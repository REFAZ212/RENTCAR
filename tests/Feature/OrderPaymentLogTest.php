<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\Kendaraan;
use App\Models\Order;
use App\Models\Pembayaran;
use App\Models\SupirCalo;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class OrderPaymentLogTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        Schema::dropIfExists('pembayarans');
        Schema::dropIfExists('orders');
        Schema::dropIfExists('garasi_requests');
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
            $t->timestamps();
            $t->softDeletes();
        });
        Schema::create('garasi_partners', function ($t) {
            $t->id();
            $t->string('nama_garasi');
            $t->string('nama_pemilik');
            $t->text('alamat');
            $t->string('no_hp');
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

        $this->admin = User::create(['name' => 'Admin', 'email' => 'admin@test.com', 'password' => 'password', 'role' => 'admin_utama']);
        $this->customer = Customer::create(['nama_lengkap' => 'Budi', 'no_hp' => '6281234567890', 'no_sim' => 'SIM123']);
        $this->kendaraan = Kendaraan::create([
            'nama_kendaraan' => 'Avanza',
            'plat_nomor' => 'B 1234 ABC',
            'warna' => 'Putih',
            'harga_sewa_per_hari' => 500000,
            'status' => 'tersedia',
        ]);
    }

    private User $admin;

    private Customer $customer;

    private Kendaraan $kendaraan;

    public function test_store_order_creates_pembayaran_when_partial_payment(): void
    {
        Storage::fake('public');

        $response = $this->actingAs($this->admin)->postJson('/api/orders', [
            'customer_id' => $this->customer->id,
            'customer_no_hp' => '6281234567890',
            'customer_alamat' => 'Jakarta',
            'customer_no_sim' => 'SIM123',
            'kendaraan_id' => $this->kendaraan->id,
            'tanggal_mulai' => '2026-08-01',
            'tanggal_selesai' => '2026-08-04',
            'tujuan' => 'Bandung',
            'status_pembayaran' => 'partial',
            'metode_pembayaran' => 'transfer',
            'jumlah_bayar' => 750000,
            'bukti_transfer' => UploadedFile::fake()->image('bukti.jpg'),
        ]);

        $response->assertStatus(201);

        $order = Order::where('customer_id', $this->customer->id)->first();
        $this->assertNotNull($order);
        $this->assertSame('partial', $order->status_pembayaran);

        $pembayaran = Pembayaran::where('order_id', $order->id)->first();
        $this->assertNotNull($pembayaran);
        $this->assertSame('dp', $pembayaran->status);
        $this->assertSame('750000.00', $pembayaran->jumlah);
        $this->assertSame('transfer', $pembayaran->metode_pembayaran);
        $this->assertNotNull($pembayaran->bukti_transfer);
    }

    public function test_store_order_does_not_create_pembayaran_when_unpaid(): void
    {
        $response = $this->actingAs($this->admin)->postJson('/api/orders', [
            'customer_id' => $this->customer->id,
            'customer_no_hp' => '6281234567890',
            'customer_alamat' => 'Jakarta',
            'customer_no_sim' => 'SIM123',
            'kendaraan_id' => $this->kendaraan->id,
            'tanggal_mulai' => '2026-08-01',
            'tanggal_selesai' => '2026-08-04',
            'tujuan' => 'Bandung',
            'status_pembayaran' => 'unpaid',
        ]);

        $response->assertStatus(201);

        $order = Order::where('customer_id', $this->customer->id)->first();
        $this->assertCount(0, $order->pembayarans);
    }

    public function test_update_order_creates_pembayaran_on_payment_change(): void
    {
        $order = Order::create([
            'kode_order' => 'ORD-TEST0001',
            'customer_id' => $this->customer->id,
            'kendaraan_id' => $this->kendaraan->id,
            'admin_id' => $this->admin->id,
            'tanggal_mulai' => '2026-08-01',
            'tanggal_selesai' => '2026-08-04',
            'durasi_hari' => 3,
            'harga_per_hari' => 500000,
            'harga_total' => 1500000,
            'status_order' => 'active',
            'status_pembayaran' => 'unpaid',
        ]);

        $this->assertCount(0, $order->pembayarans);

        $response = $this->actingAs($this->admin)->putJson("/api/orders/{$order->id}", [
            'status_pembayaran' => 'partial',
            'metode_pembayaran' => 'transfer',
            'jumlah_bayar' => 500000,
        ]);

        $response->assertOk();

        $order->refresh();
        $this->assertSame('partial', $order->status_pembayaran);

        $pembayarans = $order->pembayarans()->get();
        $this->assertCount(1, $pembayarans);
        $this->assertSame('dp', $pembayarans->first()->status);
        $this->assertSame('500000.00', $pembayarans->first()->jumlah);
    }

    public function test_update_order_creates_pelunasan_entry(): void
    {
        $order = Order::create([
            'kode_order' => 'ORD-TEST0002',
            'customer_id' => $this->customer->id,
            'kendaraan_id' => $this->kendaraan->id,
            'admin_id' => $this->admin->id,
            'tanggal_mulai' => '2026-08-01',
            'tanggal_selesai' => '2026-08-04',
            'durasi_hari' => 3,
            'harga_per_hari' => 500000,
            'harga_total' => 1500000,
            'status_order' => 'active',
            'status_pembayaran' => 'partial',
        ]);

        Pembayaran::create([
            'order_id' => $order->id,
            'jumlah' => 750000,
            'metode_pembayaran' => 'transfer',
            'status' => 'dp',
        ]);

        $response = $this->actingAs($this->admin)->putJson("/api/orders/{$order->id}", [
            'status_pembayaran' => 'paid',
            'jumlah_bayar' => 750000,
        ]);

        $response->assertOk();

        $pembayarans = $order->pembayarans()->get();
        $this->assertCount(2, $pembayarans);
        $this->assertSame('pelunasan', $pembayarans->last()->status);
    }

    public function test_update_notes_does_not_create_pembayaran(): void
    {
        $order = Order::create([
            'kode_order' => 'ORD-TEST0003',
            'customer_id' => $this->customer->id,
            'kendaraan_id' => $this->kendaraan->id,
            'admin_id' => $this->admin->id,
            'tanggal_mulai' => '2026-08-01',
            'tanggal_selesai' => '2026-08-04',
            'durasi_hari' => 3,
            'harga_per_hari' => 500000,
            'harga_total' => 1500000,
            'status_order' => 'active',
            'status_pembayaran' => 'paid',
        ]);

        $response = $this->actingAs($this->admin)->putJson("/api/orders/{$order->id}", [
            'catatan' => 'Updated note',
        ]);

        $response->assertOk();
        $this->assertCount(0, $order->pembayarans);
    }

    public function test_show_order_includes_pembayarans(): void
    {
        $order = Order::create([
            'kode_order' => 'ORD-TEST0004',
            'customer_id' => $this->customer->id,
            'kendaraan_id' => $this->kendaraan->id,
            'admin_id' => $this->admin->id,
            'tanggal_mulai' => '2026-08-01',
            'tanggal_selesai' => '2026-08-04',
            'durasi_hari' => 3,
            'harga_per_hari' => 500000,
            'harga_total' => 1500000,
            'status_order' => 'active',
            'status_pembayaran' => 'partial',
        ]);

        Pembayaran::create([
            'order_id' => $order->id,
            'jumlah' => 750000,
            'metode_pembayaran' => 'transfer',
            'status' => 'dp',
        ]);

        $response = $this->actingAs($this->admin)->getJson("/api/orders/{$order->id}");

        $response->assertOk();
        $response->assertJsonFragment(['status' => 'dp', 'jumlah' => '750000.00']);
    }

    public function test_index_orders_includes_pembayarans(): void
    {
        $order = Order::create([
            'kode_order' => 'ORD-TEST0005',
            'customer_id' => $this->customer->id,
            'kendaraan_id' => $this->kendaraan->id,
            'admin_id' => $this->admin->id,
            'tanggal_mulai' => '2026-08-01',
            'tanggal_selesai' => '2026-08-04',
            'durasi_hari' => 3,
            'harga_per_hari' => 500000,
            'harga_total' => 1500000,
            'status_order' => 'active',
            'status_pembayaran' => 'partial',
        ]);

        Pembayaran::create([
            'order_id' => $order->id,
            'jumlah' => 750000,
            'metode_pembayaran' => 'transfer',
            'status' => 'dp',
        ]);

        $response = $this->actingAs($this->admin)->getJson('/api/orders');

        $response->assertOk();
        $response->assertJsonPath('data.0.pembayarans', function ($pembayarans) {
            return count($pembayarans) === 1 && $pembayarans[0]['status'] === 'dp';
        });
    }

    public function test_delete_completed_order_is_blocked(): void
    {
        $order = Order::create([
            'kode_order' => 'ORD-TEST0006',
            'customer_id' => $this->customer->id,
            'kendaraan_id' => $this->kendaraan->id,
            'admin_id' => $this->admin->id,
            'tanggal_mulai' => '2026-08-01',
            'tanggal_selesai' => '2026-08-04',
            'durasi_hari' => 3,
            'harga_per_hari' => 500000,
            'harga_total' => 1500000,
            'status_order' => 'completed',
            'status_pembayaran' => 'paid',
        ]);

        $response = $this->actingAs($this->admin)->deleteJson("/api/orders/{$order->id}");

        $response->assertStatus(422);
        $this->assertDatabaseHas('orders', ['id' => $order->id, 'deleted_at' => null]);
    }

    public function test_delete_pending_order_succeeds(): void
    {
        $order = Order::create([
            'kode_order' => 'ORD-TEST0007',
            'customer_id' => $this->customer->id,
            'kendaraan_id' => $this->kendaraan->id,
            'admin_id' => $this->admin->id,
            'tanggal_mulai' => '2026-08-01',
            'tanggal_selesai' => '2026-08-04',
            'durasi_hari' => 3,
            'harga_per_hari' => 500000,
            'harga_total' => 1500000,
            'status_order' => 'pending',
            'status_pembayaran' => 'unpaid',
        ]);

        $response = $this->actingAs($this->admin)->deleteJson("/api/orders/{$order->id}");

        $response->assertOk();
        $this->assertSoftDeleted('orders', ['id' => $order->id]);
    }

    public function test_pembayaran_records_admin_id(): void
    {
        Storage::fake('public');

        $response = $this->actingAs($this->admin)->postJson('/api/orders', [
            'customer_id' => $this->customer->id,
            'customer_no_hp' => '6281234567890',
            'customer_alamat' => 'Jakarta',
            'customer_no_sim' => 'SIM123',
            'kendaraan_id' => $this->kendaraan->id,
            'tanggal_mulai' => '2026-08-01',
            'tanggal_selesai' => '2026-08-04',
            'tujuan' => 'Bandung',
            'status_pembayaran' => 'partial',
            'metode_pembayaran' => 'transfer',
            'jumlah_bayar' => 1500000,
            'bukti_transfer' => UploadedFile::fake()->image('bukti.jpg'),
        ]);

        $response->assertStatus(201);

        $order = Order::where('customer_id', $this->customer->id)->first();
        $pembayaran = Pembayaran::where('order_id', $order->id)->first();
        $this->assertNotNull($pembayaran);
        $this->assertSame($this->admin->id, $pembayaran->admin_id);
    }

    // ── Fase 2: State transition validation ──

    public function test_invalid_state_transition_pending_to_completed_is_rejected(): void
    {
        $order = Order::create([
            'kode_order' => 'ORD-TRN0001',
            'customer_id' => $this->customer->id,
            'kendaraan_id' => $this->kendaraan->id,
            'admin_id' => $this->admin->id,
            'tanggal_mulai' => '2026-08-01',
            'tanggal_selesai' => '2026-08-04',
            'durasi_hari' => 3,
            'harga_per_hari' => 500000,
            'harga_total' => 1500000,
            'status_order' => 'pending',
            'status_pembayaran' => 'unpaid',
        ]);

        $response = $this->actingAs($this->admin)->putJson("/api/orders/{$order->id}", [
            'status_order' => 'completed',
        ]);

        $response->assertStatus(422);
        $response->assertJson(['message' => "Transisi status dari 'pending' ke 'completed' tidak diizinkan."]);
        $this->assertDatabaseHas('orders', ['id' => $order->id, 'status_order' => 'pending']);
    }

    public function test_valid_state_transition_pending_to_confirmed_succeeds(): void
    {
        $order = Order::create([
            'kode_order' => 'ORD-TRN0002',
            'customer_id' => $this->customer->id,
            'kendaraan_id' => $this->kendaraan->id,
            'admin_id' => $this->admin->id,
            'tanggal_mulai' => '2026-08-01',
            'tanggal_selesai' => '2026-08-04',
            'durasi_hari' => 3,
            'harga_per_hari' => 500000,
            'harga_total' => 1500000,
            'status_order' => 'pending',
            'status_pembayaran' => 'unpaid',
        ]);

        $response = $this->actingAs($this->admin)->putJson("/api/orders/{$order->id}", [
            'status_order' => 'confirmed',
        ]);

        $response->assertOk();
        $this->assertDatabaseHas('orders', ['id' => $order->id, 'status_order' => 'confirmed']);
    }

    public function test_invalid_state_transition_confirmed_to_completed_is_rejected(): void
    {
        $order = Order::create([
            'kode_order' => 'ORD-TRN0003',
            'customer_id' => $this->customer->id,
            'kendaraan_id' => $this->kendaraan->id,
            'admin_id' => $this->admin->id,
            'tanggal_mulai' => '2026-08-01',
            'tanggal_selesai' => '2026-08-04',
            'durasi_hari' => 3,
            'harga_per_hari' => 500000,
            'harga_total' => 1500000,
            'status_order' => 'confirmed',
            'status_pembayaran' => 'unpaid',
        ]);

        $response = $this->actingAs($this->admin)->putJson("/api/orders/{$order->id}", [
            'status_order' => 'completed',
        ]);

        $response->assertStatus(422);
        $this->assertDatabaseHas('orders', ['id' => $order->id, 'status_order' => 'confirmed']);
    }

    // ── Fase 2: jumlah_bayar validation ──

    public function test_store_rejects_jumlah_bayar_exceeds_harga_total(): void
    {
        Storage::fake('public');

        $response = $this->actingAs($this->admin)->postJson('/api/orders', [
            'customer_id' => $this->customer->id,
            'customer_no_hp' => '6281234567890',
            'customer_alamat' => 'Jakarta',
            'customer_no_sim' => 'SIM123',
            'kendaraan_id' => $this->kendaraan->id,
            'tanggal_mulai' => '2026-08-01',
            'tanggal_selesai' => '2026-08-04',
            'tujuan' => 'Bandung',
            'status_pembayaran' => 'partial',
            'jumlah_bayar' => 3000000,
        ]);

        $response->assertStatus(422);
    }

    public function test_store_rejects_jumlah_bayar_zero_when_partial(): void
    {
        Storage::fake('public');

        $response = $this->actingAs($this->admin)->postJson('/api/orders', [
            'customer_id' => $this->customer->id,
            'customer_no_hp' => '6281234567890',
            'customer_alamat' => 'Jakarta',
            'customer_no_sim' => 'SIM123',
            'kendaraan_id' => $this->kendaraan->id,
            'tanggal_mulai' => '2026-08-01',
            'tanggal_selesai' => '2026-08-04',
            'tujuan' => 'Bandung',
            'status_pembayaran' => 'partial',
            'jumlah_bayar' => 0,
        ]);

        $response->assertStatus(422);
    }

    public function test_update_rejects_jumlah_bayar_exceeds_harga_total(): void
    {
        $order = Order::create([
            'kode_order' => 'ORD-JB0001',
            'customer_id' => $this->customer->id,
            'kendaraan_id' => $this->kendaraan->id,
            'admin_id' => $this->admin->id,
            'tanggal_mulai' => '2026-08-01',
            'tanggal_selesai' => '2026-08-04',
            'durasi_hari' => 3,
            'harga_per_hari' => 500000,
            'harga_total' => 1500000,
            'status_order' => 'active',
            'status_pembayaran' => 'unpaid',
        ]);

        $response = $this->actingAs($this->admin)->putJson("/api/orders/{$order->id}", [
            'status_pembayaran' => 'partial',
            'jumlah_bayar' => 2000000,
        ]);

        $response->assertStatus(422);
    }

    // ── Fase 2: jam format validation ──

    public function test_store_rejects_invalid_jam_mulai_format(): void
    {
        $response = $this->actingAs($this->admin)->postJson('/api/orders', [
            'customer_id' => $this->customer->id,
            'customer_no_hp' => '6281234567890',
            'customer_alamat' => 'Jakarta',
            'customer_no_sim' => 'SIM123',
            'kendaraan_id' => $this->kendaraan->id,
            'tanggal_mulai' => '2026-08-01',
            'tanggal_selesai' => '2026-08-04',
            'tujuan' => 'Bandung',
            'jam_mulai' => '08.00',
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors('jam_mulai');
    }

    public function test_store_accepts_valid_jam_mulai_format(): void
    {
        $response = $this->actingAs($this->admin)->postJson('/api/orders', [
            'customer_id' => $this->customer->id,
            'customer_no_hp' => '6281234567890',
            'customer_alamat' => 'Jakarta',
            'customer_no_sim' => 'SIM123',
            'kendaraan_id' => $this->kendaraan->id,
            'tanggal_mulai' => '2026-08-01',
            'tanggal_selesai' => '2026-08-04',
            'tujuan' => 'Bandung',
            'jam_mulai' => '08:00',
            'jam_selesai' => '17:30',
        ]);

        $response->assertStatus(201);
        $order = Order::where('customer_id', $this->customer->id)->first();
        $this->assertSame('08:00', $order->jam_mulai);
        $this->assertSame('17:30', $order->jam_selesai);
    }

    // ── Fase 3: Datetime-aware overlap check ──

    public function test_same_day_different_times_does_not_overlap(): void
    {
        // Order 1: Aug 1 08:00 – Aug 1 12:00
        Order::create([
            'kode_order' => 'ORD-OVL0001',
            'customer_id' => $this->customer->id,
            'kendaraan_id' => $this->kendaraan->id,
            'admin_id' => $this->admin->id,
            'tanggal_mulai' => '2026-08-01',
            'tanggal_selesai' => '2026-08-01',
            'durasi_hari' => 1,
            'harga_per_hari' => 500000,
            'harga_total' => 500000,
            'jam_mulai' => '08:00',
            'jam_selesai' => '12:00',
            'status_order' => 'active',
        ]);

        // Order 2: Aug 1 13:00 – Aug 1 17:00 (no overlap)
        $response = $this->actingAs($this->admin)->postJson('/api/orders', [
            'customer_id' => $this->customer->id,
            'customer_no_hp' => '6281234567890',
            'customer_alamat' => 'Jakarta',
            'customer_no_sim' => 'SIM123',
            'kendaraan_id' => $this->kendaraan->id,
            'tanggal_mulai' => '2026-08-01',
            'tanggal_selesai' => '2026-08-01',
            'tujuan' => 'Bandung',
            'jam_mulai' => '13:00',
            'jam_selesai' => '17:00',
        ]);

        $response->assertStatus(201);
    }

    public function test_same_day_overlapping_times_is_rejected(): void
    {
        // Order 1: Aug 1 08:00 – Aug 1 14:00
        Order::create([
            'kode_order' => 'ORD-OVL0002',
            'customer_id' => $this->customer->id,
            'kendaraan_id' => $this->kendaraan->id,
            'admin_id' => $this->admin->id,
            'tanggal_mulai' => '2026-08-01',
            'tanggal_selesai' => '2026-08-01',
            'durasi_hari' => 1,
            'harga_per_hari' => 500000,
            'harga_total' => 500000,
            'jam_mulai' => '08:00',
            'jam_selesai' => '14:00',
            'status_order' => 'active',
        ]);

        // Order 2: Aug 1 13:00 – Aug 1 17:00 (overlaps by 1 hour)
        $response = $this->actingAs($this->admin)->postJson('/api/orders', [
            'customer_id' => $this->customer->id,
            'customer_no_hp' => '6281234567890',
            'customer_alamat' => 'Jakarta',
            'customer_no_sim' => 'SIM123',
            'kendaraan_id' => $this->kendaraan->id,
            'tanggal_mulai' => '2026-08-01',
            'tanggal_selesai' => '2026-08-01',
            'tujuan' => 'Bandung',
            'jam_mulai' => '13:00',
            'jam_selesai' => '17:00',
        ]);

        $response->assertStatus(422);
    }

    public function test_existing_order_without_times_blocks_whole_day(): void
    {
        // Order 1: Aug 1 – Aug 1 (no times → defaults to 00:00–23:59)
        Order::create([
            'kode_order' => 'ORD-OVL0003',
            'customer_id' => $this->customer->id,
            'kendaraan_id' => $this->kendaraan->id,
            'admin_id' => $this->admin->id,
            'tanggal_mulai' => '2026-08-01',
            'tanggal_selesai' => '2026-08-01',
            'durasi_hari' => 1,
            'harga_per_hari' => 500000,
            'harga_total' => 500000,
            'jam_mulai' => null,
            'jam_selesai' => null,
            'status_order' => 'active',
        ]);

        // Order 2: Aug 1 13:00 – Aug 1 17:00 (should be blocked)
        $response = $this->actingAs($this->admin)->postJson('/api/orders', [
            'customer_id' => $this->customer->id,
            'customer_no_hp' => '6281234567890',
            'customer_alamat' => 'Jakarta',
            'customer_no_sim' => 'SIM123',
            'kendaraan_id' => $this->kendaraan->id,
            'tanggal_mulai' => '2026-08-01',
            'tanggal_selesai' => '2026-08-01',
            'tujuan' => 'Bandung',
            'jam_mulai' => '13:00',
            'jam_selesai' => '17:00',
        ]);

        $response->assertStatus(422);
    }

    public function test_back_to_back_orders_with_times_allowed(): void
    {
        // Order 1: Aug 1 08:00 – Aug 2 12:00
        Order::create([
            'kode_order' => 'ORD-OVL0004',
            'customer_id' => $this->customer->id,
            'kendaraan_id' => $this->kendaraan->id,
            'admin_id' => $this->admin->id,
            'tanggal_mulai' => '2026-08-01',
            'tanggal_selesai' => '2026-08-02',
            'durasi_hari' => 1,
            'harga_per_hari' => 500000,
            'harga_total' => 500000,
            'jam_mulai' => '08:00',
            'jam_selesai' => '12:00',
            'status_order' => 'active',
        ]);

        // Order 2: Aug 2 13:00 – Aug 3 (starts after Order 1 ends → OK)
        $response = $this->actingAs($this->admin)->postJson('/api/orders', [
            'customer_id' => $this->customer->id,
            'customer_no_hp' => '6281234567890',
            'customer_alamat' => 'Jakarta',
            'customer_no_sim' => 'SIM123',
            'kendaraan_id' => $this->kendaraan->id,
            'tanggal_mulai' => '2026-08-02',
            'tanggal_selesai' => '2026-08-03',
            'tujuan' => 'Bandung',
            'jam_mulai' => '13:00',
            'jam_selesai' => '18:00',
        ]);

        $response->assertStatus(201);
    }

    public function test_search_escapes_like_wildcards(): void
    {
        $this->actingAs($this->admin);

        Order::create([
            'kode_order' => 'ORD-100%-TEST',
            'customer_id' => $this->customer->id,
            'kendaraan_id' => $this->kendaraan->id,
            'admin_id' => $this->admin->id,
            'tanggal_mulai' => '2026-08-01',
            'tanggal_selesai' => '2026-08-03',
            'durasi_hari' => 2,
            'harga_per_hari' => 500000,
            'harga_total' => 1000000,
        ]);

        Order::create([
            'kode_order' => 'ORD-200-ALPHA',
            'customer_id' => $this->customer->id,
            'kendaraan_id' => $this->kendaraan->id,
            'admin_id' => $this->admin->id,
            'tanggal_mulai' => '2026-08-01',
            'tanggal_selesai' => '2026-08-03',
            'durasi_hari' => 2,
            'harga_per_hari' => 500000,
            'harga_total' => 1000000,
        ]);

        $response = $this->getJson('/api/orders?search='.urlencode('100%'));
        $response->assertOk();
        $orders = $response->json('data');
        $this->assertCount(1, $orders);
        $this->assertEquals('ORD-100%-TEST', $orders[0]['kode_order']);
    }

    public function test_search_escapes_like_underscore(): void
    {
        $this->actingAs($this->admin);

        Order::create([
            'kode_order' => 'ORD-TEST_123',
            'customer_id' => $this->customer->id,
            'kendaraan_id' => $this->kendaraan->id,
            'admin_id' => $this->admin->id,
            'tanggal_mulai' => '2026-08-01',
            'tanggal_selesai' => '2026-08-03',
            'durasi_hari' => 2,
            'harga_per_hari' => 500000,
            'harga_total' => 1000000,
        ]);

        Order::create([
            'kode_order' => 'ORD-TESTX123',
            'customer_id' => $this->customer->id,
            'kendaraan_id' => $this->kendaraan->id,
            'admin_id' => $this->admin->id,
            'tanggal_mulai' => '2026-08-01',
            'tanggal_selesai' => '2026-08-03',
            'durasi_hari' => 2,
            'harga_per_hari' => 500000,
            'harga_total' => 1000000,
        ]);

        $response = $this->getJson('/api/orders?search='.urlencode('TEST_123'));
        $response->assertOk();
        $orders = $response->json('data');
        $this->assertCount(1, $orders);
        $this->assertEquals('ORD-TEST_123', $orders[0]['kode_order']);
    }

    // ── Fase 8: HIGH severity bug fixes ──

    public function test_store_forces_status_order_to_pending(): void
    {
        $response = $this->actingAs($this->admin)->postJson('/api/orders', [
            'customer_id' => $this->customer->id,
            'customer_no_hp' => '6281234567890',
            'customer_alamat' => 'Jakarta',
            'customer_no_sim' => 'SIM123',
            'kendaraan_id' => $this->kendaraan->id,
            'tanggal_mulai' => '2026-08-01',
            'tanggal_selesai' => '2026-08-04',
            'tujuan' => 'Bandung',
            'status_order' => 'completed',
        ]);

        $response->assertStatus(201);
        $order = Order::where('customer_id', $this->customer->id)->first();
        $this->assertSame('pending', $order->status_order);
    }

    public function test_updating_bukti_transfer_without_jumlah_bayar_does_not_create_ghost_pembayaran(): void
    {
        Storage::fake('public');

        $order = Order::create([
            'kode_order' => 'ORD-H3T0001',
            'customer_id' => $this->customer->id,
            'kendaraan_id' => $this->kendaraan->id,
            'admin_id' => $this->admin->id,
            'tanggal_mulai' => '2026-08-01',
            'tanggal_selesai' => '2026-08-04',
            'durasi_hari' => 3,
            'harga_per_hari' => 500000,
            'harga_total' => 1500000,
            'status_order' => 'active',
            'status_pembayaran' => 'paid',
        ]);

        $this->assertCount(0, $order->pembayarans);

        $response = $this->actingAs($this->admin)->putJson("/api/orders/{$order->id}", [
            'bukti_transfer' => UploadedFile::fake()->image('bukti_baru.jpg'),
        ]);

        $response->assertOk();
        $order->refresh();
        $this->assertCount(0, $order->pembayarans);
    }

    public function test_selesaikan_sewa_with_deleted_supir_does_not_crash(): void
    {
        $supir = SupirCalo::create([
            'nama' => 'Supir Test',
            'no_hp' => '628111222333',
            'jenis' => 'supir',
            'tarif_per_hari' => 100000,
        ]);

        $order = Order::create([
            'kode_order' => 'ORD-H5T0001',
            'customer_id' => $this->customer->id,
            'kendaraan_id' => $this->kendaraan->id,
            'admin_id' => $this->admin->id,
            'tanggal_mulai' => '2026-08-01',
            'tanggal_selesai' => '2026-08-03',
            'durasi_hari' => 2,
            'harga_per_hari' => 500000,
            'harga_total' => 1000000 + (100000 * 2),
            'status_order' => 'active',
            'supir_id' => $supir->id,
        ]);

        $supir->forceDelete();

        $order->selesaikanSewa();
        $order->save();

        // The supir record is deleted, so supirTarif defaults to 0.
        // harga_total = harga_per_hari * durasi_hari + 0 + denda (0 if on time)
        $this->assertSame(0.0, (float) $order->harga_total - ($order->harga_per_hari * $order->durasi_hari));
    }

    public function test_vehicle_stays_disewa_when_other_active_orders_exist(): void
    {
        $order1 = Order::create([
            'kode_order' => 'ORD-H1T0001',
            'customer_id' => $this->customer->id,
            'kendaraan_id' => $this->kendaraan->id,
            'admin_id' => $this->admin->id,
            'tanggal_mulai' => '2026-08-01',
            'tanggal_selesai' => '2026-08-03',
            'durasi_hari' => 2,
            'harga_per_hari' => 500000,
            'harga_total' => 1000000,
            'status_order' => 'active',
            'status_pembayaran' => 'paid',
        ]);

        $order2 = Order::create([
            'kode_order' => 'ORD-H1T0002',
            'customer_id' => $this->customer->id,
            'kendaraan_id' => $this->kendaraan->id,
            'admin_id' => $this->admin->id,
            'tanggal_mulai' => '2026-08-10',
            'tanggal_selesai' => '2026-08-15',
            'durasi_hari' => 5,
            'harga_per_hari' => 500000,
            'harga_total' => 2500000,
            'status_order' => 'confirmed',
            'status_pembayaran' => 'unpaid',
        ]);

        $this->kendaraan->update(['status' => 'disewa']);

        Storage::fake('public');

        $response = $this->actingAs($this->admin)->putJson("/api/orders/{$order1->id}", [
            'status_order' => 'completed',
            'bukti_pengembalian' => UploadedFile::fake()->image('pengembalian.jpg'),
            'tanggal_pengembalian_aktual' => '2026-08-02 10:00:00',
        ]);

        $response->assertOk();
        $this->kendaraan->refresh();
        $this->assertSame('disewa', $this->kendaraan->status);
    }

    public function test_vehicle_set_to_tersedia_when_no_other_active_orders(): void
    {
        $order = Order::create([
            'kode_order' => 'ORD-H1T0003',
            'customer_id' => $this->customer->id,
            'kendaraan_id' => $this->kendaraan->id,
            'admin_id' => $this->admin->id,
            'tanggal_mulai' => '2026-08-01',
            'tanggal_selesai' => '2026-08-03',
            'durasi_hari' => 2,
            'harga_per_hari' => 500000,
            'harga_total' => 1000000,
            'status_order' => 'active',
            'status_pembayaran' => 'paid',
        ]);

        $this->kendaraan->update(['status' => 'disewa']);

        Storage::fake('public');

        $response = $this->actingAs($this->admin)->putJson("/api/orders/{$order->id}", [
            'status_order' => 'completed',
            'bukti_pengembalian' => UploadedFile::fake()->image('pengembalian.jpg'),
            'tanggal_pengembalian_aktual' => '2026-08-02 10:00:00',
        ]);

        $response->assertOk();
        $this->kendaraan->refresh();
        $this->assertSame('tersedia', $this->kendaraan->status);
    }

    public function test_soft_deleted_order_preserves_file_references(): void
    {
        $order = Order::create([
            'kode_order' => 'ORD-H6T0001',
            'customer_id' => $this->customer->id,
            'kendaraan_id' => $this->kendaraan->id,
            'admin_id' => $this->admin->id,
            'tanggal_mulai' => '2026-08-01',
            'tanggal_selesai' => '2026-08-03',
            'durasi_hari' => 2,
            'harga_per_hari' => 500000,
            'harga_total' => 1000000,
            'status_order' => 'pending',
            'bukti_transfer' => 'bukti-transfer/test.jpg',
            'bukti_pengiriman' => 'bukti-pengiriman/test.jpg',
        ]);

        $order->delete();

        $this->assertSoftDeleted('orders', ['id' => $order->id]);

        $order->refresh();
        $this->assertSame('bukti-transfer/test.jpg', $order->bukti_transfer);
        $this->assertSame('bukti-pengiriman/test.jpg', $order->bukti_pengiriman);
    }
}
