<?php

namespace Tests\Feature;

use App\Models\GpsDevice;
use App\Models\GpsLocation;
use App\Models\Kendaraan;
use App\Models\SupirCalo;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class GpsTest extends TestCase
{
    protected User $admin;

    protected function setUp(): void
    {
        parent::setUp();

        Schema::dropIfExists('gps_locations');
        Schema::dropIfExists('gps_devices');
        Schema::dropIfExists('supir_calos');
        Schema::dropIfExists('orders');
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
            $t->string('nama_kendaraan');
            $t->string('plat_nomor')->unique();
            $t->string('warna')->nullable();
            $t->decimal('harga_sewa_per_hari', 12, 2)->default(0);
            $t->string('status')->default('tersedia');
            $t->timestamps();
        });
        Schema::create('orders', function ($t) {
            $t->id();
            $t->string('kode_order');
            $t->foreignId('kendaraan_id');
            $t->foreignId('supir_id')->nullable();
            $t->string('status_order')->default('confirmed');
            $t->timestamp('deleted_at')->nullable();
            $t->timestamps();
        });
        Schema::create('supir_calos', function ($t) {
            $t->id();
            $t->foreignId('user_id')->nullable();
            $t->string('nama');
            $t->string('no_hp');
            $t->enum('jenis', ['supir', 'calo'])->default('supir');
            $t->string('status')->default('aktif');
            $t->timestamps();
        });
        Schema::create('gps_devices', function ($t) {
            $t->id();
            $t->foreignId('kendaraan_id');
            $t->string('api_key', 64)->unique();
            $t->string('device_identifier')->nullable();
            $t->string('nama_perangkat')->nullable();
            $t->boolean('status_aktif')->default(true);
            $t->text('catatan')->nullable();
            $t->timestamps();
        });
        Schema::create('gps_locations', function ($t) {
            $t->id();
            $t->foreignId('gps_device_id');
            $t->decimal('lat', 10, 7);
            $t->decimal('lng', 10, 7);
            $t->unsignedInteger('speed_kmh')->nullable();
            $t->unsignedSmallInteger('heading')->nullable();
            $t->unsignedTinyInteger('fuel_percent')->nullable();
            $t->timestamp('recorded_at');
            $t->timestamps();
        });

        $this->admin = User::create([
            'name' => 'Admin Utama',
            'email' => 'admin@test.dev',
            'password' => bcrypt('password'),
            'role' => 'admin_utama',
        ]);
    }

    private function buatKendaraan(): Kendaraan
    {
        return Kendaraan::create([
            'nama_kendaraan' => 'Toyota Avanza',
            'plat_nomor' => 'B 1234 XYZ',
            'harga_sewa_per_hari' => 350000,
            'status' => 'disewa',
        ]);
    }

    public function test_push_dengan_api_key_salah_ditolak(): void
    {
        $response = $this->postJson('/api/gps/push', [
            'api_key' => 'gps_salah',
            'lat' => -6.2088,
            'lng' => 106.8456,
        ]);

        $response->assertStatus(401);
        $this->assertSame(0, GpsLocation::count());
    }

    public function test_push_valid_tersimpan(): void
    {
        $kendaraan = $this->buatKendaraan();
        $device = GpsDevice::create([
            'kendaraan_id' => $kendaraan->id,
            'api_key' => GpsDevice::generateApiKey(),
        ]);

        $response = $this->postJson('/api/gps/push', [
            'api_key' => $device->api_key,
            'lat' => -6.2088,
            'lng' => 106.8456,
            'speed_kmh' => 42,
            'fuel_percent' => 68,
        ]);

        $response->assertStatus(201);
        $this->assertSame(1, GpsLocation::count());
        $this->assertEquals(-6.2088, (float) GpsLocation::first()->lat);
    }

    public function test_push_dengan_perangkat_nonaktif_ditolak(): void
    {
        $kendaraan = $this->buatKendaraan();
        $device = GpsDevice::create([
            'kendaraan_id' => $kendaraan->id,
            'api_key' => GpsDevice::generateApiKey(),
            'status_aktif' => false,
        ]);

        $response = $this->postJson('/api/gps/push', [
            'api_key' => $device->api_key,
            'lat' => -6.2088,
            'lng' => 106.8456,
        ]);

        $response->assertStatus(401);
    }

    public function test_push_dengan_koordinat_invalid_ditolak(): void
    {
        $kendaraan = $this->buatKendaraan();
        $device = GpsDevice::create([
            'kendaraan_id' => $kendaraan->id,
            'api_key' => GpsDevice::generateApiKey(),
        ]);

        $response = $this->postJson('/api/gps/push', [
            'api_key' => $device->api_key,
            'lat' => 120,
            'lng' => 106.8456,
        ]);

        $response->assertStatus(422);
    }

    public function test_latest_menghitung_status_dan_driver(): void
    {
        $kendaraan = $this->buatKendaraan();
        $supir = SupirCalo::create(['nama' => 'Ahmad', 'no_hp' => '62812', 'jenis' => 'supir']);
        $device = GpsDevice::create([
            'kendaraan_id' => $kendaraan->id,
            'api_key' => GpsDevice::generateApiKey(),
        ]);

        GpsLocation::create([
            'gps_device_id' => $device->id,
            'lat' => -6.2088,
            'lng' => 106.8456,
            'speed_kmh' => 42,
            'recorded_at' => now()->subMinute(1),
        ]);
        DB::table('orders')->insert([
            'kode_order' => 'ORD-TEST-1',
            'kendaraan_id' => $kendaraan->id,
            'supir_id' => $supir->id,
            'status_order' => 'active',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $response = $this->actingAs($this->admin)->getJson('/api/gps/latest');

        $response->assertStatus(200);
        $data = $response->json('data');
        $this->assertCount(1, $data);
        $this->assertSame('bergerak', $data[0]['status']);
        $this->assertSame('Ahmad', $data[0]['driver']);
        $this->assertSame('B 1234 XYZ', $data[0]['plat_nomor']);
    }

    public function test_latest_menandai_offline_saat_data_lama(): void
    {
        $kendaraan = $this->buatKendaraan();
        $device = GpsDevice::create([
            'kendaraan_id' => $kendaraan->id,
            'api_key' => GpsDevice::generateApiKey(),
        ]);
        GpsLocation::create([
            'gps_device_id' => $device->id,
            'lat' => -6.2088,
            'lng' => 106.8456,
            'speed_kmh' => 0,
            'recorded_at' => now()->subMinutes(30),
        ]);

        $response = $this->actingAs($this->admin)->getJson('/api/gps/latest');

        $this->assertSame('offline', $response->json('data.0.status'));
    }

    public function test_latest_mengabaikan_kendaraan_tanpa_riwayat(): void
    {
        $this->buatKendaraan();

        $response = $this->actingAs($this->admin)->getJson('/api/gps/latest');

        $this->assertSame([], $response->json('data'));
    }

    public function test_history_mengembalikan_titik_terurut(): void
    {
        $kendaraan = $this->buatKendaraan();
        $device = GpsDevice::create([
            'kendaraan_id' => $kendaraan->id,
            'api_key' => GpsDevice::generateApiKey(),
        ]);
        GpsLocation::create([
            'gps_device_id' => $device->id,
            'lat' => -6.2,
            'lng' => 106.8,
            'recorded_at' => now()->subMinutes(5),
        ]);
        GpsLocation::create([
            'gps_device_id' => $device->id,
            'lat' => -6.21,
            'lng' => 106.81,
            'recorded_at' => now()->subMinutes(2),
        ]);
        GpsLocation::create([
            'gps_device_id' => $device->id,
            'lat' => -6.3,
            'lng' => 106.9,
            'recorded_at' => now()->subDays(2),
        ]);

        $response = $this->actingAs($this->admin)
            ->getJson("/api/gps/kendaraans/{$kendaraan->id}/history?from=".now()->subDay()->toDateString());

        $response->assertStatus(200);
        $data = $response->json('data');
        $this->assertCount(2, $data);
        $this->assertLessThan($data[1]['recorded_at'], $data[0]['recorded_at']);
    }

    public function test_buat_perangkat_menghasilkan_api_key(): void
    {
        $kendaraan = $this->buatKendaraan();

        $response = $this->actingAs($this->admin)->postJson('/api/gps-devices', [
            'kendaraan_id' => $kendaraan->id,
            'device_identifier' => 'IMEI-TEST-1',
        ]);

        $response->assertStatus(201);
        $this->assertStringStartsWith('gps_', $response->json('api_key'));
        $this->assertSame('IMEI-TEST-1', GpsDevice::first()->device_identifier);
    }

    public function test_petugas_tidak_bisa_melihat_gps(): void
    {
        $petugas = User::create([
            'name' => 'Petugas',
            'email' => 'petugas@test.dev',
            'password' => bcrypt('password'),
            'role' => 'petugas',
        ]);

        $response = $this->actingAs($petugas)->getJson('/api/gps/latest');

        $response->assertStatus(403);
    }

    public function test_hapus_perangkat_khusus_admin_utama(): void
    {
        $kendaraan = $this->buatKendaraan();
        $device = GpsDevice::create([
            'kendaraan_id' => $kendaraan->id,
            'api_key' => GpsDevice::generateApiKey(),
        ]);
        $operasional = User::create([
            'name' => 'Admin Operasional',
            'email' => 'ops@test.dev',
            'password' => bcrypt('password'),
            'role' => 'admin_operasional',
        ]);

        $this->actingAs($operasional)->deleteJson("/api/gps-devices/{$device->id}")->assertStatus(403);

        $this->actingAs($this->admin)->deleteJson("/api/gps-devices/{$device->id}")->assertStatus(200);
        $this->assertSame(0, GpsDevice::count());
    }
}
