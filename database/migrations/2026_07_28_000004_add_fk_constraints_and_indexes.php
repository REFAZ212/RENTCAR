<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('whatsapp_logs', function (Blueprint $table) {
            $table->foreign('order_id')->references('id')->on('orders')->nullOnDelete();
            $table->index('order_id');
        });

        Schema::table('notifications', function (Blueprint $table) {
            $table->foreign('user_id')->references('id')->on('users')->nullOnDelete();
        });

        Schema::table('pembayarans', function (Blueprint $table) {
            $table->index('admin_id');
        });

        Schema::table('supir_calos', function (Blueprint $table) {
            $table->index('jenis');
            $table->index('status');
        });

        Schema::table('customers', function (Blueprint $table) {
            $table->unique('no_hp');
        });
    }

    public function down(): void
    {
        Schema::table('whatsapp_logs', function (Blueprint $table) {
            $table->dropForeign(['order_id']);
            $table->dropIndex(['order_id']);
        });

        Schema::table('notifications', function (Blueprint $table) {
            $table->dropForeign(['user_id']);
        });

        Schema::table('pembayarans', function (Blueprint $table) {
            $table->dropIndex(['admin_id']);
        });

        Schema::table('supir_calos', function (Blueprint $table) {
            $table->dropIndex(['jenis']);
            $table->dropIndex(['status']);
        });

        Schema::table('customers', function (Blueprint $table) {
            $table->dropUnique('no_hp');
        });
    }
};
