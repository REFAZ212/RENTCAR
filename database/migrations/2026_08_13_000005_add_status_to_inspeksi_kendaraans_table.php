<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('inspeksi_kendaraans', function (Blueprint $table) {
            $table->enum('status', ['draft', 'final'])->default('final')->after('jenis')
                ->comment('draft = inspeksi pickup tersimpan (order belum dikirim); final = terkunci');
        });
    }

    public function down(): void
    {
        Schema::table('inspeksi_kendaraans', function (Blueprint $table) {
            $table->dropColumn('status');
        });
    }
};
