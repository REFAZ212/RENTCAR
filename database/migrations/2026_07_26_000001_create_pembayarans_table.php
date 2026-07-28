<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pembayarans', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained()->cascadeOnDelete();
            $table->decimal('jumlah', 14, 2);
            $table->enum('metode_pembayaran', ['cash', 'transfer', 'qris', 'lainnya']);
            $table->enum('status', ['dp', 'pelunasan']);
            $table->string('bukti_transfer')->nullable();
            $table->text('catatan')->nullable();
            $table->timestamps();

            $table->index('order_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pembayarans');
    }
};
