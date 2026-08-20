<?php

namespace App\Console\Commands;

use App\Services\BackupService;
use Illuminate\Console\Command;

class BackupDatabase extends Command
{
    protected $signature = 'backup:database {--days=30 : Hapus backup yang lebih tua dari N hari}';

    protected $description = 'Buat backup database lengkap ke storage/app/backup dengan retensi otomatis';

    public function handle(BackupService $service): int
    {
        $path = $service->createDump();

        $this->info("Backup dibuat: {$path}");

        $deleted = $service->cleanup((int) $this->option('days'));
        if ($deleted > 0) {
            $this->info("{$deleted} backup lama dihapus (retensi {$this->option('days')} hari).");
        }

        return self::SUCCESS;
    }
}
