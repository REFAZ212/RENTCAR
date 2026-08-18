<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('inspeksi_kendaraans', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained()->cascadeOnDelete();
            $table->enum('jenis', ['pickup', 'return'])->comment('pickup = serah terima awal, return = serah terima akhir');
            $table->integer('odometer')->nullable()->comment('KM odometer saat inspeksi');
            $table->enum('fuel_level', ['full', '3/4', '1/2', '1/4', 'kosong'])->default('full');
            $table->enum('kondisi_body', ['baik', 'lecet_ringan', 'lecet_parah', 'penyok', 'retak'])->default('baik');
            $table->enum('kondisi_interior', ['baik', 'kotor_ringan', 'kotor_banyak', 'rusak'])->default('baik');
            $table->enum('kondisi_ban', ['baik', 'tipis', 'gundul', 'kosong'])->default('baik');
            $table->enum('kondisi_ac', ['baik', 'tidak_baik'])->default('baik');
            $table->enum('kondisi_lampu', ['baik', 'tidak_baik'])->default('baik');
            $table->boolean('ada_damagenya')->default(false);
            $table->text('deskripsi_kondisi')->nullable()->comment('Deskripsi detail kondisi kendaraan');
            $table->text('catatan')->nullable()->comment('Catatan tambahan dari petugas');
            $table->string('foto')->nullable();
            $table->string('inspeksi_oleh')->nullable()->comment('Nama petugas yang melakukan inspeksi');
            $table->foreignId('admin_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index('order_id');
            $table->index(['order_id', 'jenis']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('inspeksi_kendaraans');
    }
};
