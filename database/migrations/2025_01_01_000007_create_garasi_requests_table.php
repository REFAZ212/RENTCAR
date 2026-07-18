<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('garasi_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained()->cascadeOnDelete();
            $table->foreignId('garasi_partner_id')->constrained()->cascadeOnDelete();
            $table->enum('status_permintaan', ['pending', 'tersedia', 'tidak_terjawab'])->default('pending');
            $table->text('pesan_wa_terkirim')->nullable();
            $table->timestamp('waktu_kirim')->nullable();
            $table->timestamp('waktu_respon')->nullable();
            $table->text('catatan_admin')->nullable();
            $table->text('catatan_garasi')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('garasi_requests');
    }
};
