<?php

namespace Tests\Feature;

use App\Models\SupirCalo;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class SupirCaloTest extends TestCase
{
    protected User $admin;

    protected User $adminOperasional;

    protected User $petugas;

    protected function setUp(): void
    {
        parent::setUp();

        Schema::dropIfExists('orders');
        Schema::dropIfExists('supir_calos');
        Schema::dropIfExists('users');

        Schema::create('users', function ($t) {
            $t->id();
            $t->string('name');
            $t->string('email')->unique();
            $t->string('phone')->nullable();
            $t->string('role')->default('petugas');
            $t->string('password');
            $t->rememberToken();
            $t->timestamps();
        });
        Schema::create('supir_calos', function ($t) {
            $t->id();
            $t->unsignedBigInteger('user_id')->nullable();
            $t->string('jenis')->default('supir');
            $t->string('nama');
            $t->string('email')->nullable()->unique();
            $t->string('password')->nullable();
            $t->boolean('must_change_password')->default(false);
            $t->string('no_hp');
            $t->text('alamat')->nullable();
            $t->string('status')->default('active');
            $t->string('driver_status')->nullable();
            $t->text('fcm_token')->nullable();
            $t->string('no_sim')->nullable();
            $t->string('foto')->nullable();
            $t->decimal('tarif_per_hari', 12, 2)->nullable();
            $t->decimal('komisi', 12, 2)->nullable();
            $t->text('catatan')->nullable();
            $t->timestamps();
        });
        Schema::create('orders', function ($t) {
            $t->id();
            $t->unsignedBigInteger('supir_id')->nullable();
            $t->unsignedBigInteger('calo_id')->nullable();
            $t->string('status_order')->default('pending');
            $t->timestamps();
            $t->softDeletes();
        });

        $this->admin = User::create(['name' => 'Admin Utama', 'email' => 'admin@tes.com', 'role' => 'admin_utama', 'password' => bcrypt('password')]);
        $this->adminOperasional = User::create(['name' => 'Admin Ops', 'email' => 'ops@tes.com', 'role' => 'admin_operasional', 'password' => bcrypt('password')]);
        $this->petugas = User::create(['name' => 'Petugas', 'email' => 'petugas@tes.com', 'role' => 'petugas', 'password' => bcrypt('password')]);
    }

    private function payload(array $overrides = []): array
    {
        return array_merge([
            'jenis' => 'supir',
            'nama' => 'Supir Test',
            'no_hp' => '081234567890',
            'no_sim' => '1234567890',
        ], $overrides);
    }

    private function createSupir(array $overrides = []): SupirCalo
    {
        return SupirCalo::create(array_merge([
            'jenis' => 'supir',
            'nama' => 'Supir Test',
            'no_hp' => '081234567890',
            'no_sim' => '1234567890',
            'status' => 'active',
        ], $overrides));
    }

    public function test_admin_dapat_tambah_supir(): void
    {
        $response = $this->actingAs($this->admin)->postJson('/api/supir-calos', $this->payload());

        $response->assertStatus(201);
        $this->assertDatabaseHas('supir_calos', [
            'nama' => 'Supir Test',
            'jenis' => 'supir',
            'no_sim' => '1234567890',
        ]);
    }

    public function test_admin_operasional_dapat_tambah_supir(): void
    {
        $response = $this->actingAs($this->adminOperasional)->postJson('/api/supir-calos', $this->payload());

        $response->assertStatus(201);
    }

    public function test_tambah_supir_tanpa_no_sim_ditolak(): void
    {
        $response = $this->actingAs($this->admin)->postJson('/api/supir-calos', $this->payload(['no_sim' => null]));

        $response->assertStatus(422);
        $response->assertJson(['message' => 'No. SIM wajib diisi untuk supir.']);
        $this->assertDatabaseCount('supir_calos', 0);
    }

    public function test_tambah_calo_wajib_komisi(): void
    {
        $response = $this->actingAs($this->admin)->postJson('/api/supir-calos', $this->payload([
            'jenis' => 'calo',
            'no_sim' => null,
        ]));

        $response->assertStatus(422);
        $response->assertJson(['message' => 'Komisi wajib diisi untuk calo.']);
    }

    public function test_email_duplikat_ditolak(): void
    {
        $this->actingAs($this->admin)->postJson('/api/supir-calos', $this->payload(['email' => 'dua@tes.com']))->assertStatus(201);

        $response = $this->actingAs($this->admin)->postJson('/api/supir-calos', $this->payload(['email' => 'dua@tes.com']));

        $response->assertStatus(422);
        $response->assertJsonValidationErrors('email');
    }

    public function test_petugas_tidak_bisa_tambah(): void
    {
        $response = $this->actingAs($this->petugas)->postJson('/api/supir-calos', $this->payload());

        $response->assertStatus(403);
    }

    public function test_tambah_supir_dengan_foto(): void
    {
        Storage::fake('public');

        $response = $this->actingAs($this->admin)->post('/api/supir-calos', $this->payload([
            'foto' => UploadedFile::fake()->image('foto.jpg'),
        ]));

        $response->assertStatus(201);
        $this->assertNotNull($response->json('foto'));
        Storage::disk('public')->assertExists($response->json('foto'));
    }

    public function test_index_memfilter_jenis_dan_pencarian(): void
    {
        $this->createSupir(['nama' => 'Si Percepatan', 'no_hp' => '6281111111111']);
        $this->createSupir(['nama' => 'Si Halus', 'no_hp' => '6282222222222']);
        $this->createSupir(['jenis' => 'calo', 'nama' => 'Calo Jago', 'komisi' => 50000]);

        $supir = $this->actingAs($this->admin)->getJson('/api/supir-calos?jenis=supir')->assertOk()->json('data');
        $this->assertCount(2, $supir);

        $byNama = $this->actingAs($this->admin)->getJson('/api/supir-calos?search=Halus')->assertOk()->json('data');
        $this->assertCount(1, $byNama);
        $this->assertSame('Si Halus', $byNama[0]['nama']);

        $byHp = $this->actingAs($this->admin)->getJson('/api/supir-calos?search=1111111111')->assertOk()->json('data');
        $this->assertCount(1, $byHp);
        $this->assertSame('Si Percepatan', $byHp[0]['nama']);
    }

    public function test_update_dilarang_untuk_data_dari_user_petugas(): void
    {
        $supir = $this->createSupir(['user_id' => $this->petugas->id]);

        $response = $this->actingAs($this->admin)->putJson("/api/supir-calos/{$supir->id}", ['nama' => 'Diubah']);

        $response->assertStatus(422);
        $response->assertJson(['message' => 'Data supir dari user petugas dikelola di halaman Manajemen User.']);
    }

    public function test_hapus_dilarang_untuk_data_dari_user_petugas(): void
    {
        $supir = $this->createSupir(['user_id' => $this->petugas->id]);

        $response = $this->actingAs($this->admin)->deleteJson("/api/supir-calos/{$supir->id}");

        $response->assertStatus(422);
        $this->assertDatabaseHas('supir_calos', ['id' => $supir->id]);
    }

    public function test_hapus_diblokir_saat_order_aktif(): void
    {
        $supir = $this->createSupir();
        DB::table('orders')->insert(['supir_id' => $supir->id, 'status_order' => 'active']);

        $response = $this->actingAs($this->admin)->deleteJson("/api/supir-calos/{$supir->id}");

        $response->assertStatus(422);
        $response->assertJson(['message' => 'Tidak bisa menghapus yang memiliki order aktif. Selesaikan atau batalkan order terlebih dahulu.']);
        $this->assertDatabaseHas('supir_calos', ['id' => $supir->id]);
    }

    public function test_hapus_diblokir_saat_order_perlu_verifikasi(): void
    {
        $supir = $this->createSupir();
        DB::table('orders')->insert(['calo_id' => $supir->id, 'status_order' => 'perlu_verifikasi']);

        $response = $this->actingAs($this->admin)->deleteJson("/api/supir-calos/{$supir->id}");

        $response->assertStatus(422);
        $this->assertDatabaseHas('supir_calos', ['id' => $supir->id]);
    }

    public function test_hapus_berhasil_tanpa_order_aktif(): void
    {
        Storage::fake('public');
        $supir = $this->createSupir(['foto' => 'supir-calos/lamasuatu.jpg']);
        Storage::disk('public')->put('supir-calos/lamasuatu.jpg', 'x');
        DB::table('orders')->insert(['supir_id' => $supir->id, 'status_order' => 'completed']);

        $response = $this->actingAs($this->admin)->deleteJson("/api/supir-calos/{$supir->id}");

        $response->assertOk();
        $this->assertDatabaseMissing('supir_calos', ['id' => $supir->id]);
        Storage::disk('public')->assertMissing('supir-calos/lamasuatu.jpg');
    }

    public function test_admin_operasional_tidak_bisa_hapus(): void
    {
        $supir = $this->createSupir();

        $response = $this->actingAs($this->adminOperasional)->deleteJson("/api/supir-calos/{$supir->id}");

        $response->assertStatus(403);
        $this->assertDatabaseHas('supir_calos', ['id' => $supir->id]);
    }

    public function test_update_dengan_hapus_foto_menghapus_foto_dan_file(): void
    {
        Storage::fake('public');
        $supir = $this->createSupir(['foto' => 'supir-calos/lamasuatu.jpg']);
        Storage::disk('public')->put('supir-calos/lamasuatu.jpg', 'x');

        $response = $this->actingAs($this->admin)->putJson("/api/supir-calos/{$supir->id}", [
            'hapus_foto' => true,
        ]);

        $response->assertOk();
        $this->assertNull($response->json('foto'));
        $this->assertDatabaseHas('supir_calos', ['id' => $supir->id, 'foto' => null]);
        Storage::disk('public')->assertMissing('supir-calos/lamasuatu.jpg');
    }

    public function test_update_tanpa_hapus_foto_tetap_menyimpan_foto(): void
    {
        Storage::fake('public');
        $supir = $this->createSupir(['foto' => 'supir-calos/lamasuatu.jpg']);
        Storage::disk('public')->put('supir-calos/lamasuatu.jpg', 'x');

        $response = $this->actingAs($this->admin)->putJson("/api/supir-calos/{$supir->id}", [
            'nama' => 'Diubah',
        ]);

        $response->assertOk();
        $this->assertSame('supir-calos/lamasuatu.jpg', $response->json('foto'));
        Storage::disk('public')->assertExists('supir-calos/lamasuatu.jpg');
    }

    public function test_update_dengan_foto_baru_mengganti_dan_menghapus_foto_lama(): void
    {
        Storage::fake('public');
        $supir = $this->createSupir(['foto' => 'supir-calos/lamasuatu.jpg']);
        Storage::disk('public')->put('supir-calos/lamasuatu.jpg', 'x');

        $response = $this->actingAs($this->admin)->post("/api/supir-calos/{$supir->id}", [
            '_method' => 'PUT',
            'foto' => UploadedFile::fake()->image('baru.jpg'),
        ]);

        $response->assertOk();
        $this->assertNotNull($response->json('foto'));
        $this->assertNotSame('supir-calos/lamasuatu.jpg', $response->json('foto'));
        Storage::disk('public')->assertMissing('supir-calos/lamasuatu.jpg');
        Storage::disk('public')->assertExists($response->json('foto'));
    }
}
