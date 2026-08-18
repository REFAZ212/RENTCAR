<?php

namespace Tests\Feature;

use App\Models\GarasiPartner;
use App\Models\User;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class GarasiPartnerIncludeOwnTest extends TestCase
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
        Schema::create('kendaraans', function ($t) {
            $t->id();
            $t->foreignId('garasi_partner_id')->nullable();
            $t->string('nama_kendaraan');
            $t->string('plat_nomor')->unique();
            $t->string('warna')->nullable();
            $t->decimal('harga_sewa_per_hari', 12, 2)->default(0);
            $t->string('status')->default('tersedia');
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

        $this->admin = User::create([
            'name' => 'Admin Utama',
            'email' => 'admin@test.dev',
            'password' => bcrypt('password'),
            'role' => 'admin_utama',
        ]);
    }

    public function test_index_excludes_own_garage_by_default(): void
    {
        GarasiPartner::create([
            'nama_garasi' => 'Garasi Sendiri',
            'nama_pemilik' => 'Udin',
            'alamat' => 'Jl. Test 1',
            'no_hp' => '6281234567890',
            'is_own' => true,
        ]);
        GarasiPartner::create([
            'nama_garasi' => 'Garasi Mitra',
            'nama_pemilik' => 'Budi',
            'alamat' => 'Jl. Test 2',
            'no_hp' => '6281234567891',
            'is_own' => false,
        ]);

        $response = $this->actingAs($this->admin)->getJson('/api/garasi-partners');

        $response->assertStatus(200);
        $namaGarasi = collect($response->json('data'))->pluck('nama_garasi')->all();
        $this->assertNotContains('Garasi Sendiri', $namaGarasi);
        $this->assertContains('Garasi Mitra', $namaGarasi);
    }

    public function test_index_includes_own_garage_with_include_own(): void
    {
        GarasiPartner::create([
            'nama_garasi' => 'Garasi Sendiri',
            'nama_pemilik' => 'Udin',
            'alamat' => 'Jl. Test 1',
            'no_hp' => '6281234567890',
            'is_own' => true,
        ]);
        GarasiPartner::create([
            'nama_garasi' => 'Garasi Mitra',
            'nama_pemilik' => 'Budi',
            'alamat' => 'Jl. Test 2',
            'no_hp' => '6281234567891',
            'is_own' => false,
        ]);

        $response = $this->actingAs($this->admin)->getJson('/api/garasi-partners?include_own=1');

        $response->assertStatus(200);
        $namaGarasi = collect($response->json('data'))->pluck('nama_garasi')->all();
        $this->assertContains('Garasi Sendiri', $namaGarasi);
        $this->assertContains('Garasi Mitra', $namaGarasi);
    }
}
