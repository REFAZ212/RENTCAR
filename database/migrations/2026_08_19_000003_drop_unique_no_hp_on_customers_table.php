<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // No. HP diperbolehkan sama antar pelanggan (mis. HP keluarga atau
        // nomor yang sudah ganti pemilik) — identitas dipegang oleh no_ktp.
        Schema::table('customers', function (Blueprint $table) {
            $table->dropUnique('customers_no_hp_unique');
        });
    }

    public function down(): void
    {
        Schema::table('customers', function (Blueprint $table) {
            $table->unique('no_hp');
        });
    }
};
