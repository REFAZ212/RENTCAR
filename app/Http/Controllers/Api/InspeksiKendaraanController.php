<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\InspeksiKendaraan;
use App\Models\Order;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class InspeksiKendaraanController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', InspeksiKendaraan::class);

        $query = InspeksiKendaraan::with(['order.kode_order', 'order.kendaraan.nama_kendaraan', 'admin']);

        if ($request->filled('order_id')) {
            $query->where('order_id', $request->input('order_id'));
        }

        if ($request->filled('jenis')) {
            $query->where('jenis', $request->input('jenis'));
        }

        $inspeksis = $query->latest()->paginate(20);

        return response()->json($inspeksis);
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorize('create', InspeksiKendaraan::class);

        $validated = $request->validate([
            'order_id' => 'required|exists:orders,id',
            'jenis' => 'required|in:pickup,return',
            'odometer' => 'nullable|integer|min:0',
            'fuel_level' => 'required|in:full,3/4,1/2,1/4,kosong',
            'kondisi_body' => 'required|in:baik,lecet_ringan,lecet_parah,penyok,retak',
            'kondisi_interior' => 'required|in:baik,kotor_ringan,kotor_banyak,rusak',
            'kondisi_ban' => 'required|in:baik,tipis,gundul,kosong',
            'kondisi_ac' => 'required|in:baik,tidak_baik',
            'kondisi_lampu' => 'required|in:baik,tidak_baik',
            'ada_damagenya' => 'nullable|boolean',
            'deskripsi_kondisi' => 'nullable|string',
            'catatan' => 'nullable|string',
            'foto' => 'nullable|image|max:2048',
            'inspeksi_oleh' => 'nullable|string|max:255',
        ]);

        $validated['admin_id'] = $request->user()->id;

        if ($request->hasFile('foto')) {
            $validated['foto'] = $request->file('foto')->store('inspeksi', 'public');
        }

        $inspeksi = InspeksiKendaraan::create($validated);

        $inspeksi->load(['order', 'admin']);

        return response()->json($inspeksi, 201);
    }

    public function show(InspeksiKendaraan $inspeksi): JsonResponse
    {
        $this->authorize('view', $inspeksi);

        $inspeksi->load(['order.kendaraan', 'order.customer', 'admin']);

        return response()->json($inspeksi);
    }

    public function update(Request $request, InspeksiKendaraan $inspeksi): JsonResponse
    {
        $this->authorize('update', $inspeksi);

        $validated = $request->validate([
            'odometer' => 'nullable|integer|min:0',
            'fuel_level' => 'sometimes|in:full,3/4,1/2,1/4,kosong',
            'kondisi_body' => 'sometimes|in:baik,lecet_ringan,lecet_parah,penyok,retak',
            'kondisi_interior' => 'sometimes|in:baik,kotor_ringan,kotor_banyak,rusak',
            'kondisi_ban' => 'sometimes|in:baik,tipis,gundul,kosong',
            'kondisi_ac' => 'sometimes|in:baik,tidak_baik',
            'kondisi_lampu' => 'sometimes|in:baik,tidak_baik',
            'ada_damagenya' => 'nullable|boolean',
            'deskripsi_kondisi' => 'nullable|string',
            'catatan' => 'nullable|string',
            'foto' => 'nullable|image|max:2048',
            'inspeksi_oleh' => 'nullable|string|max:255',
        ]);

        if ($request->hasFile('foto')) {
            if ($inspeksi->foto && Storage::disk('public')->exists($inspeksi->foto)) {
                Storage::disk('public')->delete($inspeksi->foto);
            }
            $validated['foto'] = $request->file('foto')->store('inspeksi', 'public');
        }

        $inspeksi->update($validated);
        $inspeksi->load(['order', 'admin']);

        return response()->json($inspeksi);
    }

    public function destroy(InspeksiKendaraan $inspeksi): JsonResponse
    {
        $this->authorize('delete', $inspeksi);

        if ($inspeksi->foto && Storage::disk('public')->exists($inspeksi->foto)) {
            Storage::disk('public')->delete($inspeksi->foto);
        }

        $inspeksi->delete();

        return response()->json(['message' => 'Inspeksi berhasil dihapus.']);
    }

    public function byOrder(Order $order): JsonResponse
    {
        $this->authorize('viewAny', InspeksiKendaraan::class);

        $inspeksis = InspeksiKendaraan::where('order_id', $order->id)
            ->with('admin')
            ->get();

        return response()->json($inspeksis);
    }
}
