<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\UserDevice;
use App\Services\EmailOtpService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class EmailOtpController extends Controller
{
    /**
     * Verifikasi OTP untuk verifikasi email.
     */
    public function verify(
        Request $request,
        EmailOtpService $otpService
    ): JsonResponse {
        $validated = $request->validate([
            'email' => 'required|email|exists:users,email',
            'otp' => 'required|string|size:6',
        ]);

        $user = User::where('email', $validated['email'])->first();

        if ($user->email_verified_at !== null) {
            return response()->json([
                'message' => 'Email sudah terverifikasi.',
                'verified' => true,
            ]);
        }

        $result = $otpService->verify(
            $validated['email'],
            $validated['otp']
        );

        if (! $result['ok']) {
            return response()->json([
                'message' => $result['message'],
            ], 422);
        }

        return response()->json([
            'message' => 'Email berhasil terverifikasi. Silakan login.',
            'verified' => true,
        ]);
    }

    /**
     * Kirim ulang OTP verifikasi email.
     */
    public function resend(
        Request $request,
        EmailOtpService $otpService
    ): JsonResponse {
        $validated = $request->validate([
            'email' => 'required|email|exists:users,email',
        ]);

        $user = User::where('email', $validated['email'])->first();

        if ($user->email_verified_at !== null) {
            return response()->json([
                'message' => 'Email sudah terverifikasi, tidak perlu kode ulang.',
            ], 422);
        }

        $otpService->send($user);

        return response()->json([
            'message' => 'Kode OTP baru telah dikirim ke email Anda.',
        ]);
    }

    /**
     * Verifikasi OTP login dari device baru.
     *
     * Setelah OTP benar:
     * - Device disimpan
     * - Device dipercaya selama 30 hari
     * - Token login dibuat
     */
    public function verifyLogin(
        Request $request,
        EmailOtpService $otpService
    ): JsonResponse {
        $validated = $request->validate([
            'email' => 'required|email|exists:users,email',
            'otp' => 'required|string|size:6',
            'device_id' => 'required|string|max:100',
        ]);

        $user = User::where('email', $validated['email'])->first();

        /*
         * Pastikan email memang sudah diverifikasi.
         */
        if ($user->email_verified_at === null) {
            return response()->json([
                'message' => 'Email belum diverifikasi.',
                'unverified' => true,
            ], 422);
        }

        /*
         * Verifikasi OTP login.
         */
        $result = $otpService->verifyLoginOtp(
            $validated['email'],
            $validated['otp']
        );

        if (! $result['ok']) {
            return response()->json([
                'message' => $result['message'],
            ], 422);
        }

        /*
         * Hash device ID sebelum disimpan.
         */
        $deviceId = hash(
            'sha256',
            $validated['device_id']
        );

        /*
         * Simpan atau update device.
         *
         * Device dipercaya selama 30 hari.
         */
        UserDevice::updateOrCreate(
            [
                'user_id' => $user->id,
                'device_id' => $deviceId,
            ],
            [
                'device_name' => $this->getDeviceName(
                    $request->userAgent()
                ),
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent(),
                'last_used_at' => now(),
                'trusted_until' => now()->addDays(30),
            ]
        );

        /*
         * Buat token login setelah OTP benar.
         */
        $token = $user
            ->createToken('auth-token')
            ->plainTextToken;

        return response()->json([
            'message' => 'Verifikasi OTP berhasil. Login berhasil.',
            'user' => $user,
            'token' => $token,
        ]);
    }

    /**
     * Kirim ulang OTP login untuk device baru.
     */
    public function resendLogin(
        Request $request,
        EmailOtpService $otpService
    ): JsonResponse {
        $validated = $request->validate([
            'email' => 'required|email|exists:users,email',
        ]);

        $user = User::where('email', $validated['email'])->first();

        /*
         * Email harus sudah diverifikasi.
         */
        if ($user->email_verified_at === null) {
            return response()->json([
                'message' => 'Email belum diverifikasi.',
                'unverified' => true,
            ], 422);
        }

        $otpService->sendLoginOtp($user);

        return response()->json([
            'message' => 'Kode OTP login baru telah dikirim ke email Anda.',
        ]);
    }

    /**
     * Nama sederhana untuk device.
     *
     * User-Agent tetap disimpan sebagai informasi lengkap.
     */
    private function getDeviceName(?string $userAgent): string
    {
        if (! $userAgent) {
            return 'Unknown Device';
        }

        if (str_contains($userAgent, 'Windows')) {
            return 'Windows Browser';
        }

        if (str_contains($userAgent, 'Android')) {
            return 'Android Browser';
        }

        if (str_contains($userAgent, 'iPhone')) {
            return 'iPhone Browser';
        }

        if (str_contains($userAgent, 'Macintosh')) {
            return 'Mac Browser';
        }

        if (str_contains($userAgent, 'Linux')) {
            return 'Linux Browser';
        }

        return 'Unknown Device';
    }
}