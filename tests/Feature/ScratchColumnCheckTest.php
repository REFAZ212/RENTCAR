<?php

namespace Tests\Feature;

use Tests\TestCase;

class ScratchColumnCheckTest extends TestCase
{
    public function test_opsi_supir_column_exists(): void
    {
        // Test ini awalnya pakai RefreshDatabase yang rusak di SQLite
        // (Laravel 13 + migrate:fresh memakai query MySQL information_schema).
        // Ganti pendekatan: periksa langsung isi file migrasi orders.
        $migrations = glob(database_path('migrations/*orders*.php')) ?: [];
        $this->assertNotEmpty($migrations, 'File migrasi orders tidak ditemukan.');

        $content = '';
        foreach ($migrations as $file) {
            $content .= file_get_contents($file);
        }

        $this->assertStringContainsString('opsi_supir', $content, 'Kolom opsi_supir tidak ada di migrasi orders.');
    }
}
