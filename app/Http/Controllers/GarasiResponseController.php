<?php

namespace App\Http\Controllers;

use App\Models\GarasiRequest;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;

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
        $result = DB::transaction(function () use ($request, $token) {
            $garasiRequest = GarasiRequest::with(['order', 'garasiPartner'])
                ->where('token', $token)
                ->lockForUpdate()
                ->firstOrFail();

            if ($garasiRequest->status_permintaan !== 'pending') {
                return ['garasiRequest' => $garasiRequest, 'alreadyAnswered' => true];
            }

            if ($garasiRequest->isExpired()) {
                return ['garasiRequest' => $garasiRequest, 'expired' => true];
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

            return ['garasiRequest' => $garasiRequest->fresh()->load(['order.customer', 'order.kendaraan', 'garasiPartner']), 'submitted' => true];
        });

        return response()->view('garasi-response', [
            'garasiRequest' => $result['garasiRequest'],
            'token' => $token,
            'alreadyAnswered' => $result['alreadyAnswered'] ?? false,
            'expired' => $result['expired'] ?? false,
            'submitted' => $result['submitted'] ?? false,
        ]);
    }
}
