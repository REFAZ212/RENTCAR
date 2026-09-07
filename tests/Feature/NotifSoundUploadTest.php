<?php

namespace Tests\Feature;

use App\Models\Setting;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class NotifSoundUploadTest extends TestCase
{
    private User $admin;

    private User $petugas;

    protected function setUp(): void
    {
        parent::setUp();

        Schema::dropIfExists('users');
        Schema::dropIfExists('settings');

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

    public function test_upload_suara_notifikasi_berhasil(): void
    {
        Storage::fake('public');

        $file = UploadedFile::fake()->createWithContent('notif.mp3', 'fake-mp3-bytes');

        $response = $this->actingAs($this->admin)->post('/api/pengaturan/notifikasi/sound', [
            'notif_sound' => $file,
        ]);

        $response->assertOk();
        $this->assertNotEmpty(Setting::get('notif_sound_admin'));
        $this->assertStringEndsWith('.mp3', $response->json('name'));
        Storage::disk('public')->assertExists(Setting::get('notif_sound_admin'));
    }

    public function test_upload_file_non_audio_ditolak(): void
    {
        Storage::fake('public');

        $file = UploadedFile::fake()->create('dokumen.txt', 10);

        $response = $this->actingAs($this->admin)->post('/api/pengaturan/notifikasi/sound', [
            'notif_sound' => $file,
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors('notif_sound');
        $this->assertEmpty(Setting::get('notif_sound_admin', ''));
    }

    public function test_get_suara_notifikasi_kosong(): void
    {
        $response = $this->actingAs($this->admin)->getJson('/api/pengaturan/notifikasi/sound');

        $response->assertOk();
        $response->assertJsonPath('source', 'none');
        $response->assertJsonPath('url', null);
        $response->assertJsonPath('preset', null);
    }

    public function test_pilih_suara_bawaan_berhasil(): void
    {
        $response = $this->actingAs($this->admin)->putJson('/api/pengaturan/notifikasi/sound/builtin', [
            'preset' => 'bell',
        ]);

        $response->assertOk();
        $response->assertJsonPath('source', 'builtin');
        $response->assertJsonPath('preset', 'bell');
        $this->assertSame('builtin:bell', Setting::get('notif_sound_admin'));
    }

    public function test_pilih_suara_bawaan_preset_tidak_valid_ditolak(): void
    {
        $response = $this->actingAs($this->admin)->putJson('/api/pengaturan/notifikasi/sound/builtin', [
            'preset' => 'nada-asal',
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors('preset');
        $this->assertEmpty(Setting::get('notif_sound_admin', ''));
    }

    public function test_pilih_suara_bawaan_menghapus_file_custom_lama(): void
    {
        Storage::fake('public');
        $file = UploadedFile::fake()->createWithContent('notif.mp3', 'fake-mp3-bytes');

        $this->actingAs($this->admin)->post('/api/pengaturan/notifikasi/sound', ['notif_sound' => $file])->assertOk();
        $storedPath = Setting::get('notif_sound_admin');

        $response = $this->actingAs($this->admin)->putJson('/api/pengaturan/notifikasi/sound/builtin', [
            'preset' => 'pop',
        ]);

        $response->assertOk();
        $response->assertJsonPath('source', 'builtin');
        $response->assertJsonPath('preset', 'pop');
        Storage::disk('public')->assertMissing($storedPath);
    }

    public function test_pilih_suara_bawaan_ditolak_untuk_petugas(): void
    {
        $response = $this->actingAs($this->petugas)->putJson('/api/pengaturan/notifikasi/sound/builtin', [
            'preset' => 'pop',
        ]);

        $response->assertForbidden();
    }

    public function test_custom_saat_suara_bawaan_aktif_menghapus_bawaan(): void
    {
        Storage::fake('public');
        $this->actingAs($this->admin)->putJson('/api/pengaturan/notifikasi/sound/builtin', ['preset' => 'bell'])->assertOk();

        $file = UploadedFile::fake()->createWithContent('notif.mp3', 'fake-mp3-bytes');
        $response = $this->actingAs($this->admin)->post('/api/pengaturan/notifikasi/sound', ['notif_sound' => $file]);

        $response->assertOk();
        $response->assertJsonPath('source', 'custom');
        $response->assertJsonPath('preset', null);
        $this->assertStringStartsWith('notification-sounds/', Setting::get('notif_sound_admin'));
    }

    public function test_delete_suara_notifikasi_berhasil(): void
    {
        Storage::fake('public');
        $file = UploadedFile::fake()->createWithContent('notif.mp3', 'fake-mp3-bytes');

        $respond = $this->actingAs($this->admin)->post('/api/pengaturan/notifikasi/sound', [
            'notif_sound' => $file,
        ]);
        $respond->assertOk();
        $storedPath = Setting::get('notif_sound_admin');

        $response = $this->actingAs($this->admin)->deleteJson('/api/pengaturan/notifikasi/sound');

        $response->assertOk();
        $this->assertEmpty(Setting::get('notif_sound_admin', ''));
        Storage::disk('public')->assertMissing($storedPath);
    }

    public function test_upload_suara_notifikasi_ditolak_untuk_petugas(): void
    {
        Storage::fake('public');
        $file = UploadedFile::fake()->createWithContent('notif.mp3', 'fake-mp3-bytes');

        $response = $this->actingAs($this->petugas)->post('/api/pengaturan/notifikasi/sound', [
            'notif_sound' => $file,
        ]);

        $response->assertForbidden();
    }
}
