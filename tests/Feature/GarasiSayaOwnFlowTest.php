<?php

namespace Tests\Feature;

use App\Models\GarasiPartner;
use App\Models\User;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class GarasiSayaOwnFlowTest extends TestCase
{
    protected User $admin;

    protected function setUp(): void
    {
        parent::setUp();

        Schema::dropIfExists('tipes');
        Schema::dropIfExists('kategoris');
        Schema::dropIfExists('kendaraans');
        Schema::dropIfExists('garasi_partners');
        Schema::dropIfExists('personal_access_tokens');
        Schema::dropIfExists('supir_calos');
        Schema::dropIfExists('users');

        Schema::create('users', function ($t) {
            $t->id();
            $t->string('name');
            $t->string('email')->unique();
            $t->string('role')->default('petugas');
            $t->string('password');
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
            $t->enum('metode_bagi_hasil', ['persentase'])->default('persentase');
            $t->decimal('persentase_bagi_hasil', 5, 2)->nullable();
            $t->text('catatan')->nullable();
            $t->timestamps();
        });
        Schema::create('kendaraans', function ($t) {
            $t->id();
            $t->foreignId('garasi_partner_id')->nullable();
            $t->foreignId('kategori_id')->nullable();
            $t->foreignId('tipe_id')->nullable();
            $t->string('nama_kendaraan')->nullable();
            $t->timestamps();
        });

        $this->admin = User::create([
            'name' => 'Admin Utama',
            'email' => 'admin@test.dev',
            'password' => 'password',
            'role' => 'admin_utama',
        ]);
    }

    private function payload(string $nama = 'Garasi Mitra', bool $isOwn = false): array
    {
        return [
            'nama_garasi' => $nama,
            'nama_pemilik' => 'Udin',
            'alamat' => 'Jl. Test 1',
            'no_hp' => '6281234567890',
            'is_own' => $isOwn,
        ];
    }

    private function buatGarasi(array $payload): GarasiPartner
    {
        $this->actingAs($this->admin)
            ->postJson('/api/garasi-partners', $payload)
            ->assertCreated();

        return GarasiPartner::where('nama_garasi', $payload['nama_garasi'])->firstOrFail();
    }

    public function test_create_own_garasi_lalu_garasi_saya_mengembalikannya(): void
    {
        $garasi = $this->buatGarasi($this->payload('Garasi Kantor', true));

        $response = $this->actingAs($this->admin)->getJson('/api/garasi-saya');

        $response->assertOk();
        $response->assertJsonPath('id', $garasi->id);
        $response->assertJsonPath('nama_garasi', 'Garasi Kantor');
    }

    public function test_menambahkan_kedua_own_garasi_menonaktifkan_yang_pertama(): void
    {
        $pertama = $this->buatGarasi($this->payload('Garasi Pertama', true));
        $kedua = $this->buatGarasi($this->payload('Garasi Kedua', true));

        $this->assertDatabaseHas('garasi_partners', ['id' => $pertama->id, 'is_own' => 0]);
        $this->assertDatabaseHas('garasi_partners', ['id' => $kedua->id, 'is_own' => 1]);

        $response = $this->actingAs($this->admin)->getJson('/api/garasi-saya');
        $response->assertOk();
        $response->assertJsonPath('id', $kedua->id);
    }

    public function test_garasi_mitra_tanpa_is_own_tidak_muncul_di_garasi_saya(): void
    {
        $this->buatGarasi($this->payload('Garasi Mitra', false));

        $response = $this->actingAs($this->admin)->getJson('/api/garasi-saya');

        $response->assertOk();
        $response->assertHeader('Content-Type', 'application/json');
        $this->assertSame('null', $response->getContent());
    }

    public function test_update_mitra_menjadi_own_menonaktifkan_own_sebelumnya(): void
    {
        $ownLama = $this->buatGarasi($this->payload('Own Lama', true));
        $mitra = $this->buatGarasi($this->payload('Garasi Mitra', false));

        $this->actingAs($this->admin)
            ->putJson("/api/garasi-partners/{$mitra->id}", ['is_own' => true])
            ->assertOk();

        $this->assertDatabaseHas('garasi_partners', ['id' => $ownLama->id, 'is_own' => 0]);
        $this->assertDatabaseHas('garasi_partners', ['id' => $mitra->id, 'is_own' => 1]);

        $response = $this->actingAs($this->admin)->getJson('/api/garasi-saya');
        $response->assertOk();
        $response->assertJsonPath('id', $mitra->id);
    }
}
