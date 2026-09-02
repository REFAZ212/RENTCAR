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

class KendaraanAvailabilityTest extends TestCase
{
    protected User $admin;

    protected Customer $customer;

    protected GarasiPartner $garasi;

    protected function setUp(): void
    {
        parent::setUp();

        Schema::dropIfExists('pembayarans');
        Schema::dropIfExists('garasi_requests');
        Schema::dropIfExists('orders');
        Schema::dropIfExists('kendaraans');
        Schema::dropIfExists('garasi_partners');
        Schema::dropIfExists('customers');
        Schema::dropIfExists('tipes');
        Schema::dropIfExists('kategoris');
        Schema::dropIfExists('settings');
        Schema::dropIfExists('supir_calos');
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
            $t->foreignId('kategori_id');
            $t->string('nama_tipe');
            $t->string('slug')->nullable();
            $t->boolean('aktif')->default(true);
            $t->timestamps();
        });
        Schema::create('kendaraans', function ($t) {
            $t->id();
            $t->foreignId('garasi_partner_id')->nullable();
            $t->foreignId('kategori_id')->nullable();
            $t->foreignId('tipe_id')->nullable();
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
    }

    private function buatKendaraan(string $plat, string $status = 'tersedia'): Kendaraan
    {
        return Kendaraan::create([
            'garasi_partner_id' => $this->garasi->id,
            'nama_kendaraan' => 'Toyota Avanza',
            'plat_nomor' => $plat,
            'warna' => 'Putih',
            'harga_sewa_per_hari' => 500000,
            'status' => $status,
        ]);
    }

    private function buatOrder(Kendaraan $kendaraan, string $kode, string $statusOrder = 'pending'): Order
    {
        return Order::create([
            'kode_order' => $kode,
            'customer_id' => $this->customer->id,
            'kendaraan_id' => $kendaraan->id,
            'admin_id' => $this->admin->id,
            'tanggal_mulai' => '2026-09-01',
            'tanggal_selesai' => '2026-09-05',
            'durasi_hari' => 4,
            'harga_per_hari' => 500000,
            'harga_total' => 2000000,
            'status_order' => $statusOrder,
        ]);
    }

    private function payloadOrder(Kendaraan $kendaraan): array
    {
        return [
            'customer_id' => $this->customer->id,
            'customer_no_hp' => '6281234567890',
            'customer_alamat' => 'Jakarta Selatan',
            'customer_no_sim' => 'SIM123',
            'kendaraan_id' => $kendaraan->id,
            'tanggal_mulai' => '2026-10-01',
            'tanggal_selesai' => '2026-10-05',
            'tujuan' => 'Surabaya',
        ];
    }

    public function test_admin_cannot_create_order_for_disewa_vehicle(): void
    {
        Storage::fake('public');
        $kendaraan = $this->buatKendaraan('B 1 AA', 'disewa');

        $response = $this->actingAs($this->admin)->postJson('/api/orders', $this->payloadOrder($kendaraan));

        $response->assertStatus(422)
            ->assertJsonPath('errors.kendaraan_id.0', 'Kendaraan sedang tidak tersedia (disewa/servis) dan tidak dapat dipesan.');
        $this->assertDatabaseMissing('orders', ['kendaraan_id' => $kendaraan->id]);
    }

    public function test_admin_cannot_create_order_for_maintenance_vehicle(): void
    {
        Storage::fake('public');
        $kendaraan = $this->buatKendaraan('B 2 BB', 'maintenance');

        $response = $this->actingAs($this->admin)->postJson('/api/orders', $this->payloadOrder($kendaraan));

        $response->assertStatus(422)
            ->assertJsonPath('errors.kendaraan_id.0', 'Kendaraan sedang tidak tersedia (disewa/servis) dan tidak dapat dipesan.');
    }

    public function test_admin_cannot_create_order_for_tidak_tersedia_vehicle(): void
    {
        Storage::fake('public');
        $kendaraan = $this->buatKendaraan('B 3 CC', 'tidak_tersedia');

        $response = $this->actingAs($this->admin)->postJson('/api/orders', $this->payloadOrder($kendaraan));

        $response->assertStatus(422)
            ->assertJsonPath('errors.kendaraan_id.0', 'Kendaraan sedang tidak tersedia (disewa/servis) dan tidak dapat dipesan.');
    }

    public function test_admin_can_create_order_for_tersedia_vehicle(): void
    {
        Storage::fake('public');
        $kendaraan = $this->buatKendaraan('B 4 DD', 'tersedia');

        $response = $this->actingAs($this->admin)->postJson('/api/orders', $this->payloadOrder($kendaraan));

        $response->assertStatus(201);
        $this->assertDatabaseHas('orders', ['kendaraan_id' => $kendaraan->id]);
    }

    public function test_admin_cannot_switch_order_to_disewa_vehicle(): void
    {
        Storage::fake('public');
        $kendaraanAwal = $this->buatKendaraan('B 5 EE', 'tersedia');
        $kendaraanDisewa = $this->buatKendaraan('B 6 FF', 'disewa');
        $order = $this->buatOrder($kendaraanAwal, 'ORD-KA-1');

        $response = $this->actingAs($this->admin)->putJson("/api/orders/{$order->id}", [
            'kendaraan_id' => $kendaraanDisewa->id,
        ]);

        $response->assertStatus(422)
            ->assertJsonPath('errors.kendaraan_id.0', 'Kendaraan sedang tidak tersedia (disewa/servis) dan tidak dapat dipesan.');
        $this->assertDatabaseHas('orders', ['id' => $order->id, 'kendaraan_id' => $kendaraanAwal->id]);
    }

    public function test_admin_can_switch_order_to_tersedia_vehicle(): void
    {
        Storage::fake('public');
        $kendaraanAwal = $this->buatKendaraan('B 7 GG', 'tersedia');
        $kendaraanBaru = $this->buatKendaraan('B 8 HH', 'tersedia');
        $order = $this->buatOrder($kendaraanAwal, 'ORD-KA-2');

        $response = $this->actingAs($this->admin)->putJson("/api/orders/{$order->id}", [
            'kendaraan_id' => $kendaraanBaru->id,
        ]);

        $response->assertStatus(200);
        $this->assertDatabaseHas('orders', ['id' => $order->id, 'kendaraan_id' => $kendaraanBaru->id]);
    }

    public function test_admin_can_activate_order_keeping_same_vehicle(): void
    {
        Storage::fake('public');
        $kendaraan = $this->buatKendaraan('B 9 II', 'tersedia');
        $order = $this->buatOrder($kendaraan, 'ORD-KA-3');

        $response = $this->actingAs($this->admin)->putJson("/api/orders/{$order->id}", [
            'status_order' => 'active',
            'kendaraan_id' => $kendaraan->id,
        ]);

        $response->assertStatus(200);
        $this->assertSame('disewa', $kendaraan->fresh()->status);
    }

    public function test_tidak_tersedia_dengan_order_confirmed_bisa_dikembalikan_ke_tersedia(): void
    {
        Storage::fake('public');
        $kendaraan = $this->buatKendaraan('B 20 TT', 'tidak_tersedia');
        $this->buatOrder($kendaraan, 'ORD-CTUZXKKS', 'confirmed');

        $response = $this->actingAs($this->admin)->putJson("/api/kendaraans/{$kendaraan->id}", [
            'status' => 'tersedia',
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('status', 'tersedia');
        $this->assertSame('tersedia', $kendaraan->fresh()->status);
    }

    public function test_kendaraan_dengan_order_confirmed_tidak_bisa_ke_tidak_tersedia(): void
    {
        Storage::fake('public');
        $kendaraan = $this->buatKendaraan('B 21 UU', 'tersedia');
        $this->buatOrder($kendaraan, 'ORD-CONF-1', 'confirmed');

        $response = $this->actingAs($this->admin)->putJson("/api/kendaraans/{$kendaraan->id}", [
            'status' => 'tidak_tersedia',
        ]);

        $response->assertStatus(422)
            ->assertJsonPath('message', 'Kendaraan masih memiliki order aktif. Selesaikan atau batalkan order terlebih dahulu.');
        $this->assertSame('tersedia', $kendaraan->fresh()->status);
    }

    public function test_kendaraan_dengan_order_confirmed_tidak_bisa_ke_maintenance(): void
    {
        Storage::fake('public');
        $kendaraan = $this->buatKendaraan('B 22 VV', 'tersedia');
        $this->buatOrder($kendaraan, 'ORD-CONF-2', 'confirmed');

        $response = $this->actingAs($this->admin)->putJson("/api/kendaraans/{$kendaraan->id}", [
            'status' => 'maintenance',
        ]);

        $response->assertStatus(422)
            ->assertJsonPath('message', 'Kendaraan masih memiliki order aktif. Selesaikan atau batalkan order terlebih dahulu.');
        $this->assertSame('tersedia', $kendaraan->fresh()->status);
    }

    public function test_kendaraan_disewa_dengan_order_active_tidak_bisa_ke_tersedia(): void
    {
        Storage::fake('public');
        $kendaraan = $this->buatKendaraan('B 23 WW', 'disewa');
        $this->buatOrder($kendaraan, 'ORD-ACT-1', 'active');

        $response = $this->actingAs($this->admin)->putJson("/api/kendaraans/{$kendaraan->id}", [
            'status' => 'tersedia',
        ]);

        $response->assertStatus(422)
            ->assertJsonPath('message', 'Kendaraan masih memiliki order aktif. Selesaikan atau batalkan order terlebih dahulu.');
        $this->assertSame('disewa', $kendaraan->fresh()->status);
    }

    public function test_tanpa_order_status_tersedia_dan_tidak_tersedia_bisa_diubah_bebas(): void
    {
        Storage::fake('public');
        $kendaraan = $this->buatKendaraan('B 24 XX', 'tersedia');

        $this->actingAs($this->admin)->putJson("/api/kendaraans/{$kendaraan->id}", ['status' => 'tidak_tersedia'])
            ->assertStatus(200)
            ->assertJsonPath('status', 'tidak_tersedia');
        $this->assertSame('tidak_tersedia', $kendaraan->fresh()->status);

        $this->actingAs($this->admin)->putJson("/api/kendaraans/{$kendaraan->id}", ['status' => 'tersedia'])
            ->assertStatus(200)
            ->assertJsonPath('status', 'tersedia');
        $this->assertSame('tersedia', $kendaraan->fresh()->status);
    }

    public function test_order_confirmed_soft_deleted_tidak_memblokir_perubahan_status(): void
    {
        Storage::fake('public');
        $kendaraan = $this->buatKendaraan('B 25 YY', 'tersedia');
        $order = $this->buatOrder($kendaraan, 'ORD-DEL-1', 'confirmed');
        $order->delete();

        $this->actingAs($this->admin)->putJson("/api/kendaraans/{$kendaraan->id}", ['status' => 'tidak_tersedia'])
            ->assertStatus(200)
            ->assertJsonPath('status', 'tidak_tersedia');
        $this->assertSame('tidak_tersedia', $kendaraan->fresh()->status);
    }

    public function test_index_mengembalikan_jumlah_order_menunggu_dan_konfirmasi(): void
    {
        Storage::fake('public');
        $kendaraan = $this->buatKendaraan('B 26 ZZ', 'tersedia');
        $this->buatOrder($kendaraan, 'ORD-IDX-1', 'pending');
        $this->buatOrder($kendaraan, 'ORD-IDX-2', 'confirmed');
        $this->buatKendaraan('B 27 AAA', 'tersedia');

        $response = $this->actingAs($this->admin)->getJson('/api/kendaraans');

        $response->assertStatus(200);
        $item = collect($response->json('data'))->firstWhere('id', $kendaraan->id);
        $this->assertSame(1, $item['order_pending_count']);
        $this->assertSame(1, $item['order_confirmed_count']);
        $other = collect($response->json('data'))->firstWhere('plat_nomor', 'B 27 AAA');
        $this->assertSame(0, $other['order_pending_count']);
        $this->assertSame(0, $other['order_confirmed_count']);
    }

    public function test_index_returns_counts_per_status(): void
    {
        $this->buatKendaraan('B 10 JJ', 'tersedia');
        $disewa = $this->buatKendaraan('B 11 KK', 'disewa');
        $this->buatOrder($disewa, 'ORD-COUNT-1', 'active');
        $this->buatKendaraan('B 12 LL', 'maintenance');

        $response = $this->actingAs($this->admin)->getJson('/api/kendaraans');

        $response->assertStatus(200)
            ->assertJsonPath('counts.total', 3)
            ->assertJsonPath('counts.tersedia', 1)
            ->assertJsonPath('counts.disewa', 1)
            ->assertJsonPath('counts.maintenance', 1)
            ->assertJsonPath('counts.tidak_tersedia', 0);
    }

    public function test_katalog_hides_maintenance_vehicles(): void
    {
        $tersedia = $this->buatKendaraan('B 13 MM', 'tersedia');
        $this->buatKendaraan('B 14 NN', 'maintenance');
        $this->buatKendaraan('B 15 OO', 'tidak_tersedia');

        $response = $this->getJson('/api/katalog');

        $response->assertStatus(200);
        $platList = collect($response->json('data'))->pluck('plat_nomor')->all();
        $this->assertContains($tersedia->plat_nomor, $platList);
        $this->assertNotContains('B 14 NN', $platList);
        $this->assertNotContains('B 15 OO', $platList);
    }

    public function test_katalog_show_hides_maintenance_and_unavailable_vehicles(): void
    {
        $maintenance = $this->buatKendaraan('B 16 PP', 'maintenance');
        $tidakTersedia = $this->buatKendaraan('B 17 QQ', 'tidak_tersedia');

        $this->getJson("/api/katalog/{$maintenance->id}")->assertStatus(404);
        $this->getJson("/api/katalog/{$tidakTersedia->id}")->assertStatus(404);
    }

    public function test_katalog_menyembunyikan_data_pribadi_partner(): void
    {
        $kendaraan = $this->buatKendaraan('B 18 RR', 'tersedia');

        $index = $this->getJson('/api/katalog')->assertOk();
        $item = collect($index->json('data'))->firstWhere('id', $kendaraan->id);
        $this->assertNotNull($item['garasi_partner']);
        $this->assertSame($this->garasi->nama_garasi, $item['garasi_partner']['nama_garasi']);
        foreach (['nama_pemilik', 'alamat', 'no_hp', 'email', 'status_aktif', 'is_own', 'metode_bagi_hasil', 'persentase_bagi_hasil', 'catatan'] as $field) {
            $this->assertArrayNotHasKey($field, $item['garasi_partner'], "Field '{$field}' tidak boleh bocor di katalog");
        }

        $detail = $this->getJson("/api/katalog/{$kendaraan->id}")->assertOk();
        $this->assertSame($this->garasi->nama_garasi, $detail->json('garasi_partner.nama_garasi'));
        foreach (['nama_pemilik', 'alamat', 'no_hp', 'email', 'status_aktif', 'is_own', 'metode_bagi_hasil', 'persentase_bagi_hasil', 'catatan'] as $field) {
            $this->assertArrayNotHasKey($field, $detail->json('garasi_partner'), "Field '{$field}' tidak boleh bocor di detail katalog");
        }
    }

    public function test_sinkronkan_status_menjadikan_disewa_untuk_order_active(): void
    {
        $kendaraan = $this->buatKendaraan('B 28 BB', 'tersedia');
        $this->buatOrder($kendaraan, 'ORD-SYNC-1', 'active');

        Kendaraan::sinkronkanStatusDariOrder();

        $this->assertSame('disewa', $kendaraan->fresh()->status);
    }

    public function test_sinkronkan_menjadikan_disewa_untuk_order_perlu_verifikasi(): void
    {
        $kendaraan = $this->buatKendaraan('B 29 CC', 'tersedia');
        $this->buatOrder($kendaraan, 'ORD-SYNC-2', 'perlu_verifikasi');

        Kendaraan::sinkronkanStatusDariOrder();

        $this->assertSame('disewa', $kendaraan->fresh()->status);
    }

    public function test_sinkronkan_membebaskan_kendaraan_setelah_order_selesai(): void
    {
        $kendaraan = $this->buatKendaraan('B 30 DD', 'disewa');
        $this->buatOrder($kendaraan, 'ORD-SYNC-3', 'completed');

        Kendaraan::sinkronkanStatusDariOrder();

        $this->assertSame('tersedia', $kendaraan->fresh()->status);
    }

    public function test_sinkronkan_kendaraan_dengan_order_cancelled_kembali_tersedia(): void
    {
        $kendaraan = $this->buatKendaraan('B 31 EE', 'disewa');
        $this->buatOrder($kendaraan, 'ORD-SYNC-4', 'cancelled');

        Kendaraan::sinkronkanStatusDariOrder();

        $this->assertSame('tersedia', $kendaraan->fresh()->status);
    }

    public function test_sinkronkan_mengabaikan_order_soft_deleted(): void
    {
        $kendaraan = $this->buatKendaraan('B 32 FF', 'disewa');
        $order = $this->buatOrder($kendaraan, 'ORD-SYNC-5', 'active');
        $order->delete();

        Kendaraan::sinkronkanStatusDariOrder();

        $this->assertSame('tersedia', $kendaraan->fresh()->status);
    }

    public function test_sinkronkan_tidak_mengubah_status_manual_tanpa_order_berjalan(): void
    {
        $servis = $this->buatKendaraan('B 33 GG', 'maintenance');
        $mati = $this->buatKendaraan('B 34 HH', 'tidak_tersedia');

        Kendaraan::sinkronkanStatusDariOrder();

        $this->assertSame('maintenance', $servis->fresh()->status);
        $this->assertSame('tidak_tersedia', $mati->fresh()->status);
    }

    public function test_index_self_heal_status_dan_count_disewa(): void
    {
        Storage::fake('public');
        $kendaraan = $this->buatKendaraan('B 35 II', 'tersedia');
        $this->buatOrder($kendaraan, 'ORD-SYNC-6', 'active');

        $response = $this->actingAs($this->admin)->getJson('/api/kendaraans');

        $response->assertStatus(200)
            ->assertJsonPath('counts.disewa', 1)
            ->assertJsonPath('counts.tersedia', 0);
        $item = collect($response->json('data'))->firstWhere('id', $kendaraan->id);
        $this->assertSame('disewa', $item['status']);
        $this->assertSame(1, $item['active_orders_count']);
    }

    public function test_show_menyertakan_order_aktif_dan_status_hasil_sinkron(): void
    {
        Storage::fake('public');
        $kendaraan = $this->buatKendaraan('B 36 JJ', 'tersedia');
        $this->buatOrder($kendaraan, 'ORD-SYNC-7', 'active');

        $response = $this->actingAs($this->admin)->getJson("/api/kendaraans/{$kendaraan->id}");

        $response->assertStatus(200)
            ->assertJsonPath('data.id', $kendaraan->id)
            ->assertJsonPath('data.status', 'disewa');
        $orders = $response->json('data.orders');
        $this->assertCount(1, $orders);
        $this->assertSame('ORD-SYNC-7', $orders[0]['kode_order']);
        $this->assertSame('active', $orders[0]['status_order']);
        $this->assertSame('2026-09-05', $orders[0]['tanggal_selesai']);
    }

    public function test_show_tidak_menyertakan_order_selesai(): void
    {
        Storage::fake('public');
        $kendaraan = $this->buatKendaraan('B 37 KK', 'tersedia');
        $this->buatOrder($kendaraan, 'ORD-SYNC-8', 'completed');

        $response = $this->actingAs($this->admin)->getJson("/api/kendaraans/{$kendaraan->id}");

        $response->assertStatus(200)
            ->assertJsonPath('data.status', 'tersedia')
            ->assertJsonPath('data.orders', []);
    }

    public function test_katalog_menampilkan_kendaraan_sedang_dipakai_sebagai_disewa(): void
    {
        $kendaraan = $this->buatKendaraan('B 38 LL', 'tersedia');
        $this->buatOrder($kendaraan, 'ORD-SYNC-9', 'active');

        $response = $this->getJson('/api/katalog');

        $response->assertStatus(200);
        $item = collect($response->json('data'))->firstWhere('id', $kendaraan->id);
        $this->assertSame('disewa', $item['status']);
        $this->assertSame(1, $item['active_orders_count']);
    }

    public function test_pindah_kendaraan_tidak_membebaskan_kendaraan_lama_yang_masih_dipakai(): void
    {
        Storage::fake('public');
        $kendaraanLama = $this->buatKendaraan('B 39 MM', 'disewa');
        $kendaraanBaru = $this->buatKendaraan('B 40 NN', 'tersedia');
        $this->buatOrder($kendaraanLama, 'ORD-LAMA-1', 'active');
        $orderPindah = $this->buatOrder($kendaraanLama, 'ORD-PINDAH-1', 'pending');

        $response = $this->actingAs($this->admin)->putJson("/api/orders/{$orderPindah->id}", [
            'kendaraan_id' => $kendaraanBaru->id,
            'status_order' => 'active',
        ]);

        $response->assertStatus(200);
        $this->assertDatabaseHas('orders', ['id' => $orderPindah->id, 'kendaraan_id' => $kendaraanBaru->id]);
        $this->assertSame('disewa', $kendaraanLama->fresh()->status);
        $this->assertSame('disewa', $kendaraanBaru->fresh()->status);
    }

    public function test_pindah_kendaraan_membebaskan_kendaraan_lama_yang_tidak_dipakai_lain(): void
    {
        Storage::fake('public');
        $kendaraanLama = $this->buatKendaraan('B 41 OO', 'disewa');
        $kendaraanBaru = $this->buatKendaraan('B 42 PP', 'tersedia');
        $orderPindah = $this->buatOrder($kendaraanLama, 'ORD-PINDAH-2', 'pending');

        $response = $this->actingAs($this->admin)->putJson("/api/orders/{$orderPindah->id}", [
            'kendaraan_id' => $kendaraanBaru->id,
            'status_order' => 'active',
        ]);

        $response->assertStatus(200);
        $this->assertDatabaseHas('orders', ['id' => $orderPindah->id, 'kendaraan_id' => $kendaraanBaru->id]);
        $this->assertSame('tersedia', $kendaraanLama->fresh()->status);
        $this->assertSame('disewa', $kendaraanBaru->fresh()->status);
    }

    public function test_kendaraan_disewa_dengan_order_active_tidak_bisa_ke_tidak_tersedia(): void
    {
        Storage::fake('public');
        $kendaraan = $this->buatKendaraan('B 43 QQ', 'disewa');
        $this->buatOrder($kendaraan, 'ORD-LOCK-1', 'active');

        $this->actingAs($this->admin)->putJson("/api/kendaraans/{$kendaraan->id}", ['status' => 'tidak_tersedia'])
            ->assertStatus(422)
            ->assertJsonPath('message', 'Kendaraan masih memiliki order aktif. Selesaikan atau batalkan order terlebih dahulu.');
        $this->assertSame('disewa', $kendaraan->fresh()->status);
    }

    public function test_kendaraan_disewa_dengan_order_active_tidak_bisa_ke_maintenance(): void
    {
        Storage::fake('public');
        $kendaraan = $this->buatKendaraan('B 44 RR', 'disewa');
        $this->buatOrder($kendaraan, 'ORD-LOCK-2', 'active');

        $this->actingAs($this->admin)->putJson("/api/kendaraans/{$kendaraan->id}", ['status' => 'maintenance'])
            ->assertStatus(422)
            ->assertJsonPath('message', 'Kendaraan masih memiliki order aktif. Selesaikan atau batalkan order terlebih dahulu.');
        $this->assertSame('disewa', $kendaraan->fresh()->status);
    }

    public function test_kendaraan_dengan_order_perlu_verifikasi_dikunci_dari_perubahan_manual(): void
    {
        Storage::fake('public');
        $kendaraan = $this->buatKendaraan('B 45 SS', 'disewa');
        $this->buatOrder($kendaraan, 'ORD-LOCK-3', 'perlu_verifikasi');

        foreach (['maintenance', 'tidak_tersedia', 'tersedia'] as $target) {
            $this->actingAs($this->admin)->putJson("/api/kendaraans/{$kendaraan->id}", ['status' => $target])
                ->assertStatus(422)
                ->assertJsonPath('message', 'Kendaraan masih memiliki order aktif. Selesaikan atau batalkan order terlebih dahulu.');
        }

        // Tetap boleh menandai disewa (konsisten dengan order yang berjalan).
        $this->actingAs($this->admin)->putJson("/api/kendaraans/{$kendaraan->id}", ['status' => 'disewa'])
            ->assertStatus(200)
            ->assertJsonPath('status', 'disewa');
        $this->assertSame('disewa', $kendaraan->fresh()->status);
    }

    public function test_index_active_orders_count_termasuk_perlu_verifikasi(): void
    {
        Storage::fake('public');
        $kendaraan = $this->buatKendaraan('B 46 TT', 'tersedia');
        $this->buatOrder($kendaraan, 'ORD-COUNT-2', 'perlu_verifikasi');

        $response = $this->actingAs($this->admin)->getJson('/api/kendaraans');

        $response->assertStatus(200)
            ->assertJsonPath('counts.disewa', 1);
        $item = collect($response->json('data'))->firstWhere('id', $kendaraan->id);
        $this->assertSame('disewa', $item['status']);
        $this->assertSame(1, $item['active_orders_count']);
    }
}
