<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('inspeksi_kendaraans', function (Blueprint $table) {
            $table->string('foto_body')->nullable()->after('foto');
            $table->string('foto_interior')->nullable()->after('foto_body');
            $table->string('foto_ban')->nullable()->after('foto_interior');
            $table->string('foto_ac')->nullable()->after('foto_ban');
            $table->string('foto_lampu')->nullable()->after('foto_ac');
        });
    }

    public function down(): void
    {
        Schema::table('inspeksi_kendaraans', function (Blueprint $table) {
            $table->dropColumn(['foto_body', 'foto_interior', 'foto_ban', 'foto_ac', 'foto_lampu']);
        });
    }
};
