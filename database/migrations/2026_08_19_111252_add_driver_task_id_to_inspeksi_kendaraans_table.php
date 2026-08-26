<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('inspeksi_kendaraans', function (Blueprint $table) {
            $table->foreignId('driver_task_id')->nullable()->after('order_id')->constrained('driver_tasks')->nullOnDelete();
            $table->foreignId('order_id')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('inspeksi_kendaraans', function (Blueprint $table) {
            $table->dropForeign(['driver_task_id']);
            $table->dropColumn('driver_task_id');
            $table->foreignId('order_id')->nullable(false)->change();
        });
    }
};
