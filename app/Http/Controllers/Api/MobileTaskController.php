<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DriverTask;
use App\Models\InspeksiKendaraan;
use App\Models\Notification;
use App\Services\DriverTaskService;
use App\Services\WatermarkService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;

class MobileTaskController extends Controller
{
    private const INSIGNIA_RULES = [
        'fuel_level' => 'required|in:kosong,1/8,1/4,3/8,1/2,5/8,3/4,7/8,full',
        'kondisi_body' => 'required|in:baik,lecet_ringan,lecet_parah,penyok,retak',
        'kondisi_interior' => 'nullable|in:baik,kotor_ringan,kotor_banyak,rusak',
        'kondisi_ban' => 'nullable|in:baik,tipis,gundul,kosong',
        'kondisi_ac' => 'nullable|in:baik,tidak_baik',
        'kondisi_lampu' => 'nullable|in:baik,tidak_baik',
    ];

    private const MULTIMEDIA_RULES = [
        'fotos' => 'nullable|array',
        'fotos.*' => 'image|mimes:jpeg,png,webp|max:10240',
        'videos' => 'nullable|array',
        'videos.*' => 'mimetypes:video/mp4,video/quicktime,video/webm|max:102400',
    ];

    /**
     * Daftar tugas yang tersedia untuk diambil (AVAILABLE).
     */
    public function available(Request $request): JsonResponse
    {
        $driver = $request->user();

        if ($driver->driver_status === 'busy') {
            return response()->json([
                'tasks' => [],
                'message' => 'Anda sedang memiliki tugas aktif.',
                'active_task' => $this->serializeTask($driver->activeDriverTask()),
            ]);
        }

        $tasks = DriverTask::with(['kendaraan', 'order.customer'])
            ->where('status', DriverTask::STATUS_AVAILABLE)
            ->orderByDesc('id')
            ->get();

        return response()->json([
            'tasks' => $tasks->map(fn ($t) => $this->serializeTask($t))->values(),
        ]);
    }

    /**
     * Tugas aktif milik supir saat ini.
     */
    public function myActive(Request $request): JsonResponse
    {
        $driver = $request->user();

        $task = $driver->activeDriverTask();

        if (! $task) {
            return response()->json(['task' => null]);
        }

        return response()->json([
            'task' => $this->serializeTask($task->load([
                'kendaraan', 'order.customer', 'assignedDriver',
                'inspectionBefore', 'inspectionAfter',
            ])),
        ]);
    }

    /**
     * Ambil tugas — atomic first come first served.
     * Menolak (409) bila supir sudah BUSY (punya tugas aktif).
     */
    public function accept(Request $request, DriverTask $task, DriverTaskService $service): JsonResponse
    {
        try {
            $task = $service->accept($task, $request->user());

            return response()->json([
                'message' => '✓ Tugas berhasil diambil.',
                'task' => $this->serializeTask($task),
                'driver_status' => 'busy',
            ]);
        } catch (ConflictHttpException $e) {
            return response()->json(['message' => $e->getMessage()], 409);
        }
    }

    /**
     * Mulai inspeksi awal.
     */
    public function startInspectionBefore(Request $request, DriverTask $task, DriverTaskService $service): JsonResponse
    {
        try {
            $task = $service->startInspectionBefore($task, $request->user());

            return response()->json([
                'message' => 'Inspeksi awal dimulai.',
                'task' => $this->serializeTask($task),
            ]);
        } catch (ConflictHttpException $e) {
            return response()->json(['message' => $e->getMessage()], 409);
        } catch (AccessDeniedHttpException $e) {
            return response()->json(['message' => $e->getMessage()], 403);
        }
    }

    /**
     * Simpan hasil inspeksi awal.
     */
    public function inspectionBefore(Request $request, DriverTask $task, DriverTaskService $service): JsonResponse
    {
        try {
            $validated = $request->validate(array_merge([
                'odometer' => 'nullable|integer|min:0',
                'ada_damagenya' => 'nullable|boolean',
                'deskripsi_kondisi' => 'nullable|string',
                'catatan' => 'nullable|string',
                'biaya_kerusakan' => 'nullable|numeric|min:0',
                'latitude' => 'nullable|numeric|between:-90,90',
                'longitude' => 'nullable|numeric|between:-180,180',
                'accuracy' => 'nullable|numeric|min:0',
                'location' => 'nullable|string|max:255',
                'captured_at' => 'nullable|date',
                'watermarked' => 'nullable|boolean',
            ], self::INSIGNIA_RULES, self::MULTIMEDIA_RULES));

            $fotoPaths = $this->simpanFotoTask($request, $validated, $task);
            $videoPaths = $this->simpanVideoTask($request);

            $inspeksi = $service->storeInspectionBefore(
                $task,
                $request->user(),
                $this->dataInspeksi($validated),
                $fotoPaths,
                $videoPaths
            );

            return response()->json([
                'message' => 'Inspeksi awal tersimpan.',
                'inspeksi' => $inspeksi->fresh()->load('driverTask.kendaraan'),
                'task' => $this->serializeTask($task->fresh()->load(['kendaraan', 'inspectionBefore', 'inspectionAfter'])),
            ], 201);
        } catch (ValidationException $e) {
            throw $e;
        } catch (ConflictHttpException $e) {
            return response()->json(['message' => $e->getMessage()], 409);
        } catch (AccessDeniedHttpException $e) {
            return response()->json(['message' => $e->getMessage()], 403);
        }
    }

    /**
     * Mulai pengantaran — simpan GPS & waktu mulai.
     */
    public function startDelivery(Request $request, DriverTask $task, DriverTaskService $service): JsonResponse
    {
        $validated = $request->validate([
            'latitude' => 'nullable|numeric|between:-90,90',
            'longitude' => 'nullable|numeric|between:-180,180',
            'accuracy' => 'nullable|numeric|min:0',
        ]);

        try {
            $task = $service->startDelivery(
                $task,
                $request->user(),
                isset($validated['latitude']) ? (float) $validated['latitude'] : null,
                isset($validated['longitude']) ? (float) $validated['longitude'] : null,
                isset($validated['accuracy']) ? (float) $validated['accuracy'] : null,
            );

            return response()->json([
                'message' => 'Pengantaran dimulai.',
                'task' => $this->serializeTask($task),
            ]);
        } catch (ConflictHttpException $e) {
            return response()->json(['message' => $e->getMessage()], 409);
        } catch (AccessDeniedHttpException $e) {
            return response()->json(['message' => $e->getMessage()], 403);
        }
    }

    /**
     * Kendaraan sampai tujuan.
     */
    public function arrive(Request $request, DriverTask $task, DriverTaskService $service): JsonResponse
    {
        $validated = $request->validate([
            'latitude' => 'nullable|numeric|between:-90,90',
            'longitude' => 'nullable|numeric|between:-180,180',
            'accuracy' => 'nullable|numeric|min:0',
        ]);

        try {
            $task = $service->arrive(
                $task,
                $request->user(),
                isset($validated['latitude']) ? (float) $validated['latitude'] : null,
                isset($validated['longitude']) ? (float) $validated['longitude'] : null,
                isset($validated['accuracy']) ? (float) $validated['accuracy'] : null,
            );

            return response()->json([
                'message' => 'Kendaraan tiba di tujuan — lakukan inspeksi akhir.',
                'task' => $this->serializeTask($task),
            ]);
        } catch (ConflictHttpException $e) {
            return response()->json(['message' => $e->getMessage()], 409);
        } catch (AccessDeniedHttpException $e) {
            return response()->json(['message' => $e->getMessage()], 403);
        }
    }

    /**
     * Simpan hasil inspeksi akhir.
     */
    public function inspectionAfter(Request $request, DriverTask $task, DriverTaskService $service): JsonResponse
    {
        try {
            $validated = $request->validate(array_merge([
                'odometer' => 'nullable|integer|min:0',
                'ada_damagenya' => 'nullable|boolean',
                'deskripsi_kondisi' => 'nullable|string',
                'catatan' => 'nullable|string',
                'biaya_kerusakan' => 'nullable|numeric|min:0',
                'latitude' => 'nullable|numeric|between:-90,90',
                'longitude' => 'nullable|numeric|between:-180,180',
                'accuracy' => 'nullable|numeric|min:0',
                'location' => 'nullable|string|max:255',
                'captured_at' => 'nullable|date',
                'watermarked' => 'nullable|boolean',
            ], self::INSIGNIA_RULES, self::MULTIMEDIA_RULES));

            $fotoPaths = $this->simpanFotoTask($request, $validated, $task);
            $videoPaths = $this->simpanVideoTask($request);

            $inspeksi = $service->storeInspectionAfter(
                $task,
                $request->user(),
                $this->dataInspeksi($validated),
                $fotoPaths,
                $videoPaths
            );

            return response()->json([
                'message' => 'Inspeksi akhir tersimpan — tugas siap diselesaikan.',
                'inspeksi' => $inspeksi->fresh()->load('driverTask.kendaraan'),
                'task' => $this->serializeTask($task->fresh()->load(['kendaraan', 'inspectionBefore', 'inspectionAfter'])),
            ], 201);
        } catch (ValidationException $e) {
            throw $e;
        } catch (ConflictHttpException $e) {
            return response()->json(['message' => $e->getMessage()], 409);
        } catch (AccessDeniedHttpException $e) {
            return response()->json(['message' => $e->getMessage()], 403);
        }
    }

    /**
     * Selesaikan tugas — supir kembali AVAILABLE.
     */
    public function complete(Request $request, DriverTask $task, DriverTaskService $service): JsonResponse
    {
        try {
            $task = $service->complete($task, $request->user());

            return response()->json([
                'message' => '✓ Tugas selesai. Anda kembali available untuk tugas baru.',
                'task' => $this->serializeTask($task),
                'driver_status' => 'available',
            ]);
        } catch (ConflictHttpException $e) {
            return response()->json(['message' => $e->getMessage()], 409);
        } catch (AccessDeniedHttpException $e) {
            return response()->json(['message' => $e->getMessage()], 403);
        }
    }

    /**
     * Detail satu tugas (hanya miliknya / tugas available).
     */
    public function show(Request $request, DriverTask $task): JsonResponse
    {
        $driver = $request->user();

        if ($task->status !== DriverTask::STATUS_AVAILABLE
            && $task->assigned_driver_id !== $driver->id) {
            return response()->json(['message' => 'Tugas ini tidak dapat diakses.'], 403);
        }

        return response()->json([
            'task' => $this->serializeTask($task->load([
                'kendaraan', 'order.customer', 'assignedDriver',
                'inspectionBefore', 'inspectionAfter',
            ])),
        ]);
    }

    /**
     * Sinkronisasi media (foto/video inspeksi) dari perangkat offline.
     * Dipanggil berulang sampai semua item queue ter-upload.
     *
     * @return array{uploaded: int, items: array<int, array<string, mixed>>}
     */
    public function syncMedia(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'items' => 'required|array|min:1|max:20',
            'items.*.task_id' => 'nullable|integer|exists:driver_tasks,id',
            'items.*.type' => 'required|in:photo,video',
            'items.*.jenis' => 'required|in:pickup,return',
            'items.*.latitude' => 'nullable|numeric|between:-90,90',
            'items.*.longitude' => 'nullable|numeric|between:-180,180',
            'items.*.accuracy' => 'nullable|numeric|min:0',
            'items.*.location' => 'nullable|string|max:255',
            'items.*.captured_at' => 'nullable|date',
            'items.*.watermarked' => 'nullable|boolean',
        ]);

        $files = $request->file('items', []);
        $driver = $request->user();

        $result = [];
        foreach ($validated['items'] as $index => $item) {
            $file = $files[$index] ?? null;

            if (! $file) {
                $result[] = [
                    'index' => $index,
                    'success' => false,
                    'error' => 'File tidak ditemukan.',
                ];

                continue;
            }

            try {
                if ($item['type'] === 'photo') {
                    $task = isset($item['task_id']) ? DriverTask::find($item['task_id']) : null;

                    $storagePath = $file->store('inspeksi/task/sync', 'public');
                    $meta = [
                        'driver_name' => $driver->nama,
                        'location' => $item['location'] ?? $task?->pickup_location,
                        'latitude' => $item['latitude'] ?? null,
                        'longitude' => $item['longitude'] ?? null,
                        'accuracy' => $item['accuracy'] ?? null,
                        'captured_at' => $item['captured_at'] ?? now(),
                        'task_code' => $task?->kode_task,
                    ];

                    $watermarked = ! filter_var($item['watermarked'] ?? false, FILTER_VALIDATE_BOOLEAN)
                        ? app(WatermarkService::class)->applyDriverWatermark($storagePath, $meta)
                        : $storagePath;
                    if ($watermarked && $watermarked !== $storagePath) {
                        Storage::disk('public')->delete($storagePath);
                    }

                    $result[] = [
                        'index' => $index,
                        'success' => true,
                        'path' => $watermarked ?? $storagePath,
                    ];
                } else {
                    $result[] = [
                        'index' => $index,
                        'success' => true,
                        'path' => $file->store('inspeksi/task/sync/videos', 'public'),
                    ];
                }
            } catch (\Throwable $e) {
                $result[] = [
                    'index' => $index,
                    'success' => false,
                    'error' => $e->getMessage(),
                ];
            }
        }

        $uploaded = collect($result)->where('success', true)->count();

        return response()->json([
            'uploaded' => $uploaded,
            'items' => $result,
        ]);
    }

    /* ─────────────────────────────────────────────────────────────
     * NOTIFIKASI SUPIR
     * ───────────────────────────────────────────────────────────── */

    /**
     * Daftar notifikasi milik supir yang sedang login.
     */
    public function notifications(Request $request): JsonResponse
    {
        $perPage = max(1, min((int) $request->query('per_page', 20), 100));

        $notifications = Notification::query()
            ->where('supir_id', $request->user()->id)
            ->orderByDesc('id')
            ->paginate($perPage);

        return response()->json($notifications->through(fn ($n) => $this->serializeNotification($n))->toArray());
    }

    /**
     * Jumlah notifikasi belum dibaca supir yang sedang login.
     */
    public function unreadCount(Request $request): JsonResponse
    {
        $count = Notification::query()
            ->where('supir_id', $request->user()->id)
            ->whereNull('read_at')
            ->count();

        return response()->json(['count' => $count]);
    }

    /**
     * Tandai satu notifikasi supir sebagai sudah dibaca.
     */
    public function markNotificationRead(Request $request, Notification $notification): JsonResponse
    {
        if ($notification->supir_id !== $request->user()->id) {
            return response()->json(['message' => 'Notifikasi tidak ditemukan.'], 404);
        }

        $notification->markAsRead();

        return response()->json([
            'message' => 'Notifikasi ditandai sudah dibaca.',
            'notification' => $this->serializeNotification($notification),
        ]);
    }

    private function serializeNotification(Notification $notification): array
    {
        return [
            'id' => $notification->id,
            'type' => $notification->type,
            'title' => $notification->title,
            'message' => $notification->message,
            'data' => $notification->data,
            'read_at' => $notification->read_at?->toIso8601String(),
            'created_at' => $notification->created_at?->toIso8601String(),
        ];
    }

    /* ─────────────────────────────────────────────────────────────
     * HELPERS
     * ───────────────────────────────────────────────────────────── */

    private function dataInspeksi(array $validated): array
    {
        return collect($validated)->only([
            'odometer', 'fuel_level', 'kondisi_body', 'kondisi_interior',
            'kondisi_ban', 'kondisi_ac', 'kondisi_lampu', 'ada_damagenya',
            'deskripsi_kondisi', 'catatan', 'biaya_kerusakan',
        ])->toArray();
    }

    /**
     * Simpan foto inspeksi + terapkan watermark lengkap (petugas, lokasi, GPS, waktu).
     */
    private function simpanFotoTask(Request $request, array $validated, DriverTask $task): array
    {
        $fotoPaths = [];
        $files = $request->file('fotos', []);

        foreach ($files as $file) {
            $path = $file->store('inspeksi/task', 'public');
            $watermarked = ! ($validated['watermarked'] ?? false)
                ? app(WatermarkService::class)->applyDriverWatermark($path, [
                    'driver_name' => $request->user()->nama,
                    'location' => $validated['location'] ?? $task->pickup_location,
                    'latitude' => $validated['latitude'] ?? null,
                    'longitude' => $validated['longitude'] ?? null,
                    'accuracy' => $validated['accuracy'] ?? null,
                    'captured_at' => $validated['captured_at'] ?? now(),
                    'task_code' => $task->kode_task,
                ])
                : $path;

            if ($watermarked) {
                $fotoPaths[] = $watermarked;
                if (Storage::disk('public')->exists($path)) {
                    Storage::disk('public')->delete($path);
                }
            }
        }

        return $fotoPaths;
    }

    private function simpanVideoTask(Request $request): array
    {
        $videoPaths = [];
        foreach ($request->file('videos', []) as $file) {
            $videoPaths[] = $file->store('inspeksi/task/videos', 'public');
        }

        return $videoPaths;
    }

    private function serializeTask(?DriverTask $task): ?array
    {
        if (! $task) {
            return null;
        }

        return [
            'id' => $task->id,
            'kode_task' => $task->kode_task,
            'judul' => $task->judul,
            'deskripsi' => $task->deskripsi,
            'order_id' => $task->order_id,
            'order_code' => $task->order?->kode_order,
            'status' => $task->status,
            'status_label' => $this->statusLabel($task->status),
            'kendaraan' => $task->kendaraan ? [
                'id' => $task->kendaraan->id,
                'nama_kendaraan' => $task->kendaraan->nama_kendaraan,
                'plat_nomor' => $task->kendaraan->plat_nomor,
                'warna' => $task->kendaraan->warna,
                'foto' => $task->kendaraan->foto,
            ] : null,
            'customer' => $task->order?->customer ? [
                'nama_lengkap' => $task->order->customer->nama_lengkap,
                'no_hp' => $task->order->customer->no_hp,
            ] : null,
            'pickup' => [
                'location' => $task->pickup_location,
                'lat' => $task->pickup_lat ? (float) $task->pickup_lat : null,
                'lng' => $task->pickup_lng ? (float) $task->pickup_lng : null,
            ],
            'destination' => [
                'location' => $task->destination_location,
                'lat' => $task->destination_lat ? (float) $task->destination_lat : null,
                'lng' => $task->destination_lng ? (float) $task->destination_lng : null,
            ],
            'assigned_driver' => $task->assignedDriver ? [
                'id' => $task->assignedDriver->id,
                'nama' => $task->assignedDriver->nama,
                'no_hp' => $task->assignedDriver->no_hp,
            ] : null,
            'inspection_before' => $this->serializeInspeksi($task->inspectionBefore),
            'inspection_after' => $this->serializeInspeksi($task->inspectionAfter),
            'accepted_at' => $task->accepted_at?->toIso8601String(),
            'started_delivery_at' => $task->started_delivery_at?->toIso8601String(),
            'arrived_at' => $task->arrived_at?->toIso8601String(),
            'completed_at' => $task->completed_at?->toIso8601String(),
            'created_at' => $task->created_at?->toIso8601String(),
        ];
    }

    private function serializeInspeksi(?InspeksiKendaraan $inspeksi): ?array
    {
        if (! $inspeksi) {
            return null;
        }

        return [
            'id' => $inspeksi->id,
            'jenis' => $inspeksi->jenis,
            'odometer' => $inspeksi->odometer,
            'fuel_level' => $inspeksi->fuel_level,
            'kondisi_body' => $inspeksi->kondisi_body,
            'kondisi_interior' => $inspeksi->kondisi_interior,
            'kondisi_ban' => $inspeksi->kondisi_ban,
            'kondisi_ac' => $inspeksi->kondisi_ac,
            'kondisi_lampu' => $inspeksi->kondisi_lampu,
            'ada_damagenya' => (bool) $inspeksi->ada_damagenya,
            'deskripsi_kondisi' => $inspeksi->deskripsi_kondisi,
            'catatan' => $inspeksi->catatan,
            'biaya_kerusakan' => $inspeksi->biaya_kerusakan ? (float) $inspeksi->biaya_kerusakan : null,
            'fotos' => $inspeksi->fotos,
            'videos' => $inspeksi->videos,
            'inspeksi_oleh' => $inspeksi->inspeksi_oleh,
            'created_at' => $inspeksi->created_at?->toIso8601String(),
        ];
    }

    private function statusLabel(string $status): string
    {
        return match ($status) {
            DriverTask::STATUS_PENDING => 'Menunggu',
            DriverTask::STATUS_AVAILABLE => 'Tersedia',
            DriverTask::STATUS_ACCEPTED => 'Diterima',
            DriverTask::STATUS_INSPECTION_BEFORE => 'Inspeksi Awal',
            DriverTask::STATUS_ON_DELIVERY => 'Sedang Dikirim',
            DriverTask::STATUS_ARRIVED => 'Sampai Tujuan',
            DriverTask::STATUS_INSPECTION_AFTER => 'Inspeksi Akhir',
            DriverTask::STATUS_COMPLETED => 'Selesai',
            DriverTask::STATUS_CANCELLED => 'Dibatalkan',
            default => $status,
        };
    }
}
