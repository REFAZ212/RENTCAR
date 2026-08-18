<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('inspeksi_kendaraans', function (Blueprint $table) {
            $table->json('fotos')->nullable()->after('foto')
                ->comment('Daftar path foto kendaraan (multi upload)');
            $table->json('videos')->nullable()->after('fotos')
                ->comment('Daftar path video kendaraan (multi upload)');
        });
    }

    public function down(): void
    {
        Schema::table('inspeksi_kendaraans', function (Blueprint $table) {
            $table->dropColumn(['fotos', 'videos']);
        });
    }
};
