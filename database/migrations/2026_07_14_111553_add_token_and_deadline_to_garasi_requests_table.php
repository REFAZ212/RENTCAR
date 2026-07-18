<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('garasi_requests', function (Blueprint $table) {
            $table->string('token', 64)->unique()->after('garasi_partner_id');
            $table->timestamp('deadline')->nullable()->after('waktu_respon');
        });
    }

    public function down(): void
    {
        Schema::table('garasi_requests', function (Blueprint $table) {
            $table->dropColumn(['token', 'deadline']);
        });
    }
};
