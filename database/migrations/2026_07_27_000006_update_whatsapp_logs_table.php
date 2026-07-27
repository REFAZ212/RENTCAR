<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('whatsapp_logs', function (Blueprint $table) {
            $table->string('type')->default('garasi')->after('garasi_request_id');
            $table->foreignId('order_id')->nullable()->after('garasi_request_id');
        });

        DB::statement('ALTER TABLE whatsapp_logs MODIFY COLUMN garasi_request_id BIGINT UNSIGNED NULL');
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE whatsapp_logs MODIFY COLUMN garasi_request_id BIGINT UNSIGNED NOT NULL');

        Schema::table('whatsapp_logs', function (Blueprint $table) {
            $table->dropColumn(['type', 'order_id']);
        });
    }
};
