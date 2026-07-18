<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->integer('jam_overtime')->default(0)->after('harga_total');
            $table->decimal('denda_overtime', 14, 2)->default(0)->after('jam_overtime');
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn(['jam_overtime', 'denda_overtime']);
        });
    }
};
