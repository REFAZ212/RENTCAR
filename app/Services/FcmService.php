<?php

namespace App\Services;

use App\Models\SupirCalo;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class FcmService
{
    /**
     * Kirim push notification ke perangkat Android via FCM legacy API.
     * Jika kredensial belum diisi (FCM_SERVER_KEY kosong), notifikasi
     * hanya disimpan di database — tidak mengirim push.
     *
     * @param  array<string, mixed>  $data
     */
    public function sendToDriver(SupirCalo $supir, string $title, string $body, array $data = [], string $category = 'tugas'): bool
    {
        if (! $supir->fcm_token) {
            return false;
        }

        $serverKey = config('services.fcm.server_key');
        if (! $serverKey) {
            Log::info('FCM_SERVER_KEY belum diisi — push ke '.$supir->nama.' dilewati (notifikasi tetap tersimpan di DB).', [
                'supir_id' => $supir->id,
                'title' => $title,
            ]);

            return false;
        }

        $payload = [
            'to' => $supir->fcm_token,
            'notification' => [
                'title' => $title,
                'body' => $body,
                'sound' => config('services.fcm.sound', 'default'),
                'channel_id' => 'driver_tasks',
                'priority' => 'high',
                'android' => [
                    'priority' => 'HIGH',
                    'notification' => [
                        'channel_id' => 'driver_tasks',
                        'sound' => config('services.fcm.sound', 'default'),
                        'vibrate' => '500',
                        'badge' => 1,
                    ],
                ],
            ],
            'data' => array_merge([
                'category' => $category,
                'click_action' => 'FLUTTER_NOTIFICATION_CLICK',
                'sound' => config('services.fcm.sound', 'default'),
            ], $data),
        ];

        try {
            $response = Http::withHeaders([
                'Authorization' => 'key='.$serverKey,
                'Content-Type' => 'application/json',
            ])->timeout(10)->post('https://fcm.googleapis.com/fcm/send', $payload);

            return $response->successful();
        } catch (\Throwable $e) {
            Log::warning('Gagal mengirim FCM ke supir: '.$e->getMessage(), [
                'supir_id' => $supir->id,
            ]);

            return false;
        }
    }

    /**
     * Broadcast push ke semua supir yang sedang AVAILABLE.
     *
     * @param  array<string, mixed>  $data
     */
    public function broadcastToAvailableDrivers(string $title, string $body, array $data = []): int
    {
        $drivers = SupirCalo::query()
            ->where('jenis', 'supir')
            ->where('status', 'active')
            ->where('driver_status', 'available')
            ->whereNotNull('fcm_token')
            ->get();

        $sent = 0;
        foreach ($drivers as $driver) {
            if ($this->sendToDriver($driver, $title, $body, $data, 'tugas')) {
                $sent++;
            }
        }

        return $sent;
    }
}
