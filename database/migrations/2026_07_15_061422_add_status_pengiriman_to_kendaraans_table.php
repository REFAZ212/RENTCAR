<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('kendaraans', function (Blueprint $table) {
            $table->enum('status_pengiriman', ['belum_diambil', 'sudah_diantarkan', 'dalam_penyewaan', 'selesai'])->default('belum_diambil')->after('status');
        });
    }

    public function down(): void
    {
        Schema::table('kendaraans', function (Blueprint $table) {
            $table->dropColumn('status_pengiriman');
        });
    }
};
