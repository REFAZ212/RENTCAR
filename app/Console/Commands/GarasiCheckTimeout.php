<?php

namespace App\Console\Commands;

use App\Models\GarasiRequest;
use App\Models\Notification;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

#[Signature('garasi:check-timeout')]
#[Description('Mark pending garasi requests as tidak_terjawab when deadline passes')]
class GarasiCheckTimeout extends Command
{
    public function handle(): int
    {
        $expired = GarasiRequest::where('status_permintaan', 'pending')
            ->whereNotNull('deadline')
            ->where('deadline', '<', now())
            ->update([
                'status_permintaan' => 'tidak_terjawab',
                'waktu_respon' => now(),
                'catatan_garasi' => 'Otomatis: melebihi batas waktu respons',
            ]);

        if ($expired > 0) {
            $this->info("{$expired} permintaan ditandai sebagai tidak_terjawab (timeout).");

            Notification::create([
                'type' => 'garasi_timeout',
                'title' => 'Permintaan Garasi Timeout',
                'message' => "{$expired} permintaan garasi melebihi batas waktu dan ditandai tidak terjawab",
                'data' => [
                    'count' => $expired,
                    'link' => '/garasi',
                ],
            ]);
        } else {
            $this->info('Tidak ada permintaan yang timeout.');
        }

        return self::SUCCESS;
    }
}
