<?php

namespace Tests\Feature;

use App\Models\Setting;
use App\Models\SupirCalo;
use App\Models\User;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class BackupTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        Schema::dropIfExists('whatsapp_logs');
        Schema::dropIfExists('supir_calos');
        Schema::dropIfExists('settings');
        Schema::dropIfExists('users');

        Schema::create('users', function ($t) {
            $t->id();
            $t->string('name');
            $t->string('email')->unique();
            $t->string('phone')->nullable();
            $t->string('role')->default('petugas');
            $t->string('avatar')->nullable();
            $t->timestamp('email_verified_at')->nullable();
            $t->string('password');
            $t->rememberToken();
            $t->timestamps();
        });
        Schema::create('supir_calos', function ($t) {
            $t->id();
            $t->string('nama');
            $t->string('no_hp');
            $t->string('jenis');
            $t->string('status')->default('aktif');
            $t->decimal('tarif_per_hari', 12, 2)->default(0);
            $t->decimal('komisi', 12, 2)->default(0);
            $t->string('password')->nullable();
            $t->text('catatan')->nullable();
            $t->timestamps();
            $t->softDeletes();
        });
        Schema::create('settings', function ($t) {
            $t->id();
            $t->string('key')->unique();
            $t->text('value')->nullable();
            $t->timestamps();
        });

        $this->hashAdmin = Hash::make('password');
        User::create([
            'name' => 'Admin Utama',
            'email' => 'admin@test.com',
            'password' => $this->hashAdmin,
            'role' => 'admin_utama',
        ]);

        $this->hashSupir = Hash::make('supersecret');
        SupirCalo::create([
            'nama' => 'Supir Rahasia',
            'no_hp' => '628111222333',
            'jenis' => 'supir',
            'password' => $this->hashSupir,
        ]);

        Setting::set('nama_usaha', 'UDIN RENTCAR');
        Setting::set('fonnte_token', 'rahasia-gateway-123');
    }

    private string $hashSupir;

    private string $hashAdmin;

    public function test_backup_download_includes_all_tables_and_sanitizes_secrets(): void
    {
        $response = $this->actingAs(User::first())->getJson('/api/pengaturan/backup');

        $response->assertOk();
        $response->assertHeader('content-type');

        $content = $response->streamedContent();

        // Semua tabel ikut (DDL untuk setiap tabel yang ada di skema).
        $this->assertStringContainsString('INSERT INTO `settings`', $content);
        $this->assertStringContainsString('INSERT INTO `supir_calos`', $content);

        // Token gateway & hash password TIDAK boleh ikut.
        $this->assertStringNotContainsString('rahasia-gateway-123', $content);
        $this->assertStringNotContainsString($this->hashSupir, $content);
        $this->assertStringNotContainsString($this->hashAdmin, $content);
    }

    public function test_backup_download_denied_for_non_admin(): void
    {
        $petugas = User::create([
            'name' => 'Petugas',
            'email' => 'petugas@test.com',
            'password' => 'password',
            'role' => 'petugas',
        ]);

        $response = $this->actingAs($petugas)->getJson('/api/pengaturan/backup');

        $response->assertForbidden();
    }

    public function test_backup_database_command_creates_file_and_cleans_old(): void
    {
        $backupDir = storage_path('app/backup');
        File::makeDirectory($backupDir, 0775, true, true);

        $lama = $backupDir.'/backup-udin-renctcar-2000-01-01_000000.sql';
        File::put($lama, 'lama');
        touch($lama, now()->subDays(31)->getTimestamp());

        Artisan::call('backup:database');

        $files = glob($backupDir.'/backup-*.sql') ?: [];
        $this->assertNotEmpty($files, 'Perintah backup harus menghasilkan file .sql');

        // File lama dihapus oleh retensi (default 30 hari).
        $this->assertFileDoesNotExist($lama);

        foreach ($files as $file) {
            File::delete($file);
        }
    }
}
