<?php

namespace Tests\Feature;

use App\Models\Kategori;
use App\Models\Tipe;
use App\Models\User;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class KategoriTipeTest extends TestCase
{
    protected User $admin;

    protected function setUp(): void
    {
        parent::setUp();

        Schema::dropIfExists('kendaraans');
        Schema::dropIfExists('tipes');
        Schema::dropIfExists('kategoris');
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
        Schema::create('kategoris', function ($t) {
            $t->id();
            $t->string('nama_kategori');
            $t->string('slug')->nullable();
            $t->text('deskripsi')->nullable();
            $t->boolean('aktif')->default(true);
            $t->timestamps();
        });
        Schema::create('tipes', function ($t) {
            $t->id();
            $t->foreignId('kategori_id')->nullable();
            $t->string('nama_tipe');
            $t->string('slug')->nullable();
            $t->text('deskripsi')->nullable();
            $t->boolean('aktif')->default(true);
            $t->timestamps();
        });
        Schema::create('kendaraans', function ($t) {
            $t->id();
            $t->foreignId('kategori_id')->nullable();
            $t->foreignId('tipe_id')->nullable();
            $t->string('nama_kendaraan');
            $t->string('plat_nomor')->unique();
            $t->timestamps();
        });

        $this->admin = User::create([
            'name' => 'Admin Utama',
            'email' => 'admin@test.dev',
            'password' => bcrypt('password'),
            'role' => 'admin_utama',
        ]);
    }

    public function test_store_kategori_with_tipes_creates_all(): void
    {
        $response = $this->actingAs($this->admin)->postJson('/api/kategoris', [
            'nama_kategori' => 'Mobil',
            'deskripsi' => 'Kendaraan roda empat',
            'aktif' => true,
            'tipes' => ['MPV', 'SUV'],
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('nama_kategori', 'Mobil')
            ->assertJsonCount(2, 'tipes');
        $this->assertDatabaseHas('kategoris', ['nama_kategori' => 'Mobil']);
        $this->assertDatabaseHas('tipes', ['nama_tipe' => 'MPV', 'kategori_id' => $response->json('id')]);
        $this->assertDatabaseHas('tipes', ['nama_tipe' => 'SUV', 'kategori_id' => $response->json('id')]);
    }

    public function test_store_kategori_trims_name_and_dedupes_tipes(): void
    {
        $response = $this->actingAs($this->admin)->postJson('/api/kategoris', [
            'nama_kategori' => '  Motor  ',
            'tipes' => ['  Sport ', 'Sport', 'Trail'],
        ]);

        $response->assertStatus(201);
        $this->assertDatabaseHas('kategoris', ['nama_kategori' => 'Motor']);
        $this->assertDatabaseHas('tipes', ['nama_tipe' => 'Sport', 'kategori_id' => $response->json('id')]);
        $this->assertDatabaseHas('tipes', ['nama_tipe' => 'Trail', 'kategori_id' => $response->json('id')]);
        $this->assertSame(2, Tipe::where('kategori_id', $response->json('id'))->count());
    }

    public function test_store_tipe_is_unique_per_kategori(): void
    {
        $kategoriA = Kategori::create(['nama_kategori' => 'Mobil']);
        $kategoriB = Kategori::create(['nama_kategori' => 'Motor']);

        $this->actingAs($this->admin)->postJson('/api/tipes', [
            'kategori_id' => $kategoriA->id,
            'nama_tipe' => 'Sport',
        ])->assertStatus(201);

        $response = $this->actingAs($this->admin)->postJson('/api/tipes', [
            'kategori_id' => $kategoriB->id,
            'nama_tipe' => 'Sport',
        ]);

        $response->assertStatus(201);
        $this->assertDatabaseHas('tipes', ['nama_tipe' => 'Sport', 'kategori_id' => $kategoriA->id]);
        $this->assertDatabaseHas('tipes', ['nama_tipe' => 'Sport', 'kategori_id' => $kategoriB->id]);
    }

    public function test_store_tipe_duplicate_in_same_kategori_rejected(): void
    {
        $kategori = Kategori::create(['nama_kategori' => 'Mobil']);
        Tipe::create(['kategori_id' => $kategori->id, 'nama_tipe' => 'SUV']);

        $response = $this->actingAs($this->admin)->postJson('/api/tipes', [
            'kategori_id' => $kategori->id,
            'nama_tipe' => 'SUV',
        ]);

        $response->assertStatus(422)
            ->assertJsonPath('errors.nama_tipe.0', 'Nama Tipe sudah digunakan.');
    }

    public function test_store_tipe_requires_kategori(): void
    {
        $response = $this->actingAs($this->admin)->postJson('/api/tipes', [
            'nama_tipe' => 'MPV',
        ]);

        $response->assertStatus(422)
            ->assertJsonPath('errors.kategori_id.0', 'Kategori wajib diisi.');
    }

    public function test_destroy_kategori_with_tipes_is_blocked(): void
    {
        $kategori = Kategori::create(['nama_kategori' => 'Mobil']);
        $kategori->tipes()->create(['nama_tipe' => 'SUV']);

        $response = $this->actingAs($this->admin)->deleteJson("/api/kategoris/{$kategori->id}");

        $response->assertStatus(422)
            ->assertJsonPath('message', 'Kategori masih memiliki tipe. Hapus atau pindahkan tipe terlebih dahulu.');
        $this->assertDatabaseHas('kategoris', ['id' => $kategori->id]);
        $this->assertDatabaseHas('tipes', ['nama_tipe' => 'SUV']);
    }

    public function test_destroy_kategori_without_tipes_allowed(): void
    {
        $kategori = Kategori::create(['nama_kategori' => 'Mobil']);

        $response = $this->actingAs($this->admin)->deleteJson("/api/kategoris/{$kategori->id}");

        $response->assertStatus(200);
        $this->assertDatabaseMissing('kategoris', ['id' => $kategori->id]);
    }

    public function test_update_tipe_can_move_to_another_kategori(): void
    {
        $kategoriA = Kategori::create(['nama_kategori' => 'Mobil']);
        $kategoriB = Kategori::create(['nama_kategori' => 'Motor']);
        $tipe = Tipe::create(['kategori_id' => $kategoriA->id, 'nama_tipe' => 'Sport']);

        $response = $this->actingAs($this->admin)->putJson("/api/tipes/{$tipe->id}", [
            'kategori_id' => $kategoriB->id,
            'nama_tipe' => 'Sport',
        ]);

        $response->assertStatus(200);
        $this->assertDatabaseHas('tipes', ['id' => $tipe->id, 'kategori_id' => $kategoriB->id]);
    }

    public function test_update_tipe_trims_nama(): void
    {
        $kategori = Kategori::create(['nama_kategori' => 'Mobil']);
        $tipe = Tipe::create(['kategori_id' => $kategori->id, 'nama_tipe' => 'MPV']);

        $response = $this->actingAs($this->admin)->putJson("/api/tipes/{$tipe->id}", [
            'kategori_id' => $kategori->id,
            'nama_tipe' => '  MPV Baru  ',
        ]);

        $response->assertStatus(200);
        $this->assertDatabaseHas('tipes', ['id' => $tipe->id, 'nama_tipe' => 'MPV Baru']);
    }
}
