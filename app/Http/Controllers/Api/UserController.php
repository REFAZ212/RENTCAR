<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\SupirCalo;
use App\Models\User;
use App\Services\WatermarkService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class UserController extends Controller
{
    private static function nyambiRules(): array
    {
        return [
            'phone' => 'required|string|max:20',
            'no_sim' => 'required|string|max:64',
            'tarif_per_hari' => 'required|numeric|min:0',
        ];
    }

    /**
     * Sinkronkan record SupirCalo (jenis supir) milik user.
     * One-way sync: nama & no_hp selalu mengikuti user.
     */
    private function syncSupirCalo(User $user, bool $nyambi, array $data): void
    {
        $supir = $user->supirCalo;

        if (! $nyambi) {
            if (! $supir) {
                return;
            }

            $hasActiveOrder = Order::where('supir_id', $supir->id)
                ->whereIn('status_order', ['pending', 'confirmed', 'active'])
                ->exists();

            if ($hasActiveOrder) {
                $supir->update(['user_id' => null]);
            } else {
                $supir->delete();
            }

            return;
        }

        $payload = [
            'user_id' => $user->id,
            'jenis' => 'supir',
            'nama' => $user->name,
            'no_hp' => $user->phone ?? '',
            'status' => 'active',
        ];

        if (array_key_exists('no_sim', $data)) {
            $payload['no_sim'] = $data['no_sim'];
        }
        if (array_key_exists('tarif_per_hari', $data)) {
            $payload['tarif_per_hari'] = $data['tarif_per_hari'];
        }

        if ($supir) {
            $supir->update($payload);
        } else {
            SupirCalo::create($payload);
        }
    }

    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', User::class);

        $query = User::query();

        if ($request->filled('role')) {
            $query->where('role', $request->role);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                whereLikeEscaped($q, 'name', $search);
                whereLikeEscaped($q, 'email', $search);
            });
        }

        $users = $query->withCount('orders')->with('supirCalo')->orderBy('created_at', 'desc')->paginate(15);

        return response()->json($users);
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorize('create', User::class);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'phone' => ['nullable', 'string', 'max:20', Rule::requiredIf($request->input('role') === 'petugas')],
            'role' => 'required|in:admin_utama,admin_operasional,petugas',
            'password' => ['required', 'confirmed', Password::min(8)],
            'avatar' => 'nullable|image|max:2048|dimensions:max_width=10000,max_height=10000',
            'nyambi_supir' => 'nullable|boolean',
            'no_sim' => 'nullable|string|max:64',
            'tarif_per_hari' => 'nullable|numeric|min:0',
        ]);

        $nyambi = (bool) ($validated['nyambi_supir'] ?? false);

        if ($nyambi) {
            $validated = array_merge($validated, $request->validate(self::nyambiRules()));
        }

        $validated['password'] = Hash::make($validated['password']);

        if ($request->hasFile('avatar')) {
            $validated['avatar'] = $request->file('avatar')->store('avatars', 'public');
            try {
                $watermark = app(WatermarkService::class);
                $watermark->applyToStoragePath($validated['avatar']);
            } catch (\Throwable $e) {
                report($e);
            }
        }

        $user = User::create($validated);

        if ($nyambi) {
            $this->syncSupirCalo($user, true, $validated);
        }

        return response()->json($user, 201);
    }

    public function show(User $user): JsonResponse
    {
        $this->authorize('view', $user);

        $user->loadCount('orders');

        return response()->json($user);
    }

    public function update(Request $request, User $user): JsonResponse
    {
        $this->authorize('update', $user);

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'email' => 'sometimes|required|email|unique:users,email,'.$user->id,
            'phone' => ['sometimes', 'nullable', 'string', 'max:20', Rule::requiredIf(($request->input('role') ?? $user->role) === 'petugas')],
            'role' => 'sometimes|required|in:admin_utama,admin_operasional,petugas',
            'password' => ['nullable', 'confirmed', Password::min(8)],
            'avatar' => 'nullable|image|max:2048|dimensions:max_width=10000,max_height=10000',
            'nyambi_supir' => 'nullable|boolean',
            'no_sim' => 'nullable|string|max:64',
            'tarif_per_hari' => 'nullable|numeric|min:0',
        ]);

        $nyambi = $request->has('nyambi_supir')
            ? $request->boolean('nyambi_supir')
            : $user->supirCalo !== null;

        if ($nyambi && ($request->has('no_sim') || $request->has('tarif_per_hari') || $request->has('nyambi_supir'))) {
            $validated = array_merge($validated, $request->validate(self::nyambiRules()));
        }

        if (! empty($validated['password'])) {
            $validated['password'] = Hash::make($validated['password']);
        } else {
            unset($validated['password']);
        }

        if ($request->hasFile('avatar')) {
            if ($user->avatar && Storage::disk('public')->exists($user->avatar)) {
                Storage::disk('public')->delete($user->avatar);
            }
            $validated['avatar'] = $request->file('avatar')->store('avatars', 'public');
            try {
                $watermark = app(WatermarkService::class);
                $watermark->applyToStoragePath($validated['avatar']);
            } catch (\Throwable $e) {
                report($e);
            }
        }

        $user->update($validated);

        $this->syncSupirCalo($user, $nyambi, $validated);

        return response()->json($user);
    }

    public function destroy(User $user): JsonResponse
    {
        $this->authorize('delete', $user);

        if ($user->id === auth()->id()) {
            return response()->json(['message' => 'Tidak bisa menghapus akun sendiri.'], 422);
        }

        $user->delete();

        return response()->json(['message' => 'User berhasil dihapus']);
    }
}
