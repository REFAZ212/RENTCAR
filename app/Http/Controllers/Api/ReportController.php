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
use PhpOffice\PhpSpreadsheet\Cell\Coordinate;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;
use PhpOffice\PhpSpreadsheet\Writer\Csv;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ReportController extends Controller
{
    private function parseDates(Request $request): array
    {
        $start = $request->start_date ? Carbon::parse($request->start_date)->startOfDay() : Carbon::now()->startOfMonth();
        $end = $request->end_date ? Carbon::parse($request->end_date)->endOfDay() : Carbon::now()->endOfMonth();

        if ($start->diffInDays($end) > 90) {
            abort(422, 'Range tanggal maksimal 90 hari.');
        }

        return [$start, $end];
    }

    public function ringkasan(Request $request): JsonResponse
    {
        $request->validate([
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
        ]);

        [$start, $end] = $this->parseDates($request);

        $orderQuery = Order::whereBetween('created_at', [$start, $end]);

        $totalOrder = (clone $orderQuery)->count();
        $orderSelesai = (clone $orderQuery)->where('status_order', 'completed')->count();
        $orderDibatalkan = (clone $orderQuery)->where('status_order', 'cancelled')->count();
        $orderPending = (clone $orderQuery)->where('status_order', 'pending')->count();
        $orderConfirmed = (clone $orderQuery)->where('status_order', 'confirmed')->count();
        $orderActive = (clone $orderQuery)->where('status_order', 'active')->count();

        $pendapatan = (clone $orderQuery)->where('status_pembayaran', 'paid')->sum('harga_total');
        $denda = (clone $orderQuery)->where('status_pembayaran', 'paid')->sum('denda_overtime');
        $totalPendapatanSemua = (clone $orderQuery)->sum('harga_total');
        $rataRataOrder = $totalOrder > 0 ? $totalPendapatanSemua / $totalOrder : 0;

        $totalKendaraan = Kendaraan::count();
        $kendaraanDisewa = Kendaraan::where('status', 'disewa')->count();
        $utilisasi = $totalKendaraan > 0 ? round($kendaraanDisewa / $totalKendaraan * 100, 1) : 0;

        $garasiPending = GarasiRequest::whereBetween('created_at', [$start, $end])->where('status_permintaan', 'pending')->count();
        $garasiDirespon = GarasiRequest::whereBetween('created_at', [$start, $end])->where('status_permintaan', '!=', 'pending')->count();

        return response()->json([
            'order' => [
                'total' => $totalOrder,
                'selesai' => $orderSelesai,
                'dibatalkan' => $orderDibatalkan,
                'pending' => $orderPending,
                'confirmed' => $orderConfirmed,
                'active' => $orderActive,
            ],
            'keuangan' => [
                'pendapatan' => $pendapatan,
                'denda' => $denda,
                'total_penerimaan' => $pendapatan,
                'rata_rata_order' => $rataRataOrder,
            ],
            'kendaraan' => [
                'total' => $totalKendaraan,
                'disewa' => $kendaraanDisewa,
                'utilisasi_persen' => $utilisasi,
            ],
            'pertumbuhan' => [
                'kendaraan_baru' => Kendaraan::whereBetween('created_at', [$start, $end])->count(),
                'customer_baru' => Customer::whereBetween('created_at', [$start, $end])->count(),
                'permintaan_garasi' => GarasiRequest::whereBetween('created_at', [$start, $end])->count(),
            ],
            'garasi' => [
                'pending' => $garasiPending,
                'direspon' => $garasiDirespon,
            ],
            'periode' => [
                'start_date' => $start->toDateString(),
                'end_date' => $end->toDateString(),
            ],
        ]);
    }

    public function pendapatan(Request $request): JsonResponse
    {
        $request->validate([
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'group' => 'nullable|in:harian,bulanan,tahunan',
        ]);

        [$start, $end] = $this->parseDates($request);
        $group = $request->group ?? 'bulanan';

        $query = Order::whereBetween('created_at', [$start, $end])
            ->where('status_pembayaran', 'paid');

        $totalPendapatan = (clone $query)->sum('harga_total');
        $totalDenda = (clone $query)->sum('denda_overtime');
        $totalOrder = (clone $query)->count();
        $totalCustomer = (clone $query)->distinct('customer_id')->count('customer_id');
        $rataRata = $totalOrder > 0 ? $totalPendapatan / $totalOrder : 0;

        $groupBy = match ($group) {
            'harian' => 'DATE(created_at)',
            'bulanan' => "DATE_FORMAT(created_at, '%Y-%m')",
            'tahunan' => "DATE_FORMAT(created_at, '%Y')",
        };

        $pendapatanPeriode = Order::selectRaw("
                {$groupBy} as periode,
                COUNT(*) as total_order,
                SUM(harga_total) as total_pendapatan,
                SUM(denda_overtime) as total_denda,
                ROUND(AVG(harga_total), 2) as rata_rata
            ")
            ->whereBetween('created_at', [$start, $end])
            ->where('status_pembayaran', 'paid')
            ->groupBy('periode')
            ->orderBy('periode')
            ->get();

        $metodePembayaran = Order::selectRaw('
                metode_pembayaran,
                COUNT(*) as total_order,
                SUM(harga_total) as total_pendapatan,
                ROUND(AVG(harga_total), 2) as rata_rata
            ')
            ->whereBetween('created_at', [$start, $end])
            ->where('status_pembayaran', 'paid')
            ->groupBy('metode_pembayaran')
            ->get();

        $pendapatanKategori = Order::selectRaw('
                kn.nama_kategori,
                COUNT(*) as total_order,
                SUM(orders.harga_total) as total_pendapatan,
                ROUND(AVG(orders.harga_total), 2) as rata_rata
            ')
            ->join('kendaraans as k', 'k.id', '=', 'orders.kendaraan_id')
            ->join('kategoris as kn', 'kn.id', '=', 'k.kategori_id')
            ->whereBetween('orders.created_at', [$start, $end])
            ->where('orders.status_pembayaran', 'paid')
            ->groupBy('kn.nama_kategori')
            ->orderByDesc('total_pendapatan')
            ->get();

        return response()->json([
            'ringkasan' => [
                'total_pendapatan' => $totalPendapatan,
                'total_denda' => $totalDenda,
                'total_order' => $totalOrder,
                'total_customer' => $totalCustomer,
                'rata_rata_order' => $rataRata,
                'start_date' => $start->toDateString(),
                'end_date' => $end->toDateString(),
            ],
            'pendapatan_periode' => $pendapatanPeriode,
            'metode_pembayaran' => $metodePembayaran,
            'pendapatan_kategori' => $pendapatanKategori,
        ]);
    }

    public function kendaraan(Request $request): JsonResponse
    {
        $request->validate([
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
        ]);

        [$start, $end] = $this->parseDates($request);

        $kendaraanTerpopuler = Kendaraan::with(['kategori', 'tipe'])
            ->withCount(['orders' => function ($q) use ($start, $end) {
                $q->whereBetween('created_at', [$start, $end]);
            }])
            ->withSum(['orders' => function ($q) use ($start, $end) {
                $q->where('status_pembayaran', 'paid')->whereBetween('created_at', [$start, $end]);
            }], 'harga_total')
            ->withAvg(['orders' => function ($q) use ($start, $end) {
                $q->where('status_pembayaran', 'paid')->whereBetween('created_at', [$start, $end]);
            }], 'durasi_hari')
            ->having('orders_count', '>', 0)
            ->orderBy('orders_count', 'desc')
            ->limit(20)
            ->get();

        $statusKendaraan = Kendaraan::selectRaw('status, COUNT(*) as total')->groupBy('status')->get();

        $kategoriStats = Kendaraan::selectRaw('
                kn.nama_kategori,
                COUNT(*) as total_kendaraan,
                SUM(CASE WHEN k.status = "disewa" THEN 1 ELSE 0 END) as disewa,
                SUM(CASE WHEN k.status = "tersedia" THEN 1 ELSE 0 END) as tersedia
            ')
            ->join('kategoris as kn', 'kn.id', '=', 'kendaraans.kategori_id')
            ->groupBy('kn.nama_kategori')
            ->get();

        return response()->json([
            'kendaraan_terpopuler' => $kendaraanTerpopuler,
            'status_kendaraan' => $statusKendaraan,
            'kategori_stats' => $kategoriStats,
            'start_date' => $start->toDateString(),
            'end_date' => $end->toDateString(),
        ]);
    }

    public function customer(Request $request): JsonResponse
    {
        $request->validate([
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
        ]);

        [$start, $end] = $this->parseDates($request);

        $customerTop = Customer::withCount(['orders' => function ($q) use ($start, $end) {
            $q->whereBetween('created_at', [$start, $end]);
        }])
            ->withSum(['orders' => function ($q) use ($start, $end) {
                $q->where('status_pembayaran', 'paid')->whereBetween('created_at', [$start, $end]);
            }], 'harga_total')
            ->withAvg(['orders' => function ($q) use ($start, $end) {
                $q->where('status_pembayaran', 'paid')->whereBetween('created_at', [$start, $end]);
            }], 'durasi_hari')
            ->having('orders_count', '>', 0)
            ->orderBy('orders_count', 'desc')
            ->limit(20)
            ->get();

        $totalCustomer = Customer::count();
        $customerBaru = Customer::whereBetween('created_at', [$start, $end])->count();
        $customerAktif = Order::whereBetween('created_at', [$start, $end])
            ->distinct('customer_id')
            ->count('customer_id');

        $totalDenganLebihSatuOrder = Customer::has('orders', '>', 1)->count();

        return response()->json([
            'customer_top' => $customerTop,
            'ringkasan' => [
                'total_customer' => $totalCustomer,
                'customer_baru' => $customerBaru,
                'customer_aktif' => $customerAktif,
                'customer_repeat' => $totalDenganLebihSatuOrder,
                'start_date' => $start->toDateString(),
                'end_date' => $end->toDateString(),
            ],
        ]);
    }

    public function order(Request $request): JsonResponse
    {
        $request->validate([
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
        ]);

        [$start, $end] = $this->parseDates($request);

        $query = Order::whereBetween('created_at', [$start, $end]);

        $totalOrder = (clone $query)->count();

        $statusOrder = (clone $query)
            ->selectRaw('status_order, COUNT(*) as total')
            ->groupBy('status_order')
            ->get();

        $statusPembayaran = (clone $query)
            ->selectRaw('status_pembayaran, COUNT(*) as total')
            ->groupBy('status_pembayaran')
            ->get();

        $statusPengiriman = (clone $query)
            ->selectRaw('status_pengiriman, COUNT(*) as total')
            ->groupBy('status_pengiriman')
            ->get();

        $orderTerbaru = (clone $query)
            ->with(['customer', 'kendaraan.kategori', 'kendaraan.tipe', 'admin'])
            ->latest()
            ->limit(100)
            ->get();

        return response()->json([
            'total_order' => $totalOrder,
            'status_order' => $statusOrder,
            'status_pembayaran' => $statusPembayaran,
            'status_pengiriman' => $statusPengiriman,
            'order_terbaru' => $orderTerbaru,
            'start_date' => $start->toDateString(),
            'end_date' => $end->toDateString(),
        ]);
    }

    public function bagiHasil(Request $request): JsonResponse
    {
        $request->validate([
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
        ]);

        [$start, $end] = $this->parseDates($request);

        $partners = GarasiPartner::where('is_own', false)->get();

        $results = $partners->map(function ($partner) use ($start, $end) {
            $orderQuery = Order::whereBetween('orders.created_at', [$start, $end])
                ->where('status_pembayaran', 'paid')
                ->whereHas('garasiRequests', function ($q) use ($partner) {
                    $q->where('garasi_partner_id', $partner->id);
                });

            $totalPendapatan = (clone $orderQuery)->sum('harga_total');
            $totalDenda = (clone $orderQuery)->sum('denda_overtime');
            $totalOrder = (clone $orderQuery)->count();
            $persentase = $partner->persentase_bagi_hasil ?? 0;
            $bagiHasil = round(($totalPendapatan + $totalDenda) * $persentase / 100, 2);

            return [
                'partner_id' => $partner->id,
                'nama_garasi' => $partner->nama_garasi,
                'nama_pemilik' => $partner->nama_pemilik ?? '-',
                'persentase' => $persentase,
                'total_order' => $totalOrder,
                'total_pendapatan' => $totalPendapatan,
                'total_denda' => $totalDenda,
                'total_bagi_hasil' => $bagiHasil,
            ];
        });

        $grandTotalBagiHasil = $results->sum('total_bagi_hasil');
        $grandTotalPendapatan = $results->sum('total_pendapatan');

        return response()->json([
            'data' => $results->values(),
            'ringkasan' => [
                'grand_total_pendapatan' => $grandTotalPendapatan,
                'grand_total_bagi_hasil' => $grandTotalBagiHasil,
                'jumlah_partner' => $partners->count(),
            ],
            'periode' => [
                'start_date' => $start->toDateString(),
                'end_date' => $end->toDateString(),
            ],
        ]);
    }

    public function komisiCalo(Request $request): JsonResponse
    {
        $request->validate([
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
        ]);

        [$start, $end] = $this->parseDates($request);

        $calos = SupirCalo::where('jenis', 'calo')->get();

        $results = $calos->map(function ($calo) use ($start, $end) {
            $orderQuery = Order::whereBetween('orders.created_at', [$start, $end])
                ->where('calo_id', $calo->id)
                ->where('status_pembayaran', 'paid');

            $totalPendapatan = (clone $orderQuery)->sum('harga_total');
            $totalKomisi = (clone $orderQuery)->sum('komisi_calo');
            $totalOrder = (clone $orderQuery)->count();

            return [
                'calo_id' => $calo->id,
                'nama' => $calo->nama,
                'no_hp' => $calo->no_hp ?? '-',
                'total_order' => $totalOrder,
                'total_pendapatan' => $totalPendapatan,
                'total_komisi' => $totalKomisi,
            ];
        });

        $grandTotalKomisi = $results->sum('total_komisi');
        $grandTotalPendapatan = $results->sum('total_pendapatan');

        return response()->json([
            'data' => $results->values(),
            'ringkasan' => [
                'grand_total_pendapatan' => $grandTotalPendapatan,
                'grand_total_komisi' => $grandTotalKomisi,
                'jumlah_calo' => $calos->count(),
            ],
            'periode' => [
                'start_date' => $start->toDateString(),
                'end_date' => $end->toDateString(),
            ],
        ]);
    }

    /**
     * Export laporan sebagai CSV atau XLSX.
     */
    public function export(Request $request, string $tab, string $format): StreamedResponse
    {
        if (! in_array($format, ['csv', 'xlsx'], true)) {
            abort(422, 'Format export tidak dikenali. Gunakan csv atau xlsx.');
        }

        $request->validate([
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
        ]);

        [$start, $end] = $this->parseDates($request);

        $filename = sprintf('laporan-%s-%s-%s', $tab, $start->toDateString(), $end->toDateString());

        if ($tab === 'all') {
            $sheets = [
                'Ringkasan' => $this->sectionsRingkasan($start, $end),
                'Pendapatan' => $this->sectionsPendapatan($start, $end),
                'Kendaraan' => $this->sectionsKendaraan($start, $end),
                'Customer' => $this->sectionsCustomer($start, $end),
                'Order' => $this->sectionsOrder($start, $end),
                'Bagi Hasil' => $this->sectionsBagiHasil($start, $end),
                'Komisi Calo' => $this->sectionsKomisiCalo($start, $end),
            ];
            $spreadsheet = $this->buildMultiSheetSpreadsheet($sheets);
        } else {
            $sections = match ($tab) {
                'ringkasan' => $this->sectionsRingkasan($start, $end),
                'pendapatan' => $this->sectionsPendapatan($start, $end),
                'kendaraan' => $this->sectionsKendaraan($start, $end),
                'customer' => $this->sectionsCustomer($start, $end),
                'order' => $this->sectionsOrder($start, $end),
                'bagi-hasil' => $this->sectionsBagiHasil($start, $end),
                'komisi-calo' => $this->sectionsKomisiCalo($start, $end),
                default => abort(422, 'Tab laporan tidak dikenali'),
            };
            $spreadsheet = $this->buildSpreadsheet($sections);
        }

        return $this->streamSpreadsheet($spreadsheet, $filename, $format);
    }

    // ── Export Sections ──────────────────────────────────────────────

    private function sectionsRingkasan(Carbon $start, Carbon $end): array
    {
        $orderQuery = Order::whereBetween('created_at', [$start, $end]);
        $totalOrder = (clone $orderQuery)->count();
        $orderSelesai = (clone $orderQuery)->where('status_order', 'completed')->count();
        $orderDibatalkan = (clone $orderQuery)->where('status_order', 'cancelled')->count();
        $orderPending = (clone $orderQuery)->where('status_order', 'pending')->count();
        $orderConfirmed = (clone $orderQuery)->where('status_order', 'confirmed')->count();
        $orderActive = (clone $orderQuery)->where('status_order', 'active')->count();
        $pendapatan = (clone $orderQuery)->where('status_pembayaran', 'paid')->sum('harga_total');
        $denda = (clone $orderQuery)->where('status_pembayaran', 'paid')->sum('denda_overtime');
        $totalAll = (clone $orderQuery)->sum('harga_total');
        $rataRata = $totalOrder > 0 ? $totalAll / $totalOrder : 0;

        $totalKendaraan = Kendaraan::count();
        $kendaraanDisewa = Kendaraan::where('status', 'disewa')->count();

        return [
            [
                'title' => "Ringkasan Laporan ({$start->toDateString()} s/d {$end->toDateString()})",
                'headers' => ['Kategori', 'Detail', 'Nilai'],
                'rows' => [
                    ['Order', 'Total Order', $totalOrder],
                    ['Order', 'Pending', $orderPending],
                    ['Order', 'Dikonfirmasi', $orderConfirmed],
                    ['Order', 'Aktif / Disewa', $orderActive],
                    ['Order', 'Selesai', $orderSelesai],
                    ['Order', 'Dibatalkan', $orderDibatalkan],
                    ['Keuangan', 'Pendapatan (Lunas)', $pendapatan],
                    ['Keuangan', 'Denda Overtime', $denda],
                    ['Keuangan', 'Total Semua Order', $totalAll],
                    ['Keuangan', 'Rata-rata per Order', round($rataRata, 2)],
                    ['Kendaraan', 'Total Kendaraan', $totalKendaraan],
                    ['Kendaraan', 'Sedang Disewa', $kendaraanDisewa],
                    ['Kendaraan', 'Utilisasi (%)', $totalKendaraan > 0 ? round($kendaraanDisewa / $totalKendaraan * 100, 1).'%' : '0%'],
                    ['Pertumbuhan', 'Customer Baru', Customer::whereBetween('created_at', [$start, $end])->count()],
                    ['Pertumbuhan', 'Kendaraan Baru', Kendaraan::whereBetween('created_at', [$start, $end])->count()],
                    ['Garasi', 'Total Permintaan', GarasiRequest::whereBetween('created_at', [$start, $end])->count()],
                ],
            ],
        ];
    }

    private function sectionsPendapatan(Carbon $start, Carbon $end): array
    {
        $pendapatanPeriode = Order::selectRaw("
                DATE_FORMAT(created_at, '%Y-%m') as periode,
                COUNT(*) as total_order,
                SUM(harga_total) as total_pendapatan,
                SUM(denda_overtime) as total_denda,
                ROUND(AVG(harga_total), 2) as rata_rata
            ")
            ->whereBetween('created_at', [$start, $end])
            ->where('status_pembayaran', 'paid')
            ->groupBy('periode')
            ->orderBy('periode')
            ->get();

        $metodePembayaran = Order::selectRaw('
                metode_pembayaran,
                COUNT(*) as total_order,
                SUM(harga_total) as total_pendapatan,
                ROUND(AVG(harga_total), 2) as rata_rata
            ')
            ->whereBetween('created_at', [$start, $end])
            ->where('status_pembayaran', 'paid')
            ->groupBy('metode_pembayaran')
            ->get();

        $pendapatanKategori = Order::selectRaw('
                kn.nama_kategori,
                COUNT(*) as total_order,
                SUM(orders.harga_total) as total_pendapatan,
                SUM(orders.denda_overtime) as total_denda,
                ROUND(AVG(orders.harga_total), 2) as rata_rata
            ')
            ->join('kendaraans as k', 'k.id', '=', 'orders.kendaraan_id')
            ->join('kategoris as kn', 'kn.id', '=', 'k.kategori_id')
            ->whereBetween('orders.created_at', [$start, $end])
            ->where('orders.status_pembayaran', 'paid')
            ->groupBy('kn.nama_kategori')
            ->orderByDesc('total_pendapatan')
            ->get();

        return [
            [
                'title' => 'Pendapatan Per Periode',
                'headers' => ['Periode', 'Total Order', 'Total Pendapatan', 'Total Denda', 'Rata-rata/Order'],
                'rows' => $pendapatanPeriode->map(fn ($r) => [
                    $r->periode, $r->total_order, $r->total_pendapatan, $r->total_denda, $r->rata_rata,
                ])->toArray(),
            ],
            [
                'title' => 'Pendapatan Per Metode Pembayaran',
                'headers' => ['Metode', 'Total Order', 'Total Pendapatan', 'Rata-rata/Order'],
                'rows' => $metodePembayaran->map(fn ($r) => [
                    $r->metode_pembayaran, $r->total_order, $r->total_pendapatan, $r->rata_rata,
                ])->toArray(),
            ],
            [
                'title' => 'Pendapatan Per Kategori Kendaraan',
                'headers' => ['Kategori', 'Total Order', 'Total Pendapatan', 'Total Denda', 'Rata-rata/Order'],
                'rows' => $pendapatanKategori->map(fn ($r) => [
                    $r->nama_kategori, $r->total_order, $r->total_pendapatan, $r->total_denda, $r->rata_rata,
                ])->toArray(),
            ],
        ];
    }

    private function sectionsKendaraan(Carbon $start, Carbon $end): array
    {
        $kendaraanTerpopuler = Kendaraan::with(['kategori', 'tipe'])
            ->withCount(['orders' => function ($q) use ($start, $end) {
                $q->whereBetween('created_at', [$start, $end]);
            }])
            ->withSum(['orders' => function ($q) use ($start, $end) {
                $q->where('status_pembayaran', 'paid')->whereBetween('created_at', [$start, $end]);
            }], 'harga_total')
            ->withAvg(['orders' => function ($q) use ($start, $end) {
                $q->where('status_pembayaran', 'paid')->whereBetween('created_at', [$start, $end]);
            }], 'durasi_hari')
            ->having('orders_count', '>', 0)
            ->orderBy('orders_count', 'desc')
            ->get();

        $statusKendaraan = Kendaraan::selectRaw('status, COUNT(*) as total')->groupBy('status')->get();

        $kategoriStats = Kendaraan::selectRaw('
                kn.nama_kategori,
                COUNT(*) as total_kendaraan,
                SUM(CASE WHEN k.status = "disewa" THEN 1 ELSE 0 END) as disewa,
                SUM(CASE WHEN k.status = "tersedia" THEN 1 ELSE 0 END) as tersedia
            ')
            ->join('kategoris as kn', 'kn.id', '=', 'kendaraans.kategori_id')
            ->groupBy('kn.nama_kategori')
            ->get();

        return [
            [
                'title' => 'Status Kendaraan',
                'headers' => ['Status', 'Total'],
                'rows' => $statusKendaraan->map(fn ($r) => [$r->status, $r->total])->toArray(),
            ],
            [
                'title' => 'Statistik Per Kategori',
                'headers' => ['Kategori', 'Total', 'Disewa', 'Tersedia'],
                'rows' => $kategoriStats->map(fn ($r) => [
                    $r->nama_kategori, $r->total_kendaraan, $r->disewa, $r->tersedia,
                ])->toArray(),
            ],
            [
                'title' => 'Kendaraan Terpopuler',
                'headers' => ['Nama', 'Plat', 'Kategori', 'Tipe', 'Merek/Model', 'Tahun', 'Harga/Hari', 'Status', 'Total Order', 'Total Pendapatan', 'Avg Durasi (hari)'],
                'rows' => $kendaraanTerpopuler->map(fn ($k) => [
                    $k->nama_kendaraan,
                    $k->plat_nomor,
                    $k->kategori?->nama_kategori ?? '-',
                    $k->tipe?->nama_tipe ?? '-',
                    $k->merek.' '.$k->model,
                    $k->tahun,
                    $k->harga_sewa_per_hari,
                    $k->status,
                    $k->orders_count,
                    $k->orders_sum_harga_total ?? 0,
                    round($k->orders_avg_durasi_hari ?? 0, 1),
                ])->toArray(),
            ],
        ];
    }

    private function sectionsCustomer(Carbon $start, Carbon $end): array
    {
        $customerTop = Customer::withCount(['orders' => function ($q) use ($start, $end) {
            $q->whereBetween('created_at', [$start, $end]);
        }])
            ->withSum(['orders' => function ($q) use ($start, $end) {
                $q->where('status_pembayaran', 'paid')->whereBetween('created_at', [$start, $end]);
            }], 'harga_total')
            ->withAvg(['orders' => function ($q) use ($start, $end) {
                $q->where('status_pembayaran', 'paid')->whereBetween('created_at', [$start, $end]);
            }], 'durasi_hari')
            ->having('orders_count', '>', 0)
            ->orderBy('orders_count', 'desc')
            ->get();

        $totalCustomer = Customer::count();
        $customerBaru = Customer::whereBetween('created_at', [$start, $end])->count();
        $customerAktif = Order::whereBetween('created_at', [$start, $end])->distinct('customer_id')->count('customer_id');
        $customerRepeat = Customer::has('orders', '>', 1)->count();

        return [
            [
                'title' => 'Ringkasan Customer',
                'headers' => ['Metrik', 'Nilai'],
                'rows' => [
                    ['Total Customer', $totalCustomer],
                    ['Customer Baru', $customerBaru],
                    ['Customer Aktif (periode ini)', $customerAktif],
                    ['Customer Repeat (lebih dari 1 order)', $customerRepeat],
                ],
            ],
            [
                'title' => 'Daftar Customer',
                'headers' => ['Nama', 'No. HP', 'Email', 'Alamat', 'Total Order', 'Total Pengeluaran', 'Avg Durasi (hari)'],
                'rows' => $customerTop->map(fn ($c) => [
                    $c->nama_lengkap,
                    $c->no_hp,
                    $c->email ?? '-',
                    $c->alamat ?? '-',
                    $c->orders_count,
                    $c->orders_sum_harga_total ?? 0,
                    round($c->orders_avg_durasi_hari ?? 0, 1),
                ])->toArray(),
            ],
        ];
    }

    private function sectionsOrder(Carbon $start, Carbon $end): array
    {
        $orders = Order::whereBetween('created_at', [$start, $end])
            ->with(['customer', 'kendaraan.kategori', 'kendaraan.tipe', 'admin'])
            ->latest()
            ->limit(500)
            ->get();

        $totalOrder = $orders->count();
        $totalPendapatan = $orders->where('status_pembayaran', 'paid')->sum('harga_total');
        $totalDenda = $orders->where('status_pembayaran', 'paid')->sum('denda_overtime');

        return [
            [
                'title' => 'Ringkasan Order',
                'headers' => ['Metrik', 'Nilai'],
                'rows' => [
                    ['Total Order', $totalOrder],
                    ['Total Pendapatan (Lunas)', $totalPendapatan],
                    ['Total Denda', $totalDenda],
                ],
            ],
            [
                'title' => 'Daftar Order Lengkap',
                'headers' => [
                    'Kode Order', 'Tanggal Order', 'Customer', 'No. HP',
                    'Kendaraan', 'Plat', 'Kategori', 'Tipe',
                    'Tanggal Mulai', 'Tanggal Selesai', 'Durasi (hari)', 'Harga/Hari', 'Harga Total',
                    'Denda', 'Status Order', 'Status Bayar', 'Metode Bayar', 'Status Pengiriman',
                    'Admin',
                ],
                'rows' => $orders->map(fn ($o) => [
                    $o->kode_order,
                    $o->created_at->toDateTimeString(),
                    $o->customer?->nama_lengkap ?? '-',
                    $o->customer?->no_hp ?? '-',
                    $o->kendaraan?->nama_kendaraan ?? '-',
                    $o->kendaraan?->plat_nomor ?? '-',
                    $o->kendaraan?->kategori?->nama_kategori ?? '-',
                    $o->kendaraan?->tipe?->nama_tipe ?? '-',
                    $o->tanggal_mulai?->toDateString() ?? '-',
                    $o->tanggal_selesai?->toDateString() ?? '-',
                    $o->durasi_hari,
                    $o->harga_per_hari,
                    $o->harga_total,
                    $o->denda_overtime,
                    $o->status_order,
                    $o->status_pembayaran,
                    $o->metode_pembayaran ?? '-',
                    $o->status_pengiriman,
                    $o->admin?->name ?? '-',
                ])->toArray(),
            ],
        ];
    }

    private function sectionsBagiHasil(Carbon $start, Carbon $end): array
    {
        $partners = GarasiPartner::where('is_own', false)->get();

        $rows = $partners->map(function ($partner) use ($start, $end) {
            $orderQuery = Order::whereBetween('orders.created_at', [$start, $end])
                ->where('status_pembayaran', 'paid')
                ->whereHas('garasiRequests', function ($q) use ($partner) {
                    $q->where('garasi_partner_id', $partner->id);
                });

            $totalPendapatan = (clone $orderQuery)->sum('harga_total');
            $totalDenda = (clone $orderQuery)->sum('denda_overtime');
            $totalOrder = (clone $orderQuery)->count();
            $persentase = $partner->persentase_bagi_hasil ?? 0;
            $bagiHasil = round(($totalPendapatan + $totalDenda) * $persentase / 100, 2);

            return [
                $partner->nama_garasi,
                $partner->nama_pemilik ?? '-',
                $persentase.'%',
                $totalOrder,
                $totalPendapatan,
                $totalDenda,
                $bagiHasil,
            ];
        })->toArray();

        $grandTotalBagiHasil = collect($rows)->sum(6);
        $grandTotalPendapatan = collect($rows)->sum(4);

        return [
            [
                'title' => "Laporan Bagi Hasil Partner ({$start->toDateString()} s/d {$end->toDateString()})",
                'headers' => ['Nama Garasi', 'Pemilik', 'Persentase', 'Total Order', 'Total Pendapatan', 'Total Denda', 'Bagi Hasil'],
                'rows' => $rows,
            ],
            [
                'title' => 'Ringkasan',
                'headers' => ['Metrik', 'Nilai'],
                'rows' => [
                    ['Total Pendapatan', $grandTotalPendapatan],
                    ['Total Bagi Hasil', $grandTotalBagiHasil],
                    ['Jumlah Partner', $partners->count()],
                ],
            ],
        ];
    }

    private function sectionsKomisiCalo(Carbon $start, Carbon $end): array
    {
        $calos = SupirCalo::where('jenis', 'calo')->get();

        $rows = $calos->map(function ($calo) use ($start, $end) {
            $orderQuery = Order::whereBetween('orders.created_at', [$start, $end])
                ->where('calo_id', $calo->id)
                ->where('status_pembayaran', 'paid');

            $totalPendapatan = (clone $orderQuery)->sum('harga_total');
            $totalKomisi = (clone $orderQuery)->sum('komisi_calo');
            $totalOrder = (clone $orderQuery)->count();

            return [
                $calo->nama,
                $calo->no_hp ?? '-',
                $totalOrder,
                $totalPendapatan,
                $totalKomisi,
            ];
        })->toArray();

        $grandTotalKomisi = collect($rows)->sum(4);
        $grandTotalPendapatan = collect($rows)->sum(3);

        return [
            [
                'title' => "Laporan Komisi Calo ({$start->toDateString()} s/d {$end->toDateString()})",
                'headers' => ['Nama Calo', 'No. HP', 'Total Order', 'Total Pendapatan', 'Total Komisi'],
                'rows' => $rows,
            ],
            [
                'title' => 'Ringkasan',
                'headers' => ['Metrik', 'Nilai'],
                'rows' => [
                    ['Total Pendapatan', $grandTotalPendapatan],
                    ['Total Komisi', $grandTotalKomisi],
                    ['Jumlah Calo', $calos->count()],
                ],
            ],
        ];
    }

    // ── Spreadsheet Builders ─────────────────────────────────────────

    private function buildSpreadsheet(array $sections): Spreadsheet
    {
        $spreadsheet = new Spreadsheet;
        $sheet = $spreadsheet->getActiveSheet();
        $this->writeSectionsToSheet($sheet, $sections);

        return $spreadsheet;
    }

    private function buildMultiSheetSpreadsheet(array $sheets): Spreadsheet
    {
        $spreadsheet = new Spreadsheet;
        $spreadsheet->removeSheetByIndex(0);

        foreach ($sheets as $sheetName => $sections) {
            $sheet = $spreadsheet->createSheet();
            $sheet->setTitle(mb_substr($sheetName, 0, 31));
            $this->writeSectionsToSheet($sheet, $sections);
        }

        return $spreadsheet;
    }

    private function writeSectionsToSheet(Worksheet $sheet, array $sections): void
    {
        $rowIndex = 1;
        $lastColumn = 'A';

        foreach ($sections as $section) {
            if (! empty($section['title'])) {
                $sheet->setCellValue("A{$rowIndex}", $section['title']);
                $sheet->getStyle("A{$rowIndex}")->getFont()->setBold(true)->setSize(13);
                $rowIndex++;
            }

            $sheet->fromArray($section['headers'], null, "A{$rowIndex}");
            $headerColumnCount = count($section['headers']);
            $headerLastColumn = Coordinate::stringFromColumnIndex($headerColumnCount);
            $lastColumn = max($lastColumn, $headerLastColumn);

            $headerRange = "A{$rowIndex}:{$headerLastColumn}{$rowIndex}";
            $sheet->getStyle($headerRange)->getFont()->setBold(true)->getColor()->setRGB('FFFFFF');
            $sheet->getStyle($headerRange)->getFill()
                ->setFillType(Fill::FILL_SOLID)
                ->getStartColor()->setRGB('2563EB');
            $sheet->getStyle($headerRange)->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
            $rowIndex++;

            if (empty($section['rows'])) {
                $sheet->setCellValue("A{$rowIndex}", 'Belum ada data');
                $rowIndex++;
            } else {
                foreach ($section['rows'] as $row) {
                    $sheet->fromArray($row, null, "A{$rowIndex}");
                    $rowIndex++;
                }
            }

            $rowIndex++;
        }

        foreach (range('A', $lastColumn) as $col) {
            $sheet->getColumnDimension($col)->setAutoSize(true);
        }
    }

    private function streamSpreadsheet(Spreadsheet $spreadsheet, string $filename, string $format): StreamedResponse
    {
        if ($format === 'csv') {
            $writer = new Csv($spreadsheet);
            $extension = 'csv';
            $contentType = 'text/csv';
        } else {
            $writer = new Xlsx($spreadsheet);
            $extension = 'xlsx';
            $contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        }

        return response()->streamDownload(function () use ($writer) {
            $writer->save('php://output');
        }, "{$filename}.{$extension}", [
            'Content-Type' => $contentType,
            'Content-Disposition' => "attachment; filename=\"{$filename}.{$extension}\"",
        ]);
    }
}
