<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('whatsapp_logs', function (Blueprint $table) {
            // Dedup "sudah terkirim hari ini" di command reminder & filter admin
            // paling sering memfilter berdasarkan kombinasi ini.
            $table->index(['order_id', 'type', 'created_at']);
            $table->index(['type', 'created_at']);
            $table->index('status_kirim');
        });

        Schema::table('notifications', function (Blueprint $table) {
            // Dedup notifikasi per jenis/tanggal di command reminder.
            $table->index(['type', 'created_at']);
            // Filter unread/belum dibaca.
            $table->index('read_at');
        });
    }

    public function down(): void
    {
        Schema::table('whatsapp_logs', function (Blueprint $table) {
            $table->dropIndex(['order_id', 'type', 'created_at']);
            $table->dropIndex(['type', 'created_at']);
            $table->dropIndex('whatsapp_logs_status_kirim_index');
        });

        Schema::table('notifications', function (Blueprint $table) {
            $table->dropIndex(['type', 'created_at']);
            $table->dropIndex('notifications_read_at_index');
        });
    }
};
