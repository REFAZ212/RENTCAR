<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // ── Ubah FK dari cascadeOnDelete ke restrictOnDelete ──
        // Agar tidak ada data historis yang ikut terhapus saat
        // customer/kendaraan/admin dihapus.
        Schema::table('orders', function (Blueprint $table) {
            $table->dropForeign(['customer_id']);
            $table->foreign('customer_id')->references('id')->on('customers')->restrictOnDelete();

            $table->dropForeign(['kendaraan_id']);
            $table->foreign('kendaraan_id')->references('id')->on('kendaraans')->restrictOnDelete();

            $table->dropForeign(['admin_id']);
            $table->foreign('admin_id')->references('id')->on('users')->restrictOnDelete();
        });

        Schema::table('pembayarans', function (Blueprint $table) {
            $table->dropForeign(['order_id']);
            $table->foreign('order_id')->references('id')->on('orders')->restrictOnDelete();

            // Hapus index duplikat — constrained() sudah membuat index
            $table->dropIndex(['order_id']);

            // Tambah kolom admin_id untuk audit trail
            $table->foreignId('admin_id')->nullable()->after('order_id');
        });

        // ── SoftDeletes: tambah deleted_at ke orders & pembayarans ──
        Schema::table('orders', function (Blueprint $table) {
            $table->softDeletes();
        });

        Schema::table('pembayarans', function (Blueprint $table) {
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::table('pembayarans', function (Blueprint $table) {
            $table->dropSoftDeletes();
        });

        Schema::table('orders', function (Blueprint $table) {
            $table->dropSoftDeletes();
        });

        Schema::table('pembayarans', function (Blueprint $table) {
            $table->dropColumn('admin_id');
            $table->index('order_id');
        });

        Schema::table('pembayarans', function (Blueprint $table) {
            $table->dropForeign(['order_id']);
            $table->foreign('order_id')->references('id')->on('orders')->cascadeOnDelete();
        });

        Schema::table('orders', function (Blueprint $table) {
            $table->dropForeign(['admin_id']);
            $table->foreign('admin_id')->references('id')->on('users')->cascadeOnDelete();

            $table->dropForeign(['kendaraan_id']);
            $table->foreign('kendaraan_id')->references('id')->on('kendaraans')->cascadeOnDelete();

            $table->dropForeign(['customer_id']);
            $table->foreign('customer_id')->references('id')->on('customers')->cascadeOnDelete();
        });
    }
};
