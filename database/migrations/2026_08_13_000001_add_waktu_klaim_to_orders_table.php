<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->timestamp('waktu_klaim')->nullable()->after('operator_id')
                ->comment('Waktu petugas mengklaim task inspeksi (untuk timeout otomatis)');
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn('waktu_klaim');
        });
    }
};
