<?php

namespace App\Services;

use App\Models\DriverTask;
use App\Models\InspeksiKendaraan;
use App\Models\SupirCalo;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;

class DriverTaskService
{
    /**
     * Ambil tugas pertama yang berhasil (first come first served).
     * Menggunakan row locking supaya tidak terjadi double assignment.
     */
    public function accept(DriverTask $task, SupirCalo $driver): DriverTask
    {
        return DB::transaction(function () use ($task, $driver) {
            $task = DriverTask::whereKey($task->id)->lockForUpdate()->first();
            $driver = SupirCalo::whereKey($driver->id)->lockForUpdate()->first();

            if (! $task) {
                throw new ConflictHttpException('Tugas tidak ditemukan.');
            }

            if ($task->status !== DriverTask::STATUS_AVAILABLE) {
                $pemenang = $task->assignedDriver?->nama ?? 'petugas lain';
                throw new ConflictHttpException("Tugas sudah diambil oleh {$pemenang}.");
            }

            $aktif = $driver->activeDriverTask();
            if ($aktif) {
                throw new ConflictHttpException('Anda masih memiliki tugas aktif ('.$aktif->kode_task.').');
            }

            $task->update([
                'assigned_driver_id' => $driver->id,
                'accepted_at' => now(),
                'status' => DriverTask::STATUS_ACCEPTED,
            ]);

            $driver->update(['driver_status' => 'busy']);

            return $task->fresh()->load([
                'kendaraan', 'order.customer', 'assignedDriver',
                'inspectionBefore', 'inspectionAfter',
            ]);
        });
    }

    /**
     * Mulai inspeksi awal (accepted → inspection_before).
     */
    public function startInspectionBefore(DriverTask $task, SupirCalo $driver): DriverTask
    {
        $this->ensureAssigned($task, $driver);

        return DB::transaction(function () use ($task) {
            $task = DriverTask::whereKey($task->id)->lockForUpdate()->first();

            if ($task->status !== DriverTask::STATUS_ACCEPTED
                && $task->status !== DriverTask::STATUS_INSPECTION_BEFORE) {
                throw new ConflictHttpException('Tugas tidak dalam tahap inspeksi awal.');
            }

            if ($task->status === DriverTask::STATUS_ACCEPTED) {
                $task->update(['status' => DriverTask::STATUS_INSPECTION_BEFORE]);
            }

            return $task->fresh()->load([
                'kendaraan', 'order.customer', 'assignedDriver',
                'inspectionBefore', 'inspectionAfter',
            ]);
        });
    }

    /**
     * Simpan hasil inspeksi awal (foto/video/GPS/timestamp).
     */
    public function storeInspectionBefore(DriverTask $task, SupirCalo $driver, array $data, array $fotoPaths, array $videoPaths): InspeksiKendaraan
    {
        $this->ensureAssigned($task, $driver);

        return DB::transaction(function () use ($task, $driver, $data, $fotoPaths, $videoPaths) {
            $task = DriverTask::whereKey($task->id)->lockForUpdate()->first();

            if (! in_array($task->status, [
                DriverTask::STATUS_ACCEPTED,
                DriverTask::STATUS_INSPECTION_BEFORE,
            ])) {
                throw new ConflictHttpException('Inspeksi awal tidak bisa disimpan pada status ini.');
            }

            $inspeksi = InspeksiKendaraan::updateOrCreate(
                [
                    'driver_task_id' => $task->id,
                    'jenis' => 'pickup',
                ],
                array_merge($data, [
                    'driver_task_id' => $task->id,
                    'order_id' => $task->order_id,
                    'admin_id' => $driver->id,
                    'status' => 'final',
                    'inspeksi_oleh' => $driver->nama,
                ])
            );

            if ($fotoPaths) {
                $inspeksi->update(['fotos' => array_values(array_unique(array_merge($inspeksi->fotos ?? [], $fotoPaths)))]);
            }
            if ($videoPaths) {
                $inspeksi->update(['videos' => array_values(array_unique(array_merge($inspeksi->videos ?? [], $videoPaths)))]);
            }

            $task->update([
                'inspection_before_id' => $inspeksi->id,
                'status' => DriverTask::STATUS_ON_DELIVERY,
            ]);

            return $inspeksi->fresh();
        });
    }

    /**
     * Mulai pengantaran — simpan koordinat & waktu mulai.
     */
    public function startDelivery(DriverTask $task, SupirCalo $driver, ?float $lat = null, ?float $lng = null, ?float $accuracy = null): DriverTask
    {
        $this->ensureAssigned($task, $driver);

        return DB::transaction(function () use ($task, $lat, $lng, $accuracy) {
            $task = DriverTask::whereKey($task->id)->lockForUpdate()->first();

            if (! in_array($task->status, [
                DriverTask::STATUS_INSPECTION_BEFORE,
                DriverTask::STATUS_ON_DELIVERY,
            ])) {
                throw new ConflictHttpException('Inspeksi awal belum selesai — selesaikan dahulu sebelum pengantaran.');
            }

            if (! $task->inspection_before_id) {
                throw new ConflictHttpException('Inspeksi awal belum tersimpan.');
            }

            $task->update([
                'status' => DriverTask::STATUS_ON_DELIVERY,
                'started_delivery_at' => now(),
                'start_lat' => $lat,
                'start_lng' => $lng,
                'start_accuracy' => $accuracy,
            ]);

            return $task->fresh();
        });
    }

    /**
     * Kendaraan sampai tujuan (on_delivery → arrived).
     */
    public function arrive(DriverTask $task, SupirCalo $driver, ?float $lat = null, ?float $lng = null, ?float $accuracy = null): DriverTask
    {
        $this->ensureAssigned($task, $driver);

        return DB::transaction(function () use ($task, $lat, $lng, $accuracy) {
            $task = DriverTask::whereKey($task->id)->lockForUpdate()->first();

            if ($task->status !== DriverTask::STATUS_ON_DELIVERY) {
                throw new ConflictHttpException('Tugas belum dalam perjalanan.');
            }

            $task->update([
                'status' => DriverTask::STATUS_ARRIVED,
                'arrived_at' => now(),
                'arrive_lat' => $lat,
                'arrive_lng' => $lng,
                'arrive_accuracy' => $accuracy,
            ]);

            return $task->fresh();
        });
    }

    /**
     * Simpan hasil inspeksi akhir setelah kendaraan sampai.
     */
    public function storeInspectionAfter(DriverTask $task, SupirCalo $driver, array $data, array $fotoPaths, array $videoPaths): InspeksiKendaraan
    {
        $this->ensureAssigned($task, $driver);

        return DB::transaction(function () use ($task, $driver, $data, $fotoPaths, $videoPaths) {
            $task = DriverTask::whereKey($task->id)->lockForUpdate()->first();

            if (! in_array($task->status, [
                DriverTask::STATUS_ARRIVED,
                DriverTask::STATUS_INSPECTION_AFTER,
            ])) {
                throw new ConflictHttpException('Inspeksi akhir hanya bisa setelah kendaraan sampai.');
            }

            $inspeksi = InspeksiKendaraan::updateOrCreate(
                [
                    'driver_task_id' => $task->id,
                    'jenis' => 'return',
                ],
                array_merge($data, [
                    'driver_task_id' => $task->id,
                    'order_id' => $task->order_id,
                    'admin_id' => $driver->id,
                    'status' => 'final',
                    'inspeksi_oleh' => $driver->nama,
                ])
            );

            if ($fotoPaths) {
                $inspeksi->update(['fotos' => array_values(array_unique(array_merge($inspeksi->fotos ?? [], $fotoPaths)))]);
            }
            if ($videoPaths) {
                $inspeksi->update(['videos' => array_values(array_unique(array_merge($inspeksi->videos ?? [], $videoPaths)))]);
            }

            $task->update([
                'inspection_after_id' => $inspeksi->id,
                'status' => DriverTask::STATUS_INSPECTION_AFTER,
            ]);

            return $inspeksi->fresh();
        });
    }

    /**
     * Selesaikan tugas — supir kembali available.
     */
    public function complete(DriverTask $task, SupirCalo $driver): DriverTask
    {
        $this->ensureAssigned($task, $driver);

        return DB::transaction(function () use ($task, $driver) {
            $task = DriverTask::whereKey($task->id)->lockForUpdate()->first();
            $driver = SupirCalo::whereKey($driver->id)->lockForUpdate()->first();

            if (! in_array($task->status, [
                DriverTask::STATUS_INSPECTION_AFTER,
                DriverTask::STATUS_ARRIVED,
            ])) {
                throw new ConflictHttpException('Tugas belum melewati inspeksi akhir.');
            }

            if (! $task->inspection_after_id) {
                throw new ConflictHttpException('Inspeksi akhir belum tersimpan — tugas tidak bisa diselesaikan.');
            }

            $task->update([
                'status' => DriverTask::STATUS_COMPLETED,
                'completed_at' => now(),
            ]);

            // Supir kembali siap menerima tugas baru.
            $driver->update(['driver_status' => 'available']);

            return $task->fresh()->load([
                'kendaraan', 'order.customer', 'assignedDriver',
                'inspectionBefore', 'inspectionAfter',
            ]);
        });
    }

    private function ensureAssigned(DriverTask $task, SupirCalo $driver): void
    {
        if ($task->assigned_driver_id !== $driver->id) {
            throw new AccessDeniedHttpException('Tugas ini bukan milik Anda.');
        }
    }
}
