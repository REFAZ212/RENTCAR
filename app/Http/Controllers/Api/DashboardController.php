<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Models\GarasiPartner;
use App\Models\GarasiRequest;
use App\Models\Kendaraan;
use App\Models\Order;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class DashboardController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $today = Carbon::today();

        $stats = [
            'total_kendaraan' => Kendaraan::count(),
            'kendaraan_tersedia' => Kendaraan::where('status', 'tersedia')->count(),
            'kendaraan_disewa' => Kendaraan::where('status', 'disewa')->count(),
            'kendaraan_maintenance' => Kendaraan::where('status', 'maintenance')->count(),

            'total_customer' => Customer::count(),
            'total_garasi' => GarasiPartner::where('status_aktif', true)->count(),

            'orders_hari_ini' => Order::whereDate('created_at', $today)->count(),
            'orders_aktif' => Order::where('status_order', 'active')->count(),
            'orders_pending' => Order::where('status_order', 'pending')->count(),

            'pendapatan_hari_ini' => Order::whereDate('created_at', $today)
                ->where('status_pembayaran', 'paid')
                ->sum('harga_total'),

            'pendapatan_bulan_ini' => Order::whereMonth('created_at', $today->month)
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

        return response()->json([
            'stats' => $stats,
            'recent_orders' => $recent_orders,
            'recent_garasi_requests' => $recent_garasi_requests,
            'chart_pendapatan' => $this->getChartPendapatan('bulanan'),
        ]);
    }

    public function chart(Request $request): JsonResponse
    {
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

        $rows = Order::where('status_pembayaran', 'paid')
            ->where('created_at', '>=', $start)
            ->selectRaw('DATE_FORMAT(created_at, ?) AS period', [$config['sql']])
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
