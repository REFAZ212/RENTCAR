<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // M9: Composite index for the overlap check query in OrderController.
        // Covers the WHERE clause: kendaraan_id + status_order IN (...) + tanggal_mulai <= X + tanggal_selesai >= Y
        Schema::table('orders', function (Blueprint $table) {
            $table->index(['kendaraan_id', 'status_order', 'tanggal_mulai', 'tanggal_selesai'], 'idx_orders_overlap_check');
        });

        // M10: Index on deleted_at for SoftDeletes queries.
        // Without this, every query with WHERE deleted_at IS NULL causes a full table scan.
        Schema::table('orders', function (Blueprint $table) {
            $table->index('deleted_at', 'idx_orders_deleted_at');
        });

        Schema::table('pembayarans', function (Blueprint $table) {
            $table->index('deleted_at', 'idx_pembayarans_deleted_at');
            $table->index('order_id', 'idx_pembayarans_order_id');
        });

        // M11: SoftDeletes for customers — allows safe deletion while preserving history.
        Schema::table('customers', function (Blueprint $table) {
            $table->softDeletes();
        });

        // L12: SoftDeletes for garasi_requests — cascades with soft-deleted orders.
        Schema::table('garasi_requests', function (Blueprint $table) {
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropIndex('idx_orders_overlap_check');
            $table->dropIndex('idx_orders_deleted_at');
        });

        Schema::table('pembayarans', function (Blueprint $table) {
            $table->dropIndex('idx_pembayarans_deleted_at');
            $table->dropIndex('idx_pembayarans_order_id');
        });

        Schema::table('customers', function (Blueprint $table) {
            $table->dropSoftDeletes();
        });

        Schema::table('garasi_requests', function (Blueprint $table) {
            $table->dropSoftDeletes();
        });
    }
};
