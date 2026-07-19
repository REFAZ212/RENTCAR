<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('supir_calos', function (Blueprint $table) {
            $table->id();
            $table->enum('jenis', ['supir', 'calo']);
            $table->string('nama');
            $table->string('no_hp');
            $table->text('alamat')->nullable();
            $table->enum('status', ['active', 'inactive'])->default('active');
            $table->string('no_sim')->nullable();
            $table->string('foto')->nullable();
            $table->decimal('komisi', 12, 2)->nullable();
            $table->text('catatan')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('supir_calos');
    }
};
