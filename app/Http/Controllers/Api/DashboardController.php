<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Models\GarasiPartner;
use App\Models\GarasiRequest;
use App\Models\Kendaraan;
use App\Models\Order;
use App\Models\SupirCalo;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        abort_if($request->user() instanceof SupirCalo, 403, 'Akses ditolak. Anda tidak memiliki izin yang cukup.');

        $today = Carbon::today();
        $isPetugas = $request->user()->role === 'petugas';

        $stats = [
            'total_kendaraan' => Kendaraan::count(),
            'kendaraan_tersedia' => Kendaraan::where('status', 'tersedia')->count(),
            'kendaraan_disewa' => Kendaraan::where('status', 'disewa')->count(),
            'kendaraan_maintenance' => Kendaraan::where('status', 'maintenance')->count(),
            'kendaraan_tidak_tersedia' => Kendaraan::where('status', 'tidak_tersedia')->count(),

            'total_customer' => Customer::withTrashed()->count(),
            'total_garasi' => GarasiPartner::where('status_aktif', true)->count(),

            'orders_hari_ini' => Order::whereDate('created_at', $today)->count(),
            'orders_aktif' => Order::where('status_order', 'active')->count(),
            'orders_pending' => Order::where('status_order', 'pending')->count(),

            'pendapatan_hari_ini' => $isPetugas ? null : Order::whereDate('created_at', $today)
                ->where('status_pembayaran', 'paid')
                ->sum('harga_total'),

            'pendapatan_bulan_ini' => $isPetugas ? null : Order::whereMonth('created_at', $today->month)
                ->whereYear('created_at', $today->year)
                ->where('status_pembayaran', 'paid')
                ->sum('harga_total'),

            'garasi_pending' => GarasiRequest::where('status_permintaan', 'pending')->count(),
            'garasi_tersedia' => GarasiRequest::where('status_permintaan', 'tersedia')->count(),
            'garasi_tidak_terjawab' => GarasiRequest::where('status_permintaan', 'tidak_terjawab')->count(),
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

        return response()->json([
            'stats' => $stats,
            'recent_orders' => $recent_orders,
            'recent_garasi_requests' => $recent_garasi_requests,
            'orders_saya_supiri' => $orders_saya_supiri,
            'chart_pendapatan' => $isPetugas ? [] : $this->getChartPendapatan('bulanan'),
        ]);
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
                'week' => 'W'.$cursor->isoWeek,
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
