<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('garasi_partners', function (Blueprint $table) {
            $table->boolean('is_own')->default(false)->after('status_aktif');
        });
    }

    public function down(): void
    {
        Schema::table('garasi_partners', function (Blueprint $table) {
            $table->dropColumn('is_own');
        });
    }
};
