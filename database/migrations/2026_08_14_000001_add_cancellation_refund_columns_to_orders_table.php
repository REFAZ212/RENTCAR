<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            if (! Schema::hasColumn('orders', 'alasan_pembatalan')) {
                $table->text('alasan_pembatalan')->nullable()->after('catatan');
            }
            if (! Schema::hasColumn('orders', 'tanggal_jatuh_tempo')) {
                $table->date('tanggal_jatuh_tempo')->nullable()->after('alasan_pembatalan');
            }
            if (! Schema::hasColumn('orders', 'biaya_pembatalan')) {
                $table->decimal('biaya_pembatalan', 14, 2)->nullable()->after('tanggal_jatuh_tempo');
            }
            if (! Schema::hasColumn('orders', 'total_refund')) {
                $table->decimal('total_refund', 14, 2)->nullable()->after('biaya_pembatalan');
            }
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            foreach (['total_refund', 'biaya_pembatalan', 'tanggal_jatuh_tempo', 'alasan_pembatalan'] as $column) {
                if (Schema::hasColumn('orders', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
