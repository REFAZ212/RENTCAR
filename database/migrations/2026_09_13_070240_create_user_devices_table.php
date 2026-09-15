<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('user_devices', function (Blueprint $table) {
            $table->id();

            $table->foreignId('user_id')
                ->constrained('users')
                ->cascadeOnDelete();

            // ID unik perangkat dari frontend
            $table->string('device_id', 100);

            // Nama/perangkat untuk ditampilkan di pengaturan keamanan
            $table->string('device_name')->nullable();

            $table->ipAddress('ip_address')->nullable();

            $table->text('user_agent')->nullable();

            // Kapan perangkat terakhir digunakan
            $table->timestamp('last_used_at')->nullable();

            // Batas waktu perangkat dianggap terpercaya
            $table->timestamp('trusted_until')->nullable();

            $table->timestamps();

            // Satu user tidak boleh memiliki device_id yang sama
            $table->unique(['user_id', 'device_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_devices');
    }
};
