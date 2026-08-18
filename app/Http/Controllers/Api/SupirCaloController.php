<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\SupirCalo;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class SupirCaloController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', SupirCalo::class);

        $query = SupirCalo::query();

        if ($request->jenis) {
            $query->jenis($request->jenis);
        }

        if ($request->search) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                whereLikeEscaped($q, 'nama', $search);
                $q->orWhereRaw("no_hp LIKE ? ESCAPE '#'", ['%'.escapeLike($search).'%']);
            });
        }

        $items = $query->withCount(['ordersAsSupir', 'ordersAsCalo'])
            ->orderBy('created_at', 'desc')
            ->paginate(15);

        return response()->json($items);
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorize('create', SupirCalo::class);

        $validated = $request->validate([
            'jenis' => 'required|in:supir,calo',
            'nama' => 'required|string|max:255',
            'no_hp' => 'required|string|max:255',
            'alamat' => 'nullable|string',
            'status' => 'nullable|in:active,inactive',
            'no_sim' => 'nullable|string',
            'foto' => 'nullable|image|max:2048',
            'tarif_per_hari' => 'nullable|numeric|min:0',
            'komisi' => 'nullable|numeric|min:0',
            'catatan' => 'nullable|string',
        ]);

        if ($validated['jenis'] === 'supir' && empty($validated['no_sim'] ?? null)) {
            return response()->json(['message' => 'No. SIM wajib diisi untuk supir.'], 422);
        }

        if ($validated['jenis'] === 'calo' && ($validated['komisi'] ?? null) === null) {
            return response()->json(['message' => 'Komisi wajib diisi untuk calo.'], 422);
        }

        if ($request->hasFile('foto')) {
            $validated['foto'] = $request->file('foto')->store('supir-calos', 'public');
        }

        $item = SupirCalo::create($validated);

        return response()->json($item, 201);
    }

    public function show(SupirCalo $supirCalo): JsonResponse
    {
        $this->authorize('view', $supirCalo);

        $supirCalo->load(['user', 'ordersAsSupir' => function ($q) {
            $q->with('kendaraan')->latest()->limit(10);
        }, 'ordersAsCalo' => function ($q) {
            $q->with('kendaraan')->latest()->limit(10);
        }]);

        return response()->json($supirCalo);
    }

    public function update(Request $request, SupirCalo $supirCalo): JsonResponse
    {
        $this->authorize('update', $supirCalo);

        if ($supirCalo->user_id) {
            return response()->json([
                'message' => 'Data supir dari user petugas dikelola di halaman Manajemen User.',
            ], 422);
        }

        $validated = $request->validate([
            'jenis' => 'sometimes|required|in:supir,calo',
            'nama' => 'sometimes|required|string|max:255',
            'no_hp' => 'sometimes|required|string|max:255',
            'alamat' => 'nullable|string',
            'status' => 'nullable|in:active,inactive',
            'no_sim' => 'nullable|string',
            'foto' => 'nullable|image|max:2048',
            'tarif_per_hari' => 'nullable|numeric|min:0',
            'komisi' => 'nullable|numeric|min:0',
            'catatan' => 'nullable|string',
        ]);

        if (($validated['jenis'] ?? $supirCalo->jenis) === 'supir' && empty($validated['no_sim'] ?? $supirCalo->no_sim ?? null)) {
            return response()->json(['message' => 'No. SIM wajib diisi untuk supir.'], 422);
        }

        if (($validated['jenis'] ?? $supirCalo->jenis) === 'calo' && ($validated['komisi'] ?? $supirCalo->komisi ?? null) === null) {
            return response()->json(['message' => 'Komisi wajib diisi untuk calo.'], 422);
        }

        if ($request->hasFile('foto')) {
            if ($supirCalo->foto) {
                Storage::disk('public')->delete($supirCalo->foto);
            }
            $validated['foto'] = $request->file('foto')->store('supir-calos', 'public');
        }

        $supirCalo->update($validated);

        return response()->json($supirCalo);
    }

    public function destroy(SupirCalo $supirCalo): JsonResponse
    {
        $this->authorize('delete', $supirCalo);

        if ($supirCalo->user_id) {
            return response()->json([
                'message' => 'Data supir dari user petugas dikelola di halaman Manajemen User.',
            ], 422);
        }

        $hasActiveOrder = Order::where(function ($q) use ($supirCalo) {
            $q->where('supir_id', $supirCalo->id)
                ->orWhere('calo_id', $supirCalo->id);
        })->whereIn('status_order', ['pending', 'confirmed', 'active'])->exists();

        if ($hasActiveOrder) {
            return response()->json([
                'message' => 'Tidak bisa menghapus yang memiliki order aktif. Selesaikan atau batalkan order terlebih dahulu.',
            ], 422);
        }

        if ($supirCalo->foto) {
            Storage::disk('public')->delete($supirCalo->foto);
        }

        $supirCalo->delete();

        return response()->json(['message' => 'Data berhasil dihapus']);
    }
}
