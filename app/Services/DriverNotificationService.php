<?php

namespace App\Services;

use App\Models\DriverTask;
use App\Models\Notification;
use App\Models\SupirCalo;

class DriverNotificationService
{
    public function __construct(protected FcmService $fcm) {}

    /**
     * Kirim notifikasi ke satu supir: simpan di DB + push FCM bila ada token.
     *
     * @param  array<string, mixed>  $data
     */
    public function sendToDriver(SupirCalo $supir, string $type, string $title, string $message, array $data = [], ?DriverTask $task = null): Notification
    {
        $notification = Notification::create([
            'supir_id' => $supir->id,
            'type' => $type,
            'title' => $title,
            'message' => $message,
            'data' => array_merge($data, [
                'task_id' => $task?->id,
                'task_code' => $task?->kode_task,
                'kendaraan_id' => $task?->kendaraan_id,
                'pickup_location' => $task?->pickup_location,
                'destination_location' => $task?->destination_location,
            ]),
        ]);

        $this->fcm->sendToDriver($supir, $title, $message, $data, 'tugas');

        return $notification;
    }

    /**
     * Broadcast tugas baru ke semua supir available + simpan notifikasi DB.
     *
     * @param  array<string, mixed>  $data
     */
    public function broadcastNewTask(DriverTask $task): int
    {
        $drivers = SupirCalo::query()
            ->where('jenis', 'supir')
            ->where('status', 'active')
            ->where('driver_status', 'available')
            ->get();

        $title = '🚗 Tugas Baru';
        $message = $task->kendaraan?->nama_kendaraan
            ? "{$task->kendaraan->nama_kendaraan} ({$task->kendaraan->plat_nomor}) menunggu untuk diantar — siapa cepat dia dapat."
            : 'Ada tugas pengantaran baru — siapa cepat dia dapat.';

        $count = 0;
        foreach ($drivers as $driver) {
            $this->sendToDriver($driver, 'tugas', $title, $message, [
                'category' => 'tugas_baru',
                'vehicle_name' => $task->kendaraan?->nama_kendaraan,
                'pickup_location' => $task->pickup_location,
                'destination_location' => $task->destination_location,
            ], $task);
            $count++;
        }

        return $count;
    }
}
