<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropForeign(['kendaraan_id']);
            $table->foreignId('kendaraan_id')->nullable()->change();
            $table->foreign('kendaraan_id')->references('id')->on('kendaraans')->nullOnDelete();
        });
    }

    public function down(): void
    {
        // First, fill any null kendaraan_ids (best effort — may fail if orphans exist)
        DB::table('orders')->whereNull('kendaraan_id')->delete();

        Schema::table('orders', function (Blueprint $table) {
            $table->dropForeign(['kendaraan_id']);
            $table->foreignId('kendaraan_id')->nullable(false)->change();
            $table->foreign('kendaraan_id')->references('id')->on('kendaraans')->restrictOnDelete();
        });
    }
};
