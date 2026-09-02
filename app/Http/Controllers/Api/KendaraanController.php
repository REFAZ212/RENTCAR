<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Kendaraan;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class KendaraanController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Kendaraan::class);

        // Perbaiki status kolom yang mungkin tidak sinkron dengan order berjalan.
        Kendaraan::sinkronkanStatusDariOrder();

        $query = Kendaraan::with(['garasiPartner', 'kategori', 'tipe'])
            ->withCount([
                'activeOrders',
                'orders as order_pending_count' => function ($q) {
                    $q->whereNull('deleted_at')->where('status_order', 'pending');
                },
                'orders as order_confirmed_count' => function ($q) {
                    $q->whereNull('deleted_at')->where('status_order', 'confirmed');
                },
            ]);

        if ($request->search) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                whereLikeEscaped($q, 'nama_kendaraan', $search);
                $q->orWhereRaw("plat_nomor LIKE ? ESCAPE '#'", ['%'.escapeLike($search).'%']);
                $q->orWhereRaw("merek LIKE ? ESCAPE '#'", ['%'.escapeLike($search).'%']);
                $q->orWhereRaw("model LIKE ? ESCAPE '#'", ['%'.escapeLike($search).'%']);
            });
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('tipe_id')) {
            $query->where('tipe_id', $request->tipe_id);
        }

        if ($request->filled('kategori_id')) {
            $query->where('kategori_id', $request->kategori_id);
        }

        if ($request->filled('garasi_partner_id')) {
            $query->where('garasi_partner_id', $request->garasi_partner_id);
        }

        // Filter ketersediaan berdasarkan rentang tanggal: mobil yang sudah
        // punya order (pending/confirmed/active) yang tanggalnya beririsan
        // tidak ikut ditampilkan — sama dengan aturan checkVehicleOverlap.
        if ($request->filled('available_from') && $request->filled('available_to')) {
            $availableFrom = $request->available_from;
            $availableTo = $request->available_to;
            $query->whereDoesntHave('orders', function ($q) use ($availableFrom, $availableTo) {
                $q->whereNull('deleted_at')
                    ->whereIn('status_order', ['pending', 'confirmed', 'active'])
                    ->whereDate('tanggal_mulai', '<=', $availableTo)
                    ->whereDate('tanggal_selesai', '>=', $availableFrom);
            });
        }

        // select() menimpa daftar kolom bawaan (termasuk `kendaraans.*` dan
        // subquery active_orders_count dari withCount) agar query GROUP BY tetap
        // valid di MySQL dengan sql_mode=ONLY_FULL_GROUP_BY.
        $statusCounts = (clone $query)
            ->select('status')
            ->selectRaw('COUNT(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status');

        $perPage = (int) ($request->per_page ?? 15);
        if (! in_array($perPage, [15, 30, 50, 100], true)) {
            $perPage = 15;
        }
        $kendaraan = $query->orderBy('created_at', 'desc')->paginate($perPage);

        $response = $kendaraan->toArray();
        $response['counts'] = [
            'total' => (int) array_sum($statusCounts->all()),
            'tersedia' => (int) ($statusCounts['tersedia'] ?? 0),
            'disewa' => (int) ($statusCounts['disewa'] ?? 0),
            'maintenance' => (int) ($statusCounts['maintenance'] ?? 0),
            'tidak_tersedia' => (int) ($statusCounts['tidak_tersedia'] ?? 0),
        ];

        return response()->json($response);
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorize('create', Kendaraan::class);

        $request->merge([
            'plat_nomor' => mb_strtoupper((string) preg_replace('/\s+/', ' ', trim((string) $request->input('plat_nomor')))),
        ]);

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
            'harga_sewa_per_hari' => 'required|numeric|min:1',
            'harga_partner_per_hari' => 'required_if:garasi_partner_id,!=,null|nullable|numeric|min:0',
            'status' => 'nullable|in:tersedia,disewa,maintenance,tidak_tersedia',
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
        $this->authorize('view', $kendaraan);

        Kendaraan::sinkronkanStatusDariOrder();
        $kendaraan->refresh();

        $kendaraan->load([
            'garasiPartner',
            'kategori',
            'tipe',
            'orders' => function ($q) {
                $q->whereNull('deleted_at')
                    ->whereIn('status_order', ['active', 'perlu_verifikasi'])
                    ->select('id', 'kode_order', 'kendaraan_id', 'status_order', 'status_pengiriman', 'tanggal_mulai', 'tanggal_selesai', 'jam_mulai', 'jam_selesai')
                    ->latest('id');
            },
        ]);

        return response()->json(['data' => $kendaraan]);
    }

    public function update(Request $request, Kendaraan $kendaraan): JsonResponse
    {
        $this->authorize('update', $kendaraan);

        if ($request->has('plat_nomor')) {
            $request->merge([
                'plat_nomor' => mb_strtoupper((string) preg_replace('/\s+/', ' ', trim((string) $request->input('plat_nomor')))),
            ]);
        }

        $validated = $request->validate([
            'garasi_partner_id' => 'sometimes|required|exists:garasi_partners,id',
            'kategori_id' => 'nullable|exists:kategoris,id',
            'tipe_id' => 'nullable|exists:tipes,id',
            'nama_kendaraan' => 'sometimes|required|string|max:255',
            'plat_nomor' => 'sometimes|required|string|unique:kendaraans,plat_nomor,'.$kendaraan->id,
            'merek' => 'sometimes|required|string|max:255',
            'model' => 'sometimes|required|string|max:255',
            'tahun' => 'sometimes|required|integer|min:1990|max:'.(date('Y') + 1),
            'warna' => 'sometimes|required|string|max:255',
            'kapasitas_penumpang' => 'sometimes|required|integer|min:1|max:50',
            'harga_sewa_per_hari' => 'sometimes|required|numeric|min:1',
            'harga_partner_per_hari' => 'sometimes|required_if:garasi_partner_id,!=,null|nullable|numeric|min:0',
            'status' => 'sometimes|required|in:tersedia,disewa,maintenance,tidak_tersedia',
            'foto' => 'nullable|image|max:2048',
            'hapus_foto' => 'nullable|boolean',
            'catatan' => 'nullable|string',
        ]);

        if (isset($validated['status']) && $validated['status'] !== $kendaraan->status) {

            $hasAwaitingOrder = $kendaraan->orders()
                ->whereNull('deleted_at')
                ->whereIn('status_order', ['pending', 'confirmed'])
                ->exists();

            $hasOngoingRental = $kendaraan->orders()
                ->whereNull('deleted_at')
                ->whereIn('status_order', ['active', 'perlu_verifikasi'])
                ->exists();

            // Kendaraan ber-order menunggu/konfirmasi harus tetap tersedia:
            // tidak boleh dipindah ke tidak_tersedia maupun maintenance.
            if ($hasAwaitingOrder && in_array($validated['status'], ['tidak_tersedia', 'maintenance'])) {
                return response()->json([
                    'message' => 'Kendaraan masih memiliki order aktif. Selesaikan atau batalkan order terlebih dahulu.',
                ], 422);
            }

            // Kendaraan yang sedang disewa tidak boleh diubah statusnya secara
            // manual sama sekali — sinkronisasi akan tetap memaksakan `disewa`.
            if ($hasOngoingRental && $validated['status'] !== 'disewa') {
                return response()->json([
                    'message' => 'Kendaraan masih memiliki order aktif. Selesaikan atau batalkan order terlebih dahulu.',
                ], 422);
            }
        }

        if ($request->hasFile('foto')) {
            if ($kendaraan->foto) {
                Storage::disk('public')->delete($kendaraan->foto);
            }
            $validated['foto'] = $request->file('foto')->store('kendaraan', 'public');
        } elseif (! empty($validated['hapus_foto']) && $kendaraan->foto) {
            Storage::disk('public')->delete($kendaraan->foto);
            $validated['foto'] = null;
        }

        unset($validated['hapus_foto']);

        $kendaraan->update($validated);

        return response()->json($kendaraan->load(['garasiPartner', 'kategori', 'tipe']));
    }

    public function destroy(Kendaraan $kendaraan): JsonResponse
    {
        $this->authorize('delete', $kendaraan);

        $hasActiveOrder = $kendaraan->orders()
            ->whereIn('status_order', ['pending', 'confirmed', 'active'])
            ->exists();

        if ($hasActiveOrder) {
            return response()->json([
                'message' => 'Tidak bisa menghapus kendaraan yang masih memiliki order aktif. Selesaikan atau batalkan order terlebih dahulu.',
            ], 422);
        }

        DB::transaction(function () use ($kendaraan) {
            // Putuskan referensi order historis sebelum menghapus kendaraan
            $kendaraan->orders()->update(['kendaraan_id' => null]);

            if ($kendaraan->foto) {
                Storage::disk('public')->delete($kendaraan->foto);
            }

            $kendaraan->delete();
        });

        return response()->json(['message' => 'Kendaraan berhasil dihapus']);
    }
}
