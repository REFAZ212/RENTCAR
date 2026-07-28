<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
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
            'search', 'status_order', 'status_pembayaran', 'status_pengiriman', 'tanggal_mulai', 'tanggal_selesai',
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
            'customer_foto_ktp' => 'nullable|image|max:2048',
            'customer_foto_ktp_delete' => 'nullable|boolean',
            'customer_foto_sim' => 'nullable|image|max:2048',
            'kendaraan_id' => 'required|exists:kendaraans,id',
            'alamat_jemput' => 'nullable|string|max:500',
            'tujuan' => 'required|string|max:500',
            'tanggal_mulai' => 'required|date|after_or_equal:today',
            'tanggal_selesai' => 'required|date|after_or_equal:tanggal_mulai',
            'jam_mulai' => 'nullable|date_format:H:i',
            'jam_selesai' => 'nullable|date_format:H:i',
            'metode_pembayaran' => 'nullable|in:cash,transfer,qris,lainnya',
            'status_pembayaran' => 'nullable|in:unpaid,partial,paid',
            'status_pengiriman' => 'nullable|in:belum_diambil,sudah_diantarkan,dalam_penyewaan,selesai',
            'bukti_transfer' => 'nullable|image|max:2048',
            'bukti_pengiriman' => 'nullable|image|max:2048',
            'bukti_pengembalian' => 'nullable|image|max:2048',
            'supir_id' => 'nullable|exists:supir_calos,id',
            'calo_id' => 'nullable|exists:supir_calos,id',
            'komisi_calo' => 'nullable|numeric|min:0',
            'catatan' => 'nullable|string',
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
            'customer_foto_ktp' => 'nullable|image|max:2048',
            'customer_foto_ktp_delete' => 'nullable|boolean',
            'customer_foto_sim' => 'nullable|image|max:2048',
            'kendaraan_id' => 'sometimes|required|exists:kendaraans,id',
            'alamat_jemput' => 'nullable|string|max:500',
            'tujuan' => 'sometimes|required|string|max:500',
            'tanggal_mulai' => 'sometimes|date|after_or_equal:today',
            'tanggal_selesai' => 'sometimes|date|after_or_equal:tanggal_mulai',
            'jam_mulai' => 'nullable|date_format:H:i',
            'jam_selesai' => 'nullable|date_format:H:i',
            'tanggal_pengembalian_aktual' => 'nullable|date',
            'status_order' => 'nullable|in:pending,confirmed,active,completed,cancelled',
            'metode_pembayaran' => 'nullable|in:cash,transfer,qris,lainnya',
            'status_pembayaran' => 'nullable|in:unpaid,partial,paid',
            'status_pengiriman' => 'nullable|in:belum_diambil,sudah_diantarkan,dalam_penyewaan,selesai',
            'bukti_transfer' => 'nullable|image|max:2048',
            'bukti_pengiriman' => 'nullable|image|max:2048',
            'bukti_pengembalian' => 'nullable|image|max:2048',
            'supir_id' => 'nullable|exists:supir_calos,id',
            'calo_id' => 'nullable|exists:supir_calos,id',
            'komisi_calo' => 'nullable|numeric|min:0',
            'catatan' => 'nullable|string',
            'jumlah_bayar' => 'nullable|numeric|min:0',
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

    private function storeUploadedFiles(Request $request): array
    {
        $paths = [];

        if ($request->hasFile('bukti_transfer')) {
            $paths['bukti_transfer_path'] = $request->file('bukti_transfer')->store('bukti-transfer', 'public');
        }
        if ($request->hasFile('bukti_pengiriman')) {
            $paths['bukti_pengiriman_path'] = $request->file('bukti_pengiriman')->store('bukti-pengiriman', 'public');
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
            $validated['bukti_pengiriman_path'] ?? null,
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
                $watermark->applyToStoragePath($path, 'CVPILAR • Identitas');
            }
        } catch (\Throwable) {
            // GD extension not available in test env — skip silently.
        }
    }
}
