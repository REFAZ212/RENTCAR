<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('pembayarans') && DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE pembayarans MODIFY COLUMN status ENUM('dp', 'pelunasan', 'refund') NOT NULL");
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('pembayarans') && DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE pembayarans MODIFY COLUMN status ENUM('dp', 'pelunasan') NOT NULL");
        }
    }
};
