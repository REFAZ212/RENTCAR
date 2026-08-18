<?php

namespace Tests\Feature;

use App\Models\GarasiPartner;
use App\Models\Kendaraan;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class KendaraanTest extends TestCase
{
    protected User $admin;

    protected function setUp(): void
    {
        parent::setUp();

        Schema::dropIfExists('kendaraans');
        Schema::dropIfExists('garasi_partners');
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
        Schema::create('garasi_partners', function ($t) {
            $t->id();
            $t->string('nama_garasi');
            $t->string('nama_pemilik')->nullable();
            $t->text('alamat')->nullable();
            $t->string('no_hp')->nullable();
            $t->boolean('status_aktif')->default(true);
            $t->boolean('is_own')->default(false);
            $t->timestamps();
        });
        Schema::create('kendaraans', function ($t) {
            $t->id();
            $t->foreignId('garasi_partner_id')->nullable();
            $t->foreignId('kategori_id')->nullable();
            $t->foreignId('tipe_id')->nullable();
            $t->string('nama_kendaraan');
            $t->string('plat_nomor')->unique();
            $t->string('merek')->nullable();
            $t->string('model')->nullable();
            $t->integer('tahun')->nullable();
            $t->string('warna')->nullable();
            $t->integer('kapasitas_penumpang')->nullable();
            $t->decimal('harga_sewa_per_hari', 12, 2)->default(0);
            $t->string('status')->default('tersedia');
            $t->string('foto')->nullable();
            $t->text('catatan')->nullable();
            $t->timestamps();
        });

        $this->admin = User::create([
            'name' => 'Admin Utama',
            'email' => 'admin@test.dev',
            'password' => bcrypt('password'),
            'role' => 'admin_utama',
        ]);
    }

    private function buatGarasi(): GarasiPartner
    {
        return GarasiPartner::create([
            'nama_garasi' => 'Garasi Mitra Test',
            'nama_pemilik' => 'Budi',
            'alamat' => 'Jl. Test 1',
            'no_hp' => '6281234567890',
            'status_aktif' => true,
            'is_own' => false,
        ]);
    }

    private function payload(GarasiPartner $garasi, array $overrides = []): array
    {
        return array_merge([
            'garasi_partner_id' => $garasi->id,
            'nama_kendaraan' => 'Avanza',
            'plat_nomor' => 'B 1234 CD',
            'merek' => 'Toyota',
            'model' => 'Avanza',
            'tahun' => 2021,
            'warna' => 'Putih',
            'kapasitas_penumpang' => 7,
            'harga_sewa_per_hari' => 350000,
        ], $overrides);
    }

    public function test_store_creates_vehicle_with_default_tersedia_status(): void
    {
        $garasi = $this->buatGarasi();

        $response = $this->actingAs($this->admin)->postJson('/api/kendaraans', $this->payload($garasi));

        $response->assertStatus(201)
            ->assertJsonPath('status', 'tersedia')
            ->assertJsonPath('nama_kendaraan', 'Avanza');
        $this->assertDatabaseHas('kendaraans', ['plat_nomor' => 'B 1234 CD']);
    }

    public function test_store_normalizes_plat_nomor_to_uppercase(): void
    {
        $garasi = $this->buatGarasi();

        $this->actingAs($this->admin)->postJson('/api/kendaraans', $this->payload($garasi, [
            'plat_nomor' => '  b 123 cD  ',
        ]));

        $this->assertDatabaseHas('kendaraans', ['plat_nomor' => 'B 123 CD']);
    }

    public function test_store_rejects_zero_harga_with_indonesian_message(): void
    {
        $garasi = $this->buatGarasi();

        $response = $this->actingAs($this->admin)->postJson('/api/kendaraans', $this->payload($garasi, [
            'harga_sewa_per_hari' => 0,
        ]));

        $response->assertStatus(422)
            ->assertJsonPath('errors.harga_sewa_per_hari.0', 'Harga Sewa per Hari minimal bernilai 1.');
    }

    public function test_store_rejects_missing_garasi_with_indonesian_message(): void
    {
        $payload = $this->payload($this->buatGarasi());
        unset($payload['garasi_partner_id']);

        $response = $this->actingAs($this->admin)->postJson('/api/kendaraans', $payload);

        $response->assertStatus(422)
            ->assertJsonPath('errors.garasi_partner_id.0', 'Garasi wajib diisi.');
    }

    public function test_store_rejects_duplicate_plat_with_indonesian_message(): void
    {
        $garasi = $this->buatGarasi();
        $this->actingAs($this->admin)->postJson('/api/kendaraans', $this->payload($garasi));

        $response = $this->actingAs($this->admin)->postJson('/api/kendaraans', $this->payload($garasi, [
            'nama_kendaraan' => 'Avanza Kedua',
        ]));

        $response->assertStatus(422)
            ->assertJsonPath('errors.plat_nomor.0', 'Plat Nomor sudah digunakan.');
    }

    public function test_store_rejects_foto_larger_than_2mb(): void
    {
        $garasi = $this->buatGarasi();
        $tooBigFoto = UploadedFile::fake()->create('foto.jpg', 3000, 'image/jpeg');

        $response = $this->actingAs($this->admin)->post('/api/kendaraans', $this->payload($garasi) + [
            'foto' => $tooBigFoto,
        ]);

        $response->assertStatus(422)
            ->assertJsonPath('errors.foto.0', 'Foto tidak boleh lebih dari 2048 kilobyte.');
    }

    public function test_update_normalizes_plat_nomor_and_accepts_valid_input(): void
    {
        $garasi = $this->buatGarasi();
        $kendaraan = Kendaraan::create($this->payload($garasi));

        $response = $this->actingAs($this->admin)->putJson("/api/kendaraans/{$kendaraan->id}", [
            'plat_nomor' => ' x  777 yy ',
        ]);

        $response->assertStatus(200);
        $this->assertDatabaseHas('kendaraans', ['plat_nomor' => 'X 777 YY']);
    }

    public function test_update_rejects_zero_harga(): void
    {
        $garasi = $this->buatGarasi();
        $kendaraan = Kendaraan::create($this->payload($garasi));

        $response = $this->actingAs($this->admin)->putJson("/api/kendaraans/{$kendaraan->id}", [
            'harga_sewa_per_hari' => 0,
        ]);

        $response->assertStatus(422)
            ->assertJsonPath('errors.harga_sewa_per_hari.0', 'Harga Sewa per Hari minimal bernilai 1.');
    }

    public function test_update_with_hapus_foto_removes_photo_and_deletes_file(): void
    {
        Storage::fake('public');
        $garasi = $this->buatGarasi();
        $kendaraan = Kendaraan::create($this->payload($garasi) + ['foto' => 'kendaraan/foto-lama.jpg']);
        Storage::disk('public')->put('kendaraan/foto-lama.jpg', 'dummy');

        $response = $this->actingAs($this->admin)->putJson("/api/kendaraans/{$kendaraan->id}", [
            'hapus_foto' => true,
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('foto', null);
        $this->assertNull($kendaraan->fresh()->foto);
        Storage::disk('public')->assertMissing('kendaraan/foto-lama.jpg');
    }

    public function test_update_with_hapus_foto_false_keeps_photo(): void
    {
        Storage::fake('public');
        $garasi = $this->buatGarasi();
        $kendaraan = Kendaraan::create($this->payload($garasi) + ['foto' => 'kendaraan/foto-lama.jpg']);
        Storage::disk('public')->put('kendaraan/foto-lama.jpg', 'dummy');

        $this->actingAs($this->admin)->putJson("/api/kendaraans/{$kendaraan->id}", [
            'hapus_foto' => false,
            'nama_kendaraan' => 'Innova',
        ]);

        $this->assertSame('kendaraan/foto-lama.jpg', $kendaraan->fresh()->foto);
        Storage::disk('public')->assertExists('kendaraan/foto-lama.jpg');
    }
}
