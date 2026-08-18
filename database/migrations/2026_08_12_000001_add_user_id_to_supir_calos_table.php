<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('supir_calos', function (Blueprint $table) {
            $table->foreignId('user_id')->nullable()->unique()->after('id')
                ->constrained('users')->cascadeOnDelete()
                ->comment('User petugas yang nyambi sebagai supir (opsional)');
        });
    }

    public function down(): void
    {
        Schema::table('supir_calos', function (Blueprint $table) {
            $table->dropConstrainedForeignId('user_id');
        });
    }
};
