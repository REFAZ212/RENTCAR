<?php

namespace App\Services;

use App\Models\Customer;
use App\Models\GarasiPartner;
use App\Models\GarasiRequest;
use App\Models\InspeksiKendaraan;
use App\Models\Kendaraan;
use App\Models\Order;
use App\Models\SupirCalo;
use App\Models\Tipe;
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
        $semuaWaktu = ($params['start_date'] ?? null) === '2000-01-01';
        $start = isset($params['start_date']) ? Carbon::parse($params['start_date'])->startOfDay() : Carbon::now()->startOfMonth()->startOfDay();
        $end = isset($params['end_date']) ? Carbon::parse($params['end_date'])->endOfDay() : Carbon::now()->endOfDay();

        if (! $semuaWaktu && $start->diffInDays($end) > 90) {
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
        $totalFines = Order::where('status_order', 'completed')->whereBetween('created_at', [$start, $end])->sum('denda_overtime');
        $avgOrderValue = $completedOrders > 0 ? $totalRevenue / $completedOrders : 0;

        $totalVehicles = Kendaraan::count();
        $rentedVehicles = Kendaraan::where('status', 'disewa')->count();
        $utilization = $totalVehicles > 0 ? round(($rentedVehicles / $totalVehicles) * 100, 1) : 0;

        $newVehicles = Kendaraan::whereBetween('created_at', [$start, $end])->count();
        $newCustomers = Customer::withTrashed()->whereBetween('created_at', [$start, $end])->count();
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
            ->get()
            ->each(function (Order $row) {
                $row->revenue = (float) $row->revenue;
                $row->denda = (float) ($row->denda ?? 0);
                $row->orders = (int) $row->orders;
            });

        $perMetode = Order::where('status_order', 'completed')
            ->whereBetween('created_at', [$start, $end])
            ->whereNotNull('metode_pembayaran')
            ->selectRaw('metode_pembayaran, SUM(harga_total) as revenue, COUNT(*) as orders')
            ->groupBy('metode_pembayaran')
            ->get()
            ->each(function (Order $row) {
                $row->revenue = (float) $row->revenue;
                $row->orders = (int) $row->orders;
            });

        $perKategori = Order::where('status_order', 'completed')
            ->whereBetween('orders.created_at', [$start, $end])
            ->join('kendaraans', 'orders.kendaraan_id', '=', 'kendaraans.id')
            ->join('kategoris', 'kendaraans.kategori_id', '=', 'kategoris.id')
            ->selectRaw('kategoris.nama_kategori, SUM(orders.harga_total) as revenue, SUM(orders.denda_overtime) as denda, COUNT(*) as orders')
            ->groupBy('kategoris.nama_kategori')
            ->get()
            ->each(function (Order $row) {
                $row->revenue = (float) $row->revenue;
                $row->denda = (float) ($row->denda ?? 0);
                $row->orders = (int) $row->orders;
            });

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
        $start = $this->start;
        $end = $this->end;

        $topIds = Order::where('status_order', 'completed')
            ->whereBetween('created_at', [$start, $end])
            ->select('kendaraan_id')
            ->selectRaw('COUNT(*) as order_count')
            ->groupBy('kendaraan_id')
            ->orderByDesc('order_count')
            ->limit(20)
            ->pluck('kendaraan_id');

        $kendaraanTerpopuler = collect();

        if ($topIds->isNotEmpty()) {
            $kendaraanMap = Kendaraan::with('kategori')->whereIn('id', $topIds)->get()->keyBy('id');

            $stats = Order::where('status_order', 'completed')
                ->whereIn('kendaraan_id', $topIds)
                ->whereBetween('created_at', [$start, $end])
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
                    'kategori' => $k->kategori?->nama_kategori ?? null,
                    'harga_sewa_per_hari' => (float) ($k->harga_sewa_per_hari ?? 0),
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

        $topIds = Order::where('status_order', 'completed')
            ->whereBetween('created_at', [$start, $end])
            ->select('customer_id')
            ->selectRaw('COUNT(*) as order_count')
            ->groupBy('customer_id')
            ->orderByDesc('order_count')
            ->limit(20)
            ->pluck('customer_id');

        $topCustomers = collect();

        if ($topIds->isNotEmpty()) {
            $customerMap = Customer::withTrashed()->whereIn('id', $topIds)->get()->keyBy('id');

            $stats = Order::where('status_order', 'completed')
                ->whereIn('customer_id', $topIds)
                ->whereBetween('created_at', [$start, $end])
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

        $totalCustomers = Customer::withTrashed()->count();
        $newCustomers = Customer::withTrashed()->whereBetween('created_at', [$start, $end])->count();
        $activeCustomers = Order::whereBetween('created_at', [$start, $end])->distinct('customer_id')->count('customer_id');
        $repeatCustomers = Customer::withTrashed()->has('orders', '>', 1)->count();

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
        $start = $this->start;
        $end = $this->end;

        $totalOrders = Order::whereBetween('created_at', [$start, $end])->count();
        $byStatus = Order::whereBetween('created_at', [$start, $end])
            ->selectRaw('status_order, COUNT(*) as count')->groupBy('status_order')->get();
        $byPembayaran = Order::whereBetween('created_at', [$start, $end])
            ->selectRaw('status_pembayaran, COUNT(*) as count')->groupBy('status_pembayaran')->get();
        $byPengiriman = Order::whereBetween('created_at', [$start, $end])
            ->selectRaw('status_pengiriman, COUNT(*) as count')->groupBy('status_pengiriman')->get();

        $recentOrders = Order::with(['customer', 'kendaraan.kategori', 'kendaraan.tipe', 'admin'])
            ->whereBetween('created_at', [$start, $end])
            ->orderBy('created_at', 'desc')
            ->limit(100)
            ->get();

        return [
            'total_orders' => $totalOrders,
            'total_pendapatan' => (float) Order::where('status_order', 'completed')
                ->whereBetween('created_at', [$start, $end])->sum('harga_total'),
            'total_denda' => (float) Order::where('status_order', 'completed')
                ->whereBetween('created_at', [$start, $end])->sum('denda_overtime'),
            'rata_rata_durasi' => round((float) (Order::where('status_order', 'completed')->whereBetween('created_at', [$start, $end])->avg('durasi_hari') ?? 0), 1),
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
                'nama_pemilik' => $partner->nama_pemilik,
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
                'no_hp' => $calo->no_hp,
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

    /**
     * Rekap pendapatan, beban, komisi, laba, dan bagi hasil per garasi partner
     * dalam periode terpilih. Menggabungkan dimensi Bagi Hasil dan Laba/Rugi
     * menjadi satu baris per garasi agar konsisten dengan Detail Order.
     */
    public function rekapGarasi(): array
    {
        $start = $this->start;
        $end = $this->end;

        $orders = Order::with(['kendaraan.garasiPartner', 'calo'])
            ->where('status_order', 'completed')
            ->whereBetween('created_at', [$start, $end])
            ->whereNotNull('kendaraan_id')
            ->get();

        $perGarasi = [];
        $grandTotal = [
            'order_count' => 0,
            'pendapatan' => 0,
            'denda' => 0,
            'beban_partner' => 0,
            'komisi' => 0,
            'laba' => 0,
            'bagi_hasil' => 0,
        ];

        foreach ($orders as $order) {
            $kendaraan = $order->kendaraan;
            $garasi = $kendaraan?->garasiPartner;

            if (! $garasi || $garasi->is_own) {
                continue;
            }

            $pendapatan = (float) $order->harga_total;
            $denda = (float) ($order->denda_overtime ?? 0);
            $komisi = (float) ($order->komisi_calo ?? 0);
            $durasi = (int) $order->durasi_hari;

            $beban = 0;
            if (! empty($kendaraan->harga_partner_per_hari)) {
                $beban = round((float) $kendaraan->harga_partner_per_hari * $durasi, 2);
            }
            $laba = round($pendapatan - $beban - $komisi, 2);
            $bagiHasil = round($pendapatan * ($garasi->persentase_bagi_hasil / 100), 2);

            $key = (string) $garasi->id;
            if (! isset($perGarasi[$key])) {
                $perGarasi[$key] = [
                    'garasi_partner_id' => $garasi->id,
                    'nama_garasi' => $garasi->nama_garasi,
                    'persentase' => (float) $garasi->persentase_bagi_hasil,
                    'order_count' => 0,
                    'pendapatan' => 0,
                    'denda' => 0,
                    'beban_partner' => 0,
                    'komisi' => 0,
                    'laba' => 0,
                    'bagi_hasil' => 0,
                ];
            }

            $perGarasi[$key]['order_count']++;
            $perGarasi[$key]['pendapatan'] += $pendapatan;
            $perGarasi[$key]['denda'] += $denda;
            $perGarasi[$key]['beban_partner'] += $beban;
            $perGarasi[$key]['komisi'] += $komisi;
            $perGarasi[$key]['laba'] += $laba;
            $perGarasi[$key]['bagi_hasil'] += $bagiHasil;

            $grandTotal['order_count']++;
            $grandTotal['pendapatan'] += $pendapatan;
            $grandTotal['denda'] += $denda;
            $grandTotal['beban_partner'] += $beban;
            $grandTotal['komisi'] += $komisi;
            $grandTotal['laba'] += $laba;
            $grandTotal['bagi_hasil'] += $bagiHasil;
        }

        foreach ($perGarasi as $key => $item) {
            $perGarasi[$key]['pendapatan'] = round($item['pendapatan'], 2);
            $perGarasi[$key]['denda'] = round($item['denda'], 2);
            $perGarasi[$key]['beban_partner'] = round($item['beban_partner'], 2);
            $perGarasi[$key]['laba'] = round($item['laba'], 2);
            $perGarasi[$key]['bagi_hasil'] = round($item['bagi_hasil'], 2);
        }

        $rows = array_values($perGarasi);
        usort($rows, fn ($a, $b) => $b['laba'] <=> $a['laba']);

        return [
            'partners' => $rows,
            'grand_total' => [
                'order_count' => $grandTotal['order_count'],
                'pendapatan' => round($grandTotal['pendapatan'], 2),
                'denda' => round($grandTotal['denda'], 2),
                'beban_partner' => round($grandTotal['beban_partner'], 2),
                'komisi' => round($grandTotal['komisi'], 2),
                'laba' => round($grandTotal['laba'], 2),
                'bagi_hasil' => round($grandTotal['bagi_hasil'], 2),
            ],
        ];
    }

    public function growthComparison(): array
    {
        $start = $this->start;
        $end = $this->end;

        $currentDays = $start->diffInDays($end);
        $prevStart = $start->copy()->subDays($currentDays + 1);
        $prevEnd = $start->copy()->subDay();

        $currentRevenue = Order::where('status_order', 'completed')
            ->whereBetween('created_at', [$start, $end])->sum('harga_total');
        $prevRevenue = Order::where('status_order', 'completed')
            ->whereBetween('created_at', [$prevStart, $prevEnd])->sum('harga_total');

        $currentFines = Order::where('status_order', 'completed')
            ->whereBetween('created_at', [$start, $end])->sum('denda_overtime');
        $prevFines = Order::where('status_order', 'completed')
            ->whereBetween('created_at', [$prevStart, $prevEnd])->sum('denda_overtime');

        $currentOrders = Order::whereBetween('created_at', [$start, $end])->count();
        $prevOrders = Order::whereBetween('created_at', [$prevStart, $prevEnd])->count();

        $currentCustomers = Customer::withTrashed()
            ->whereBetween('created_at', [$start, $end])->count();
        $prevCustomers = Customer::withTrashed()
            ->whereBetween('created_at', [$prevStart, $prevEnd])->count();

        return [
            'pendapatan' => ['current' => (float) $currentRevenue, 'previous' => (float) $prevRevenue],
            'denda' => ['current' => (float) $currentFines, 'previous' => (float) $prevFines],
            'order' => ['current' => $currentOrders, 'previous' => $prevOrders],
            'customer' => ['current' => $currentCustomers, 'previous' => $prevCustomers],
        ];
    }

    public function piutang(): array
    {
        $orders = Order::whereIn('status_pembayaran', ['unpaid', 'partial'])
            ->where('status_order', '!=', 'cancelled')
            ->with(['customer', 'kendaraan.kategori'])
            ->get();

        $results = $orders->map(function ($order) {
            $totalPaid = $order->pembayarans()
                ->whereNull('deleted_at')
                ->where('status', '!=', 'refund')
                ->sum('jumlah');

            $outstanding = $order->harga_total - $totalPaid;
            $returnDate = $order->tanggal_pengembalian_aktual?->copy()->startOfDay();
            $daysOverdue = $returnDate
                ? (int) $returnDate->diffInDays(now()->startOfDay())
                : 0;

            $aging = match (true) {
                ! $returnDate || $daysOverdue <= 0 => 'belum_tertunggak',
                $daysOverdue <= 30 => '1_30_hari',
                $daysOverdue <= 60 => '31_60_hari',
                default => 'lebih_60_hari',
            };

            return [
                'order_id' => $order->id,
                'kode_order' => $order->kode_order,
                'nama_customer' => $order->customer->nama_lengkap ?? '-',
                'no_hp' => $order->customer->no_hp ?? '-',
                'kendaraan' => $order->kendaraan->nama_kendaraan ?? '-',
                'tanggal_mulai' => $order->tanggal_mulai?->format('Y-m-d'),
                'tanggal_pengembalian' => $returnDate?->format('Y-m-d'),
                'harga_total' => (float) $order->harga_total,
                'total_bayar' => (float) $totalPaid,
                'sisa_pembayaran' => (float) $outstanding,
                'hari_tertunggak' => $daysOverdue,
                'aging' => $aging,
            ];
        });

        $totalOutstanding = $results->sum('sisa_pembayaran');
        $overdueTotal = $results->where('aging', '!=', 'belum_tertunggak')->sum('sisa_pembayaran');
        $agingBuckets = $results->groupBy('aging')->map(fn ($group) => [
            'count' => $group->count(),
            'total' => $group->sum('sisa_pembayaran'),
        ]);

        return [
            'data' => $results->values()->toArray(),
            'ringkasan' => [
                'total_piutang' => (float) $totalOutstanding,
                'total_tertunggak' => (float) $overdueTotal,
                'jumlah_order' => $results->count(),
                'aging_buckets' => $agingBuckets,
            ],
        ];
    }

    public function sectionsRingkasan(): array
    {
        $data = $this->ringkasan();
        unset($data['total_revenue'], $data['total_fines']);

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

        $statusRows = $data['by_status']->map(fn ($s) => [$s->status_order, $s->count])->toArray();
        $sections[] = ['title' => 'Order per Status', 'headers' => ['Status', 'Jumlah'], 'rows' => $statusRows];

        $pembayaranRows = $data['by_pembayaran']->map(fn ($p) => [$p->status_pembayaran, $p->count])->toArray();
        $sections[] = ['title' => 'Order per Status Pembayaran', 'headers' => ['Status', 'Jumlah'], 'rows' => $pembayaranRows];

        $pengirimanRows = $data['by_pengiriman']->map(fn ($p) => [$p->status_pengiriman, $p->count])->toArray();
        $sections[] = ['title' => 'Order per Status Pengiriman', 'headers' => ['Status', 'Jumlah'], 'rows' => $pengirimanRows];

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

    public function sectionsRekapGarasi(): array
    {
        $data = $this->rekapGarasi();

        $rows = array_map(fn ($p) => [
            $p['nama_garasi'], $p['order_count'],
            number_format($p['pendapatan'], 0, ',', '.'),
            number_format($p['beban_partner'], 0, ',', '.'),
            number_format($p['komisi'], 0, ',', '.'),
            number_format($p['laba'], 0, ',', '.'),
            number_format($p['bagi_hasil'], 0, ',', '.'),
            number_format($p['persentase'], 1, ',', '.').'%',
        ], $data['partners']);

        $g = $data['grand_total'];
        $rows[] = [
            'TOTAL', $g['order_count'],
            number_format($g['pendapatan'], 0, ',', '.'),
            number_format($g['beban_partner'], 0, ',', '.'),
            number_format($g['komisi'], 0, ',', '.'),
            number_format($g['laba'], 0, ',', '.'),
            number_format($g['bagi_hasil'], 0, ',', '.'),
            '',
        ];

        return [['title' => 'Rekap per Garasi Partner', 'headers' => ['Nama Garasi', 'Order', 'Pendapatan', 'Beban', 'Komisi', 'Laba', 'Bagi Hasil', 'Persentase'], 'rows' => $rows]];
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

    public function sectionsPiutang(): array
    {
        $data = $this->piutang();
        $sections = [];

        $ringkasan = $data['ringkasan'];
        $sections[] = ['title' => 'Ringkasan Piutang', 'headers' => ['Metrik', 'Nilai'], 'rows' => [
            ['Total Piutang', number_format($ringkasan['total_piutang'], 0, ',', '.')],
            ['Total Tertunggak', number_format($ringkasan['total_tertunggak'], 0, ',', '.')],
            ['Jumlah Order', $ringkasan['jumlah_order']],
        ]];

        $agingLabels = [
            'belum_tertunggak' => 'Belum Tertunggak',
            '1_30_hari' => '1-30 Hari',
            '31_60_hari' => '31-60 Hari',
            'lebih_60_hari' => '60+ Hari',
        ];
        $agingRows = [];
        foreach ($ringkasan['aging_buckets'] as $key => $bucket) {
            $agingRows[] = [$agingLabels[$key] ?? $key, $bucket['count'], number_format($bucket['total'], 0, ',', '.')];
        }
        $sections[] = ['title' => 'Aging Buckets', 'headers' => ['Kategori', 'Jumlah Order', 'Total'], 'rows' => $agingRows];

        $detailRows = array_map(fn ($p) => [
            $p['kode_order'], $p['nama_customer'], $p['kendaraan'],
            $p['tanggal_mulai'] ?? '-', $p['tanggal_pengembalian'] ?? '-',
            number_format($p['harga_total'], 0, ',', '.'),
            number_format($p['total_bayar'], 0, ',', '.'),
            number_format($p['sisa_pembayaran'], 0, ',', '.'),
            $p['hari_tertunggak'],
            str_replace('_', ' ', $p['aging']),
        ], $data['data']);
        $sections[] = ['title' => 'Detail Piutang', 'headers' => ['Kode', 'Customer', 'Kendaraan', 'Mulai', 'Tgl Kembali', 'Total', 'Dibayar', 'Sisa', 'Hari Tertunggak', 'Aging'], 'rows' => $detailRows];

        return $sections;
    }

    public function profitabilitas(): array
    {
        $start = $this->start;
        $end = $this->end;

        $orders = Order::with(['kendaraan.kategori', 'kendaraan.garasiPartner', 'calo'])
            ->where('status_order', 'completed')
            ->whereBetween('created_at', [$start, $end])
            ->whereNotNull('kendaraan_id')
            ->get();

        $bebanPerGarasi = [];
        $bebanPerKategori = [];
        $totalPendapatan = 0;
        $totalBeban = 0;
        $totalKomisi = 0;

        foreach ($orders as $order) {
            $pendapatan = (float) $order->harga_total;
            $komisi = (float) ($order->komisi_calo ?? 0);
            $kendaraan = $order->kendaraan;
            $durasi = (int) $order->durasi_hari;

            $beban = 0;
            if ($kendaraan && ! empty($kendaraan->harga_partner_per_hari)) {
                $beban = (float) $kendaraan->harga_partner_per_hari * $durasi;
            }

            $totalPendapatan += $pendapatan;
            $totalBeban += $beban;
            $totalKomisi += $komisi;

            $partnerId = $kendaraan?->garasi_partner_id;
            if ($partnerId && $beban > 0) {
                $key = (string) $partnerId;
                if (! isset($bebanPerGarasi[$key])) {
                    $bebanPerGarasi[$key] = [
                        'garasi_partner_id' => $partnerId,
                        'nama_garasi' => $kendaraan->garasiPartner->nama_garasi ?? '-',
                        'pendapatan' => 0,
                        'beban_partner' => 0,
                        'komisi' => 0,
                        'order_count' => 0,
                    ];
                }
                $bebanPerGarasi[$key]['pendapatan'] += $pendapatan;
                $bebanPerGarasi[$key]['beban_partner'] += $beban;
                $bebanPerGarasi[$key]['komisi'] += $komisi;
                $bebanPerGarasi[$key]['order_count']++;
            }

            $kategori = $kendaraan?->kategori?->nama_kategori;
            if ($kategori) {
                if (! isset($bebanPerKategori[$kategori])) {
                    $bebanPerKategori[$kategori] = [
                        'nama_kategori' => $kategori,
                        'pendapatan' => 0,
                        'beban_partner' => 0,
                        'komisi' => 0,
                        'order_count' => 0,
                    ];
                }
                $bebanPerKategori[$kategori]['pendapatan'] += $pendapatan;
                $bebanPerKategori[$kategori]['beban_partner'] += $beban;
                $bebanPerKategori[$kategori]['komisi'] += $komisi;
                $bebanPerKategori[$kategori]['order_count']++;
            }
        }

        $labaBersih = $totalPendapatan - $totalBeban - $totalKomisi;
        $rasioMargin = $totalPendapatan > 0 ? round(($labaBersih / $totalPendapatan) * 100, 1) : 0;

        foreach ($bebanPerGarasi as $key => $item) {
            $bebanPerGarasi[$key]['laba'] = round($item['pendapatan'] - $item['beban_partner'] - $item['komisi'], 2);
        }
        foreach ($bebanPerKategori as $key => $item) {
            $bebanPerKategori[$key]['laba'] = round($item['pendapatan'] - $item['beban_partner'] - $item['komisi'], 2);
        }

        return [
            'ringkasan' => [
                'total_pendapatan' => round($totalPendapatan, 2),
                'total_beban_partner' => round($totalBeban, 2),
                'total_komisi' => round($totalKomisi, 2),
                'laba_bersih' => round($labaBersih, 2),
                'rasio_margin' => $rasioMargin,
                'jumlah_order' => $orders->count(),
            ],
            'per_garasi' => array_values($bebanPerGarasi),
            'per_kategori' => array_values($bebanPerKategori),
        ];
    }

    public function sectionsProfitabilitas(): array
    {
        $data = $this->profitabilitas();
        $sections = [];

        $garasiRows = array_map(fn ($g) => [
            $g['nama_garasi'], $g['order_count'],
            number_format($g['pendapatan'], 0, ',', '.'),
            number_format($g['beban_partner'], 0, ',', '.'),
            number_format($g['komisi'], 0, ',', '.'),
            number_format($g['laba'], 0, ',', '.'),
        ], $data['per_garasi']);
        $totalLabaGarasi = array_sum(array_column($data['per_garasi'], 'laba'));
        $garasiRows[] = ['TOTAL', array_sum(array_column($data['per_garasi'], 'order_count')),
            number_format(array_sum(array_column($data['per_garasi'], 'pendapatan')), 0, ',', '.'),
            number_format(array_sum(array_column($data['per_garasi'], 'beban_partner')), 0, ',', '.'),
            number_format(array_sum(array_column($data['per_garasi'], 'komisi')), 0, ',', '.'),
            number_format($totalLabaGarasi, 0, ',', '.')];
        $sections[] = ['title' => 'Laba / Rugi Per Garasi', 'headers' => ['Nama Garasi', 'Order', 'Pendapatan', 'Beban', 'Komisi', 'Laba'], 'rows' => $garasiRows];

        return $sections;
    }

    /**
     * Laporan detail per order — seluruh kegiatan order termasuk hasil
     * inspeksi pickup/return, keuangan, dan laba per order.
     *
     * @param  array  $filters  [status_order, source, garasi_partner_id]
     * @param  int  $perPage  jumlah baris per halaman (0 = tanpa pagination)
     * @param  int  $page  halaman saat ini
     */
    public function detailOrder(array $filters = [], int $perPage = 25, int $page = 1): array
    {
        $start = $this->start;
        $end = $this->end;

        $query = Order::with([
            'customer',
            'kendaraan.tipe',
            'kendaraan.kategori',
            'kendaraan.garasiPartner',
            'admin',
            'operator',
            'supir',
            'calo',
            'garasiRequests.garasiPartner',
            'inspeksis',
        ])
            ->whereBetween('created_at', [$start, $end]);

        if (! empty($filters['status_order'])) {
            $query->where('status_order', $filters['status_order']);
        }
        if (! empty($filters['source'])) {
            $query->where('source', $filters['source']);
        }
        if (! empty($filters['garasi_partner_id'])) {
            $query->whereHas('kendaraan', fn ($q) => $q->where('garasi_partner_id', $filters['garasi_partner_id']));
        }

        $query->orderByDesc('created_at');

        if ($perPage > 0) {
            $paginator = $query->paginate($perPage, ['*'], 'page', $page);
            $orders = $paginator->getCollection();
        } else {
            $orders = $query->get();
        }

        $rows = $orders->map(fn ($order) => $this->formatDetailOrderRow($order));

        $result = ['data' => $rows->values()->toArray()];

        if ($perPage > 0) {
            $result['pagination'] = [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'total' => $paginator->total(),
                'per_page' => $paginator->perPage(),
            ];
        }

        return $result;
    }

    public function detailOrderSummary(array $filters = []): array
    {
        $start = $this->start;
        $end = $this->end;

        $query = Order::whereBetween('created_at', [$start, $end]);

        if (! empty($filters['status_order'])) {
            $query->where('status_order', $filters['status_order']);
        }
        if (! empty($filters['source'])) {
            $query->where('source', $filters['source']);
        }
        if (! empty($filters['garasi_partner_id'])) {
            $query->whereHas('kendaraan', fn ($q) => $q->where('garasi_partner_id', $filters['garasi_partner_id']));
        }

        $completed = (clone $query)->where('status_order', 'completed')->get();

        $totalHarga = $completed->sum('harga_total');
        $totalDenda = $completed->sum('denda_overtime');
        $totalKomisi = $completed->sum('komisi_calo');
        $totalBeban = 0;

        foreach ($completed as $order) {
            if ($order->kendaraan && ! empty($order->kendaraan->harga_partner_per_hari)) {
                $totalBeban += (float) $order->kendaraan->harga_partner_per_hari * (int) $order->durasi_hari;
            }
        }

        $labaBersih = $totalHarga - $totalBeban - $totalKomisi;

        return [
            'total_order' => $query->count(),
            'total_harga' => round($totalHarga, 2),
            'total_denda' => round($totalDenda, 2),
            'total_komisi' => round($totalKomisi, 2),
            'total_beban' => round($totalBeban, 2),
            'total_laba' => round($labaBersih, 2),
            'margin_rata_rata' => $totalHarga > 0 ? round(($labaBersih / $totalHarga) * 100, 1) : 0,
        ];
    }

    /**
     * Tabel 2 — data untuk pengambilan keputusan.
     * Ringkasan finansial + breakdown per kategori + top kendaraan
     * (terlaris & paling menguntungkan). Berbasis order completed.
     */
    public function dashboardDecision(array $filters = []): array
    {
        $start = $this->start;
        $end = $this->end;

        $query = Order::with(['customer', 'kendaraan.kategori'])
            ->whereBetween('created_at', [$start, $end]);

        if (! empty($filters['status_order'])) {
            $query->where('status_order', $filters['status_order']);
        }
        if (! empty($filters['source'])) {
            $query->where('source', $filters['source']);
        }
        if (! empty($filters['garasi_partner_id'])) {
            $query->whereHas('kendaraan', fn ($q) => $q->where('garasi_partner_id', $filters['garasi_partner_id']));
        }

        $orders = (clone $query)->where('status_order', 'completed')->get();

        $ringkasan = $this->detailOrderSummary($filters);

        $perKategori = [];
        $perKendaraan = [];

        foreach ($orders as $order) {
            $kendaraan = $order->kendaraan;
            if (! $kendaraan) {
                continue;
            }

            $beban = 0;
            if (! empty($kendaraan->harga_partner_per_hari)) {
                $beban = round((float) $kendaraan->harga_partner_per_hari * (int) $order->durasi_hari, 2);
            }
            $hargaTotal = (float) $order->harga_total;
            $komisi = (float) ($order->komisi_calo ?? 0);
            $laba = round($hargaTotal - $beban - $komisi, 2);

            $kategori = $kendaraan->kategori?->nama_kategori ?? 'Tanpa Kategori';
            $perKategori[$kategori] = $perKategori[$kategori] ?? [
                'nama_kategori' => $kategori,
                'jumlah_order' => 0,
                'total_harga' => 0,
                'total_beban' => 0,
                'total_komisi' => 0,
                'total_laba' => 0,
            ];
            $perKategori[$kategori]['jumlah_order']++;
            $perKategori[$kategori]['total_harga'] += $hargaTotal;
            $perKategori[$kategori]['total_beban'] += $beban;
            $perKategori[$kategori]['total_komisi'] += $komisi;
            $perKategori[$kategori]['total_laba'] += $laba;

            $nama = $kendaraan->nama_kendaraan ?? "#{$kendaraan->id}";
            $perKendaraan[$kendaraan->id] = $perKendaraan[$kendaraan->id] ?? [
                'id' => $kendaraan->id,
                'nama_kendaraan' => $nama,
                'plat_nomor' => $kendaraan->plat_nomor,
                'kategori' => $kategori,
                'jumlah_order' => 0,
                'total_harga' => 0,
                'total_laba' => 0,
            ];
            $perKendaraan[$kendaraan->id]['jumlah_order']++;
            $perKendaraan[$kendaraan->id]['total_harga'] += $hargaTotal;
            $perKendaraan[$kendaraan->id]['total_laba'] += $laba;
        }

        $kategoriRows = array_values($perKategori);
        usort($kategoriRows, fn ($a, $b) => $b['total_laba'] <=> $a['total_laba']);

        $kendaraanRows = array_values($perKendaraan);

        $terlaris = $kendaraanRows;
        usort($terlaris, fn ($a, $b) => $b['jumlah_order'] <=> $a['jumlah_order']);

        $menguntungkan = $kendaraanRows;
        usort($menguntungkan, fn ($a, $b) => $b['total_laba'] <=> $a['total_laba']);

        return [
            'ringkasan' => $ringkasan,
            'per_kategori' => $kategoriRows,
            'top_kendaraan_terlaris' => array_slice($terlaris, 0, 5),
            'top_kendaraan_menguntungkan' => array_slice($menguntungkan, 0, 5),
        ];
    }

    private function formatDetailOrderRow(Order $order): array
    {
        $kendaraan = $order->kendaraan;

        $bebanPartner = 0;
        if ($kendaraan && ! empty($kendaraan->harga_partner_per_hari)) {
            $bebanPartner = round((float) $kendaraan->harga_partner_per_hari * (int) $order->durasi_hari, 2);
        }

        $hargaTotal = (float) $order->harga_total;
        $komisi = (float) ($order->komisi_calo ?? 0);
        $laba = round($hargaTotal - $bebanPartner - $komisi, 2);
        $margin = $hargaTotal > 0 ? round(($laba / $hargaTotal) * 100, 1) : 0;

        $inspeksiPickup = $order->inspeksis->where('jenis', 'pickup')->sortByDesc('id')->first();
        $inspeksiReturn = $order->inspeksis->where('jenis', 'return')->sortByDesc('id')->first();

        $cid = $order->customer;
        $garasiOwn = $kendaraan?->garasiPartner;

        return [
            'order_id' => $order->id,
            'kode_order' => $order->kode_order,
            'source' => $order->source,
            'tanggal_order' => $order->created_at?->format('Y-m-d H:i'),
            'tanggal_mulai' => $order->tanggal_mulai?->format('Y-m-d'),
            'tanggal_selesai' => $order->tanggal_selesai?->format('Y-m-d'),
            'tanggal_pengembalian_aktual' => $order->tanggal_pengembalian_aktual?->format('Y-m-d H:i'),
            'jam_mulai' => $order->jam_mulai,
            'jam_selesai' => $order->jam_selesai,
            'durasi_hari' => $order->durasi_hari,
            'nama_customer' => $cid->nama_lengkap ?? '-',
            'no_hp' => $cid->no_hp ?? '-',
            'nama_admin' => $order->admin?->name,
            'nama_operator' => $order->operator?->name,
            'nama_supir' => $order->supir?->nama,
            'nama_calo' => $order->calo?->nama,
            'nama_kendaraan' => $kendaraan?->nama_kendaraan,
            'plat_nomor' => $kendaraan?->plat_nomor,
            'kategori' => $kendaraan?->kategori?->nama_kategori,
            'tipe' => $kendaraan ? $this->kendaraanTipeNama($kendaraan) : null,
            'garasi_pemilik' => $garasiOwn?->nama_garasi,
            'garasi_request' => $order->garasiRequests->filter(fn ($gr) => $gr->garasiPartner)->map(fn ($gr) => $gr->garasiPartner->nama_garasi)->unique()->values()->all(),
            'status_order' => $order->status_order,
            'status_pembayaran' => $order->status_pembayaran,
            'metode_pembayaran' => $order->metode_pembayaran,
            'status_pengiriman' => $order->status_pengiriman,
            'metode_penyerahan' => $order->metode_penyerahan,
            'opsi_supir' => $order->opsi_supir,
            'harga_per_hari' => (float) $order->harga_per_hari,
            'harga_total' => $hargaTotal,
            'jam_overtime' => $order->jam_overtime,
            'denda_overtime' => (float) $order->denda_overtime,
            'biaya_kerusakan' => $order->biaya_kerusakan !== null ? (float) $order->biaya_kerusakan : null,
            'komisi_calo' => $order->komisi_calo !== null ? (float) $order->komisi_calo : null,
            'beban_partner' => $bebanPartner,
            'laba' => $laba,
            'margin' => $margin,
            'alamat_jemput' => $order->alamat_jemput,
            'tujuan' => $order->tujuan,
            'catatan' => $order->catatan,
            'alasan_pembatalan' => $order->alasan_pembatalan,
            'inspeksi_pickup' => $this->formatInspeksiDetail($inspeksiPickup),
            'inspeksi_return' => $this->formatInspeksiDetail($inspeksiReturn),
            'jarak_tempuh' => $this->hitungJarak($inspeksiPickup, $inspeksiReturn),
        ];
    }

    /**
     * Mengambil nama tipe dari relasi Kendaraan -> Tipe.
     *
     * Kolom string legacy `tipe` pada tabel `kendaraans` bentrok dengan relasi
     * `tipe()`, sehingga `$kendaraan?->tipe` mengembalikan string (bukan model
     * Tipe) dan `?->nama_tipe` melempar "Attempt to read property on string".
     * Fungsi ini selalu membaca lewat relasi dan menormalkan nilainya.
     */
    private function kendaraanTipeNama(Kendaraan $kendaraan): ?string
    {
        if (! $kendaraan) {
            return null;
        }

        $tipe = $kendaraan->relationLoaded('tipe')
            ? $kendaraan->getRelation('tipe')
            : $kendaraan->tipe()->first();

        return $tipe instanceof Tipe ? $tipe->nama_tipe : null;
    }

    private function formatInspeksiDetail(?InspeksiKendaraan $inspeksi): ?array
    {
        if (! $inspeksi) {
            return null;
        }

        return [
            'id' => $inspeksi->id,
            'status' => $inspeksi->status,
            'odometer' => $inspeksi->odometer,
            'fuel_level' => $inspeksi->fuel_level,
            'kondisi_body' => $inspeksi->kondisi_body,
            'kondisi_interior' => $inspeksi->kondisi_interior,
            'kondisi_ban' => $inspeksi->kondisi_ban,
            'kondisi_ac' => $inspeksi->kondisi_ac,
            'kondisi_lampu' => $inspeksi->kondisi_lampu,
            'ada_damagenya' => (bool) $inspeksi->ada_damagenya,
            'deskripsi_kondisi' => $inspeksi->deskripsi_kondisi,
            'checklist_serah_terima' => $inspeksi->checklist_serah_terima,
            'biaya_kerusakan' => $inspeksi->biaya_kerusakan !== null ? (float) $inspeksi->biaya_kerusakan : null,
            'ttd_customer' => $inspeksi->ttd_customer,
            'ttd_petugas' => $inspeksi->ttd_petugas,
            'fotos' => $inspeksi->fotos,
            'videos' => $inspeksi->videos,
            'catatan' => $inspeksi->catatan,
            'inspeksi_oleh' => $inspeksi->inspeksi_oleh,
            'waktu' => $inspeksi->created_at?->format('Y-m-d H:i'),
        ];
    }

    private function hitungJarak(?InspeksiKendaraan $pickup, ?InspeksiKendaraan $return): ?int
    {
        if ($pickup && $return && $pickup->odometer !== null && $return->odometer !== null) {
            return max(0, (int) $return->odometer - (int) $pickup->odometer);
        }

        return null;
    }

    public function sectionsDetailOrder(array $filters = []): array
    {
        $data = $this->detailOrder($filters, 0);

        $rows = array_map(function ($r) {
            $pickup = $r['inspeksi_pickup'];
            $return = $r['inspeksi_return'];
            $relevan = ($r['beban_partner'] ?? 0) > 0 || ($r['komisi_calo'] ?? 0) > 0;

            return [
                $r['kode_order'], $r['source'], $r['tanggal_order'], $r['tanggal_mulai'], $r['tanggal_selesai'],
                $r['tanggal_pengembalian_aktual'] ?? '-', $r['nama_customer'], $r['no_hp'],
                $r['nama_kendaraan'], $r['kategori'] ?? '-', $r['tipe'] ?? '-', $r['garasi_pemilik'] ?? '-',
                $r['garasi_request'] ? implode(', ', $r['garasi_request']) : '-',
                $r['nama_supir'] ?? '-', $r['nama_calo'] ?? '-', $r['durasi_hari'],
                $r['status_order'], $r['status_pembayaran'], $r['metode_pembayaran'] ?? '-', $r['status_pengiriman'],
                $r['metode_penyerahan'], $r['opsi_supir'] ?? '-',
                number_format($r['harga_per_hari'], 0, ',', '.'), number_format($r['harga_total'], 0, ',', '.'),
                number_format($r['denda_overtime'], 0, ',', '.'), number_format($r['biaya_kerusakan'] ?? 0, 0, ',', '.'),
                number_format($r['komisi_calo'] ?? 0, 0, ',', '.'), number_format($r['beban_partner'], 0, ',', '.'),
                $relevan > 0 ? number_format($r['laba'], 0, ',', '.') : '-',
                $relevan > 0 ? $r['margin'].'%' : '-',
                $pickup['odometer'] ?? '-', $pickup['fuel_level'] ?? '-', $pickup['kondisi_body'] ?? '-',
                $pickup ? ($pickup['ttd_customer'] && $pickup['ttd_petugas'] ? 'Lengkap' : 'Belum') : '-',
                $return['odometer'] ?? '-', $return['fuel_level'] ?? '-', $return['kondisi_body'] ?? '-',
                $return ? ($return['ada_damagenya'] ? 'Ya' : 'Tidak') : '-',
                $return ? ($return['ttd_customer'] && $return['ttd_petugas'] ? 'Lengkap' : 'Belum') : '-',
                $r['jarak_tempuh'] ?? '-',
            ];
        }, $data['data']);

        return [['title' => 'Detail Order', 'headers' => [
            'Kode', 'Sumber', 'Tanggal Order', 'Mulai', 'Selesai', 'Kembali Aktual', 'Customer', 'No HP',
            'Kendaraan', 'Kategori', 'Tipe', 'Garasi Pemilik', 'Garasi Request', 'Supir', 'Calo', 'Durasi',
            'Status Order', 'Status Bayar', 'Metode Bayar', 'Status Kirim', 'Penyerahan', 'Opsi Supir',
            'Harga/Hari', 'Harga Total', 'Denda', 'Biaya Kerusakan', 'Komisi', 'Beban Partner', 'Laba', 'Margin',
            'Pickup ODO', 'Pickup Fuel', 'Pickup Kondisi', 'Pickup TTD',
            'Return ODO', 'Return Fuel', 'Return Kondisi', 'Return Kerusakan', 'Return TTD', 'Jarak Tempuh',
        ], 'rows' => $rows]];
    }
}
