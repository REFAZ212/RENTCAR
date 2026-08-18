<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\WhatsappLog;
use App\Services\WhatsAppService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class WhatsAppLogController extends Controller
{
    /**
     * Riwayat WhatsApp yang memerlukan perhatian: status 'diantri' (belum
     * diproses queue) dan 'gagal'. Tidak menampilkan yang 'terkirim' karena
     * riwayat sukses sudah bisa dilihat langsung di WhatsApp itu sendiri.
     */
    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', WhatsappLog::class);

        $query = WhatsappLog::with(['order.customer', 'order.kendaraan', 'garasiRequest'])
            ->orderBy('created_at', 'desc');

        if ($request->filled('status')) {
            $query->where('status_kirim', $request->status);
        } else {
            $query->whereIn('status_kirim', ['diantri', 'gagal']);
        }

        if ($request->filled('type')) {
            $query->where('type', $request->type);
        }

        if ($request->filled('order_id')) {
            $query->where('order_id', $request->order_id);
        }

        $logs = $query->paginate(min((int) $request->input('per_page', 20), 50));

        return response()->json($logs);
    }

    /**
     * Kirim ulang pesan dari log yang gagal. Dicatat sebagai log BARU
     * (dengan status asli) supaya riwayat setiap percobaan tetap jujur.
     */
    public function retry(WhatsappLog $log): JsonResponse
    {
        $this->authorize('retry', $log);

        if (! in_array($log->status_kirim, ['diantri', 'gagal'], true)) {
            return response()->json(['message' => 'Hanya log berstatus diantri/gagal yang bisa dikirim ulang.'], 422);
        }

        $wa = app(WhatsAppService::class);
        $wa->kirimPesanAsync($log->nomor_tujuan, $log->pesan, $log->type, $log->order_id);

        return response()->json(['message' => 'Pesan dikirim ulang dan dicatat sebagai riwayat baru.']);
    }
}
