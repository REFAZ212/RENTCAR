<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Backfill: pastikan nama model yang belum terkandung di nama_kendaraan
        // digabungkan dulu, supaya tidak ada data yang hilang saat kolom dihapus.
        DB::table('kendaraans')
            ->whereNotNull('model')
            ->where('model', '!=', '')
            ->get()
            ->each(function ($kendaraan) {
                if (mb_strpos($kendaraan->nama_kendaraan, $kendaraan->model) === false) {
                    DB::table('kendaraans')
                        ->where('id', $kendaraan->id)
                        ->update([
                            'nama_kendaraan' => trim($kendaraan->nama_kendaraan).' '.$kendaraan->model,
                        ]);
                }
            });

        Schema::table('kendaraans', function (Blueprint $table) {
            $table->dropColumn('model');
        });
    }

    public function down(): void
    {
        Schema::table('kendaraans', function (Blueprint $table) {
            $table->string('model')->nullable()->after('merek');
        });
    }
};
