<?php

namespace Tests\Feature;

use App\Models\Setting;
use App\Models\User;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class PengaturanSistemTest extends TestCase
{
    private User $admin;

    private User $petugas;

    protected function setUp(): void
    {
        parent::setUp();

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

    public function test_get_sistem_hanya_menampilkan_prefix_kode_order(): void
    {
        $response = $this->actingAs($this->admin)->getJson('/api/pengaturan/sistem');

        $response->assertOk();
        $response->assertJsonPath('prefix_kode_order', 'ORD');
        $response->assertJsonMissing(['mata_uang']);
        $response->assertJsonMissing(['zona_waktu']);
        $response->assertJsonMissing(['format_tanggal']);
    }

    public function test_update_sistem_menyimpan_prefix_kode_order(): void
    {
        $response = $this->actingAs($this->admin)->putJson('/api/pengaturan/sistem', [
            'prefix_kode_order' => 'RNT',
        ]);

        $response->assertOk();
        $this->assertSame('RNT', Setting::get('prefix_kode_order'));
    }

    public function test_update_sistem_tidak_menyimpan_pengaturan_dekoratif_lama(): void
    {
        Setting::set('mata_uang', 'IDR');

        $this->actingAs($this->admin)->putJson('/api/pengaturan/sistem', [
            'mata_uang' => 'USD',
            'zona_waktu' => 'Asia/Makassar',
            'format_tanggal' => 'YYYY-MM-DD',
            'prefix_kode_order' => 'RNT',
        ])->assertOk();

        $this->assertSame('RNT', Setting::get('prefix_kode_order'));
        $this->assertSame('IDR', Setting::get('mata_uang', 'IDR'));
        $this->assertSame('Asia/Jakarta', Setting::get('zona_waktu', 'Asia/Jakarta'));
        $this->assertSame('DD/MM/YYYY', Setting::get('format_tanggal', 'DD/MM/YYYY'));
    }

    public function test_get_sistem_ditolak_untuk_petugas(): void
    {
        $response = $this->actingAs($this->petugas)->getJson('/api/pengaturan/sistem');

        $response->assertForbidden();
    }

    public function test_update_sistem_ditolak_untuk_petugas(): void
    {
        $response = $this->actingAs($this->petugas)->putJson('/api/pengaturan/sistem', [
            'prefix_kode_order' => 'RNT',
        ]);

        $response->assertForbidden();
    }
}
