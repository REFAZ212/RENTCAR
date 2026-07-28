<?php

namespace App\Services;

use App\Models\Customer;
use App\Models\GarasiPartner;
use App\Models\GarasiRequest;
use App\Models\Kendaraan;
use App\Models\Order;
use App\Models\SupirCalo;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class ReportService
{
    protected Carbon $start;

    protected Carbon $end;

    public function __construct(?string $startDate = null, ?string $endDate = null)
    {
        $this->start = Carbon::parse($startDate)->startOfDay();
        $this->end = Carbon::parse($endDate)->endOfDay();
    }

    public static function parseDates(array $params): array
    {
        $start = isset($params['start_date']) ? Carbon::parse($params['start_date'])->startOfDay() : Carbon::now()->startOfMonth()->startOfDay();
        $end = isset($params['end_date']) ? Carbon::parse($params['end_date'])->endOfDay() : Carbon::now()->endOfDay();

        if ($start->diffInDays($end) > 90) {
            abort(422, 'Rentang tanggal maksimal 90 hari.');
        }

        return [$start, $end];
    }

    private function dateFormatSql(string $column, string $mysqlFormat): string
    {
        $driver = DB::getDriverName();

        return match ($driver) {
            'mysql', 'mariadb' => "DATE_FORMAT({$column}, '{$mysqlFormat}')",
            'sqlite' => match ($mysqlFormat) {
                '%Y-%m-%d' => "strftime('%Y-%m-%d', {$column})",
                '%Y-%m' => "strftime('%Y-%m', {$column})",
                '%Y' => "strftime('%Y', {$column})",
                default => "strftime('%Y-%m', {$column})",
            },
            default => "DATE_FORMAT({$column}, '{$mysqlFormat}')",
        };
    }

    public function ringkasan(): array
    {
        $start = $this->start;
        $end = $this->end;

        $totalOrders = Order::whereBetween('created_at', [$start, $end])->count();
        $completedOrders = Order::where('status_order', 'completed')->whereBetween('created_at', [$start, $end])->count();
        $cancelledOrders = Order::where('status_order', 'cancelled')->whereBetween('created_at', [$start, $end])->count();
        $pendingOrders = Order::where('status_order', 'pending')->whereBetween('created_at', [$start, $end])->count();
        $confirmedOrders = Order::where('status_order', 'confirmed')->whereBetween('created_at', [$start, $end])->count();
        $activeOrders = Order::where('status_order', 'active')->whereBetween('created_at', [$start, $end])->count();

        $totalRevenue = Order::where('status_order', 'completed')->whereBetween('created_at', [$start, $end])->sum('harga_total');
        $totalFines = Order::whereBetween('created_at', [$start, $end])->sum('denda_overtime');
        $avgOrderValue = $completedOrders > 0 ? $totalRevenue / $completedOrders : 0;

        $totalVehicles = Kendaraan::count();
        $rentedVehicles = Kendaraan::where('status', 'disewa')->count();
        $utilization = $totalVehicles > 0 ? round(($rentedVehicles / $totalVehicles) * 100, 1) : 0;

        $newVehicles = Kendaraan::whereBetween('created_at', [$start, $end])->count();
        $newCustomers = Customer::whereBetween('created_at', [$start, $end])->count();
        $newGarageRequests = GarasiRequest::whereBetween('created_at', [$start, $end])->count();

        $pendingGarageRequests = GarasiRequest::where('status_permintaan', 'pending')->count();
        $answeredGarageRequests = GarasiRequest::whereIn('status_permintaan', ['tersedia', 'tidak_terjawab'])->count();

        return [
            'total_orders' => $totalOrders,
            'completed_orders' => $completedOrders,
            'cancelled_orders' => $cancelledOrders,
            'pending_orders' => $pendingOrders,
            'confirmed_orders' => $confirmedOrders,
            'active_orders' => $activeOrders,
            'total_revenue' => (float) $totalRevenue,
            'total_fines' => (float) $totalFines,
            'avg_order_value' => round($avgOrderValue, 2),
            'total_vehicles' => $totalVehicles,
            'rented_vehicles' => $rentedVehicles,
            'utilization' => $utilization,
            'new_vehicles' => $newVehicles,
            'new_customers' => $newCustomers,
            'new_garage_requests' => $newGarageRequests,
            'pending_garage_requests' => $pendingGarageRequests,
            'answered_garage_requests' => $answeredGarageRequests,
        ];
    }

    public function pendapatan(string $group = 'bulanan'): array
    {
        $start = $this->start;
        $end = $this->end;

        $dateFormat = match ($group) {
            'harian' => '%Y-%m-%d',
            'bulanan' => '%Y-%m',
            'tahunan' => '%Y',
            default => '%Y-%m',
        };

        $summary = Order::where('status_order', 'completed')
            ->whereBetween('created_at', [$start, $end])
            ->selectRaw('COUNT(*) as total_orders, SUM(harga_total) as total_revenue, SUM(denda_overtime) as total_fines, AVG(harga_total) as avg_order, COUNT(DISTINCT customer_id) as distinct_customers')
            ->first();

        $perPeriode = Order::where('status_order', 'completed')
            ->whereBetween('created_at', [$start, $end])
            ->selectRaw("{$this->dateFormatSql('tanggal_mulai', $dateFormat)} as periode, SUM(harga_total) as revenue, SUM(denda_overtime) as denda, COUNT(*) as orders")
            ->groupBy('periode')
            ->orderBy('periode')
            ->get();

        $perMetode = Order::where('status_order', 'completed')
            ->whereBetween('created_at', [$start, $end])
            ->whereNotNull('metode_pembayaran')
            ->selectRaw('metode_pembayaran, SUM(harga_total) as revenue, COUNT(*) as orders')
            ->groupBy('metode_pembayaran')
            ->get();

        $perKategori = Order::where('status_order', 'completed')
            ->whereBetween('orders.created_at', [$start, $end])
            ->join('kendaraans', 'orders.kendaraan_id', '=', 'kendaraans.id')
            ->join('kategoris', 'kendaraans.kategori_id', '=', 'kategoris.id')
            ->selectRaw('kategoris.nama_kategori, SUM(orders.harga_total) as revenue, SUM(orders.denda_overtime) as denda, COUNT(*) as orders')
            ->groupBy('kategoris.nama_kategori')
            ->get();

        return [
            'summary' => [
                'total_revenue' => (float) ($summary->total_revenue ?? 0),
                'total_fines' => (float) ($summary->total_fines ?? 0),
                'total_orders' => (int) ($summary->total_orders ?? 0),
                'distinct_customers' => (int) ($summary->distinct_customers ?? 0),
                'avg_order' => round((float) ($summary->avg_order ?? 0), 2),
            ],
            'pendapatan_periode' => $perPeriode,
            'metode_pembayaran' => $perMetode,
            'pendapatan_kategori' => $perKategori,
        ];
    }

    public function kendaraan(): array
    {
        $topIds = Order::select('kendaraan_id')
            ->selectRaw('COUNT(*) as order_count')
            ->groupBy('kendaraan_id')
            ->orderByDesc('order_count')
            ->limit(20)
            ->pluck('kendaraan_id');

        $kendaraanTerpopuler = collect();

        if ($topIds->isNotEmpty()) {
            $kendaraanMap = Kendaraan::whereIn('id', $topIds)->get()->keyBy('id');

            $stats = Order::whereIn('kendaraan_id', $topIds)
                ->selectRaw('kendaraan_id, COUNT(*) as order_count, SUM(CASE WHEN status_order = "completed" THEN harga_total ELSE 0 END) as total_revenue, AVG(durasi_hari) as avg_duration')
                ->groupBy('kendaraan_id')
                ->get()
                ->keyBy('kendaraan_id');

            $kendaraanTerpopuler = $topIds->map(function ($id) use ($kendaraanMap, $stats) {
                $k = $kendaraanMap[$id] ?? null;
                $s = $stats[$id] ?? null;

                return [
                    'kendaraan_id' => $id,
                    'nama_kendaraan' => $k->nama_kendaraan ?? '-',
                    'plat_nomor' => $k->plat_nomor ?? '-',
                    'order_count' => $s->order_count ?? 0,
                    'total_revenue' => (float) ($s->total_revenue ?? 0),
                    'avg_duration' => round((float) ($s->avg_duration ?? 0), 1),
                ];
            });
        }

        $statusKendaraan = Kendaraan::selectRaw('status, COUNT(*) as count')
            ->groupBy('status')
            ->get();

        $kategoriStats = Kendaraan::join('kategoris', 'kendaraans.kategori_id', '=', 'kategoris.id')
            ->selectRaw('kategoris.nama_kategori, COUNT(*) as total, SUM(CASE WHEN kendaraans.status = "disewa" THEN 1 ELSE 0 END) as rented, SUM(CASE WHEN kendaraans.status = "tersedia" THEN 1 ELSE 0 END) as available')
            ->groupBy('kategoris.nama_kategori')
            ->get();

        return [
            'kendaraan_terpopuler' => $kendaraanTerpopuler,
            'status_kendaraan' => $statusKendaraan,
            'kategori_stats' => $kategoriStats,
        ];
    }

    public function customer(): array
    {
        $start = $this->start;
        $end = $this->end;

        $topIds = Order::select('customer_id')
            ->selectRaw('COUNT(*) as order_count')
            ->groupBy('customer_id')
            ->orderByDesc('order_count')
            ->limit(20)
            ->pluck('customer_id');

        $topCustomers = collect();

        if ($topIds->isNotEmpty()) {
            $customerMap = Customer::whereIn('id', $topIds)->get()->keyBy('id');

            $stats = Order::whereIn('customer_id', $topIds)
                ->selectRaw('customer_id, COUNT(*) as order_count, SUM(CASE WHEN status_order = "completed" THEN harga_total ELSE 0 END) as total_spend, AVG(durasi_hari) as avg_duration')
                ->groupBy('customer_id')
                ->get()
                ->keyBy('customer_id');

            $topCustomers = $topIds->map(function ($id) use ($customerMap, $stats) {
                $c = $customerMap[$id] ?? null;
                $s = $stats[$id] ?? null;

                return [
                    'customer_id' => $id,
                    'nama_lengkap' => $c->nama_lengkap ?? '-',
                    'no_hp' => $c->no_hp ?? '-',
                    'order_count' => $s->order_count ?? 0,
                    'total_spend' => (float) ($s->total_spend ?? 0),
                    'avg_duration' => round((float) ($s->avg_duration ?? 0), 1),
                ];
            });
        }

        $totalCustomers = Customer::count();
        $newCustomers = Customer::whereBetween('created_at', [$start, $end])->count();
        $activeCustomers = Order::whereBetween('created_at', [$start, $end])->distinct('customer_id')->count('customer_id');
        $repeatCustomers = Customer::has('orders', '>', 1)->count();

        return [
            'customer_top' => $topCustomers,
            'ringkasan' => [
                'total_customers' => $totalCustomers,
                'new_customers' => $newCustomers,
                'active_customers' => $activeCustomers,
                'repeat_customers' => $repeatCustomers,
            ],
        ];
    }

    public function order(): array
    {
        $totalOrders = Order::count();
        $byStatus = Order::selectRaw('status_order, COUNT(*) as count')->groupBy('status_order')->get();
        $byPembayaran = Order::selectRaw('status_pembayaran, COUNT(*) as count')->groupBy('status_pembayaran')->get();
        $byPengiriman = Order::selectRaw('status_pengiriman, COUNT(*) as count')->groupBy('status_pengiriman')->get();

        $recentOrders = Order::with(['customer', 'kendaraan.kategori', 'kendaraan.tipe', 'admin'])
            ->orderBy('created_at', 'desc')
            ->limit(100)
            ->get();

        return [
            'total_orders' => $totalOrders,
            'by_status' => $byStatus,
            'by_pembayaran' => $byPembayaran,
            'by_pengiriman' => $byPengiriman,
            'recent_orders' => $recentOrders,
        ];
    }

    public function bagiHasil(): array
    {
        $partners = GarasiPartner::where('is_own', false)->get();
        $results = [];
        $grandTotalRevenue = 0;
        $grandTotalShare = 0;

        foreach ($partners as $partner) {
            $orders = Order::where('status_order', 'completed')
                ->whereHas('garasiRequests', function ($q) use ($partner) {
                    $q->where('garasi_partner_id', $partner->id);
                })
                ->get();

            $revenue = $orders->sum('harga_total');
            $fines = $orders->sum('denda_overtime');
            $partnerShare = $revenue * ($partner->persentase_bagi_hasil / 100);

            $results[] = [
                'garasi_partner_id' => $partner->id,
                'nama_garasi' => $partner->nama_garasi,
                'persentase' => $partner->persentase_bagi_hasil,
                'total_orders' => $orders->count(),
                'total_revenue' => (float) $revenue,
                'total_fines' => (float) $fines,
                'partner_share' => round($partnerShare, 2),
            ];

            $grandTotalRevenue += $revenue;
            $grandTotalShare += $partnerShare;
        }

        return [
            'partners' => $results,
            'grand_total' => [
                'total_revenue' => $grandTotalRevenue,
                'total_share' => round($grandTotalShare, 2),
            ],
        ];
    }

    public function komisiCalo(): array
    {
        $calos = SupirCalo::where('jenis', 'calo')->get();
        $results = [];
        $grandTotalRevenue = 0;
        $grandTotalKomisi = 0;

        foreach ($calos as $calo) {
            $orders = Order::where('calo_id', $calo->id)
                ->where('status_order', 'completed')
                ->get();

            $revenue = $orders->sum('harga_total');
            $komisi = $orders->sum('komisi_calo');

            $results[] = [
                'calo_id' => $calo->id,
                'nama' => $calo->nama,
                'total_orders' => $orders->count(),
                'total_revenue' => (float) $revenue,
                'total_komisi' => (float) $komisi,
            ];

            $grandTotalRevenue += $revenue;
            $grandTotalKomisi += $komisi;
        }

        return [
            'calos' => $results,
            'grand_total' => [
                'total_revenue' => $grandTotalRevenue,
                'total_komisi' => round($grandTotalKomisi, 2),
            ],
        ];
    }

    public function sectionsRingkasan(): array
    {
        $data = $this->ringkasan();
        $rows = [];
        foreach ($data as $key => $value) {
            $rows[] = [ucwords(str_replace('_', ' ', $key)), is_numeric($value) ? number_format($value, 0, ',', '.') : $value];
        }

        return [['title' => 'Ringkasan', 'headers' => ['Metrik', 'Nilai'], 'rows' => $rows]];
    }

    public function sectionsPendapatan(): array
    {
        $data = $this->pendapatan('bulanan');
        $sections = [];

        $summaryRows = [];
        foreach ($data['summary'] as $key => $value) {
            $summaryRows[] = [ucwords(str_replace('_', ' ', $key)), is_numeric($value) ? number_format($value, 0, ',', '.') : $value];
        }
        $sections[] = ['title' => 'Ringkasan Pendapatan', 'headers' => ['Metrik', 'Nilai'], 'rows' => $summaryRows];

        $periodeRows = $data['pendapatan_periode']->map(fn ($p) => [$p->periode, number_format($p->revenue, 0, ',', '.'), number_format($p->denda ?? 0, 0, ',', '.'), $p->orders])->toArray();
        $sections[] = ['title' => 'Pendapatan Per Periode', 'headers' => ['Periode', 'Pendapatan', 'Denda', 'Jumlah Order'], 'rows' => $periodeRows];

        $metodeRows = $data['metode_pembayaran']->map(fn ($m) => [$m->metode_pembayaran, number_format($m->revenue, 0, ',', '.'), $m->orders])->toArray();
        $sections[] = ['title' => 'Per Metode Pembayaran', 'headers' => ['Metode', 'Pendapatan', 'Jumlah Order'], 'rows' => $metodeRows];

        $kategoriRows = $data['pendapatan_kategori']->map(fn ($k) => [$k->nama_kategori, number_format($k->revenue, 0, ',', '.'), number_format($k->denda ?? 0, 0, ',', '.'), $k->orders])->toArray();
        $sections[] = ['title' => 'Per Kategori', 'headers' => ['Kategori', 'Pendapatan', 'Denda', 'Jumlah Order'], 'rows' => $kategoriRows];

        return $sections;
    }

    public function sectionsKendaraan(): array
    {
        $data = $this->kendaraan();
        $sections = [];

        $populerRows = $data['kendaraan_terpopuler']->map(fn ($k) => [$k['nama_kendaraan'], $k['plat_nomor'], $k['order_count'], number_format($k['total_revenue'], 0, ',', '.'), $k['avg_duration']])->toArray();
        $sections[] = ['title' => 'Kendaraan Terpopuler', 'headers' => ['Nama', 'Plat', 'Jumlah Sewa', 'Pendapatan', 'Rata-rata Durasi'], 'rows' => $populerRows];

        $statusRows = $data['status_kendaraan']->map(fn ($s) => [$s->status, $s->count])->toArray();
        $sections[] = ['title' => 'Status Kendaraan', 'headers' => ['Status', 'Jumlah'], 'rows' => $statusRows];

        $kategoriRows = $data['kategori_stats']->map(fn ($k) => [$k->nama_kategori, $k->total, $k->rented, $k->available])->toArray();
        $sections[] = ['title' => 'Statistik Kategori', 'headers' => ['Kategori', 'Total', 'Disewa', 'Tersedia'], 'rows' => $kategoriRows];

        return $sections;
    }

    public function sectionsCustomer(): array
    {
        $data = $this->customer();
        $sections = [];

        $topRows = $data['customer_top']->map(fn ($c) => [$c['nama_lengkap'], $c['no_hp'], $c['order_count'], number_format($c['total_spend'], 0, ',', '.'), $c['avg_duration']])->toArray();
        $sections[] = ['title' => 'Customer Teratas', 'headers' => ['Nama', 'No HP', 'Jumlah Order', 'Total Belanja', 'Rata-rata Durasi'], 'rows' => $topRows];

        $ringkasan = $data['ringkasan'];
        $sections[] = ['title' => 'Ringkasan Customer', 'headers' => ['Metrik', 'Nilai'], 'rows' => [
            ['Total Customer', $ringkasan['total_customers']],
            ['Customer Baru', $ringkasan['new_customers']],
            ['Customer Aktif', $ringkasan['active_customers']],
            ['Customer Repeat', $ringkasan['repeat_customers']],
        ]];

        return $sections;
    }

    public function sectionsOrder(): array
    {
        $data = $this->order();
        $sections = [];

        $sections[] = ['title' => 'Ringkasan Order', 'headers' => ['Metrik', 'Nilai'], 'rows' => [
            ['Total Order', $data['total_orders']],
        ]];

        $statusRows = $data['by_status']->map(fn ($s) => [$s->status_order, $s->count])->toArray();
        $sections[] = ['title' => 'Order per Status', 'headers' => ['Status', 'Jumlah'], 'rows' => $statusRows];

        $pembayaranRows = $data['by_pembayaran']->map(fn ($p) => [$p->status_pembayaran, $p->count])->toArray();
        $sections[] = ['title' => 'Order per Status Pembayaran', 'headers' => ['Status', 'Jumlah'], 'rows' => $pembayaranRows];

        $recentRows = $data['recent_orders']->map(fn ($o) => [
            $o->kode_order, $o->customer->nama_lengkap ?? '-', $o->kendaraan->nama_kendaraan ?? '-',
            $o->tanggal_mulai?->format('d/m/Y') ?? '-', $o->tanggal_selesai?->format('d/m/Y') ?? '-',
            number_format($o->harga_total, 0, ',', '.'), $o->status_order,
        ])->toArray();
        $sections[] = ['title' => 'Order Terbaru', 'headers' => ['Kode', 'Customer', 'Kendaraan', 'Mulai', 'Selesai', 'Total', 'Status'], 'rows' => $recentRows];

        return $sections;
    }

    public function sectionsBagiHasil(): array
    {
        $data = $this->bagiHasil();
        $rows = array_map(fn ($p) => [
            $p['nama_garasi'], $p['persentase'].'%', $p['total_orders'],
            number_format($p['total_revenue'], 0, ',', '.'), number_format($p['partner_share'], 0, ',', '.'),
        ], $data['partners']);

        $rows[] = ['', 'TOTAL', '', number_format($data['grand_total']['total_revenue'], 0, ',', '.'), number_format($data['grand_total']['total_share'], 0, ',', '.')];

        return [['title' => 'Bagi Hasil Garasi Partner', 'headers' => ['Nama Garasi', 'Persentase', 'Jumlah Order', 'Pendapatan', 'Bagi Hasil'], 'rows' => $rows]];
    }

    public function sectionsKomisiCalo(): array
    {
        $data = $this->komisiCalo();
        $rows = array_map(fn ($c) => [
            $c['nama'], $c['total_orders'],
            number_format($c['total_revenue'], 0, ',', '.'), number_format($c['total_komisi'], 0, ',', '.'),
        ], $data['calos']);

        $rows[] = ['TOTAL', '', number_format($data['grand_total']['total_revenue'], 0, ',', '.'), number_format($data['grand_total']['total_komisi'], 0, ',', '.')];

        return [['title' => 'Komisi Calo', 'headers' => ['Nama', 'Jumlah Order', 'Pendapatan', 'Komisi'], 'rows' => $rows]];
    }
}
