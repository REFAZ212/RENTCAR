<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            if (Schema::hasColumn('orders', 'tanggal_jatuh_tempo')) {
                $table->dropColumn('tanggal_jatuh_tempo');
            }
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            if (! Schema::hasColumn('orders', 'tanggal_jatuh_tempo')) {
                $table->date('tanggal_jatuh_tempo')->nullable()->after('alasan_pembatalan');
            }
        });
    }
};
