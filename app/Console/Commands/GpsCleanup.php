<?php

namespace App\Console\Commands;

use App\Services\GpsService;
use Illuminate\Console\Command;

class GpsCleanup extends Command
{
    protected $signature = 'gps:cleanup {--days=30 : Hapus riwayat lokasi yang lebih tua dari N hari}';

    protected $description = 'Bersihkan riwayat lokasi GPS yang sudah terlalu tua';

    public function handle(GpsService $service): int
    {
        $deleted = $service->cleanup((int) $this->option('days'));

        $this->info("{$deleted} riwayat lokasi GPS dihapus.");

        return self::SUCCESS;
    }
}
