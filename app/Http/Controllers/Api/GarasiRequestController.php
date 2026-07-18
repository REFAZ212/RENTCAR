<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\GarasiRequest;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class GarasiRequestController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = GarasiRequest::with(['order.customer', 'order.kendaraan', 'garasiPartner']);

        if ($request->has('status_permintaan')) {
            $query->where('status_permintaan', $request->status_permintaan);
        }

        $requests = $query->orderBy('created_at', 'desc')->paginate(15);

        return response()->json($requests);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'order_id' => 'required|exists:orders,id',
            'garasi_partner_id' => 'required|exists:garasi_partners,id',
            'pesan_wa_terkirim' => 'nullable|string',
            'deadline_minutes' => 'nullable|integer|min:5|max:120',
        ]);

        $validated['waktu_kirim'] = now();
        $validated['deadline'] = Carbon::now()->addMinutes($validated['deadline_minutes'] ?? 30);
        unset($validated['deadline_minutes']);

        $garasiRequest = GarasiRequest::create($validated);

        return response()->json($garasiRequest->load(['order.customer', 'order.kendaraan', 'garasiPartner']), 201);
    }

    public function show(GarasiRequest $garasiRequest): JsonResponse
    {
        $garasiRequest->load(['order.customer', 'order.kendaraan', 'garasiPartner', 'whatsappLogs']);

        return response()->json($garasiRequest);
    }

    public function update(Request $request, GarasiRequest $garasiRequest): JsonResponse
    {
        $validated = $request->validate([
            'status_permintaan' => 'required|in:pending,tersedia,tidak_terjawab',
            'catatan_garasi' => 'nullable|string',
        ]);

        if ($validated['status_permintaan'] !== 'pending') {
            $validated['waktu_respon'] = now();
        }

        $garasiRequest->update($validated);

        return response()->json($garasiRequest->load(['order.customer', 'order.kendaraan', 'garasiPartner']));
    }

    public function destroy(GarasiRequest $garasiRequest): JsonResponse
    {
        $garasiRequest->delete();

        return response()->json(['message' => 'Garasi request berhasil dihapus']);
    }
}
