<?php

namespace App\Http\Controllers;

use App\Models\GarasiRequest;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class GarasiResponseController extends Controller
{
    public function show(string $token): Response
    {
        $garasiRequest = GarasiRequest::with(['order.customer', 'order.kendaraan', 'garasiPartner'])
            ->where('token', $token)
            ->firstOrFail();

        return response()->view('garasi-response', [
            'garasiRequest' => $garasiRequest,
            'token' => $token,
        ]);
    }

    public function submit(Request $request, string $token): Response
    {
        $garasiRequest = GarasiRequest::with(['order', 'garasiPartner'])
            ->where('token', $token)
            ->firstOrFail();

        if ($garasiRequest->status_permintaan !== 'pending') {
            return response()->view('garasi-response', [
                'garasiRequest' => $garasiRequest,
                'token' => $token,
                'alreadyAnswered' => true,
            ]);
        }

        if ($garasiRequest->isExpired()) {
            return response()->view('garasi-response', [
                'garasiRequest' => $garasiRequest,
                'token' => $token,
                'expired' => true,
            ]);
        }

        $validated = $request->validate([
            'status' => 'required|in:tersedia,tidak_terjawab',
            'catatan_garasi' => 'nullable|string|max:500',
        ]);

        $garasiRequest->update([
            'status_permintaan' => $validated['status'],
            'catatan_garasi' => $validated['catatan_garasi'] ?? null,
            'waktu_respon' => now(),
        ]);

        return response()->view('garasi-response', [
            'garasiRequest' => $garasiRequest->fresh()->load(['order.customer', 'order.kendaraan', 'garasiPartner']),
            'token' => $token,
            'submitted' => true,
        ]);
    }
}
