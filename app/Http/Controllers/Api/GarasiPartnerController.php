<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\GarasiPartner;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class GarasiPartnerController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = GarasiPartner::where('is_own', false);

        if ($request->search) {
            $query->where(function ($q) use ($request) {
                $q->where('nama_garasi', 'like', "%{$request->search}%")
                    ->orWhere('nama_pemilik', 'like', "%{$request->search}%")
                    ->orWhere('no_hp', 'like', "%{$request->search}%");
            });
        }

        if ($request->has('status_aktif')) {
            $query->where('status_aktif', $request->boolean('status_aktif'));
        }

        $garasi = $query->withCount('kendaraans')->orderBy('created_at', 'desc')->paginate(15);

        return response()->json($garasi);
    }

    public function garasiSaya(): JsonResponse
    {
        $garasi = GarasiPartner::where('is_own', true)
            ->with(['kendaraans.garasiPartner', 'kendaraans.kategori', 'kendaraans.tipe'])
            ->withCount('kendaraans')
            ->first();

        return response()->json($garasi);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'nama_garasi' => 'required|string|max:255',
            'nama_pemilik' => 'required|string|max:255',
            'alamat' => 'required|string',
            'no_hp' => 'required|string|max:255',
            'email' => 'nullable|email|unique:garasi_partners,email',
            'is_own' => 'boolean',
            'catatan' => 'nullable|string',
        ]);

        $garasi = GarasiPartner::create($validated);

        return response()->json($garasi, 201);
    }

    public function show(GarasiPartner $garasiPartner): JsonResponse
    {
        $garasiPartner->load(['kendaraans.kategori', 'kendaraans.tipe', 'garasiRequests.order.customer']);

        return response()->json($garasiPartner);
    }

    public function update(Request $request, GarasiPartner $garasiPartner): JsonResponse
    {
        $validated = $request->validate([
            'nama_garasi' => 'sometimes|required|string|max:255',
            'nama_pemilik' => 'sometimes|required|string|max:255',
            'alamat' => 'sometimes|required|string',
            'no_hp' => 'sometimes|required|string|max:255',
            'email' => 'nullable|email|unique:garasi_partners,email,'.$garasiPartner->id,
            'status_aktif' => 'boolean',
            'is_own' => 'boolean',
            'catatan' => 'nullable|string',
        ]);

        $garasiPartner->update($validated);

        return response()->json($garasiPartner);
    }

    public function destroy(GarasiPartner $garasiPartner): JsonResponse
    {
        $hasActiveOrder = $garasiPartner->kendaraans()
            ->whereHas('orders', function ($q) {
                $q->whereIn('status_order', ['pending', 'confirmed', 'active']);
            })->exists();

        if ($hasActiveOrder) {
            return response()->json([
                'message' => 'Tidak bisa menghapus garasi partner yang memiliki order aktif pada kendaraannya.',
            ], 422);
        }

        $garasiPartner->delete();

        return response()->json(['message' => 'Garasi partner berhasil dihapus']);
    }
}
