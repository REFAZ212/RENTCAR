<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        if (config('database.default') !== 'mysql') {
            DB::table('users')->where('role', 'admin')->update(['role' => 'admin_utama']);

            return;
        }

        DB::statement("ALTER TABLE users MODIFY COLUMN role ENUM('admin', 'admin_utama', 'admin_operasional', 'petugas') DEFAULT 'petugas'");

        DB::table('users')->where('role', 'admin')->update(['role' => 'admin_utama']);

        DB::statement("ALTER TABLE users MODIFY COLUMN role ENUM('admin_utama', 'admin_operasional', 'petugas') DEFAULT 'petugas'");
    }

    public function down(): void
    {
        DB::table('users')->where('role', 'admin_utama')->update(['role' => 'admin']);

        if (config('database.default') !== 'mysql') {
            return;
        }

        DB::statement("ALTER TABLE users MODIFY COLUMN role ENUM('admin', 'admin_operasional', 'petugas') DEFAULT 'petugas'");
    }
};
