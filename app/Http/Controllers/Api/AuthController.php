<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\UserDevice;
use App\Services\EmailOtpService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    /**
     * Login admin.
     *
     * Alur:
     * 1. Cek email dan password
     * 2. Cek verifikasi email
     * 3. Cek device yang digunakan
     * 4. Jika device dipercaya -> login langsung
     * 5. Jika device baru -> kirim OTP login
     */
    public function login(
        Request $request,
        EmailOtpService $otpService
    ): JsonResponse {
        $validated = $request->validate([
            'email' => 'required|email',
            'password' => 'required',
            'device_id' => 'required|string|max:100',
        ]);

        $user = User::where('email', $validated['email'])->first();

        /*
         * Email atau password salah.
         */
        if (! $user || ! Hash::check($validated['password'], $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['Email atau password salah.'],
            ]);
        }

        /*
         * Email belum diverifikasi.
         *
         * Tetap menggunakan OTP verify_email
         * yang sudah berjalan sebelumnya.
         */
        if ($user->email_verified_at === null) {
            $otpService->send($user);

            return response()->json([
                'message' => 'Email belum diverifikasi. Kode OTP telah dikirim ke email Anda.',
                'unverified' => true,
                'email' => $user->email,
            ], 422);
        }

        /*
         * Device ID dari browser di-hash sebelum
         * digunakan untuk pencarian database.
         */
        $deviceId = hash('sha256', $validated['device_id']);

        /*
         * Cari device milik user.
         */
        $device = UserDevice::where('user_id', $user->id)
            ->where('device_id', $deviceId)
            ->first();

        /*
         * Jika device sudah dipercaya dan masa trust
         * belum habis, login langsung tanpa OTP.
         */
        if ($device && $device->isTrusted()) {
            $device->update([
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent(),
                'last_used_at' => now(),
            ]);

            return $this->createLoginToken($user);
        }

        /*
         * Device baru atau masa trust sudah habis.
         *
         * Kirim OTP khusus login.
         */
        $otpService->sendLoginOtp($user);

        return response()->json([
            'message' => 'Device baru terdeteksi. Kode OTP login telah dikirim ke email Anda.',
            'requires_otp' => true,
            'email' => $user->email,
            'device_id' => $validated['device_id'],
        ], 422);
    }

    /**
     * Membuat token login.
     */
    private function createLoginToken(User $user): JsonResponse
    {
        $token = $user->createToken('auth-token')->plainTextToken;

        return response()->json([
            'user' => $user,
            'token' => $token,
        ]);
    }

    /**
     * Logout.
     */
    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'message' => 'Berhasil logout',
        ]);
    }

    /**
     * Mendapatkan data user yang sedang login.
     */
    public function me(Request $request): JsonResponse
    {
        return response()->json($request->user());
    }
}
