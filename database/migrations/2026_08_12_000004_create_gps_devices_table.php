<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('gps_devices', function (Blueprint $table) {
            $table->id();
            $table->foreignId('kendaraan_id')->constrained()->cascadeOnDelete();
            $table->string('api_key', 64)->unique();
            $table->string('device_identifier')->nullable();
            $table->string('nama_perangkat')->nullable();
            $table->boolean('status_aktif')->default(true);
            $table->text('catatan')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('gps_devices');
    }
};
