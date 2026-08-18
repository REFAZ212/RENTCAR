<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('gps_locations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('gps_device_id')->constrained()->cascadeOnDelete();
            $table->decimal('lat', 10, 7);
            $table->decimal('lng', 10, 7);
            $table->unsignedInteger('speed_kmh')->nullable();
            $table->unsignedSmallInteger('heading')->nullable();
            $table->unsignedTinyInteger('fuel_percent')->nullable();
            $table->timestamp('recorded_at')->index();
            $table->timestamps();

            $table->index(['gps_device_id', 'recorded_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('gps_locations');
    }
};
