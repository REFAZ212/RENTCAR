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
    public function index(Request $request): JsonResponse
    {
        $query = Kendaraan::query()
            ->with(['garasiPartner', 'kategori', 'tipe'])
            ->withCount('activeOrders');

        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                whereLikeEscaped($q, 'nama_kendaraan', $search);
                $q->orWhereRaw("merek LIKE ? ESCAPE '#'", ['%'.escapeLike($search).'%']);
                $q->orWhereRaw("model LIKE ? ESCAPE '#'", ['%'.escapeLike($search).'%']);
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
                $k->estimated_return_date = $activeOrder?->tanggal_selesai?->format('Y-m-d');
            } else {
                $k->estimated_return_date = null;
            }
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
            ->withCount('kendaraans')
            ->orderBy('nama_kategori')
            ->get();

        return response()->json($kategoris);
    }

    public function tipes(Request $request): JsonResponse
    {
        $query = Tipe::where('aktif', true)
            ->withCount('kendaraans');

        if ($request->filled('kategori_slug')) {
            $query->whereHas('kategori', function ($q) use ($request) {
                $q->where('slug', $request->input('kategori_slug'))->where('aktif', true);
            });
        }

        return response()->json($query->orderBy('nama_tipe')->get());
    }

    public function show(Request $request, Kendaraan $kendaraan): JsonResponse
    {
        $kendaraan->load('garasiPartner', 'kategori', 'tipe');
        $kendaraan->loadCount('activeOrders');

        if ($kendaraan->status === 'disewa') {
            $activeOrder = $kendaraan->activeOrders()->latest('tanggal_selesai')->first();
            $kendaraan->estimated_return_date = $activeOrder?->tanggal_selesai?->format('Y-m-d');
        } else {
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

        return response()->json($kendaraan);
    }
}
