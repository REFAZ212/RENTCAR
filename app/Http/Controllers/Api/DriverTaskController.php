<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DriverTask;
use App\Models\Order;
use App\Services\DriverNotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class DriverTaskController extends Controller
{
    public function __construct(protected DriverNotificationService $notifications) {}

    /**
     * Daftar semua tugas supir (admin dashboard).
     */
    public function index(Request $request): JsonResponse
    {
        $this->authorizeTask($request);

        $query = DriverTask::with(['kendaraan', 'order.customer', 'assignedDriver'])
            ->orderByDesc('id');

        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        if ($request->filled('search')) {
            $q = $request->input('search');
            $query->where(function ($w) use ($q) {
                $w->where('kode_task', 'like', "%{$q}%")
                    ->orWhere('pickup_location', 'like', "%{$q}%")
                    ->orWhere('destination_location', 'like', "%{$q}%")
                    ->orWhereHas('kendaraan', fn ($k) => $k->where('nama_kendaraan', 'like', "%{$q}%")
                        ->orWhere('plat_nomor', 'like', "%{$q}%"));
            });
        }

        return response()->json($query->paginate(20));
    }

    /**
     * Buat tugas baru — otomatis masuk pool AVAILABLE & notif semua supir available.
     */
    public function store(Request $request): JsonResponse
    {
        $this->authorizeTask($request);

        $validated = $request->validate([
            'order_id' => 'nullable|exists:orders,id',
            'kendaraan_id' => 'nullable|exists:kendaraans,id',
            'judul' => 'nullable|string|max:255',
            'deskripsi' => 'nullable|string',
            'pickup_location' => 'required|string|max:255',
            'pickup_lat' => 'nullable|numeric|between:-90,90',
            'pickup_lng' => 'nullable|numeric|between:-180,180',
            'destination_location' => 'required|string|max:255',
            'destination_lat' => 'nullable|numeric|between:-90,90',
            'destination_lng' => 'nullable|numeric|between:-180,180',
        ]);

        // Auto-fill kendaraan dari order bila tidak dikirim.
        if (empty($validated['kendaraan_id']) && ! empty($validated['order_id'])) {
            $order = Order::find($validated['order_id']);
            $validated['kendaraan_id'] = $order?->kendaraan_id;
        }

        $task = DriverTask::create(array_merge($validated, [
            'status' => DriverTask::STATUS_AVAILABLE,
            'created_by' => $request->user()->id,
        ]));

        $task->load(['kendaraan', 'order.customer']);

        $this->notifications->broadcastNewTask($task);

        return response()->json($task, 201);
    }

    public function show(Request $request, DriverTask $task): JsonResponse
    {
        $this->authorizeTask($request);

        $task->load(['kendaraan', 'order.customer', 'assignedDriver', 'inspectionBefore', 'inspectionAfter']);

        return response()->json($task);
    }

    /**
     * Batalkan tugas yang belum diambil (admin).
     */
    public function cancel(Request $request, DriverTask $task): JsonResponse
    {
        $this->authorizeTask($request);

        if (! in_array($task->status, [DriverTask::STATUS_PENDING, DriverTask::STATUS_AVAILABLE])) {
            throw ValidationException::withMessages([
                'status' => ['Tugas sudah diambil — tidak bisa dibatalkan langsung.'],
            ]);
        }

        $task->update([
            'status' => DriverTask::STATUS_CANCELLED,
            'cancelled_at' => now(),
            'cancel_reason' => $request->input('cancel_reason'),
        ]);

        return response()->json(['message' => 'Tugas dibatalkan.', 'task' => $task->fresh()]);
    }

    private function authorizeTask(Request $request): void
    {
        if (! in_array($request->user()->role, ['admin_utama', 'admin_operasional'])) {
            abort(403, 'Hanya admin yang dapat mengelola tugas supir.');
        }
    }
}
