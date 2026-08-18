<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SupirCalo;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

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
            'token' => $token,
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Berhasil logout']);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json($request->user()->only([
            'id', 'jenis', 'nama', 'email', 'no_hp', 'alamat',
            'status', 'no_sim', 'foto', 'tarif_per_hari', 'komisi', 'catatan',
        ]));
    }
}
