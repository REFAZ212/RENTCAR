<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Services\WatermarkService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class CustomerController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Customer::class);

        $query = Customer::query();

        if ($request->boolean('trashed')) {
            $query->onlyTrashed();
        }

        if ($request->search) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                whereLikeEscaped($q, 'nama_lengkap', $search);
                $q->orWhereRaw("no_hp LIKE ? ESCAPE '#'", ['%'.escapeLike($search).'%']);
                $q->orWhereRaw("no_ktp LIKE ? ESCAPE '#'", ['%'.escapeLike($search).'%']);
            });
        }

        $customer = $query->withCount('orders')
            ->with(['latestOrder' => function ($q) {
                $q->with('kendaraan');
            }])
            ->orderBy('created_at', 'desc')
            ->paginate(15);

        return response()->json($customer);
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorize('create', Customer::class);

        $validated = $request->validate([
            'nama_lengkap' => 'required|string|max:255',
            'no_hp' => 'required|string|max:255',
            'email' => 'nullable|email',
            'alamat' => 'required|string',
            'no_ktp' => 'nullable|string|unique:customers,no_ktp',
            'no_sim' => 'required|string',
            'foto_ktp' => 'nullable|image|max:2048|dimensions:max_width=10000,max_height=10000',
            'foto_sim' => 'nullable|image|max:2048|dimensions:max_width=10000,max_height=10000',
            'catatan' => 'nullable|string',
        ]);

        if ($request->hasFile('foto_ktp')) {
            $validated['foto_ktp'] = $request->file('foto_ktp')->store('customers', 'public');
        }

        if ($request->hasFile('foto_sim')) {
            $validated['foto_sim'] = $request->file('foto_sim')->store('customers', 'public');
        }

        $customer = Customer::create($validated);

        // ── Watermark ──
        try {
            $wm = app(WatermarkService::class);
            foreach (array_filter([$validated['foto_ktp'] ?? null, $validated['foto_sim'] ?? null]) as $path) {
                $wm->applyToStoragePath($path, 'UDIN RENCTCAR • Identitas');
            }
        } catch (\Throwable $e) {
            report($e);
        }

        return response()->json($customer, 201);
    }

    public function show(Customer $customer): JsonResponse
    {
        $this->authorize('view', $customer);

        $customer->load(['orders' => function ($q) {
            $q->with('kendaraan')->latest();
        }]);

        $customer->orders_count = $customer->orders()->count();

        return response()->json($customer);
    }

    public function update(Request $request, Customer $customer): JsonResponse
    {
        $this->authorize('update', $customer);

        $validated = $request->validate([
            'nama_lengkap' => 'required|string|max:255',
            'no_hp' => 'required|string|max:255',
            'email' => 'nullable|email',
            'alamat' => 'sometimes|required|string',
            'no_ktp' => 'nullable|string|unique:customers,no_ktp,'.$customer->id,
            'no_sim' => 'sometimes|required|string',
            'foto_ktp' => 'nullable|image|max:2048|dimensions:max_width=10000,max_height=10000',
            'foto_sim' => 'nullable|image|max:2048|dimensions:max_width=10000,max_height=10000',
            'catatan' => 'nullable|string',
        ]);

        $updatedPaths = [];
        if ($request->hasFile('foto_ktp')) {
            if ($customer->foto_ktp) {
                Storage::disk('public')->delete($customer->foto_ktp);
            }
            $validated['foto_ktp'] = $request->file('foto_ktp')->store('customers', 'public');
            $updatedPaths[] = $validated['foto_ktp'];
        }

        if ($request->hasFile('foto_sim')) {
            if ($customer->foto_sim) {
                Storage::disk('public')->delete($customer->foto_sim);
            }
            $validated['foto_sim'] = $request->file('foto_sim')->store('customers', 'public');
            $updatedPaths[] = $validated['foto_sim'];
        }

        $customer->update($validated);

        // ── Watermark ──
        if ($updatedPaths) {
            try {
                $wm = app(WatermarkService::class);
                foreach ($updatedPaths as $path) {
                    $wm->applyToStoragePath($path, 'UDIN RENCTCAR • Identitas');
                }
            } catch (\Throwable $e) {
                report($e);
            }
        }

        return response()->json($customer);
    }

    public function destroy(Customer $customer): JsonResponse
    {
        $this->authorize('delete', $customer);

        $hasActiveOrder = $customer->orders()
            ->whereIn('status_order', ['pending', 'confirmed', 'active'])
            ->exists();

        if ($hasActiveOrder) {
            return response()->json([
                'message' => 'Tidak bisa menghapus customer yang memiliki order aktif. Selesaikan atau batalkan order terlebih dahulu.',
            ], 422);
        }

        $customer->delete();

        return response()->json(['message' => 'Customer berhasil dihapus']);
    }

    public function restore(Customer $customer): JsonResponse
    {
        $this->authorize('delete', $customer);

        if (! $customer->trashed()) {
            return response()->json([
                'message' => 'Customer tidak dalam status arsip.',
            ], 422);
        }

        $customer->restore();

        return response()->json(['message' => 'Customer berhasil dipulihkan']);
    }
}
