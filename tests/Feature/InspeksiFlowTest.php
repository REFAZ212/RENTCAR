<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\InspeksiKendaraan;
use App\Models\Kendaraan;
use App\Models\Order;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

class InspeksiFlowTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        Schema::dropIfExists('whatsapp_logs');
        Schema::dropIfExists('notifications');
        Schema::dropIfExists('inspeksi_kendaraans');
        Schema::dropIfExists('pembayarans');
        Schema::dropIfExists('orders');
        Schema::dropIfExists('kendaraans');
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
            $t->decimal('komisi_calo', 12, 2)->nullable();
            $t->decimal('denda_overtime', 14, 2)->default(0);
            $t->integer('jam_overtime')->default(0);
            $t->timestamp('tanggal_pengembalian_aktual')->nullable();
            $t->text('alasan_pembatalan')->nullable();
            $t->decimal('biaya_pembatalan', 14, 2)->nullable();
            $t->decimal('total_refund', 14, 2)->nullable();
            $t->foreignId('operator_id')->nullable();
            $t->timestamp('waktu_klaim')->nullable();
            $t->decimal('biaya_kerusakan', 14, 2)->nullable();
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
        Schema::create('inspeksi_kendaraans', function ($t) {
            $t->id();
            $t->foreignId('order_id');
            $t->string('jenis');
            $t->string('status')->default('final');
            $t->integer('odometer')->nullable();
            $t->string('fuel_level')->nullable();
            $t->string('kondisi_body')->nullable();
            $t->string('kondisi_interior')->nullable();
            $t->string('kondisi_ban')->nullable();
            $t->string('kondisi_ac')->nullable();
            $t->string('kondisi_lampu')->nullable();
            $t->boolean('ada_damagenya')->default(false);
            $t->text('deskripsi_kondisi')->nullable();
            $t->text('catatan')->nullable();
            $t->string('foto')->nullable();
            $t->string('ttd_customer')->nullable();
            $t->string('ttd_petugas')->nullable();
            $t->json('checklist_serah_terima')->nullable();
            $t->decimal('biaya_kerusakan', 14, 2)->nullable();
            $t->string('inspeksi_oleh')->nullable();
            $t->foreignId('admin_id')->nullable();
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
        Schema::create('notifications', function ($t) {
            $t->id();
            $t->foreignId('user_id');
            $t->string('type')->nullable();
            $t->string('title')->nullable();
            $t->text('message')->nullable();
            $t->text('data')->nullable();
            $t->timestamp('read_at')->nullable();
            $t->timestamps();
        });

        $this->admin = User::create([
            'name' => 'Admin Utama',
            'email' => 'admin@test.com',
            'password' => 'password',
            'role' => 'admin_utama',
        ]);
        $this->petugas = User::create([
            'name' => 'Petugas Lapangan',
            'email' => 'petugas@test.com',
            'phone' => '6281234567890',
            'password' => 'password',
            'role' => 'petugas',
        ]);
        $this->customer = Customer::create([
            'nama_lengkap' => 'Budi Santoso',
            'no_hp' => '6281234567890',
            'no_sim' => 'SIM123',
            'alamat' => 'Jakarta Selatan',
        ]);
        $this->kendaraan = Kendaraan::create([
            'nama_kendaraan' => 'Toyota Avanza',
            'plat_nomor' => 'B 1234 ABC',
            'warna' => 'Putih',
            'harga_sewa_per_hari' => 500000,
            'status' => 'tersedia',
        ]);
    }

    private User $admin;

    private User $petugas;

    private Customer $customer;

    private Kendaraan $kendaraan;

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
            'status_order' => 'confirmed',
            'status_pembayaran' => 'unpaid',
        ];

        return Order::create(array_merge($defaults, $overrides));
    }

    private function payloadInspeksi(array $overrides = []): array
    {
        return array_merge([
            'odometer' => 45000,
            'fuel_level' => 'full',
            'kondisi_body' => 'baik',
            'kondisi_interior' => 'baik',
            'kondisi_ban' => 'baik',
            'kondisi_ac' => 'baik',
            'kondisi_lampu' => 'baik',
            'deskripsi_kondisi' => 'Kendaraan bersih, tanpa baret.',
            'checklist_serah_terima' => ['kunci', 'stnk', 'kunci_roda', 'dongkrak', 'ban_serep', 'ac'],
            'ttd_customer' => UploadedFile::fake()->image('ttd-customer.png'),
            'ttd_petugas' => UploadedFile::fake()->image('ttd-petugas.png'),
        ], $overrides);
    }

    /**
     * Fase 1: simpan draft inspeksi pickup (boleh tanpa TTD).
     */
    private function buatDraft(Order $order, array $overrides = [], ?User $sebagai = null): TestResponse
    {
        return $this->actingAs($sebagai ?? $this->petugas)->postJson('/api/inspeksi-kendaraans', $this->payloadInspeksi(array_merge([
            'order_id' => $order->id,
            'jenis' => 'pickup',
            'ttd_customer' => null,
            'ttd_petugas' => null,
        ], $overrides)));
    }

    /**
     * Fase 2: kirim kendaraan memakai inspeksi_id draft.
     */
    private function payloadKirim(int $inspeksiId, array $overrides = []): array
    {
        return array_merge([
            'inspeksi_id' => $inspeksiId,
            'ttd_customer' => UploadedFile::fake()->image('ttd-customer.png'),
            'ttd_petugas' => UploadedFile::fake()->image('ttd-petugas.png'),
        ], $overrides);
    }

    public function test_confirmed_order_muncul_sebagai_task_inspeksi_pickup(): void
    {
        $order = $this->createOrder();

        $response = $this->actingAs($this->petugas)->getJson('/api/inspeksi-tasks');

        $response->assertOk();
        $this->assertTrue(
            collect($response->json())->contains(fn ($task) => $task['id'] === $order->id && $task['task_jenis'] === 'inspeksi_pickup')
        );
    }

    public function test_task_kirim_kendaraan_hanya_tampil_untuk_pemilik_draft(): void
    {
        $order = $this->createOrder();

        $response = $this->actingAs($this->petugas)->getJson('/api/inspeksi-tasks');
        $this->assertFalse(
            collect($response->json())->contains(fn ($task) => $task['id'] === $order->id && $task['task_jenis'] === 'kirim_kendaraan')
        );

        $this->buatDraft($order);
        $petugasLain = User::create([
            'name' => 'Petugas Lain',
            'email' => 'petugas2@test.com',
            'phone' => '6281234567891',
            'password' => 'password',
            'role' => 'petugas',
        ]);

        $response = $this->actingAs($petugasLain)->getJson('/api/inspeksi-tasks');
        $this->assertFalse(
            collect($response->json())->contains(fn ($task) => $task['id'] === $order->id && $task['task_jenis'] === 'kirim_kendaraan')
        );

        $response = $this->actingAs($this->petugas)->getJson('/api/inspeksi-tasks');
        $this->assertTrue(
            collect($response->json())->contains(fn ($task) => $task['id'] === $order->id && $task['task_jenis'] === 'kirim_kendaraan')
        );

        $response = $this->actingAs($this->admin)->getJson('/api/inspeksi-tasks');
        $this->assertTrue(
            collect($response->json())->contains(fn ($task) => $task['id'] === $order->id && $task['task_jenis'] === 'kirim_kendaraan')
        );
    }

    public function test_active_order_muncul_sebagai_task_return(): void
    {
        $order = $this->createOrder(['status_order' => 'active']);

        $response = $this->actingAs($this->petugas)->getJson('/api/inspeksi-tasks');

        $response->assertOk();
        $this->assertTrue(
            collect($response->json())->contains(fn ($task) => $task['id'] === $order->id && $task['task_jenis'] === 'return')
        );
    }

    public function test_store_pickup_membuat_draft_tanpa_mengubah_order(): void
    {
        $order = $this->createOrder();

        $response = $this->buatDraft($order);

        $response->assertStatus(201);
        $response->assertJson(['jenis' => 'pickup', 'status' => 'draft', 'order_id' => $order->id]);
        $this->assertDatabaseHas('orders', ['id' => $order->id, 'status_order' => 'confirmed']);
        $this->assertDatabaseHas('kendaraans', ['id' => $order->kendaraan_id, 'status' => 'tersedia']);
    }

    public function test_store_pickup_duplikat_ditolak(): void
    {
        $order = $this->createOrder();

        $this->buatDraft($order)->assertStatus(201);
        $this->buatDraft($order)->assertStatus(422);

        $this->assertSame(1, InspeksiKendaraan::where('order_id', $order->id)->where('jenis', 'pickup')->count());
    }

    public function test_kirim_kendaraan_mengaktifkan_order_dan_mencatat_operator(): void
    {
        Storage::fake('public');

        $order = $this->createOrder();
        $draft = $this->buatDraft($order)->json();

        // Simulasi klaim task pickup oleh petugas (claimTask).
        $order->update([
            'operator_id' => $this->petugas->id,
            'waktu_klaim' => now()->subMinutes(5),
        ]);

        $response = $this->actingAs($this->petugas)->postJson("/api/orders/{$order->id}/kirim", $this->payloadKirim($draft['id']));

        $response->assertStatus(200);
        $response->assertJson(['jenis' => 'pickup', 'status' => 'final', 'order_id' => $order->id]);

        $this->assertDatabaseHas('orders', [
            'id' => $order->id,
            'status_order' => 'active',
            'status_pengiriman' => 'dalam_penyewaan',
            'operator_id' => $this->petugas->id,
        ]);
        // Klaim pickup sudah dieksekusi: jam klaim dikosongkan supaya
        // OrderCheckClaimTimeout tidak melepas operator di tengah sewa.
        $this->assertDatabaseHas('orders', ['id' => $order->id, 'waktu_klaim' => null]);
        $this->assertDatabaseHas('kendaraans', ['id' => $order->kendaraan_id, 'status' => 'disewa']);
        $this->assertDatabaseHas('inspeksi_kendaraans', [
            'id' => $draft['id'],
            'status' => 'final',
            'odometer' => 45000,
            'fuel_level' => 'full',
        ]);
    }

    public function test_kirim_tanpa_draft_ditolak(): void
    {
        Storage::fake('public');

        $order = $this->createOrder();

        $response = $this->actingAs($this->petugas)->postJson("/api/orders/{$order->id}/kirim", [
            'ttd_customer' => UploadedFile::fake()->image('ttd-customer.png'),
            'ttd_petugas' => UploadedFile::fake()->image('ttd-petugas.png'),
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors('inspeksi_id');
        $this->assertDatabaseHas('orders', ['id' => $order->id, 'status_order' => 'confirmed']);
    }

    public function test_kirim_draft_petugas_lain_ditolak(): void
    {
        Storage::fake('public');

        $order = $this->createOrder();
        $draft = $this->buatDraft($order)->json();
        $petugasLain = User::create([
            'name' => 'Petugas Lain',
            'email' => 'petugas2@test.com',
            'phone' => '6281234567891',
            'password' => 'password',
            'role' => 'petugas',
        ]);

        $response = $this->actingAs($petugasLain)->postJson("/api/orders/{$order->id}/kirim", $this->payloadKirim($draft['id']));

        $response->assertStatus(422);
        $response->assertJsonValidationErrors('inspeksi_id');
        $this->assertDatabaseHas('orders', ['id' => $order->id, 'status_order' => 'confirmed']);
    }

    public function test_kirim_memakai_ttd_tersimpan_di_draft(): void
    {
        Storage::fake('public');

        $order = $this->createOrder();
        $draft = $this->buatDraft($order, [
            'ttd_customer' => UploadedFile::fake()->image('ttd-customer.png'),
            'ttd_petugas' => UploadedFile::fake()->image('ttd-petugas.png'),
        ])->json();

        $response = $this->actingAs($this->petugas)->postJson("/api/orders/{$order->id}/kirim", [
            'inspeksi_id' => $draft['id'],
        ]);

        $response->assertStatus(200);
        $this->assertStringStartsWith('inspeksi/ttd/', $response->json('ttd_customer'));
        $this->assertStringStartsWith('inspeksi/ttd/', $response->json('ttd_petugas'));
    }

    public function test_kirim_tanpa_ttd_efektif_ditolak(): void
    {
        Storage::fake('public');

        $order = $this->createOrder();
        $draft = $this->buatDraft($order)->json();

        $response = $this->actingAs($this->petugas)->postJson("/api/orders/{$order->id}/kirim", [
            'inspeksi_id' => $draft['id'],
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors('ttd_customer');
        $this->assertDatabaseHas('orders', ['id' => $order->id, 'status_order' => 'confirmed']);
    }

    public function test_edit_draft_petugas_lain_ditolak(): void
    {
        Storage::fake('public');

        $order = $this->createOrder();
        $draft = $this->buatDraft($order)->json();
        $petugasLain = User::create([
            'name' => 'Petugas Lain',
            'email' => 'petugas2@test.com',
            'phone' => '6281234567891',
            'password' => 'password',
            'role' => 'petugas',
        ]);

        $response = $this->actingAs($petugasLain)->putJson("/api/inspeksi-kendaraans/{$draft['id']}", [
            'catatan' => 'diubah orang lain',
        ]);

        $response->assertStatus(403);
    }

    public function test_inspeksi_final_tidak_bisa_diedit(): void
    {
        Storage::fake('public');

        $order = $this->createOrder();
        $draft = $this->buatDraft($order)->json();
        $this->actingAs($this->petugas)->postJson("/api/orders/{$order->id}/kirim", $this->payloadKirim($draft['id']));

        $response = $this->actingAs($this->petugas)->putJson("/api/inspeksi-kendaraans/{$draft['id']}", [
            'catatan' => 'korupsi data final',
        ]);

        $response->assertStatus(403);
        $this->assertSame('Kendaraan bersih, tanpa baret.', InspeksiKendaraan::find($draft['id'])->deskripsi_kondisi);
    }

    public function test_kirim_menerima_level_bbm_per_8(): void
    {
        Storage::fake('public');

        $order = $this->createOrder();
        $draft = $this->buatDraft($order, [
            'fuel_level' => '3/8',
        ])->json();

        $this->actingAs($this->petugas)->postJson("/api/orders/{$order->id}/kirim", $this->payloadKirim($draft['id']));

        $this->assertDatabaseHas('inspeksi_kendaraans', [
            'id' => $draft['id'],
            'status' => 'final',
            'fuel_level' => '3/8',
        ]);
    }

    public function test_kembali_mencatat_inspeksi_return_dan_status_dikembalikan(): void
    {
        Storage::fake('public');

        $order = $this->createOrder(['status_order' => 'active']);

        $response = $this->actingAs($this->petugas)->postJson("/api/orders/{$order->id}/kembali", $this->payloadInspeksi([
            'biaya_kerusakan' => 150000,
            'ada_damagenya' => true,
        ]));

        $response->assertStatus(201);
        $this->assertDatabaseHas('orders', [
            'id' => $order->id,
            'status_pengiriman' => 'sudah_dikembalikan',
            'status_order' => 'active',
        ]);
        $this->assertDatabaseHas('inspeksi_kendaraans', [
            'order_id' => $order->id,
            'jenis' => 'return',
            'biaya_kerusakan' => 150000,
            'ada_damagenya' => 1,
        ]);
    }

    public function test_order_tidak_bisa_ditutup_tanpa_inspeksi_return(): void
    {
        Storage::fake('public');

        $order = $this->createOrder(['status_order' => 'active', 'status_pembayaran' => 'paid']);

        $response = $this->actingAs($this->admin)->putJson("/api/orders/{$order->id}", [
            'status_order' => 'completed',
            'status_pembayaran' => 'paid',
            'bukti_pengembalian' => UploadedFile::fake()->image('pengembalian.jpg'),
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors('status_order');
        $this->assertDatabaseHas('orders', ['id' => $order->id, 'status_order' => 'active']);
    }

    public function test_order_ditutup_setelah_inspeksi_return_memakai_biaya_kerusakan(): void
    {
        Storage::fake('public');

        $order = $this->createOrder([
            'tanggal_mulai' => now()->toDateString(),
            'tanggal_selesai' => now()->addDays(2)->toDateString(),
        ]);

        $draft = $this->buatDraft($order)->json();
        $this->actingAs($this->petugas)->postJson("/api/orders/{$order->id}/kirim", $this->payloadKirim($draft['id']));
        $this->actingAs($this->petugas)->postJson("/api/orders/{$order->id}/kembali", $this->payloadInspeksi([
            'biaya_kerusakan' => 100000,
        ]));

        $totalFinal = 1000000 + 100000;
        $response = $this->actingAs($this->admin)->putJson("/api/orders/{$order->id}", [
            'status_order' => 'completed',
            'status_pembayaran' => 'paid',
            'jumlah_bayar' => $totalFinal,
            'bukti_pengembalian' => UploadedFile::fake()->image('pengembalian.jpg'),
        ]);

        $response->assertOk();
        $this->assertDatabaseHas('orders', [
            'id' => $order->id,
            'status_order' => 'completed',
            'biaya_kerusakan' => 100000,
        ]);
    }

    public function test_store_return_tanpa_ttd_ditolak(): void
    {
        Storage::fake('public');

        $order = $this->createOrder(['status_order' => 'active']);

        $response = $this->actingAs($this->petugas)->postJson('/api/inspeksi-kendaraans', $this->payloadInspeksi([
            'order_id' => $order->id,
            'jenis' => 'return',
            'ttd_customer' => null,
            'ttd_petugas' => null,
        ]));

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['ttd_customer', 'ttd_petugas']);
        $this->assertDatabaseMissing('inspeksi_kendaraans', [
            'order_id' => $order->id,
            'jenis' => 'return',
        ]);
    }

    public function test_store_return_dengan_ttd_diperbolehkan(): void
    {
        Storage::fake('public');

        $order = $this->createOrder(['status_order' => 'active']);

        $response = $this->actingAs($this->petugas)->postJson('/api/inspeksi-kendaraans', $this->payloadInspeksi([
            'order_id' => $order->id,
            'jenis' => 'return',
        ]));

        $response->assertStatus(201);
        $response->assertJson(['jenis' => 'return', 'order_id' => $order->id]);
        $this->assertDatabaseHas('inspeksi_kendaraans', [
            'order_id' => $order->id,
            'jenis' => 'return',
        ]);
    }

    public function test_admin_perbaiki_ttd_inspeksi_return_final(): void
    {
        Storage::fake('public');

        $order = $this->createOrder(['status_order' => 'active']);
        $inspeksi = $this->actingAs($this->petugas)->postJson("/api/orders/{$order->id}/kembali", $this->payloadInspeksi())->json();

        $oldTtd = $inspeksi['ttd_customer'];
        $response = $this->actingAs($this->admin)->postJson("/api/inspeksi-kendaraans/{$inspeksi['id']}/perbaiki-ttd", [
            'ttd_customer' => UploadedFile::fake()->image('ttd-baru.png'),
        ]);

        $response->assertOk();
        $this->assertNotSame($oldTtd, $response->json('ttd_customer'));
        $this->assertStringStartsWith('inspeksi/ttd/', $response->json('ttd_customer'));
        $this->assertSame($inspeksi['ttd_petugas'], $response->json('ttd_petugas'));
        $this->assertSame($inspeksi['deskripsi_kondisi'], $response->json('deskripsi_kondisi'));
        $this->assertSame($inspeksi['odometer'], $response->json('odometer'));
    }

    public function test_petugas_tidak_bisa_perbaiki_ttd(): void
    {
        Storage::fake('public');

        $order = $this->createOrder(['status_order' => 'active']);
        $inspeksi = $this->actingAs($this->petugas)->postJson("/api/orders/{$order->id}/kembali", $this->payloadInspeksi())->json();

        $response = $this->actingAs($this->petugas)->postJson("/api/inspeksi-kendaraans/{$inspeksi['id']}/perbaiki-ttd", [
            'ttd_customer' => UploadedFile::fake()->image('ttd-baru.png'),
        ]);

        $response->assertStatus(403);
    }
}
