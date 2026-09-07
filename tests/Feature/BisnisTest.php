<?php

namespace Tests\Feature;

use App\Models\Setting;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class BisnisTest extends TestCase
{
    private User $admin;

    private User $petugas;

    protected function setUp(): void
    {
        parent::setUp();

        Schema::dropIfExists('users');
        Schema::dropIfExists('settings');

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
        Schema::create('settings', function ($t) {
            $t->id();
            $t->string('key')->unique();
            $t->text('value')->nullable();
            $t->timestamps();
        });

        $this->admin = User::create([
            'name' => 'Admin Utama',
            'email' => 'admin@test.com',
            'password' => 'password',
            'role' => 'admin_utama',
        ]);
        $this->petugas = User::create([
            'name' => 'Petugas 1',
            'email' => 'petugas@test.com',
            'password' => 'password',
            'role' => 'petugas',
        ]);
    }

    public function test_simpan_informasi_bisnis_berhasil(): void
    {
        $response = $this->actingAs($this->admin)->post('/api/pengaturan/bisnis', [
            'nama_usaha' => 'UDIN RENTCAR TEST',
            'alamat' => 'Jl. Contoh No. 1',
            'no_telp' => '081234567890',
            'email_usaha' => 'test@udin.com',
            'jam_operasional' => json_encode([['hari' => 'Senin', 'buka' => '08:00', 'tutup' => '17:00', 'libur' => false]]),
        ]);

        $response->assertOk();
        $this->assertSame('UDIN RENTCAR TEST', Setting::get('nama_usaha'));
        $this->assertSame('Jl. Contoh No. 1', Setting::get('alamat_usaha'));
        $this->assertSame('081234567890', Setting::get('no_telp_usaha'));
        $this->assertSame('test@udin.com', Setting::get('email_usaha'));
        $this->assertStringContainsString('Senin', Setting::get('jam_operasional'));
    }

    public function test_simpan_informasi_bisnis_tanpa_field_wajib_ditolak(): void
    {
        $response = $this->actingAs($this->admin)->post('/api/pengaturan/bisnis', [
            'nama_usaha' => '',
            'alamat' => '',
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['nama_usaha', 'alamat']);
        $this->assertEmpty(Setting::get('nama_usaha', ''));
    }

    public function test_upload_logo_berhasil_dan_tersimpan(): void
    {
        Storage::fake('public');

        $logo = UploadedFile::fake()->image('logo.png');

        $response = $this->actingAs($this->admin)->post('/api/pengaturan/bisnis', [
            'nama_usaha' => 'UDIN RENTCAR',
            'alamat' => 'Jl. Contoh',
            'logo' => $logo,
        ]);

        $response->assertOk();
        $stored = Setting::get('logo_usaha');
        $this->assertStringStartsWith('logos/', $stored);
        Storage::disk('public')->assertExists($stored);
    }

    public function test_get_informasi_bisnis_mengembalikan_nilai_dan_logo_relatif(): void
    {
        Storage::fake('public');
        $logo = UploadedFile::fake()->image('logo.png');

        $this->actingAs($this->admin)->post('/api/pengaturan/bisnis', [
            'nama_usaha' => 'UDIN RENTCAR TEST',
            'alamat' => 'Jl. Contoh No. 1',
            'logo' => $logo,
        ])->assertOk();

        $stored = Setting::get('logo_usaha');

        $response = $this->actingAs($this->admin)->getJson('/api/pengaturan/bisnis');

        $response->assertOk();
        $response->assertJsonPath('nama_usaha', 'UDIN RENTCAR TEST');
        $response->assertJsonPath('alamat', 'Jl. Contoh No. 1');
        $response->assertJsonPath('logo_url', '/storage/'.ltrim($stored, '/'));
        $this->assertStringStartsWith('/storage/', $response->json('logo_url'));
    }

    public function test_get_informasi_bisnis_dua_kali_true(): void
    {
        $response = $this->actingAs($this->admin)->getJson('/api/pengaturan/bisnis');

        $response->assertOk();
        $response->assertJsonPath('logo_url', null);
    }

    public function test_simpan_informasi_bisnis_ditolak_untuk_petugas(): void
    {
        $response = $this->actingAs($this->petugas)->post('/api/pengaturan/bisnis', [
            'nama_usaha' => 'UDIN RENTCAR',
            'alamat' => 'Jl. Contoh',
        ]);

        $response->assertForbidden();
    }
}
