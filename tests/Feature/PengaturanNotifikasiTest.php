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

    public function test_update_menyimpan_semua_toggle_termasuk_notif_admin_kendaraan_dikirim(): void
    {
        Setting::set('notif_booking_baru', '1');
        Setting::set('notif_pembayaran_masuk', '1');
        Setting::set('notif_admin_kendaraan_dikirim', '1');

        $response = $this->actingAs($this->admin)->putJson('/api/pengaturan/notifikasi', [
            'notif_booking_baru' => false,
            'notif_penugasan_driver' => false,
            'notif_task_petugas' => false,
            'notif_supir_order_mulai' => false,
            'notif_supir_order_selesai' => false,
            'notif_pengingat_kembali_supir' => false,
            'notif_pembayaran_masuk' => false,
            'notif_pengingat_bayar' => false,
            'notif_perlu_verifikasi' => false,
            'notif_order_selesai' => false,
            'notif_pengingat_kembali' => false,
            'kirim_hasil_inspeksi_ke_customer' => false,
            'notif_admin_kendaraan_dikirim' => false,
            'template_pengingat_kembali' => 'Halo {nama_customer}, kembalikan mobil ya.',
            'template_notifikasi_owner' => '[BOOKING] {kendaraan} — {customer}',
        ]);

        $response->assertOk();
        $this->assertSame('0', Setting::get('notif_booking_baru'));
        $this->assertSame('0', Setting::get('notif_pembayaran_masuk'));
        $this->assertSame('0', Setting::get('notif_admin_kendaraan_dikirim'));
        $this->assertSame('Halo {nama_customer}, kembalikan mobil ya.', Setting::get('template_pengingat_kembali'));
        $this->assertSame('[BOOKING] {kendaraan} — {customer}', Setting::get('template_notifikasi_owner'));
    }

    public function test_update_token_termask_tidak_menimpa_token_asli(): void
    {
        Setting::set('fonnte_token', 'rahasia-asli-1234');

        $response = $this->actingAs($this->admin)->putJson('/api/pengaturan/notifikasi', [
            'fonnte_token' => '****1234',
            'nomor_wa_owner' => '6281111111111',
        ]);

        $response->assertOk();
        $this->assertSame('rahasia-asli-1234', Setting::get('fonnte_token'));
        $this->assertSame('6281111111111', Setting::get('nomor_wa_owner'));
    }

    public function test_update_toggle_ditolak_untuk_petugas(): void
    {
        $response = $this->actingAs($this->petugas)->putJson('/api/pengaturan/notifikasi', [
            'notif_admin_kendaraan_dikirim' => false,
        ]);

        $response->assertForbidden();
        $this->assertSame('', Setting::get('notif_admin_kendaraan_dikirim', ''));
    }
}
