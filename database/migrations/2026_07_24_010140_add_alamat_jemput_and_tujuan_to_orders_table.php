<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->text('alamat_jemput')->nullable()->after('kendaraan_id');
            $table->text('tujuan')->nullable()->after('alamat_jemput');
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn(['alamat_jemput', 'tujuan']);
        });
    }
};
