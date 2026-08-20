<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\GarasiPartner;
use App\Models\SupirCalo;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class GarasiPartnerController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', GarasiPartner::class);

        $query = GarasiPartner::query();

        // Secara default list garasi-partner hanya menampilkan garasi mitra
        // eksternal (is_own = false); garasi "Milik Sendiri" dikelola lewat
        // endpoint /garasi-saya. Kalau caller butuh SEMUA garasi (mis. dropdown
        // tambah kendaraan), lewatkan filter ini dengan include_own=true.
        if (! $request->boolean('include_own')) {
            $query->where('is_own', false);
        }

        if ($request->search) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                whereLikeEscaped($q, 'nama_garasi', $search);
                $q->orWhereRaw("nama_pemilik LIKE ? ESCAPE '#'", ['%'.escapeLike($search).'%']);
                $q->orWhereRaw("no_hp LIKE ? ESCAPE '#'", ['%'.escapeLike($search).'%']);
            });
        }

        if ($request->has('status_aktif')) {
            $query->where('status_aktif', $request->boolean('status_aktif'));
        }

        $garasi = $query->withCount('kendaraans')->orderBy('created_at', 'desc')->paginate(15);

        return response()->json($garasi);
    }

    public function garasiSaya(Request $request): JsonResponse
    {
        abort_if($request->user() instanceof SupirCalo, 403, 'Akses ditolak. Anda tidak memiliki izin yang cukup.');

        $garasi = GarasiPartner::where('is_own', true)
            ->with(['kendaraans.garasiPartner', 'kendaraans.kategori', 'kendaraans.tipe'])
            ->withCount('kendaraans')
            ->first();

        return response()->json($garasi);
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorize('create', GarasiPartner::class);

        $validated = $request->validate([
            'nama_garasi' => 'required|string|max:255',
            'nama_pemilik' => 'required|string|max:255',
            'alamat' => 'required|string',
            'no_hp' => 'required|string|max:255',
            'email' => 'nullable|email|unique:garasi_partners,email',
            'is_own' => 'boolean',
            'metode_bagi_hasil' => 'nullable|in:persentase',
            'persentase_bagi_hasil' => 'nullable|numeric|min:0|max:100',
            'catatan' => 'nullable|string',
        ]);

        $garasi = GarasiPartner::create($validated);

        return response()->json($garasi, 201);
    }

    public function show(GarasiPartner $garasiPartner): JsonResponse
    {
        $this->authorize('view', $garasiPartner);

        $garasiPartner->load(['kendaraans.kategori', 'kendaraans.tipe', 'garasiRequests.order.customer']);

        return response()->json($garasiPartner);
    }

    public function update(Request $request, GarasiPartner $garasiPartner): JsonResponse
    {
        $this->authorize('update', $garasiPartner);

        $validated = $request->validate([
            'nama_garasi' => 'sometimes|required|string|max:255',
            'nama_pemilik' => 'sometimes|required|string|max:255',
            'alamat' => 'sometimes|required|string',
            'no_hp' => 'sometimes|required|string|max:255',
            'email' => 'nullable|email|unique:garasi_partners,email,'.$garasiPartner->id,
            'status_aktif' => 'boolean',
            'is_own' => 'boolean',
            'metode_bagi_hasil' => 'nullable|in:persentase',
            'persentase_bagi_hasil' => 'nullable|numeric|min:0|max:100',
            'catatan' => 'nullable|string',
        ]);

        $garasiPartner->update($validated);

        return response()->json($garasiPartner);
    }

    public function destroy(GarasiPartner $garasiPartner): JsonResponse
    {
        $this->authorize('delete', $garasiPartner);

        $hasAnyOrder = $garasiPartner->kendaraans()
            ->whereHas('orders', function ($q) {
                $q->whereIn('status_order', ['pending', 'confirmed', 'active', 'completed', 'cancelled']);
            })->exists();

        if ($hasAnyOrder) {
            return response()->json([
                'message' => 'Tidak bisa menghapus garasi partner yang memiliki riwayat order pada kendaraannya. Hubungi admin database untuk penghapusan manual.',
            ], 422);
        }

        $garasiPartner->delete();

        return response()->json(['message' => 'Garasi partner berhasil dihapus']);
    }
}
