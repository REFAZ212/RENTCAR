<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->foreignId('supir_id')->nullable()->constrained('supir_calos')->nullOnDelete();
            $table->foreignId('calo_id')->nullable()->constrained('supir_calos')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropForeign(['supir_id']);
            $table->dropForeign(['calo_id']);
            $table->dropColumn(['supir_id', 'calo_id']);
        });
    }
};
