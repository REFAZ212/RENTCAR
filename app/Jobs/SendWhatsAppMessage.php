<?php

namespace App\Jobs;

use App\Models\WhatsappLog;
use App\Services\WhatsAppService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class SendWhatsAppMessage implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public int $backoff = 30;

    public function __construct(
        private int $logId,
    ) {}

    public function handle(WhatsAppService $wa): void
    {
        $log = WhatsappLog::find($this->logId);
        if (! $log) {
            Log::warning("WhatsApp log #{$this->logId} not found, skip.");

            return;
        }

        $wa->kirimLogDiantri($log);
    }

    public function failed(\Throwable $exception): void
    {
        Log::error("WhatsApp job failed (log #{$this->logId}): {$exception->getMessage()}");

        $log = WhatsappLog::find($this->logId);
        if ($log && $log->status_kirim === 'diantri') {
            $log->update([
                'status_kirim' => 'gagal',
                'response' => json_encode(['error' => $exception->getMessage()]),
            ]);
        }
    }
}
