<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Kategori;
use App\Models\Kendaraan;
use App\Models\Order;
use App\Models\Tipe;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class KatalogPublicController extends Controller
{
    /**
     * Field pribadi partner yang tidak boleh tampil di respons publik
     * (katalog, detail kendaraan, konfirmasi pemesanan).
     */
    private const PARTNER_PUBLIC_HIDDEN = [
        'nama_pemilik',
        'alamat',
        'no_hp',
        'email',
        'status_aktif',
        'is_own',
        'metode_bagi_hasil',
        'persentase_bagi_hasil',
        'catatan',
    ];

    public function index(Request $request): JsonResponse
    {
        $query = Kendaraan::query()
            ->with(['garasiPartner', 'kategori', 'tipe'])
            ->withCount('activeOrders')
            // Kendaraan yang sengaja ditandai tidak tersedia atau sedang servis tidak muncul di katalog publik.
            ->whereNotIn('status', ['tidak_tersedia', 'maintenance']);

        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                whereLikeEscaped($q, 'nama_kendaraan', $search);
                $q->orWhereRaw("merek LIKE ? ESCAPE '#'", ['%'.escapeLike($search).'%']);
                $q->orWhereHas('kategori', fn ($q2) => $q2->whereRaw("nama_kategori LIKE ? ESCAPE '#'", ['%'.escapeLike($search).'%']));
                $q->orWhereHas('tipe', fn ($q2) => $q2->whereRaw("nama_tipe LIKE ? ESCAPE '#'", ['%'.escapeLike($search).'%']));
            });
        }

        if ($request->filled('kategori_slug')) {
            $query->whereHas('kategori', function ($q) use ($request) {
                $q->where('slug', $request->input('kategori_slug'))->where('aktif', true);
            });
        }

        if ($request->filled('tipe_slug')) {
            $query->whereHas('tipe', function ($q) use ($request) {
                $q->where('slug', $request->input('tipe_slug'))->where('aktif', true);
            });
        }

        if ($request->filled('harga_min')) {
            $query->where('harga_sewa_per_hari', '>=', (int) $request->input('harga_min'));
        }

        if ($request->filled('harga_max')) {
            $query->where('harga_sewa_per_hari', '<=', (int) $request->input('harga_max'));
        }

        $sortBy = $request->input('sort', 'terbaru');
        match ($sortBy) {
            'harga_asc' => $query->orderBy('harga_sewa_per_hari', 'asc'),
            'harga_desc' => $query->orderBy('harga_sewa_per_hari', 'desc'),
            'nama' => $query->orderBy('nama_kendaraan', 'asc'),
            default => $query->orderBy('created_at', 'desc'),
        };

        $perPage = min((int) $request->input('per_page', 12), 48);
        $kendaraan = $query->paginate($perPage);

        $items = $kendaraan->items();

        // Add estimated return date for rented vehicles
        foreach ($items as $k) {
            if ($k->status === 'disewa') {
                $activeOrder = $k->activeOrders()->latest('tanggal_selesai')->first();
                $k->rented_from = $activeOrder?->tanggal_mulai?->format('Y-m-d');
                $k->rented_until = $activeOrder?->tanggal_selesai?->format('Y-m-d');
                $k->rented_from_time = $activeOrder?->jam_mulai;
                $k->rented_until_time = $activeOrder?->jam_selesai;
                $k->estimated_return_date = $activeOrder?->tanggal_selesai?->format('Y-m-d');
            } else {
                $k->rented_from = null;
                $k->rented_until = null;
                $k->rented_from_time = null;
                $k->rented_until_time = null;
                $k->estimated_return_date = null;
            }
            // Catatan servis/inspeksi internal & harga modal tidak boleh bocor ke publik.
            $k->makeHidden(['catatan', 'margin_per_hari', 'margin_persen', 'harga_partner_per_hari']);
            $k->garasiPartner?->makeHidden(self::PARTNER_PUBLIC_HIDDEN);
        }

        if ($request->filled('tanggal_mulai') && $request->filled('durasi_hari')) {
            $tanggalMulai = Carbon::parse($request->input('tanggal_mulai'));
            $durasi = max(1, (int) $request->input('durasi_hari'));
            $tanggalSelesai = $tanggalMulai->copy()->addDays($durasi - 1);

            $kendaraanIds = array_map(fn ($k) => $k->id, $items);

            if ($kendaraanIds) {
                $overlappingIds = Order::whereIn('kendaraan_id', $kendaraanIds)
                    ->whereIn('status_order', ['pending', 'confirmed', 'active'])
                    ->whereDate('tanggal_mulai', '<=', $tanggalSelesai->toDateString())
                    ->whereDate('tanggal_selesai', '>=', $tanggalMulai->toDateString())
                    ->pluck('kendaraan_id')
                    ->unique()
                    ->toArray();

                $overlappingSet = array_flip($overlappingIds);

                foreach ($items as $k) {
                    $k->available_for_dates = ! isset($overlappingSet[$k->id]);
                }
            }
        }

        return response()->json([
            'data' => $items,
            'meta' => [
                'current_page' => $kendaraan->currentPage(),
                'last_page' => $kendaraan->lastPage(),
                'per_page' => $kendaraan->perPage(),
                'total' => $kendaraan->total(),
            ],
        ]);
    }

    public function kategoris(): JsonResponse
    {
        $kategoris = Kategori::where('aktif', true)
            ->withCount(['kendaraans' => function ($q) {
                // Hanya hitung kendaraan yang benar-benar tampil di katalog.
                $q->whereNotIn('status', ['tidak_tersedia', 'maintenance']);
            }])
            ->orderBy('nama_kategori')
            ->get();

        return response()->json($kategoris);
    }

    public function tipes(Request $request): JsonResponse
    {
        $query = Tipe::where('aktif', true)
            ->withCount(['kendaraans' => function ($q) {
                $q->whereNotIn('status', ['tidak_tersedia', 'maintenance']);
            }]);

        if ($request->filled('kategori_slug')) {
            $query->whereHas('kategori', function ($q) use ($request) {
                $q->where('slug', $request->input('kategori_slug'))->where('aktif', true);
            });
        }

        return response()->json($query->orderBy('nama_tipe')->get());
    }

    public function show(Request $request, Kendaraan $kendaraan): JsonResponse
    {
        if (in_array($kendaraan->status, ['tidak_tersedia', 'maintenance'])) {
            abort(404, 'Kendaraan tidak ditemukan.');
        }

        $kendaraan->load('garasiPartner', 'kategori', 'tipe');
        $kendaraan->loadCount('activeOrders');

        if ($kendaraan->status === 'disewa') {
            $activeOrder = $kendaraan->activeOrders()->latest('tanggal_selesai')->first();
            $kendaraan->rented_from = $activeOrder?->tanggal_mulai?->format('Y-m-d');
            $kendaraan->rented_until = $activeOrder?->tanggal_selesai?->format('Y-m-d');
            $kendaraan->rented_from_time = $activeOrder?->jam_mulai;
            $kendaraan->rented_until_time = $activeOrder?->jam_selesai;
            $kendaraan->estimated_return_date = $activeOrder?->tanggal_selesai?->format('Y-m-d');
        } else {
            $kendaraan->rented_from = null;
            $kendaraan->rented_until = null;
            $kendaraan->rented_from_time = null;
            $kendaraan->rented_until_time = null;
            $kendaraan->estimated_return_date = null;
        }

        if ($request->filled('tanggal_mulai') && $request->filled('durasi_hari')) {
            $tanggalMulai = Carbon::parse($request->input('tanggal_mulai'));
            $durasi = max(1, (int) $request->input('durasi_hari'));
            $tanggalSelesai = $tanggalMulai->copy()->addDays($durasi - 1);

            $kendaraan->available_for_dates = ! Order::where('kendaraan_id', $kendaraan->id)
                ->whereIn('status_order', ['pending', 'confirmed', 'active'])
                ->whereDate('tanggal_mulai', '<=', $tanggalSelesai->toDateString())
                ->whereDate('tanggal_selesai', '>=', $tanggalMulai->toDateString())
                ->exists();
        }

        // Data internal (margin, catatan servis, harga modal) tidak boleh bocor ke publik.
        $kendaraan->makeHidden(['catatan', 'margin_per_hari', 'margin_persen', 'harga_partner_per_hari']);
        $kendaraan->garasiPartner?->makeHidden(self::PARTNER_PUBLIC_HIDDEN);

        return response()->json($kendaraan);
    }
}
