<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('garasi_partners', function (Blueprint $table) {
            $table->id();
            $table->string('nama_garasi');
            $table->string('nama_pemilik');
            $table->text('alamat');
            $table->string('no_hp');
            $table->string('email')->nullable()->unique();
            $table->boolean('status_aktif')->default(true);
            $table->text('catatan')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('garasi_partners');
    }
};
