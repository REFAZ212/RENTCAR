<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('kendaraans', function (Blueprint $table) {
            $table->enum('transmisi', ['manual', 'matic'])->nullable()->after('kapasitas_penumpang');
        });
    }

    public function down(): void
    {
        Schema::table('kendaraans', function (Blueprint $table) {
            $table->dropColumn('transmisi');
        });
    }
};
