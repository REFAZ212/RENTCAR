<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Models\GarasiPartner;
use App\Models\GarasiRequest;
use App\Models\InspeksiKendaraan;
use App\Models\Kendaraan;
use App\Models\Order;
use App\Models\SupirCalo;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Spatie\Activitylog\Models\Activity;

class DashboardController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        abort_if($request->user() instanceof SupirCalo, 403, 'Akses ditolak. Anda tidak memiliki izin yang cukup.');

        $today = Carbon::today();
        $yesterday = Carbon::yesterday();
        $isPetugas = $request->user()->role === 'petugas';
        $todayRange = [$today->copy()->startOfDay(), $today->copy()->endOfDay()];
        $yesterdayRange = [$yesterday->copy()->startOfDay(), $yesterday->copy()->endOfDay()];
        $monthRange = [$today->copy()->startOfMonth(), $today->copy()->endOfMonth()];

        $stats = [
            'total_kendaraan' => Kendaraan::count(),
            'kendaraan_tersedia' => Kendaraan::where('status', 'tersedia')->count(),
            'kendaraan_disewa' => Kendaraan::where('status', 'disewa')->count(),
            'kendaraan_maintenance' => Kendaraan::where('status', 'maintenance')->count(),
            'kendaraan_tidak_tersedia' => Kendaraan::where('status', 'tidak_tersedia')->count(),

            'total_customer' => Customer::count(),
            'total_garasi' => GarasiPartner::where('status_aktif', true)->count(),

            'orders_hari_ini' => Order::whereBetween('created_at', $todayRange)->count(),
            'orders_aktif' => Order::where('status_order', 'active')->count(),
            'orders_pending' => Order::where('status_order', 'pending')->count(),

            'pendapatan_hari_ini' => $isPetugas ? null : Order::whereBetween('created_at', $todayRange)
                ->where('status_pembayaran', 'paid')
                ->sum('harga_total'),

            'pendapatan_bulan_ini' => $isPetugas ? null : Order::whereBetween('created_at', $monthRange)
                ->where('status_pembayaran', 'paid')
                ->sum('harga_total'),

            'garasi_pending' => GarasiRequest::where('status_permintaan', 'pending')->count(),
            'garasi_tersedia' => GarasiRequest::where('status_permintaan', 'tersedia')->count(),
            'garasi_tidak_terjawab' => GarasiRequest::where('status_permintaan', 'tidak_terjawab')->count(),

            // Trend data — untuk perbandingan hari ini vs kemarin
            'orders_kemarin' => Order::whereBetween('created_at', $yesterdayRange)->count(),
            'pendapatan_kemarin' => $isPetugas ? null : Order::whereBetween('created_at', $yesterdayRange)
                ->where('status_pembayaran', 'paid')
                ->sum('harga_total'),
        ];

        $recent_orders = Order::with(['customer', 'kendaraan.garasiPartner'])
            ->latest()
            ->limit(10)
            ->get();

        $recent_garasi_requests = GarasiRequest::with(['order.customer', 'order.kendaraan', 'garasiPartner'])
            ->latest()
            ->limit(10)
            ->get();

        $orders_saya_supiri = $isPetugas
            ? Order::whereIn('supir_id', SupirCalo::where('user_id', $request->user()->id)->pluck('id'))
                ->whereIn('status_order', ['confirmed', 'active', 'perlu_verifikasi'])
                ->with(['customer', 'kendaraan'])
                ->latest()
                ->limit(5)
                ->get()
            : [];

        // Quick actions counts
        $inspeksi_pending_count = InspeksiKendaraan::where('status', 'pending')->count();
        $garasi_pending_count = GarasiRequest::where('status_permintaan', 'pending')->count();

        $quick_actions = [
            'inspeksi_pending' => $inspeksi_pending_count,
            'garasi_pending' => $garasi_pending_count,
        ];

        // Activity log — kronologis dari orders + garasi_requests + inspeksi terbaru
        $activity_log = $this->getActivityLog($isPetugas);

        return response()->json([
            'stats' => $stats,
            'recent_orders' => $recent_orders,
            'recent_garasi_requests' => $recent_garasi_requests,
            'orders_saya_supiri' => $orders_saya_supiri,
            'chart_pendapatan' => $isPetugas ? [] : $this->getChartPendapatan('bulanan'),
            'quick_actions' => $quick_actions,
            'activity_log' => $activity_log,
        ]);
    }

    /**
     * Gabungkan aktivitas terbaru menjadi satu timeline kronologis.
     *
     * Sumber data: tabel `activity_log` (spatie/activitylog) yang terisi otomatis
     * oleh Order, Customer, Kendaraan, InspeksiKendaraan lewat trait LogsActivity.
     * Dibandingkan menyimpulkan status dari state model saat ini, pendekatan ini
     * menangkap kejadian ASLI (created/updated) sesuai waktu kejadiannya.
     */
    private function getActivityLog(bool $isPetugas): array
    {
        // Subject yang relevan untuk dashboard ini.
        $subjectTypes = [
            Order::class,
            InspeksiKendaraan::class,
            GarasiRequest::class,
            GarasiPartner::class,
        ];

        $activities = Activity::whereIn('subject_type', $subjectTypes)
            ->where('created_at', '>=', Carbon::now()->subDays(30))
            ->orderBy('created_at', 'desc')
            ->limit(60)
            ->get();

        $events = collect();

        foreach ($activities as $activity) {
            $subject = $activity->subject;
            if (! $subject) {
                continue;
            }

            [$type, $kode, $label, $detail, $linkOrderId] = $this->activityToEvent($activity, $subject); // @phpstan-ignore-line

            if (! $type) {
                continue;
            }

            $events->push([
                'id' => "{$type}-{$activity->id}",
                'type' => $type,
                'tipe_event' => $activity->event ?? 'updated',
                'label' => $label,
                'kode' => $kode,
                'detail' => $detail,
                'link_order_id' => $linkOrderId,
                'waktu' => $activity->created_at,
            ]);
        }

        // Sort by waktu desc, ambil 15 terbaru
        return $events->sortByDesc('waktu')->take(15)->values()->toArray();
    }

    /**
     * @return array{0: ?string, 1: string, 2: string, 3: string, 4: int|null} [type, kode, label, detail, link_order_id]
     */
    private function activityToEvent(Activity $activity, object $subject): array
    {
        $event = $activity->event ?? 'updated';
        $atts = (array) ($activity->properties['attributes'] ?? []);
        $old = (array) ($activity->properties['old'] ?? []);
        $by = $activity->causer->name ?? '';

        if ($subject instanceof Order) {
            $kode = $subject->kode_order;
            $customer = $subject->customer ? ($subject->customer->nama_lengkap ?? '') : '';
            $kendaraan = $subject->kendaraan ? ($subject->kendaraan->nama_kendaraan ?? '') : '';
            $detail = trim(implode(' — ', array_filter([$customer, $kendaraan])));

            if ($event === 'created') {
                return ['order', $kode, 'Order baru dibuat', $detail, $subject->id];
            }

            // Deteksi perubahan status_order yang bermakna.
            $oldStatus = $old['status_order'] ?? null;
            $newStatus = $atts['status_order'] ?? null;
            if ($oldStatus && $newStatus && $oldStatus !== $newStatus) {
                $label = $this->orderStatusLabel($newStatus);
                $byText = $by ? " oleh {$by}" : '';

                return ['order', $kode, $label.$byText, $detail, $subject->id];
            }

            return ['order', $kode, 'Order diperbarui', $detail, $subject->id];
        }

        if ($subject instanceof InspeksiKendaraan) {
            $order = $subject->order;
            $kode = $order ? $order->kode_order : '-';
            $jenis = $subject->jenis;
            $detail = 'Kondisi: '.($subject->kondisi_body ?? '-');

            if ($event === 'created') {
                $label = $jenis === 'return' ? 'Inspeksi return dibuat' : 'Inspeksi pickup dibuat';

                return ['inspeksi', $kode, $label, $detail, $order?->id];
            }

            // Return selesai = TTD sudah diisi (lock completion).
            if ($jenis === 'return' && ($subject->ttd_customer && $subject->ttd_petugas)) {
                return ['inspeksi', $kode, 'Inspeksi return selesai', $detail, $order?->id];
            }

            $label = $jenis === 'return' ? 'Inspeksi return diperbarui' : 'Inspeksi pickup diperbarui';

            return ['inspeksi', $kode, $label, $detail, $order?->id];
        }

        if ($subject instanceof GarasiRequest) {
            $order = $subject->order;
            $kode = $order ? $order->kode_order : '-';
            $garasi = $subject->garasiPartner ? ($subject->garasiPartner->nama_garasi ?? '-') : '-';

            if ($event === 'created') {
                return ['garasi', $kode, 'Permintaan garasi baru', $garasi, $order?->id];
            }

            $oldStatus = $old['status_permintaan'] ?? null;
            $newStatus = $atts['status_permintaan'] ?? null;
            if ($oldStatus && $newStatus && $oldStatus !== $newStatus) {
                $label = match ($newStatus) {
                    'tersedia' => 'Garasi merespon — kendaraan tersedia',
                    'tidak_terjawab' => 'Garasi tidak merespon',
                    default => 'Status garasi diperbarui',
                };

                return ['garasi', $kode, $label, $garasi, $order?->id];
            }

            return ['garasi', $kode, 'Status garasi diperbarui', $garasi, $order?->id];
        }

        if ($subject instanceof GarasiPartner) {
            $nama = $subject->nama_garasi ?? 'Garasi';

            if ($event === 'created') {
                return ['garasi', '-', 'Garasi baru ditambahkan', $nama, null];
            }

            return ['garasi', '-', 'Garasi diperbarui', $nama, null];
        }

        return [null, '-', '', '', null];
    }

    private function orderStatusLabel(string $status): string
    {
        return match ($status) {
            'pending' => 'Order baru dibuat',
            'confirmed' => 'Order dikonfirmasi',
            'active' => 'Order aktif — kendaraan sedang disewa',
            'perlu_verifikasi' => 'Kendaraan perlu diverifikasi',
            'completed' => 'Order selesai',
            'cancelled' => 'Order dibatalkan',
            default => 'Order diperbarui',
        };
    }

    public function chart(Request $request): JsonResponse
    {
        abort_if($request->user() instanceof SupirCalo, 403, 'Akses ditolak. Anda tidak memiliki izin yang cukup.');

        if ($request->user()->role === 'petugas') {
            return response()->json([]);
        }

        $periode = $request->query('periode', 'bulanan');
        $allowed = ['harian', 'mingguan', 'bulanan'];

        if (! in_array($periode, $allowed)) {
            $periode = 'bulanan';
        }

        return response()->json($this->getChartPendapatan($periode));
    }

    private function getChartPendapatan(string $periode): array
    {
        $now = Carbon::now();

        $config = match ($periode) {
            'harian' => [
                'start' => $now->copy()->subDays(29)->startOfDay(),
                'sql' => '%Y-%m-%d',
                'step' => 'day',
            ],
            'mingguan' => [
                'start' => $now->copy()->subWeeks(11)->startOfWeek(),
                'sql' => '%x-W%v',
                'step' => 'week',
            ],
            default => [
                'start' => $now->copy()->subMonths(11)->startOfMonth(),
                'sql' => '%Y-%m',
                'step' => 'month',
            ],
        };

        $start = $config['start'];
        $step = $config['step'];

        $driver = DB::getDriverName();
        $sqlFormat = $config['sql'];
        $dateExpr = match (true) {
            in_array($driver, ['mysql', 'mariadb']) => "DATE_FORMAT(created_at, '{$sqlFormat}')",
            $driver === 'sqlite' => match ($sqlFormat) {
                '%Y-%m-%d' => "strftime('%Y-%m-%d', created_at)",
                '%Y-%m' => "strftime('%Y-%m', created_at)",
                '%x-W%v' => "strftime('%Y-W%W', created_at)",
                default => "strftime('%Y-%m', created_at)",
            },
            default => "DATE_FORMAT(created_at, '{$sqlFormat}')",
        };

        $rows = Order::where('status_pembayaran', 'paid')
            ->where('created_at', '>=', $start)
            ->selectRaw("{$dateExpr} AS period")
            ->selectRaw('SUM(harga_total) AS total_pendapatan')
            ->selectRaw('COUNT(*) AS jumlah_sewa')
            ->groupBy('period')
            ->orderBy('period')
            ->get()
            ->keyBy('period');

        $filled = collect();
        $cursor = $start->copy();

        while ($cursor->lte($now)) {
            $periodKey = match ($step) {
                'day' => $cursor->format('Y-m-d'),
                'week' => $cursor->format('o-\WW'),
                default => $cursor->format('Y-m'),
            };

            $row = $rows->get($periodKey);

            $label = match ($step) {
                'day' => $cursor->format('d M'),
                'week' => $cursor->format('d M'),
                default => $cursor->format('M Y'),
            };

            $filled->push([
                'bulan' => $label,
                'pendapatan' => $row ? round($row->total_pendapatan / 1_000_000, 2) : 0,
                'jumlah_sewa' => $row ? (int) $row->jumlah_sewa : 0,
            ]);

            match ($step) {
                'day' => $cursor->addDay(),
                'week' => $cursor->addWeek(),
                default => $cursor->addMonth(),
            };
        }

        return $filled->toArray();
    }
}
