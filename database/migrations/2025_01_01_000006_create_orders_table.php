<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('orders', function (Blueprint $table) {
            $table->id();
            $table->string('kode_order')->unique();
            $table->foreignId('customer_id')->constrained()->cascadeOnDelete();
            $table->foreignId('kendaraan_id')->constrained()->cascadeOnDelete();
            $table->foreignId('admin_id')->constrained('users')->cascadeOnDelete();
            $table->date('tanggal_mulai');
            $table->date('tanggal_selesai');
            $table->integer('durasi_hari');
            $table->decimal('harga_per_hari', 12, 2);
            $table->decimal('harga_total', 14, 2);
            $table->enum('status_order', ['pending', 'confirmed', 'active', 'completed', 'cancelled'])->default('pending');
            $table->enum('metode_pembayaran', ['cash', 'transfer', 'qris', 'lainnya'])->nullable();
            $table->enum('status_pembayaran', ['unpaid', 'partial', 'paid'])->default('unpaid');
            $table->text('catatan')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('orders');
    }
};
