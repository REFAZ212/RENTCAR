<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Kolom string legacy `tipe` sudah digantikan relasi `tipe_id` -> `tipes`.
        // Kolom ini NOT NULL tanpa default sehingga menggagalkan INSERT di mode
        // STRICT_TRANS_TABLES, sekaligus bentrok nama dengan relasi `tipe()`.
        Schema::table('kendaraans', function (Blueprint $table) {
            if (Schema::hasColumn('kendaraans', 'tipe')) {
                $table->dropColumn('tipe');
            }
        });
    }

    public function down(): void
    {
        Schema::table('kendaraans', function (Blueprint $table) {
            if (! Schema::hasColumn('kendaraans', 'tipe')) {
                $table->enum('tipe', ['sedan', 'suv', 'mpv', 'hatchback', 'pickup', 'van', 'minibus', 'truk', 'sepeda', 'motor'])->nullable();
            }
        });
    }
};
