<?php

namespace App\Jobs;

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
        private string $nomorTujuan,
        private string $pesan,
        private string $type = 'notifikasi_customer',
    ) {}

    public function handle(WhatsAppService $wa): void
    {
        $wa->kirimPesan($this->nomorTujuan, $this->pesan, $this->type);
    }

    public function failed(\Throwable $exception): void
    {
        Log::error("WhatsApp job failed for {$this->nomorTujuan}: {$exception->getMessage()}");
    }
}
