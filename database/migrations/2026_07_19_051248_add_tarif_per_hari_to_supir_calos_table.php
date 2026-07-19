<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('supir_calos', function (Blueprint $table) {
            $table->decimal('tarif_per_hari', 12, 2)->nullable()->after('komisi');
        });
    }

    public function down(): void
    {
        Schema::table('supir_calos', function (Blueprint $table) {
            $table->dropColumn('tarif_per_hari');
        });
    }
};
