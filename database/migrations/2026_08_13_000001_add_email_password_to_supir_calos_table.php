<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('supir_calos', function (Blueprint $table) {
            $table->string('email')->nullable()->after('nama');
            $table->string('password')->nullable()->after('email');
        });
    }

    public function down(): void
    {
        Schema::table('supir_calos', function (Blueprint $table) {
            $table->dropColumn(['email', 'password']);
        });
    }
};
