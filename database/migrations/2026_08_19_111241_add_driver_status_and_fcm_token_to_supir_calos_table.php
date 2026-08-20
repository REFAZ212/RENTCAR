<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('supir_calos', function (Blueprint $table) {
            $table->enum('driver_status', ['available', 'busy', 'offline'])->default('offline')->after('status');
            $table->string('fcm_token')->nullable()->after('driver_status');
        });
    }

    public function down(): void
    {
        Schema::table('supir_calos', function (Blueprint $table) {
            $table->dropColumn(['driver_status', 'fcm_token']);
        });
    }
};
