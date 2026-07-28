<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->text('alasan_pembatalan')->nullable();
            $table->date('tanggal_jatuh_tempo')->nullable();
            $table->decimal('biaya_pembatalan', 14, 2)->nullable();
            $table->decimal('total_refund', 14, 2)->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn(['alasan_pembatalan', 'tanggal_jatuh_tempo', 'biaya_pembatalan', 'total_refund']);
        });
    }
};
