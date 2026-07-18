<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Kendaraan;
use App\Models\Order;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class OrderController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Order::with(['customer', 'kendaraan.garasiPartner', 'admin']);

        if ($request->search) {
            $query->where(function ($q) use ($request) {
                $q->where('kode_order', 'like', "%{$request->search}%")
                    ->orWhereHas('customer', function ($cq) use ($request) {
                        $cq->where('nama_lengkap', 'like', "%{$request->search}%");
                    })
                    ->orWhereHas('kendaraan', function ($kq) use ($request) {
                        $kq->where('plat_nomor', 'like', "%{$request->search}%")
                            ->orWhere('nama_kendaraan', 'like', "%{$request->search}%");
                    });
            });
        }

        if ($request->has('status_order')) {
            $query->where('status_order', $request->status_order);
        }

        if ($request->has('status_pembayaran')) {
            $query->where('status_pembayaran', $request->status_pembayaran);
        }

        if ($request->has('status_pengiriman')) {
            $query->where('status_pengiriman', $request->status_pengiriman);
        }

        if ($request->has('tanggal_mulai') && $request->has('tanggal_selesai')) {
            $query->where('tanggal_mulai', '<=', $request->tanggal_selesai)
                ->where('tanggal_selesai', '>=', $request->tanggal_mulai);
        }

        $orders = $query->orderBy('created_at', 'desc')->paginate(15);

        return response()->json($orders);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'customer_id' => 'required|exists:customers,id',
            'kendaraan_id' => 'required|exists:kendaraans,id',
            'tanggal_mulai' => 'required|date|after_or_equal:today',
            'tanggal_selesai' => 'required|date|after_or_equal:tanggal_mulai',
            'jam_mulai' => 'nullable|string',
            'jam_selesai' => 'nullable|string',
            'metode_pembayaran' => 'nullable|in:cash,transfer,qris,lainnya',
            'status_order' => 'nullable|in:pending,confirmed,active,completed,cancelled',
            'status_pembayaran' => 'nullable|in:unpaid,partial,paid',
            'status_pengiriman' => 'nullable|in:belum_diambil,sudah_diantarkan,dalam_penyewaan,selesai',
            'bukti_transfer' => 'nullable|image|max:2048',
            'bukti_pengiriman' => 'nullable|image|max:2048',
            'bukti_pengembalian' => 'nullable|image|max:2048',
            'catatan' => 'nullable|string',
        ]);

        $statusPengiriman = $validated['status_pengiriman'] ?? 'belum_diambil';
        if (in_array($statusPengiriman, ['sudah_diantarkan', 'dalam_penyewaan']) && ! $request->hasFile('bukti_pengiriman')) {
            return response()->json([
                'message' => 'Bukti foto pengiriman wajib diunggah saat status pengiriman "'.$statusPengiriman.'".',
            ], 422);
        }

        $statusOrder = $validated['status_order'] ?? 'pending';
        if ($statusOrder === 'completed' && ! $request->hasFile('bukti_pengembalian')) {
            return response()->json([
                'message' => 'Bukti foto pengembalian kendaraan wajib diunggah saat menyelesaikan order.',
            ], 422);
        }

        $kendaraan = Kendaraan::findOrFail($validated['kendaraan_id']);
        $hargaPerHari = $kendaraan->harga_sewa_per_hari;
        $statusOrder = $validated['status_order'] ?? 'pending';

        if ($statusOrder === 'active') {
            $hasActiveOrder = Order::where('kendaraan_id', $validated['kendaraan_id'])
                ->where('status_order', 'active')
                ->exists();
            if ($hasActiveOrder) {
                return response()->json([
                    'message' => 'Kendaraan sedang disewa oleh order lain.',
                ], 422);
            }
        }

        $mulaiDt = Carbon::parse($validated['tanggal_mulai']);
        $selesaiDt = Carbon::parse($validated['tanggal_selesai']);
        if (! empty($validated['jam_mulai'])) {
            $mulaiDt->setTimeFromTimeString($validated['jam_mulai']);
        }
        if (! empty($validated['jam_selesai'])) {
            $selesaiDt->setTimeFromTimeString($validated['jam_selesai']);
        }
        $durasi = (int) ceil($mulaiDt->diffInSeconds($selesaiDt) / 86400);
        if ($durasi < 1) {
            $durasi = 1;
        }

        $buktiPath = null;
        if ($request->hasFile('bukti_transfer')) {
            $buktiPath = $request->file('bukti_transfer')->store('bukti-transfer', 'public');
        }

        $buktiPengirimanPath = null;
        if ($request->hasFile('bukti_pengiriman')) {
            $buktiPengirimanPath = $request->file('bukti_pengiriman')->store('bukti-pengiriman', 'public');
        }

        $buktiPengembalianPath = null;
        if ($request->hasFile('bukti_pengembalian')) {
            $buktiPengembalianPath = $request->file('bukti_pengembalian')->store('bukti-pengembalian', 'public');
        }

        $order = Order::create([
            'customer_id' => $validated['customer_id'],
            'kendaraan_id' => $validated['kendaraan_id'],
            'tanggal_mulai' => $validated['tanggal_mulai'],
            'tanggal_selesai' => $validated['tanggal_selesai'],
            'jam_mulai' => $validated['jam_mulai'] ?? null,
            'jam_selesai' => $validated['jam_selesai'] ?? null,
            'harga_per_hari' => $hargaPerHari,
            'metode_pembayaran' => $validated['metode_pembayaran'] ?? 'cash',
            'status_order' => $statusOrder,
            'status_pembayaran' => $validated['status_pembayaran'] ?? 'unpaid',
            'status_pengiriman' => $statusPengiriman,
            'catatan' => $validated['catatan'] ?? null,
            'bukti_transfer' => $buktiPath,
            'bukti_pengiriman' => $buktiPengirimanPath,
            'bukti_pengembalian' => $buktiPengembalianPath,
            'durasi_hari' => $durasi,
            'harga_total' => $durasi * $hargaPerHari,
            'admin_id' => $request->user()->id,
        ]);

        if ($statusOrder === 'active') {
            $kendaraan->update(['status' => 'disewa']);
        }

        if ($statusOrder === 'completed') {
            $order->selesaikanSewa();
            $order->save();
        }

        return response()->json($order->load(['customer', 'kendaraan.garasiPartner', 'admin']), 201);
    }

    public function show(Order $order): JsonResponse
    {
        $order->load(['customer', 'kendaraan.garasiPartner', 'admin', 'garasiRequests.garasiPartner']);

        return response()->json($order);
    }

    public function update(Request $request, Order $order): JsonResponse
    {
        $validated = $request->validate([
            'customer_id' => 'nullable|exists:customers,id',
            'kendaraan_id' => 'nullable|exists:kendaraans,id',
            'tanggal_mulai' => 'nullable|date',
            'tanggal_selesai' => 'nullable|date|after_or_equal:tanggal_mulai',
            'jam_mulai' => 'nullable|string',
            'jam_selesai' => 'nullable|string',
            'status_order' => 'nullable|in:pending,confirmed,active,completed,cancelled',
            'metode_pembayaran' => 'nullable|in:cash,transfer,qris,lainnya',
            'status_pembayaran' => 'nullable|in:unpaid,partial,paid',
            'status_pengiriman' => 'nullable|in:belum_diambil,sudah_diantarkan,dalam_penyewaan,selesai',
            'bukti_transfer' => 'nullable|image|max:2048',
            'bukti_pengiriman' => 'nullable|image|max:2048',
            'bukti_pengembalian' => 'nullable|image|max:2048',
            'catatan' => 'nullable|string',
        ]);

        $newStatusPengiriman = $validated['status_pengiriman'] ?? $order->status_pengiriman;
        if (in_array($newStatusPengiriman, ['sudah_diantarkan', 'dalam_penyewaan']) && ! $request->hasFile('bukti_pengiriman') && ! $order->bukti_pengiriman) {
            return response()->json([
                'message' => 'Bukti foto pengiriman wajib diunggah saat status pengiriman "'.$newStatusPengiriman.'".',
            ], 422);
        }

        $newStatusOrder = $validated['status_order'] ?? $order->status_order;
        if ($newStatusOrder === 'completed' && ! $request->hasFile('bukti_pengembalian') && ! $order->bukti_pengembalian) {
            return response()->json([
                'message' => 'Bukti foto pengembalian kendaraan wajib diunggah saat menyelesaikan order.',
            ], 422);
        }

        $oldKendaraanId = $order->kendaraan_id;
        $newKendaraanId = $validated['kendaraan_id'] ?? null;

        if (isset($validated['status_order']) && $validated['status_order'] === 'active') {
            $targetId = $newKendaraanId ?? $oldKendaraanId;
            $hasOtherActive = Order::where('kendaraan_id', $targetId)
                ->where('id', '!=', $order->id)
                ->where('status_order', 'active')
                ->exists();
            if ($hasOtherActive) {
                return response()->json([
                    'message' => 'Kendaraan sedang disewa oleh order lain.',
                ], 422);
            }
        }

        $updateData = collect($validated)->except(['bukti_transfer', 'bukti_pengiriman', 'bukti_pengembalian'])->toArray();

        if ($request->hasFile('bukti_transfer')) {
            if ($order->bukti_transfer) {
                Storage::disk('public')->delete($order->bukti_transfer);
            }
            $updateData['bukti_transfer'] = $request->file('bukti_transfer')->store('bukti-transfer', 'public');
        }

        if ($request->hasFile('bukti_pengiriman')) {
            if ($order->bukti_pengiriman) {
                Storage::disk('public')->delete($order->bukti_pengiriman);
            }
            $updateData['bukti_pengiriman'] = $request->file('bukti_pengiriman')->store('bukti-pengiriman', 'public');
        }

        if ($request->hasFile('bukti_pengembalian')) {
            if ($order->bukti_pengembalian) {
                Storage::disk('public')->delete($order->bukti_pengembalian);
            }
            $updateData['bukti_pengembalian'] = $request->file('bukti_pengembalian')->store('bukti-pengembalian', 'public');
        }

        $mulai = $validated['tanggal_mulai'] ?? $order->tanggal_mulai;
        $selesai = $validated['tanggal_selesai'] ?? $order->tanggal_selesai;
        $jamMulai = $validated['jam_mulai'] ?? $order->jam_mulai;
        $jamSelesai = $validated['jam_selesai'] ?? $order->jam_selesai;

        if ($newKendaraanId) {
            $targetKendaraan = Kendaraan::find($newKendaraanId);
            $harga = $targetKendaraan->harga_sewa_per_hari;
        } else {
            $harga = $order->harga_per_hari;
        }

        $mulaiDt = Carbon::parse($mulai);
        $selesaiDt = Carbon::parse($selesai);
        if ($jamMulai) {
            $mulaiDt->setTimeFromTimeString($jamMulai);
        }
        if ($jamSelesai) {
            $selesaiDt->setTimeFromTimeString($jamSelesai);
        }
        $durasi = (int) ceil($mulaiDt->diffInSeconds($selesaiDt) / 86400);
        if ($durasi < 1) {
            $durasi = 1;
        }

        $updateData['harga_per_hari'] = $harga;
        $updateData['durasi_hari'] = $durasi;
        $updateData['harga_total'] = $durasi * $harga;

        $order->update($updateData);

        if (isset($validated['status_order'])) {
            $currentKendaraan = $order->kendaraan;

            if ($newKendaraanId && $newKendaraanId != $oldKendaraanId) {
                $oldKendaraan = Kendaraan::find($oldKendaraanId);
                if ($oldKendaraan && $oldKendaraan->status === 'disewa') {
                    $oldKendaraan->update(['status' => 'tersedia']);
                }
            }

            match ($validated['status_order']) {
                'active' => $currentKendaraan->update(['status' => 'disewa']),
                'completed', 'cancelled' => $currentKendaraan->update(['status' => 'tersedia']),
                default => null,
            };

            if (in_array($validated['status_order'], ['completed', 'cancelled'])) {
                $order->update(['status_pengiriman' => 'selesai']);
            }

            if ($validated['status_order'] === 'completed' && $order->jam_overtime == 0) {
                $order->selesaikanSewa();
                $order->save();
            }
        }

        return response()->json($order->load(['customer', 'kendaraan.garasiPartner', 'admin']));
    }

    public function destroy(Order $order): JsonResponse
    {
        if ($order->status_order === 'active') {
            return response()->json(['message' => 'Tidak bisa menghapus order aktif. Selesaikan atau batalkan order terlebih dahulu.'], 422);
        }

        $order->delete();

        return response()->json(['message' => 'Order berhasil dihapus']);
    }
}
