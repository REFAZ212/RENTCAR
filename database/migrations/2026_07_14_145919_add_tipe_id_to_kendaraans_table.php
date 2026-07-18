<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('kendaraans', function (Blueprint $table) {
            if (! Schema::hasColumn('kendaraans', 'tipe_id')) {
                $table->foreignId('tipe_id')->nullable()->after('kategori_id');
            }
            $table->foreign('tipe_id')->references('id')->on('tipes')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('kendaraans', function (Blueprint $table) {
            $table->dropForeign(['tipe_id']);
            $table->dropColumn('tipe_id');
        });
    }
};
