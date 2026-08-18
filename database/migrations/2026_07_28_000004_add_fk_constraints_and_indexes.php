<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. whatsapp_logs FK
        $whatsappHasFk = DB::select(
            "SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'whatsapp_logs'
             AND COLUMN_NAME = 'order_id' AND REFERENCED_TABLE_NAME IS NOT NULL"
        );
        if (empty($whatsappHasFk)) {
            Schema::table('whatsapp_logs', function (Blueprint $table) {
                $table->foreign('order_id')->references('id')->on('orders')->nullOnDelete();
            });
        }

        // 2. whatsapp_logs order_id index
        $whatsappIdx = DB::select(
            "SHOW INDEX FROM `whatsapp_logs` WHERE Column_name = 'order_id' AND Key_name != 'PRIMARY'"
        );
        if (empty($whatsappIdx)) {
            Schema::table('whatsapp_logs', function (Blueprint $table) {
                $table->index('order_id');
            });
        }

        // 3. notifications FK
        $notifHasFk = DB::select(
            "SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'notifications'
             AND COLUMN_NAME = 'user_id' AND REFERENCED_TABLE_NAME IS NOT NULL"
        );
        if (empty($notifHasFk)) {
            Schema::table('notifications', function (Blueprint $table) {
                $table->foreign('user_id')->references('id')->on('users')->nullOnDelete();
            });
        }

        // 4. pembayarans admin_id index
        $pembIdx = DB::select(
            "SHOW INDEX FROM `pembayarans` WHERE Column_name = 'admin_id' AND Key_name != 'PRIMARY'"
        );
        if (empty($pembIdx)) {
            Schema::table('pembayarans', function (Blueprint $table) {
                $table->index('admin_id');
            });
        }

        // 5. supir_calos indexes
        $supirIdx = DB::select(
            "SHOW INDEX FROM `supir_calos` WHERE Column_name IN ('jenis', 'status') AND Key_name != 'PRIMARY'"
        );
        $supirCols = array_column($supirIdx, 'Column_name');
        Schema::table('supir_calos', function (Blueprint $table) use ($supirCols) {
            if (! in_array('jenis', $supirCols)) {
                $table->index('jenis');
            }
            if (! in_array('status', $supirCols)) {
                $table->index('status');
            }
        });

        // 6. Deduplicate customers.no_hp BEFORE adding unique constraint
        //    Keep the oldest record (lowest id), reassign orders, then delete duplicates.
        $duplicates = DB::select(
            "SELECT no_hp, MIN(id) as keep_id
             FROM customers
             WHERE no_hp IS NOT NULL AND no_hp != ''
             GROUP BY no_hp HAVING COUNT(*) > 1"
        );
        foreach ($duplicates as $dup) {
            $keepId = $dup->keep_id;
            $dupIds = DB::select(
                'SELECT id FROM customers WHERE no_hp = ? AND id != ?',
                [$dup->no_hp, $keepId]
            );
            foreach ($dupIds as $row) {
                DB::statement('UPDATE orders SET customer_id = ? WHERE customer_id = ?', [$keepId, $row->id]);
                DB::statement('DELETE FROM customers WHERE id = ?', [$row->id]);
            }
        }

        // 7. customers no_hp unique
        $custUnique = DB::select(
            "SELECT CONSTRAINT_NAME FROM information_schema.TABLE_CONSTRAINTS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'customers'
             AND CONSTRAINT_TYPE = 'UNIQUE' AND CONSTRAINT_NAME = 'customers_no_hp_unique'"
        );
        if (empty($custUnique)) {
            Schema::table('customers', function (Blueprint $table) {
                $table->unique('no_hp');
            });
        }
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
