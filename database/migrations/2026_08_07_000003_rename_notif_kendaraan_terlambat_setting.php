<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Rename setting key notif_kendaraan_terlambat -> notif_order_selesai.
     * Nama lama menyesatkan: sebenarnya ini gerbang notifikasi "order selesai"
     * ke customer, bukan notifikasi kendaraan terlambat.
     */
    public function up(): void
    {
        DB::table('settings')
            ->where('key', 'notif_kendaraan_terlambat')
            ->update(['key' => 'notif_order_selesai']);
    }

    public function down(): void
    {
        DB::table('settings')
            ->where('key', 'notif_order_selesai')
            ->update(['key' => 'notif_kendaraan_terlambat']);
    }
};
