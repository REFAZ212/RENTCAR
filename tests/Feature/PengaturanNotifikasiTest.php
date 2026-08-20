<?php

namespace Tests\Feature;

use App\Models\Setting;
use App\Models\User;
use App\Models\WhatsappLog;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class PengaturanNotifikasiTest extends TestCase
{
    private User $admin;

    private User $petugas;

    protected function setUp(): void
    {
        parent::setUp();

        Schema::dropIfExists('whatsapp_logs');
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
        Schema::create('whatsapp_logs', function ($t) {
            $t->id();
            $t->string('type')->default('garasi');
            $t->foreignId('order_id')->nullable();
            $t->string('nomor_tujuan');
            $t->text('pesan');
            $t->string('status_kirim')->default('pending');
            $t->text('response')->nullable();
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

    public function test_test_notifikasi_tanpa_token_mengembalikan_422(): void
    {
        $response = $this->actingAs($this->admin)->postJson('/api/pengaturan/notifikasi/test', [
            'nomor' => '6281234567890',
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors('fonnte_token');
        $this->assertStringContainsString('Token gateway belum dikonfigurasi', $response->json('errors.fonnte_token.0'));
    }

    public function test_test_notifikasi_nomor_kosong_mengembalikan_422(): void
    {
        $response = $this->actingAs($this->admin)->postJson('/api/pengaturan/notifikasi/test', []);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors('nomor');
    }

    public function test_test_notifikasi_berhasil_dan_mencatat_log(): void
    {
        Setting::set('fonnte_token', 'test-token');
        Http::fake([
            'api.fonnte.com/*' => Http::response(['status' => true], 200),
        ]);

        $response = $this->actingAs($this->admin)->postJson('/api/pengaturan/notifikasi/test', [
            'nomor' => '6281234567890',
        ]);

        $response->assertOk();
        $this->assertSame(1, WhatsappLog::where('type', 'test_gateway')->where('status_kirim', 'terkirim')->count());
    }

    public function test_test_notifikasi_gagal_menampilkan_alasan_gateway(): void
    {
        Setting::set('fonnte_token', 'test-token');
        Http::fake([
            'api.fonnte.com/*' => Http::response(['status' => false, 'reason' => 'Token tidak valid (401)'], 200),
        ]);

        $response = $this->actingAs($this->admin)->postJson('/api/pengaturan/notifikasi/test', [
            'nomor' => '6281234567890',
        ]);

        $response->assertStatus(422);
        $response->assertJsonPath('message', 'Gagal mengirim pesan test: Token tidak valid (401)');
        $this->assertSame(1, WhatsappLog::where('type', 'test_gateway')->where('status_kirim', 'gagal')->count());
    }

    public function test_test_notifikasi_mengirim_header_authorization_tanpa_bearer(): void
    {
        Setting::set('fonnte_token', 'test-token');
        $authHeader = null;
        Http::fake(function ($request) use (&$authHeader) {
            $authHeader = $request->header('Authorization')[0] ?? null;

            return Http::response(['status' => true], 200);
        });

        $response = $this->actingAs($this->admin)->postJson('/api/pengaturan/notifikasi/test', [
            'nomor' => '6281234567890',
        ]);

        $response->assertOk();
        $this->assertSame('test-token', $authHeader);
        $this->assertStringNotContainsString('Bearer', (string) $authHeader);
    }

    public function test_test_notifikasi_ditolak_untuk_petugas(): void
    {
        $response = $this->actingAs($this->petugas)->postJson('/api/pengaturan/notifikasi/test', [
            'nomor' => '6281234567890',
        ]);

        $response->assertForbidden();
    }
}
