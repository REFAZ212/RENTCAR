<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\EmailOtpService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class EmailOtpController extends Controller
{
    public function verify(Request $request, EmailOtpService $otpService): JsonResponse
    {
        $validated = $request->validate([
            'email' => 'required|email|exists:users,email',
            'otp' => 'required|string|size:6',
        ]);

        $user = User::where('email', $validated['email'])->first();

        if ($user->email_verified_at !== null) {
            return response()->json(['message' => 'Email sudah terverifikasi.', 'verified' => true]);
        }

        $result = $otpService->verify($validated['email'], $validated['otp']);

        if (! $result['ok']) {
            return response()->json(['message' => $result['message']], 422);
        }

        return response()->json(['message' => 'Email berhasil terverifikasi. Silakan login.', 'verified' => true]);
    }

    public function resend(Request $request, EmailOtpService $otpService): JsonResponse
    {
        $validated = $request->validate([
            'email' => 'required|email|exists:users,email',
        ]);

        $user = User::where('email', $validated['email'])->first();

        if ($user->email_verified_at !== null) {
            return response()->json(['message' => 'Email sudah terverifikasi, tidak perlu kode ulang.'], 422);
        }

        $otpService->send($user);

        return response()->json(['message' => 'Kode OTP baru telah dikirim ke email Anda.']);
    }
}
