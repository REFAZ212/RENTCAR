<?php

namespace Tests\Feature;

use App\Models\GarasiPartner;
use App\Models\SupirCalo;
use App\Models\User;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class GarasiSayaRenameTest extends TestCase
{
    protected User $admin;

    protected function setUp(): void
    {
        parent::setUp();

        Schema::dropIfExists('personal_access_tokens');
        Schema::dropIfExists('supir_calos');
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
        Schema::create('supir_calos', function ($t) {
            $t->id();
            $t->foreignId('user_id')->nullable()->unique();
            $t->enum('jenis', ['supir', 'calo']);
            $t->string('nama');
            $t->string('email')->nullable()->unique();
            $t->string('password')->nullable();
            $t->boolean('must_change_password')->default(false);
            $t->string('no_hp');
            $t->text('alamat')->nullable();
            $t->enum('status', ['active', 'inactive'])->default('active');
            $t->timestamps();
        });
        Schema::create('personal_access_tokens', function ($t) {
            $t->id();
            $t->morphs('tokenable');
            $t->string('name');
            $t->string('token', 64)->unique();
            $t->text('abilities')->nullable();
            $t->timestamp('last_used_at')->nullable();
            $t->timestamp('expires_at')->nullable();
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
            'password' => 'password',
            'role' => 'admin_utama',
        ]);
    }

    private function garasiSaya(bool $isOwn = true, string $nama = 'Garasi Milik Sendiri'): GarasiPartner
    {
        return GarasiPartner::create([
            'nama_garasi' => $nama,
            'nama_pemilik' => 'Udin',
            'alamat' => 'Jl. Test 1',
            'no_hp' => '6281234567890',
            'is_own' => $isOwn,
        ]);
    }

    public function test_rename_garasi_saya_berhasil(): void
    {
        $garasi = $this->garasiSaya();

        $response = $this->actingAs($this->admin)->putJson('/api/garasi-saya', [
            'nama_garasi' => 'Nama Baru',
        ]);

        $response->assertOk();
        $response->assertJsonPath('id', $garasi->id);
        $response->assertJsonPath('nama_garasi', 'Nama Baru');
        $this->assertDatabaseHas('garasi_partners', [
            'id' => $garasi->id,
            'nama_garasi' => 'Nama Baru',
        ]);
    }

    public function test_rename_gagal_saat_tidak_ada_garasi_milik_sendiri(): void
    {
        $this->garasiSaya(false, 'Garasi Mitra');

        $response = $this->actingAs($this->admin)->putJson('/api/garasi-saya', [
            'nama_garasi' => 'Nama Baru',
        ]);

        $response->assertStatus(404);
        $this->assertDatabaseHas('garasi_partners', [
            'nama_garasi' => 'Garasi Mitra',
        ]);
    }

    public function test_rename_tanpa_nama_garasi_ditolak(): void
    {
        $this->garasiSaya();

        $response = $this->actingAs($this->admin)->putJson('/api/garasi-saya', [
            'nama_garasi' => '',
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['nama_garasi']);
    }

    public function test_rename_ditolak_untuk_supir_calo(): void
    {
        $this->garasiSaya();

        $supir = SupirCalo::create([
            'jenis' => 'supir',
            'nama' => 'Supir Test',
            'no_hp' => '6281234567899',
        ]);
        app('auth')->forgetGuards();
        $token = $supir->createToken('test')->plainTextToken;

        $response = $this->withToken($token)->putJson('/api/garasi-saya', [
            'nama_garasi' => 'Nama Baru',
        ]);

        $response->assertForbidden();
    }
}
