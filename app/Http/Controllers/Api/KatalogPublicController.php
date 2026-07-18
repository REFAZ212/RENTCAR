<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Kategori;
use App\Models\Kendaraan;
use App\Models\Tipe;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class KatalogPublicController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Kendaraan::with(['garasiPartner', 'kategori', 'tipe'])
            ->where('status', 'tersedia');

        if ($request->has('search') && $request->search) {
            $query->where(function ($q) use ($request) {
                $q->where('nama_kendaraan', 'like', "%{$request->search}%")
                    ->orWhere('merek', 'like', "%{$request->search}%")
                    ->orWhere('model', 'like', "%{$request->search}%");
            });
        }

        if ($request->has('kategori_slug') && $request->kategori_slug) {
            $query->whereHas('kategori', function ($q) use ($request) {
                $q->where('slug', $request->kategori_slug)->where('aktif', true);
            });
        }

        if ($request->has('tipe_slug') && $request->tipe_slug) {
            $query->whereHas('tipe', function ($q) use ($request) {
                $q->where('slug', $request->tipe_slug)->where('aktif', true);
            });
        }

        if ($request->has('harga_min') && $request->harga_min) {
            $query->where('harga_sewa_per_hari', '>=', $request->harga_min);
        }

        if ($request->has('harga_max') && $request->harga_max) {
            $query->where('harga_sewa_per_hari', '<=', $request->harga_max);
        }

        $sortBy = $request->get('sort', 'terbaru');
        switch ($sortBy) {
            case 'harga_asc':
                $query->orderBy('harga_sewa_per_hari', 'asc');
                break;
            case 'harga_desc':
                $query->orderBy('harga_sewa_per_hari', 'desc');
                break;
            case 'nama':
                $query->orderBy('nama_kendaraan', 'asc');
                break;
            default:
                $query->orderBy('created_at', 'desc');
        }

        $kendaraan = $query->paginate(12);

        return response()->json($kendaraan);
    }

    public function kategoris(): JsonResponse
    {
        $kategoris = Kategori::where('aktif', true)
            ->withCount(['kendaraans' => function ($q) {
                $q->where('status', 'tersedia');
            }])
            ->orderBy('nama_kategori')
            ->get();

        return response()->json($kategoris);
    }

    public function tipes(Request $request): JsonResponse
    {
        $query = Tipe::where('aktif', true)
            ->withCount(['kendaraans' => function ($q) {
                $q->where('status', 'tersedia');
            }]);

        if ($request->has('kategori_slug') && $request->kategori_slug) {
            $query->whereHas('kategori', function ($q) use ($request) {
                $q->where('slug', $request->kategori_slug)->where('aktif', true);
            });
        }

        $tipes = $query->orderBy('nama_tipe')->get();

        return response()->json($tipes);
    }

    public function show(Kendaraan $kendaraan): JsonResponse
    {
        $kendaraan->load('garasiPartner', 'kategori', 'tipe');

        if ($kendaraan->status !== 'tersedia') {
            return response()->json(['message' => 'Kendaraan tidak tersedia'], 404);
        }

        return response()->json($kendaraan);
    }
}
