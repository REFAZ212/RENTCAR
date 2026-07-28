<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        if (config('database.default') !== 'mysql') {
            return;
        }

        DB::statement("ALTER TABLE kendaraans MODIFY COLUMN tipe ENUM('sedan', 'suv', 'mpv', 'hatchback', 'pickup', 'van', 'minibus', 'truk', 'sepeda', 'motor') NOT NULL");
    }

    public function down(): void
    {
        if (config('database.default') !== 'mysql') {
            return;
        }

        DB::statement("ALTER TABLE kendaraans MODIFY COLUMN tipe ENUM('sedan', 'suv', 'mpv', 'hatchback', 'pickup', 'van', 'minibus', 'truk') NOT NULL");
    }
};
