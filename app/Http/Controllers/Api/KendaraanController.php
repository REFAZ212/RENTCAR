<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Kendaraan;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class KendaraanController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Kendaraan::with(['garasiPartner', 'kategori', 'tipe']);

        if ($request->search) {
            $query->where(function ($q) use ($request) {
                $q->where('nama_kendaraan', 'like', "%{$request->search}%")
                    ->orWhere('plat_nomor', 'like', "%{$request->search}%")
                    ->orWhere('merek', 'like', "%{$request->search}%")
                    ->orWhere('model', 'like', "%{$request->search}%");
            });
        }

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        if ($request->has('tipe_id')) {
            $query->where('tipe_id', $request->tipe_id);
        }

        if ($request->has('kategori_id')) {
            $query->where('kategori_id', $request->kategori_id);
        }

        if ($request->has('garasi_partner_id')) {
            $query->where('garasi_partner_id', $request->garasi_partner_id);
        }

        $kendaraan = $query->orderBy('created_at', 'desc')->paginate(15);

        return response()->json($kendaraan);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'garasi_partner_id' => 'required|exists:garasi_partners,id',
            'kategori_id' => 'nullable|exists:kategoris,id',
            'tipe_id' => 'nullable|exists:tipes,id',
            'nama_kendaraan' => 'required|string|max:255',
            'plat_nomor' => 'required|string|unique:kendaraans,plat_nomor',
            'merek' => 'required|string|max:255',
            'model' => 'required|string|max:255',
            'tahun' => 'required|integer|min:1990|max:'.(date('Y') + 1),
            'warna' => 'required|string|max:255',
            'kapasitas_penumpang' => 'required|integer|min:1|max:50',
            'harga_sewa_per_hari' => 'required|numeric|min:0',
            'status' => 'nullable|in:tersedia,disewa,maintenance',
            'foto' => 'nullable|image|max:2048',
            'catatan' => 'nullable|string',
        ]);

        $validated['status'] = $validated['status'] ?? 'tersedia';

        if ($request->hasFile('foto')) {
            $validated['foto'] = $request->file('foto')->store('kendaraan', 'public');
        }

        $kendaraan = Kendaraan::create($validated);

        return response()->json($kendaraan->load(['garasiPartner', 'kategori', 'tipe']), 201);
    }

    public function show(Kendaraan $kendaraan): JsonResponse
    {
        $kendaraan->load(['garasiPartner', 'kategori', 'tipe', 'orders' => function ($q) {
            $q->with('customer')->latest()->limit(5);
        }]);

        return response()->json($kendaraan);
    }

    public function update(Request $request, Kendaraan $kendaraan): JsonResponse
    {
        $validated = $request->validate([
            'garasi_partner_id' => 'required|exists:garasi_partners,id',
            'kategori_id' => 'nullable|exists:kategoris,id',
            'tipe_id' => 'nullable|exists:tipes,id',
            'nama_kendaraan' => 'required|string|max:255',
            'plat_nomor' => 'required|string|unique:kendaraans,plat_nomor,'.$kendaraan->id,
            'merek' => 'required|string|max:255',
            'model' => 'required|string|max:255',
            'tahun' => 'required|integer|min:1990|max:'.(date('Y') + 1),
            'warna' => 'required|string|max:255',
            'kapasitas_penumpang' => 'required|integer|min:1|max:50',
            'harga_sewa_per_hari' => 'required|numeric|min:0',
            'status' => 'required|in:tersedia,disewa,maintenance',
            'foto' => 'nullable|image|max:2048',
            'catatan' => 'nullable|string',
        ]);

        if (isset($validated['status']) && $validated['status'] !== $kendaraan->status) {
            $hasActiveOrder = $kendaraan->orders()
                ->where('status_order', 'active')
                ->exists();

            if ($hasActiveOrder && $validated['status'] === 'tersedia') {
                return response()->json([
                    'message' => 'Tidak dapat mengubah status ke Tersedia karena kendaraan masih dalam status sewa aktif. Selesaikan atau batalkan order terlebih dahulu.',
                ], 422);
            }

            if ($validated['status'] === 'disewa') {
                return response()->json([
                    'message' => 'Status Disewa hanya dapat diatur melalui proses order. Gunakan menu Order untuk menyewakan kendaraan.',
                ], 422);
            }
        }

        if ($request->hasFile('foto')) {
            if ($kendaraan->foto) {
                Storage::disk('public')->delete($kendaraan->foto);
            }
            $validated['foto'] = $request->file('foto')->store('kendaraan', 'public');
        }

        $kendaraan->update($validated);

        return response()->json($kendaraan->load(['garasiPartner', 'kategori', 'tipe']));
    }

    public function destroy(Kendaraan $kendaraan): JsonResponse
    {
        $hasActiveOrder = $kendaraan->orders()
            ->whereIn('status_order', ['pending', 'confirmed', 'active'])
            ->exists();

        if ($hasActiveOrder) {
            return response()->json([
                'message' => 'Tidak bisa menghapus kendaraan yang memiliki order aktif. Selesaikan atau batalkan order terlebih dahulu.',
            ], 422);
        }

        if ($kendaraan->foto) {
            Storage::disk('public')->delete($kendaraan->foto);
        }

        $kendaraan->delete();

        return response()->json(['message' => 'Kendaraan berhasil dihapus']);
    }
}
