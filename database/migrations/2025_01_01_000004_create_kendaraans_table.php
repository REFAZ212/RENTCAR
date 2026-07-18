<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('kendaraans', function (Blueprint $table) {
            $table->id();
            $table->foreignId('garasi_partner_id')->constrained()->cascadeOnDelete();
            $table->string('nama_kendaraan');
            $table->string('plat_nomor')->unique();
            $table->enum('tipe', ['sedan', 'suv', 'mpv', 'hatchback', 'pickup', 'van', 'minibus', 'truk']);
            $table->string('merek');
            $table->string('model');
            $table->year('tahun');
            $table->string('warna');
            $table->integer('kapasitas_penumpang');
            $table->decimal('harga_sewa_per_hari', 12, 2);
            $table->enum('status', ['tersedia', 'disewa', 'maintenance'])->default('tersedia');
            $table->string('foto')->nullable();
            $table->text('catatan')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('kendaraans');
    }
};
