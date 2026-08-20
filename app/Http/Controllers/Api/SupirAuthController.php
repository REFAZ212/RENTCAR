<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SupirCalo;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
use Laravel\Sanctum\TransientToken;

class SupirAuthController extends Controller
{
    public function login(Request $request): JsonResponse
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required',
        ]);

        $supir = SupirCalo::where('email', $request->email)->first();

        if (! $supir || ! Hash::check($request->password, $supir->password)) {
            throw ValidationException::withMessages([
                'email' => ['Email atau password salah.'],
            ]);
        }

        if ($supir->status !== 'active') {
            throw ValidationException::withMessages([
                'email' => ['Akun Anda tidak aktif.'],
            ]);
        }

        $token = $supir->createToken('supir-auth-token')->plainTextToken;

        return response()->json([
            'supir' => $supir->only(['id', 'jenis', 'nama', 'email', 'no_hp', 'foto', 'status']),
            'wajib_ganti_password' => (bool) $supir->must_change_password,
            'token' => $token,
        ]);
    }

    public function ubahPassword(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'password_lama' => 'required|string',
            'password' => 'required|string|min:8|confirmed',
        ]);

        $supir = $request->user();

        if (! Hash::check($validated['password_lama'], $supir->password)) {
            throw ValidationException::withMessages([
                'password_lama' => ['Password lama tidak sesuai.'],
            ]);
        }

        if (Hash::check($validated['password'], $supir->password)) {
            throw ValidationException::withMessages([
                'password' => ['Password baru tidak boleh sama dengan password lama.'],
            ]);
        }

        $supir->password = $validated['password'];
        $supir->must_change_password = false;
        $supir->save();

        // Logout dari semua perangkat lain — simpan token saat ini.
        $currentToken = $supir->currentAccessToken();
        $currentTokenId = $currentToken && ! $currentToken instanceof TransientToken ? $currentToken->id : null;
        $supir->tokens()->where('id', '!=', $currentTokenId)->delete();

        return response()->json(['message' => 'Password berhasil diubah.']);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Berhasil logout']);
    }

    public function me(Request $request): JsonResponse
    {
        $supir = $request->user();

        return response()->json([
            ...$supir->only([
                'id', 'jenis', 'nama', 'email', 'no_hp', 'alamat',
                'status', 'no_sim', 'foto', 'tarif_per_hari', 'komisi', 'catatan',
            ]),
            'wajib_ganti_password' => (bool) $supir->must_change_password,
        ]);
    }
}
