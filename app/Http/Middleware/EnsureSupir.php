<?php

namespace App\Http\Middleware;

use App\Models\SupirCalo;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureSupir
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user instanceof SupirCalo) {
            return response()->json(['message' => 'Akses ditolak. Endpoint khusus aplikasi supir.'], 403);
        }

        if ($user->jenis !== 'supir') {
            return response()->json(['message' => 'Akun ini bukan supir.'], 403);
        }

        return $next($request);
    }
}
