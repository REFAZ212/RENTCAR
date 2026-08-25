<?php

namespace App\Console\Commands;

use App\Models\DriverTask;
use App\Models\Notification;
use App\Models\Setting;
use App\Services\DriverNotificationService;
use App\Services\DriverTaskService;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;

#[Signature('task:release-stale')]
#[Description('Release driver tasks stuck in "accepted" (never started) back to the available pool and free the assigned driver')]
class ReleaseStaleDriverTasks extends Command
{
    public function handle(DriverTaskService $taskService, DriverNotificationService $notifications): int
    {
        if (Setting::get('driver_task_release_enabled', '1') === '0') {
            return self::SUCCESS;
        }

        $minutes = max(5, (int) Setting::get('driver_task_release_minutes', 120));
        $cutoff = now()->subMinutes($minutes);

        // Hanya "accepted" murni: belum ada inspeksi/pengantaran yang dicatat.
        // Tugas yang sudah berprogres hanya boleh ditangani admin manual.
        $candidates = DriverTask::where('status', DriverTask::STATUS_ACCEPTED)
            ->whereNotNull('accepted_at')
            ->where('accepted_at', '<', $cutoff)
            ->pluck('id');

        if ($candidates->isEmpty()) {
            $this->info('Tidak ada tugas supir yang stale.');

            return self::SUCCESS;
        }

        $released = 0;

        foreach ($candidates as $taskId) {
            try {
                $task = $taskService->release(DriverTask::findOrFail($taskId));
            } catch (HttpExceptionInterface) {
                // Sudah diproses pihak lain di antara fetch dan lock — lewati.
                continue;
            }

            $notifications->broadcastNewTask($task->fresh());

            Notification::create([
                'type' => 'tugas_supir_dilepas',
                'title' => 'Tugas Supir Dilepas Otomatis',
                'message' => "Tugas {$task->kode_task} dilepas otomatis karena supir yang mengambilnya tidak pernah memulai dalam {$minutes} menit. Tugas kembali ke pool dan dibroadcast ulang.",
                'data' => [
                    'task_id' => $task->id,
                    'kode_task' => $task->kode_task,
                    'order_id' => $task->order_id,
                    'link' => '/supir',
                ],
            ]);

            $released++;
        }

        $this->info("{$released} tugas supir stale dilepas kembali ke pool.");

        return self::SUCCESS;
    }
}
