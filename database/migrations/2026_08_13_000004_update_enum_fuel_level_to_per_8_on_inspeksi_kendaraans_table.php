<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    private const LEVEL_LAMA = ['full', '3/4', '1/2', '1/4', 'kosong'];

    private const LEVEL_BARU = ['kosong', '1/8', '1/4', '3/8', '1/2', '5/8', '3/4', '7/8', 'full'];

    public function up(): void
    {
        // Perubahan enum lewat ->change() hanya didukung MySQL (pola sama
        // dengan migration enum lain di proyek ini).
        if (DB::getDriverName() !== 'mysql') {
            return;
        }

        Schema::table('inspeksi_kendaraans', function (Blueprint $table) {
            $table->enum('fuel_level', self::LEVEL_BARU)->default('full')->change();
        });
    }

    public function down(): void
    {
        if (DB::getDriverName() !== 'mysql') {
            return;
        }

        Schema::table('inspeksi_kendaraans', function (Blueprint $table) {
            $table->enum('fuel_level', self::LEVEL_LAMA)->default('full')->change();
        });
    }
};
