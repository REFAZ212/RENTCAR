<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Rules\JamBelumTerlewat;
use App\Services\OrderService;
use App\Services\WatermarkService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class OrderController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Order::class);

        $service = app(OrderService::class);
        $orders = $service->list($request->only([
            'search', 'status_order', 'status_pembayaran', 'status_pengiriman', 'tanggal_mulai', 'tanggal_selesai', 'overdue', 'per_page',
        ]));

        return response()->json($orders);
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorize('create', Order::class);

        $validated = $request->validate([
            'customer_id' => 'nullable|exists:customers,id',
            'customer_name' => 'required_without:customer_id|string|max:255',
            'customer_no_hp' => 'required|string|max:20',
            'customer_email' => 'nullable|email',
            'customer_alamat' => 'required|string|max:500',
            'customer_no_sim' => 'required|string|max:20',
            'customer_no_ktp' => 'nullable|string|max:30',
            'customer_foto_ktp' => 'nullable|image|max:2048|dimensions:max_width=10000,max_height=10000',
            'customer_foto_ktp_delete' => 'nullable|boolean',
            'customer_foto_sim' => 'nullable|image|max:2048|dimensions:max_width=10000,max_height=10000',
            'kendaraan_id' => 'required|exists:kendaraans,id',
            'alamat_jemput' => 'nullable|string|max:500',
            'tujuan' => 'required|string|max:500',
            'tanggal_mulai' => 'required|date|after_or_equal:today',
            'tanggal_selesai' => 'required|date|after_or_equal:tanggal_mulai',
            'jam_mulai' => ['nullable', 'date_format:H:i', new JamBelumTerlewat($request->input('tanggal_mulai'))],
            'jam_selesai' => ['nullable', 'date_format:H:i', new JamBelumTerlewat($request->input('tanggal_selesai'))],
            'metode_pembayaran' => 'nullable|in:cash,transfer,qris,lainnya',
            'status_pembayaran' => 'nullable|in:unpaid,partial,paid',
            'status_pengiriman' => 'nullable|in:belum_diambil,sudah_diantarkan,dalam_penyewaan,selesai,sudah_dikembalikan',
            'metode_penyerahan' => 'nullable|in:ambil,antar',
            'bukti_transfer' => 'nullable|image|max:2048|dimensions:max_width=10000,max_height=10000',
            'bukti_pengembalian' => 'nullable|image|max:2048|dimensions:max_width=10000,max_height=10000',
            'supir_id' => 'nullable|exists:supir_calos,id',
            'opsi_supir' => 'nullable|in:dengan_supir,lepas_kunci',
            'calo_id' => 'nullable|exists:supir_calos,id',
            'komisi_calo' => 'nullable|numeric|min:0',
            'catatan' => 'nullable|string',
            'alasan_pembatalan' => 'nullable|string|max:500',
            'jumlah_bayar' => 'nullable|numeric|min:0',
        ]);

        $filePaths = $this->storeUploadedFiles($request);
        $validated = array_merge($validated, $filePaths);

        $this->applyWatermarks($validated);

        $service = app(OrderService::class);
        $order = $service->create($validated, $request);

        return response()->json($order, 201);
    }

    public function show(Order $order): JsonResponse
    {
        $this->authorize('view', $order);

        $service = app(OrderService::class);
        $order = $service->getDetail($order);

        return response()->json($order);
    }

    public function update(Request $request, Order $order): JsonResponse
    {
        $this->authorize('update', $order);

        foreach (['supir_id', 'calo_id'] as $field) {
            if ($request->input($field) === '') {
                $request->merge([$field => null]);
            }
        }

        $validated = $request->validate([
            'customer_id' => 'nullable|exists:customers,id',
            'customer_name' => 'sometimes|required|string|max:255',
            'customer_no_hp' => 'sometimes|required|string|max:20',
            'customer_email' => 'nullable|email',
            'customer_alamat' => 'sometimes|required|string|max:500',
            'customer_no_sim' => 'sometimes|required|string|max:20',
            'customer_no_ktp' => 'nullable|string|max:30',
            'customer_foto_ktp' => 'nullable|image|max:2048|dimensions:max_width=10000,max_height=10000',
            'customer_foto_ktp_delete' => 'nullable|boolean',
            'customer_foto_sim' => 'nullable|image|max:2048|dimensions:max_width=10000,max_height=10000',
            'kendaraan_id' => 'sometimes|required|exists:kendaraans,id',
            'alamat_jemput' => 'nullable|string|max:500',
            'tujuan' => 'sometimes|required|string|max:500',
            'tanggal_mulai' => 'sometimes|date|after_or_equal:today',
            'tanggal_selesai' => 'sometimes|date|after_or_equal:tanggal_mulai',
            'jam_mulai' => ['nullable', 'date_format:H:i', new JamBelumTerlewat($request->input('tanggal_mulai', $order->tanggal_mulai->format('Y-m-d')))],
            'jam_selesai' => ['nullable', 'date_format:H:i', new JamBelumTerlewat($request->input('tanggal_selesai', $order->tanggal_selesai->format('Y-m-d')))],
            'tanggal_pengembalian_aktual' => 'nullable|date',
            'status_order' => 'nullable|in:pending,confirmed,active,perlu_verifikasi,completed,cancelled',
            'alasan_pembatalan' => 'nullable|string|max:500',
            'metode_pembayaran' => 'nullable|in:cash,transfer,qris,lainnya',
            'status_pembayaran' => 'nullable|in:unpaid,partial,paid',
            'status_pengiriman' => 'nullable|in:belum_diambil,sudah_diantarkan,dalam_penyewaan,selesai,sudah_dikembalikan',
            'metode_penyerahan' => 'nullable|in:ambil,antar',
            'bukti_transfer' => 'nullable|image|max:2048|dimensions:max_width=10000,max_height=10000',
            'bukti_pengembalian' => 'nullable|image|max:2048|dimensions:max_width=10000,max_height=10000',
            'supir_id' => 'nullable|exists:supir_calos,id',
            'opsi_supir' => 'nullable|in:dengan_supir,lepas_kunci',
            'calo_id' => 'nullable|exists:supir_calos,id',
            'komisi_calo' => 'nullable|numeric|min:0',
            'catatan' => 'nullable|string',
            'jumlah_bayar' => 'nullable|numeric|min:0',
            'biaya_kerusakan' => 'nullable|numeric|min:0',
        ]);

        $filePaths = $this->storeUploadedFiles($request);
        $validated = array_merge($validated, $filePaths);

        $this->applyWatermarks($validated);

        $service = app(OrderService::class);
        $order = $service->updateOrder($order, $validated, $request);

        return response()->json($order);
    }

    public function destroy(Order $order): JsonResponse
    {
        $this->authorize('delete', $order);

        $service = app(OrderService::class);
        $service->delete($order);

        return response()->json(['message' => 'Order berhasil dihapus']);
    }

    /**
     * Klaim task inspeksi (pickup/return) — siapa cepat dia dapat.
     * Task yang sudah diklaim petugas lain ditolak (409).
     */
    public function claim(Request $request, Order $order): JsonResponse
    {
        $this->authorize('claim', $order);

        $service = app(OrderService::class);
        $order = $service->claimTask($order, $request->user());

        return response()->json([
            'message' => 'Task berhasil diambil.',
            'order' => $order,
        ]);
    }

    /**
     * Lepas klaim task — oleh pemegang klaim atau admin.
     */
    public function release(Request $request, Order $order): JsonResponse
    {
        $this->authorize('release', $order);

        $service = app(OrderService::class);
        $order = $service->releaseTask($order, $request->user());

        return response()->json([
            'message' => 'Task dilepas dan kembali ke daftar tugas.',
            'order' => $order,
        ]);
    }

    private function storeUploadedFiles(Request $request): array
    {
        $paths = [];

        if ($request->hasFile('bukti_transfer')) {
            $paths['bukti_transfer_path'] = $request->file('bukti_transfer')->store('bukti-transfer', 'public');
        }
        if ($request->hasFile('bukti_pengembalian')) {
            $paths['bukti_pengembalian_path'] = $request->file('bukti_pengembalian')->store('bukti-pengembalian', 'public');
        }
        if ($request->hasFile('customer_foto_ktp')) {
            $paths['customer_foto_ktp_path'] = $request->file('customer_foto_ktp')->store('customers', 'public');
        }
        if ($request->hasFile('customer_foto_sim')) {
            $paths['customer_foto_sim_path'] = $request->file('customer_foto_sim')->store('customers', 'public');
        }

        return $paths;
    }

    private function applyWatermarks(array $validated): void
    {
        $watermarkPaths = array_filter([
            $validated['bukti_transfer_path'] ?? null,
            $validated['bukti_pengembalian_path'] ?? null,
        ]);
        $identityPaths = array_filter([
            $validated['customer_foto_ktp_path'] ?? null,
            $validated['customer_foto_sim_path'] ?? null,
        ]);

        if (empty($watermarkPaths) && empty($identityPaths)) {
            return;
        }

        try {
            $watermark = app(WatermarkService::class);
            foreach ($watermarkPaths as $path) {
                $watermark->applyToStoragePath($path);
            }
            foreach ($identityPaths as $path) {
                $watermark->applyToStoragePath($path, 'UDIN RENCTCAR • Identitas');
            }
        } catch (\Throwable $e) {
            report($e);
        }
    }
}
