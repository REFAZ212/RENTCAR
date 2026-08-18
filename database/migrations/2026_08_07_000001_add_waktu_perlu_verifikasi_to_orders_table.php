<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->timestamp('waktu_perlu_verifikasi')->nullable()->after('tanggal_pengembalian_aktual');
        });

        if (config('database.default') === 'mysql') {
            DB::statement("ALTER TABLE orders MODIFY COLUMN status_order ENUM('pending', 'confirmed', 'active', 'perlu_verifikasi', 'completed', 'cancelled') DEFAULT 'pending'");
        }
    }

    public function down(): void
    {
        if (config('database.default') === 'mysql') {
            DB::statement("ALTER TABLE orders MODIFY COLUMN status_order ENUM('pending', 'confirmed', 'active', 'completed', 'cancelled') DEFAULT 'pending'");
        }

        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn('waktu_perlu_verifikasi');
        });
    }
};
