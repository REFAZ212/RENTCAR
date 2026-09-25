<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\GarasiPartner;
use App\Models\Kendaraan;
use App\Models\Order;
use App\Models\User;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class VehicleOverlapTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        Schema::dropIfExists('pembayarans');
        Schema::dropIfExists('garasi_requests');
        Schema::dropIfExists('orders');
        Schema::dropIfExists('kendaraans');
        Schema::dropIfExists('garasi_partners');
        Schema::dropIfExists('customers');
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
        Schema::create('customers', function ($t) {
            $t->id();
            $t->string('nama_lengkap');
            $t->string('no_hp');
            $t->string('email')->nullable();
            $t->string('alamat')->nullable();
            $t->string('no_ktp')->nullable();
            $t->string('no_sim')->nullable();
            $t->string('foto_ktp')->nullable();
            $t->string('foto_sim')->nullable();
            $t->string('foto_paspor')->nullable();
            $t->text('catatan')->nullable();
            $t->timestamps();
            $t->softDeletes();
        });
        Schema::create('garasi_partners', function ($t) {
            $t->id();
            $t->string('nama_garasi');
            $t->string('nama_pemilik');
            $t->text('alamat');
            $t->string('no_hp');
            $t->string('email')->nullable();
            $t->boolean('status_aktif')->default(true);
            $t->boolean('is_own')->default(false);
            $t->text('catatan')->nullable();
            $t->timestamps();
        });
        Schema::create('kendaraans', function ($t) {
            $t->id();
            $t->foreignId('garasi_partner_id')->nullable();
            $t->string('nama_kendaraan');
            $t->string('plat_nomor')->unique();
            $t->string('warna');
            $t->decimal('harga_sewa_per_hari', 12, 2);
            $t->string('status')->default('tersedia');
            $t->string('foto')->nullable();
            $t->text('catatan')->nullable();
            $t->timestamps();
        });
        Schema::create('orders', function ($t) {
            $t->id();
            $t->string('kode_order')->unique();
            $t->string('source')->default('admin');
            $t->foreignId('customer_id');
            $t->foreignId('kendaraan_id');
            $t->foreignId('admin_id');
            $t->date('tanggal_mulai');
            $t->date('tanggal_selesai');
            $t->integer('durasi_hari');
            $t->decimal('harga_per_hari', 12, 2);
            $t->decimal('harga_total', 14, 2);
            $t->string('status_order')->default('pending');
            $t->string('metode_pembayaran')->nullable();
            $t->string('status_pembayaran')->default('unpaid');
            $t->text('catatan')->nullable();
            $t->string('bukti_transfer')->nullable();
            $t->string('bukti_pengiriman')->nullable();
            $t->string('bukti_pengembalian')->nullable();
            $t->string('status_pengiriman')->nullable();
            $t->string('metode_penyerahan')->nullable()->default('ambil');
            $t->string('alamat_jemput')->nullable();
            $t->string('tujuan')->nullable();
            $t->string('jam_mulai')->nullable();
            $t->string('jam_selesai')->nullable();
            $t->foreignId('supir_id')->nullable();
            $t->foreignId('calo_id')->nullable();
            $t->enum('opsi_supir', ['dengan_supir', 'lepas_kunci'])->nullable();
            $t->decimal('komisi_calo', 12, 2)->nullable();
            $t->decimal('denda_overtime', 14, 2)->default(0);
            $t->integer('jam_overtime')->default(0);
            $t->timestamp('tanggal_pengembalian_aktual')->nullable();
            $t->text('alasan_pembatalan')->nullable();
            $t->decimal('biaya_pembatalan', 14, 2)->nullable();
            $t->decimal('total_refund', 14, 2)->nullable();
            $t->foreignId('operator_id')->nullable();
            $t->decimal('biaya_kerusakan', 14, 2)->nullable();
            $t->timestamp('waktu_perlu_verifikasi')->nullable();
            $t->timestamp('waktu_klaim')->nullable();
            $t->timestamps();
            $t->softDeletes();
        });
        Schema::create('pembayarans', function ($t) {
            $t->id();
            $t->foreignId('order_id');
            $t->foreignId('admin_id')->nullable();
            $t->decimal('jumlah', 14, 2);
            $t->string('metode_pembayaran');
            $t->string('status');
            $t->string('bukti_transfer')->nullable();
            $t->text('catatan')->nullable();
            $t->timestamps();
            $t->softDeletes();
        });
        Schema::create('garasi_requests', function ($t) {
            $t->id();
            $t->foreignId('order_id');
            $t->foreignId('garasi_partner_id');
            $t->string('status_permintaan')->default('pending');
            $t->text('pesan_wa_terkirim')->nullable();
            $t->timestamp('waktu_kirim')->nullable();
            $t->timestamp('waktu_respon')->nullable();
            $t->text('catatan_admin')->nullable();
            $t->text('catatan_garasi')->nullable();
            $t->timestamps();
            $t->softDeletes();
        });
        Schema::create('settings', function ($t) {
            $t->id();
            $t->string('key')->unique();
            $t->text('value')->nullable();
            $t->timestamps();
        });
        Schema::create('supir_calos', function ($t) {
            $t->id();
            $t->string('nama');
            $t->string('no_hp');
            $t->string('jenis');
            $t->string('status')->default('aktif');
            $t->decimal('tarif_per_hari', 12, 2)->default(0);
            $t->decimal('komisi', 12, 2)->default(0);
            $t->text('catatan')->nullable();
            $t->timestamps();
            $t->softDeletes();
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
        $this->customer = Customer::create([
            'nama_lengkap' => 'Budi Santoso',
            'no_hp' => '6281234567890',
            'no_sim' => 'SIM123',
            'alamat' => 'Jakarta Selatan',
        ]);
        $this->garasi = GarasiPartner::create([
            'nama_garasi' => 'Garasi Pusat',
            'nama_pemilik' => 'Andi',
            'alamat' => 'Jakarta Barat',
            'no_hp' => '628111222333',
        ]);
        $this->kendaraan = Kendaraan::create([
            'garasi_partner_id' => $this->garasi->id,
            'nama_kendaraan' => 'Toyota Avanza',
            'plat_nomor' => 'B 1234 ABC',
            'warna' => 'Putih',
            'harga_sewa_per_hari' => 500000,
            'status' => 'tersedia',
        ]);
    }

    private User $admin;

    private Customer $customer;

    private GarasiPartner $garasi;

    private Kendaraan $kendaraan;

    public function test_same_vehicle_cannot_be_rented_overlapping_dates(): void
    {
        Storage::fake('public');

        Order::create([
            'kode_order' => 'ORD-OVL-EXIST',
            'customer_id' => $this->customer->id,
            'kendaraan_id' => $this->kendaraan->id,
            'admin_id' => $this->admin->id,
            'tanggal_mulai' => now()->subDay()->toDateString(),
            'tanggal_selesai' => now()->addDays(3)->toDateString(),
            'durasi_hari' => 4,
            'harga_per_hari' => 500000,
            'harga_total' => 2000000,
            'status_order' => 'active',
        ]);

        $response = $this->actingAs($this->admin)->postJson('/api/orders', [
            'customer_id' => $this->customer->id,
            'customer_no_hp' => '6281234567890',
            'customer_alamat' => 'Jakarta Selatan',
            'customer_no_sim' => 'SIM123',
            'kendaraan_id' => $this->kendaraan->id,
            'tanggal_mulai' => now()->addDay()->toDateString(),
            'tanggal_selesai' => now()->addDays(5)->toDateString(),
            'tujuan' => 'Surabaya',
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors('kendaraan_id');
    }

    public function test_same_vehicle_can_be_rented_non_overlapping_dates(): void
    {
        Storage::fake('public');

        Order::create([
            'kode_order' => 'ORD-OVL-EXIST2',
            'customer_id' => $this->customer->id,
            'kendaraan_id' => $this->kendaraan->id,
            'admin_id' => $this->admin->id,
            'tanggal_mulai' => now()->toDateString(),
            'tanggal_selesai' => now()->addDays(4)->toDateString(),
            'durasi_hari' => 4,
            'harga_per_hari' => 500000,
            'harga_total' => 2000000,
            'status_order' => 'active',
        ]);

        $response = $this->actingAs($this->admin)->postJson('/api/orders', [
            'customer_id' => $this->customer->id,
            'customer_no_hp' => '6281234567890',
            'customer_alamat' => 'Jakarta Selatan',
            'customer_no_sim' => 'SIM123',
            'kendaraan_id' => $this->kendaraan->id,
            'tanggal_mulai' => now()->addDays(6)->toDateString(),
            'tanggal_selesai' => now()->addDays(10)->toDateString(),
            'tujuan' => 'Surabaya',
        ]);

        $response->assertStatus(201);
    }

    public function test_kendaraan_tidak_dapat_dipesan_beririsan_dengan_order_pending(): void
    {
        Storage::fake('public');

        Order::create([
            'kode_order' => 'ORD-PEND-EXIST',
            'customer_id' => $this->customer->id,
            'kendaraan_id' => $this->kendaraan->id,
            'admin_id' => $this->admin->id,
            'tanggal_mulai' => now()->addDay()->toDateString(),
            'tanggal_selesai' => now()->addDays(3)->toDateString(),
            'durasi_hari' => 2,
            'harga_per_hari' => 500000,
            'harga_total' => 1000000,
            'status_order' => 'pending',
        ]);

        // Order baru (langsung confirmed) ditolak: pending meng-hold kendaraan
        // sampai dikonfirmasi admin atau otomatis batal (pending_expire_hours).
        $response = $this->actingAs($this->admin)->postJson('/api/orders', [
            'customer_id' => $this->customer->id,
            'customer_no_hp' => '6281234567890',
            'customer_alamat' => 'Jakarta Selatan',
            'customer_no_sim' => 'SIM123',
            'kendaraan_id' => $this->kendaraan->id,
            'tanggal_mulai' => now()->addDay()->toDateString(),
            'tanggal_selesai' => now()->addDays(5)->toDateString(),
            'tujuan' => 'Surabaya',
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors('kendaraan_id');
    }

    public function test_kendaraan_tidak_dapat_dipesan_beririsan_dengan_order_confirmed(): void
    {
        Storage::fake('public');

        Order::create([
            'kode_order' => 'ORD-CONF-EXIST',
            'customer_id' => $this->customer->id,
            'kendaraan_id' => $this->kendaraan->id,
            'admin_id' => $this->admin->id,
            'tanggal_mulai' => now()->subDay()->toDateString(),
            'tanggal_selesai' => now()->addDays(3)->toDateString(),
            'durasi_hari' => 4,
            'harga_per_hari' => 500000,
            'harga_total' => 2000000,
            'status_order' => 'confirmed',
        ]);

        $response = $this->actingAs($this->admin)->postJson('/api/orders', [
            'customer_id' => $this->customer->id,
            'customer_no_hp' => '6281234567890',
            'customer_alamat' => 'Jakarta Selatan',
            'customer_no_sim' => 'SIM123',
            'kendaraan_id' => $this->kendaraan->id,
            'tanggal_mulai' => now()->addDay()->toDateString(),
            'tanggal_selesai' => now()->addDays(5)->toDateString(),
            'tujuan' => 'Surabaya',
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors('kendaraan_id');
    }

    public function test_konfirmasi_order_kedua_yang_beririsan_ditolak(): void
    {
        $confirmed = Order::create([
            'kode_order' => 'ORD-C1',
            'customer_id' => $this->customer->id,
            'kendaraan_id' => $this->kendaraan->id,
            'admin_id' => $this->admin->id,
            'tanggal_mulai' => now()->subDay()->toDateString(),
            'tanggal_selesai' => now()->addDays(3)->toDateString(),
            'durasi_hari' => 4,
            'harga_per_hari' => 500000,
            'harga_total' => 2000000,
            'status_order' => 'confirmed',
        ]);

        $kandidat = Order::create([
            'kode_order' => 'ORD-C2',
            'customer_id' => $this->customer->id,
            'kendaraan_id' => $this->kendaraan->id,
            'admin_id' => $this->admin->id,
            'tanggal_mulai' => now()->addDay()->toDateString(),
            'tanggal_selesai' => now()->addDays(5)->toDateString(),
            'durasi_hari' => 4,
            'harga_per_hari' => 500000,
            'harga_total' => 2000000,
            'status_order' => 'pending',
        ]);

        $aman = Order::create([
            'kode_order' => 'ORD-C3',
            'customer_id' => $this->customer->id,
            'kendaraan_id' => $this->kendaraan->id,
            'admin_id' => $this->admin->id,
            'tanggal_mulai' => now()->addDays(6)->toDateString(),
            'tanggal_selesai' => now()->addDays(8)->toDateString(),
            'durasi_hari' => 3,
            'harga_per_hari' => 500000,
            'harga_total' => 1500000,
            'status_order' => 'pending',
        ]);

        // Konfirmasi order yang beririsan dengan order confirmed → ditolak.
        $this->actingAs($this->admin)
            ->patchJson("/api/orders/{$kandidat->id}", ['status_order' => 'confirmed'])
            ->assertStatus(422)
            ->assertJsonValidationErrors('kendaraan_id');

        // Gagal = rollback penuh: tidak ada order lain yang ikut dibatalkan.
        $this->assertDatabaseHas('orders', ['id' => $confirmed->id, 'status_order' => 'confirmed']);
        $this->assertDatabaseHas('orders', ['id' => $kandidat->id, 'status_order' => 'pending']);
        $this->assertDatabaseHas('orders', ['id' => $aman->id, 'status_order' => 'pending']);
    }

    public function test_konfirmasi_membatalkan_order_pending_beririsan_dan_mengirim_wa(): void
    {
        $pemenang = Order::create([
            'kode_order' => 'ORD-WIN',
            'customer_id' => $this->customer->id,
            'kendaraan_id' => $this->kendaraan->id,
            'admin_id' => $this->admin->id,
            'tanggal_mulai' => now()->addDay()->toDateString(),
            'tanggal_selesai' => now()->addDays(3)->toDateString(),
            'durasi_hari' => 2,
            'harga_per_hari' => 500000,
            'harga_total' => 1000000,
            'status_order' => 'pending',
        ]);

        $customerKalah = Customer::create([
            'nama_lengkap' => 'Siti Aminah',
            'no_hp' => '6281987654321',
        ]);

        $bentrok = Order::create([
            'kode_order' => 'ORD-LOSE',
            'customer_id' => $customerKalah->id,
            'kendaraan_id' => $this->kendaraan->id,
            'admin_id' => $this->admin->id,
            'tanggal_mulai' => now()->addDay()->toDateString(),
            'tanggal_selesai' => now()->addDays(5)->toDateString(),
            'durasi_hari' => 4,
            'harga_per_hari' => 500000,
            'harga_total' => 2000000,
            'status_order' => 'pending',
        ]);

        $aman = Order::create([
            'kode_order' => 'ORD-FINE',
            'customer_id' => $this->customer->id,
            'kendaraan_id' => $this->kendaraan->id,
            'admin_id' => $this->admin->id,
            'tanggal_mulai' => now()->addDays(6)->toDateString(),
            'tanggal_selesai' => now()->addDays(8)->toDateString(),
            'durasi_hari' => 3,
            'harga_per_hari' => 500000,
            'harga_total' => 1500000,
            'status_order' => 'pending',
        ]);

        // Konfirmasi pemenang → yang beririsan otomatis dibatalkan, yang tidak
        // beririsan tetap aman.
        $this->actingAs($this->admin)
            ->patchJson("/api/orders/{$pemenang->id}", ['status_order' => 'confirmed'])
            ->assertOk();

        $this->assertDatabaseHas('orders', ['id' => $pemenang->id, 'status_order' => 'confirmed']);
        $this->assertDatabaseHas('orders', ['id' => $bentrok->id, 'status_order' => 'cancelled']);
        $this->assertDatabaseHas('orders', ['id' => $aman->id, 'status_order' => 'pending']);

        $batal = Order::find($bentrok->id);
        $this->assertSame(0, (int) $batal->biaya_pembatalan);
        $this->assertSame('selesai', $batal->status_pengiriman);
        $this->assertStringContainsString($pemenang->kode_order, (string) $batal->alasan_pembatalan);

        $this->assertDatabaseHas('whatsapp_logs', [
            'type' => 'order_dibatalkan',
            'order_id' => $bentrok->id,
            'nomor_tujuan' => '6281987654321',
        ]);

        $this->assertSame('pending', Order::find($aman->id)->status_order);
    }
}
