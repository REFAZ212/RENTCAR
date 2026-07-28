<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('garasi_partners', function (Blueprint $table) {
            $table->enum('metode_bagi_hasil', ['persentase'])->default('persentase')->after('is_own');
            $table->decimal('persentase_bagi_hasil', 5, 2)->default(0)->after('metode_bagi_hasil');
        });
    }

    public function down(): void
    {
        Schema::table('garasi_partners', function (Blueprint $table) {
            $table->dropColumn(['metode_bagi_hasil', 'persentase_bagi_hasil']);
        });
    }
};
