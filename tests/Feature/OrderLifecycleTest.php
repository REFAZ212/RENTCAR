<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\GarasiPartner;
use App\Models\Kendaraan;
use App\Models\Order;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class OrderLifecycleTest extends TestCase
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
            $t->string('alamat_jemput')->nullable();
            $t->string('tujuan')->nullable();
            $t->string('jam_mulai')->nullable();
            $t->string('jam_selesai')->nullable();
            $t->foreignId('supir_id')->nullable();
            $t->foreignId('calo_id')->nullable();
            $t->decimal('komisi_calo', 12, 2)->nullable();
            $t->decimal('denda_overtime', 14, 2)->default(0);
            $t->integer('jam_overtime')->default(0);
            $t->timestamp('tanggal_pengembalian_aktual')->nullable();
            $t->text('alasan_pembatalan')->nullable();
            $t->date('tanggal_jatuh_tempo')->nullable();
            $t->decimal('biaya_pembatalan', 14, 2)->nullable();
            $t->decimal('total_refund', 14, 2)->nullable();
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

    private function baseOrderPayload(array $overrides = []): array
    {
        return array_merge([
            'customer_id' => $this->customer->id,
            'customer_no_hp' => '6281234567890',
            'customer_alamat' => 'Jakarta Selatan',
            'customer_no_sim' => 'SIM123',
            'kendaraan_id' => $this->kendaraan->id,
            'tanggal_mulai' => '2026-08-10',
            'tanggal_selesai' => '2026-08-12',
            'tujuan' => 'Bandung',
        ], $overrides);
    }

    private function createOrder(array $overrides = []): Order
    {
        $defaults = [
            'customer_id' => $this->customer->id,
            'kendaraan_id' => $this->kendaraan->id,
            'admin_id' => $this->admin->id,
            'tanggal_mulai' => '2026-08-10',
            'tanggal_selesai' => '2026-08-12',
            'durasi_hari' => 2,
            'harga_per_hari' => 500000,
            'harga_total' => 1000000,
            'status_order' => 'pending',
            'status_pembayaran' => 'unpaid',
        ];

        return Order::create(array_merge($defaults, $overrides));
    }

    // ── Test cases ──

    public function test_order_can_be_created(): void
    {
        Storage::fake('public');

        $response = $this->actingAs($this->admin)->postJson('/api/orders', $this->baseOrderPayload());

        $response->assertStatus(201);
        $response->assertJsonStructure([
            'id',
            'kode_order',
            'status_order',
            'customer' => ['id', 'nama_lengkap'],
            'kendaraan' => ['id', 'nama_kendaraan'],
        ]);
        $this->assertDatabaseHas('orders', [
            'kendaraan_id' => $this->kendaraan->id,
            'admin_id' => $this->admin->id,
        ]);
    }

    public function test_order_starts_with_pending_status(): void
    {
        Storage::fake('public');

        $response = $this->actingAs($this->admin)->postJson('/api/orders', $this->baseOrderPayload());

        $response->assertStatus(201);
        $order = Order::where('kendaraan_id', $this->kendaraan->id)->first();
        $this->assertSame('pending', $order->status_order);
    }

    public function test_order_can_be_updated_to_confirmed(): void
    {
        $order = $this->createOrder();

        $response = $this->actingAs($this->admin)->putJson("/api/orders/{$order->id}", [
            'status_order' => 'confirmed',
        ]);

        $response->assertOk();
        $this->assertDatabaseHas('orders', ['id' => $order->id, 'status_order' => 'confirmed']);
    }

    public function test_order_can_be_updated_to_active(): void
    {
        $order = $this->createOrder(['status_order' => 'confirmed']);

        $response = $this->actingAs($this->admin)->putJson("/api/orders/{$order->id}", [
            'status_order' => 'active',
        ]);

        $response->assertOk();
        $this->assertDatabaseHas('orders', ['id' => $order->id, 'status_order' => 'active']);
    }

    public function test_order_can_be_completed_with_bukti_pengembalian(): void
    {
        Storage::fake('public');

        $order = $this->createOrder(['status_order' => 'active']);

        $response = $this->actingAs($this->admin)->putJson("/api/orders/{$order->id}", [
            'status_order' => 'completed',
            'bukti_pengembalian' => UploadedFile::fake()->image('pengembalian.jpg'),
            'tanggal_pengembalian_aktual' => '2026-08-12 10:00:00',
        ]);

        $response->assertOk();
        $this->assertDatabaseHas('orders', ['id' => $order->id, 'status_order' => 'completed']);
    }

    public function test_order_cannot_skip_statuses(): void
    {
        $order = $this->createOrder(['status_order' => 'confirmed']);

        $response = $this->actingAs($this->admin)->putJson("/api/orders/{$order->id}", [
            'status_order' => 'completed',
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors('status_order');
        $this->assertDatabaseHas('orders', ['id' => $order->id, 'status_order' => 'confirmed']);
    }

    public function test_order_can_be_cancelled_from_pending(): void
    {
        $order = $this->createOrder(['status_order' => 'pending']);

        $response = $this->actingAs($this->admin)->putJson("/api/orders/{$order->id}", [
            'status_order' => 'cancelled',
        ]);

        $response->assertOk();
        $this->assertDatabaseHas('orders', ['id' => $order->id, 'status_order' => 'cancelled']);
    }

    public function test_cannot_delete_active_order(): void
    {
        $order = $this->createOrder(['status_order' => 'active']);

        $response = $this->actingAs($this->admin)->deleteJson("/api/orders/{$order->id}");

        $response->assertStatus(422);
        $this->assertDatabaseHas('orders', ['id' => $order->id, 'deleted_at' => null]);
    }
}
