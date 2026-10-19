<?php

namespace Tests\Feature;

use App\Models\GarasiPartner;
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
        Schema::dropIfExists('garasi_partners');

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
        Schema::create('garasi_partners', function ($t) {
            $t->id();
            $t->string('nama_garasi');
            $t->string('nama_pemilik');
            $t->text('alamat');
            $t->string('no_hp');
            $t->string('email')->nullable()->unique();
            $t->boolean('status_aktif')->default(true);
            $t->boolean('is_own')->default(false);
            $t->string('metode_bagi_hasil')->nullable();
            $t->decimal('persentase_bagi_hasil', 5, 2)->nullable();
            $t->text('catatan')->nullable();
            $t->string('kota')->nullable();
            $t->text('deskripsi_singkat')->nullable();
            $t->decimal('latitude', 10, 7)->nullable();
            $t->decimal('longitude', 10, 7)->nullable();
            $t->boolean('is_utama')->default(false);
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

    public function test_simpan_informasi_bisnis_menyimpan_ke_garasi_sendiri(): void
    {
        $this->actingAs($this->admin)->post('/api/pengaturan/bisnis', [
            'nama_usaha' => 'UDIN RENTCAR',
            'alamat' => 'Jl. Maju No. 5',
            'no_telp' => '0812345678',
            'email_usaha' => 'biz@udin.com',
            'nama_pemilik' => 'Pak Udin',
            'kota' => 'Yogyakarta',
            'deskripsi_singkat' => 'Rental terpercaya',
            'latitude' => -7.7829,
            'longitude' => 110.3671,
            'catatan' => 'Catatan garasi',
            'jam_operasional' => json_encode([['hari' => 'Senin', 'buka' => '08:00', 'tutup' => '17:00', 'libur' => false]]),
        ])->assertOk();

        $garasi = GarasiPartner::where('is_own', true)->first();
        $this->assertNotNull($garasi);
        $this->assertSame('UDIN RENTCAR', $garasi->nama_garasi);
        $this->assertSame('Pak Udin', $garasi->nama_pemilik);
        $this->assertSame('Jl. Maju No. 5', $garasi->alamat);
        $this->assertSame('0812345678', $garasi->no_hp);
        $this->assertSame('biz@udin.com', $garasi->email);
        $this->assertSame('Yogyakarta', $garasi->kota);
        $this->assertSame('Rental terpercaya', $garasi->deskripsi_singkat);
        $this->assertSame('Catatan garasi', $garasi->catatan);
        $this->assertNotNull($garasi->latitude);
        $this->assertNotNull($garasi->longitude);
        $this->assertTrue($garasi->is_own);
    }

    public function test_simpan_informasi_bisnis_minimal_membuat_garasi_dengan_fallback(): void
    {
        $this->actingAs($this->admin)->post('/api/pengaturan/bisnis', [
            'nama_usaha' => 'UDIN RENTCAR',
            'alamat' => 'Jl. Contoh',
        ])->assertOk();

        $garasi = GarasiPartner::where('is_own', true)->first();
        $this->assertNotNull($garasi);
        $this->assertSame('UDIN RENTCAR', $garasi->nama_garasi);
        $this->assertSame('UDIN RENTCAR', $garasi->nama_pemilik);
        $this->assertSame('', $garasi->no_hp);
    }

    public function test_simpan_informasi_bisnis_dua_kali_tidak_membuat_garasi_ganda(): void
    {
        $payload = [
            'nama_usaha' => 'UDIN RENTCAR',
            'alamat' => 'Jl. Contoh',
        ];

        $this->actingAs($this->admin)->post('/api/pengaturan/bisnis', $payload)->assertOk();
        $this->actingAs($this->admin)->post('/api/pengaturan/bisnis', [
            ...$payload,
            'nama_usaha' => 'UDIN RENTCAR BARU',
        ])->assertOk();

        $this->assertSame(1, GarasiPartner::where('is_own', true)->count());
        $this->assertSame('UDIN RENTCAR BARU', GarasiPartner::where('is_own', true)->first()->nama_garasi);
    }

    public function test_get_informasi_bisnis_mengembalikan_field_garasi(): void
    {
        GarasiPartner::create([
            'nama_garasi' => 'Garasi Sendiri',
            'nama_pemilik' => 'Pemilik X',
            'alamat' => 'Alamat X',
            'no_hp' => '0800',
            'is_own' => true,
            'kota' => 'Bandung',
            'deskripsi_singkat' => 'Deskripsi X',
            'latitude' => -6.9,
            'longitude' => 107.6,
            'catatan' => 'Catatan X',
        ]);

        $response = $this->actingAs($this->admin)->getJson('/api/pengaturan/bisnis');

        $response->assertOk();
        $response->assertJsonPath('nama_pemilik', 'Pemilik X');
        $response->assertJsonPath('kota', 'Bandung');
        $response->assertJsonPath('deskripsi_singkat', 'Deskripsi X');
        $response->assertJsonPath('catatan', 'Catatan X');
        $this->assertNotNull($response->json('latitude'));
        $this->assertNotNull($response->json('longitude'));
    }
}
