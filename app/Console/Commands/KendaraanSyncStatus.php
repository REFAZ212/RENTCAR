<?php

namespace App\Console\Commands;

use App\Models\Kendaraan;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

#[Signature('kendaraan:sync-status')]
#[Description('Sync kendaraan status (disewa/tersedia) based on active orders — reconciliation for the write-on-read sync removed from controllers')]
class KendaraanSyncStatus extends Command
{
    public function handle(): int
    {
        Kendaraan::sinkronkanStatusDariOrder();

        $disewa = Kendaraan::where('status', 'disewa')->count();
        $tersedia = Kendaraan::where('status', 'tersedia')->count();

        $this->info("Status kendaraan disinkronkan. Tersedia: {$tersedia}, disewa: {$disewa}.");

        return self::SUCCESS;
    }
}
