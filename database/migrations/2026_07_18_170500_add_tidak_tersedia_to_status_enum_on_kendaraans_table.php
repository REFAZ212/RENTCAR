<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement("ALTER TABLE kendaraans MODIFY COLUMN status ENUM('tersedia', 'disewa', 'maintenance', 'tidak_tersedia') NOT NULL DEFAULT 'tersedia'");
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE kendaraans MODIFY COLUMN status ENUM('tersedia', 'disewa', 'maintenance') NOT NULL DEFAULT 'tersedia'");
    }
};
