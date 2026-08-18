<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Tambah status 'diantri' ke enum status_kirim whatsapp_logs.
     * Status ini dipakai oleh WhatsAppService::kirimPesanAsync untuk
     * mencatat pesan yang masih menunggu diproses queue.
     */
    public function up(): void
    {
        if (config('database.default') === 'mysql') {
            DB::statement("ALTER TABLE whatsapp_logs MODIFY COLUMN status_kirim ENUM('pending', 'diantri', 'terkirim', 'gagal') NOT NULL DEFAULT 'pending'");
        } else {
            Schema::table('whatsapp_logs', function (Blueprint $table) {
                $table->string('status_kirim')->default('pending')->change();
            });
        }
    }

    public function down(): void
    {
        if (config('database.default') === 'mysql') {
            DB::statement("ALTER TABLE whatsapp_logs MODIFY COLUMN status_kirim ENUM('pending', 'terkirim', 'gagal') NOT NULL DEFAULT 'pending'");
        } else {
            Schema::table('whatsapp_logs', function (Blueprint $table) {
                $table->enum('status_kirim', ['pending', 'terkirim', 'gagal'])->default('pending')->change();
            });
        }
    }
};
