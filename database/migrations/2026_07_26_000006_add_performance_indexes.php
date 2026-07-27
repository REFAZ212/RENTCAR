<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->index('status_order');
            $table->index('status_pembayaran');
            $table->index('created_at');
            $table->index('tanggal_mulai');
            $table->index('tanggal_selesai');
        });

        Schema::table('customers', function (Blueprint $table) {
            $table->index('no_hp');
        });

        Schema::table('kendaraans', function (Blueprint $table) {
            $table->index('status');
        });

        Schema::table('garasi_requests', function (Blueprint $table) {
            $table->index('status_permintaan');
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropIndex(['status_order']);
            $table->dropIndex(['status_pembayaran']);
            $table->dropIndex(['created_at']);
            $table->dropIndex(['tanggal_mulai']);
            $table->dropIndex(['tanggal_selesai']);
        });

        Schema::table('customers', function (Blueprint $table) {
            $table->dropIndex(['no_hp']);
        });

        Schema::table('kendaraans', function (Blueprint $table) {
            $table->dropIndex(['status']);
        });

        Schema::table('garasi_requests', function (Blueprint $table) {
            $table->dropIndex(['status_permintaan']);
        });
    }
};
