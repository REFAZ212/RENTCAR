<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\InspeksiKendaraan;
use App\Models\Kendaraan;
use App\Models\Notification;
use App\Models\Order;
use App\Models\Setting;
use App\Models\SupirCalo;
use App\Models\User;
use App\Models\WhatsappLog;
use App\Services\OrderService;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class WhatsappNotifSupirPetugasTest extends TestCase
{
    private User $admin;

    private User $petugas;

    private Customer $customer;

    private Kendaraan $kendaraan;

    private SupirCalo $supir;

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
        Schema::dropIfExists('supir_calos');
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
        Schema::create('supir_calos', function ($t) {
            $t->id();
            $t->foreignId('user_id')->nullable();
            $t->string('jenis');
            $t->string('nama');
            $t->string('email')->nullable();
            $t->string('password')->nullable();
            $t->boolean('must_change_password')->default(false);
            $t->string('no_hp');
            $t->string('alamat')->nullable();
            $t->string('status')->default('active');
            $t->string('no_sim')->nullable();
            $t->string('foto')->nullable();
            $t->decimal('tarif_per_hari', 12, 2)->nullable();
            $t->decimal('komisi', 12, 2)->nullable();
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
            $t->string('opsi_supir')->nullable();
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
            $t->foreignId('user_id')->nullable();
            $t->string('type')->nullable();
            $t->string('title')->nullable();
            $t->text('message')->nullable();
            $t->text('data')->nullable();
            $t->timestamp('read_at')->nullable();
            $t->timestamps();
        });

        // Default semua toggle notifikasi aktif seperti SettingSeeder.
        Setting::set('notif_task_petugas', '1');
        Setting::set('notif_supir_order_mulai', '1');
        Setting::set('notif_supir_order_selesai', '1');
        Setting::set('notif_pengingat_kembali_supir', '1');
        Setting::set('notif_pengingat_kembali', '1');
        Setting::set('kirim_hasil_inspeksi_ke_customer', '0');
        Setting::set('fonnte_token', 'test-token');

        Http::fake([
            'api.fonnte.com/*' => Http::response(['status' => true], 200),
        ]);

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
        $this->supir = SupirCalo::create([
            'jenis' => 'supir',
            'nama' => 'Andi Kurniawan',
            'no_hp' => '6281234567101',
            'status' => 'active',
            'no_sim' => 'SIM321',
            'tarif_per_hari' => 10000,
        ]);
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
            'status_order' => 'confirmed',
            'status_pembayaran' => 'unpaid',
            'opsi_supir' => 'dengan_supir',
            'supir_id' => $this->supir->id,
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
            'deskripsi_kondisi' => 'Kendaraan bersih.',
            'checklist_serah_terima' => ['kunci', 'stnk', 'kunci_roda', 'dongkrak', 'ban_serep', 'ac'],
            'ttd_customer' => UploadedFile::fake()->image('ttd-customer.png'),
            'ttd_petugas' => UploadedFile::fake()->image('ttd-petugas.png'),
        ], $overrides);
    }

    public function test_broadcast_task_pickup_ke_petugas_bebas_dengan_template(): void
    {
        Setting::set('template_task_petugas', 'TASK {kode_order} | {jenis_task} | {nama_kendaraan} | {nama_customer} | {tanggal} | {opsi_supir}');

        $order = $this->createOrder();
        app(OrderService::class)->kirimNotifTaskOperator($order);

        $log = WhatsappLog::where('type', 'task_inspeksi_petugas')
            ->where('order_id', $order->id)
            ->first();

        $this->assertNotNull($log);
        $this->assertSame($this->petugas->phone, $log->nomor_tujuan);
        $this->assertSame('terkirim', $log->status_kirim);
        $this->assertStringContainsString($order->kode_order, $log->pesan);
        $this->assertStringContainsString('Inspeksi & Penyerahan (Pickup)', $log->pesan);
        $this->assertStringContainsString('Dengan Supir', $log->pesan);

        $this->assertSame(1, Notification::where('user_id', $this->petugas->id)
            ->where('type', 'task_inspeksi_petugas')
            ->where('data->order_id', $order->id)
            ->count());
    }

    public function test_broadcast_task_petugas_skip_petugas_tanpa_nomor(): void
    {
        $petugasTanpaNomor = User::create([
            'name' => 'Petugas Tanpa Nomor',
            'email' => 'tanpa-nomor@test.com',
            'phone' => null,
            'password' => 'password',
            'role' => 'petugas',
        ]);

        $order = $this->createOrder();
        app(OrderService::class)->kirimNotifTaskOperator($order);

        // Petugas tanpa nomor dicatat sebagai gagal dengan alasan jelas,
        // petugas dengan nomor tetap terkirim.
        $this->assertSame(1, WhatsappLog::where('type', 'task_inspeksi_petugas')
            ->where('status_kirim', 'terkirim')
            ->count());
        $this->assertSame(1, WhatsappLog::where('type', 'task_inspeksi_petugas')
            ->where('nomor_tujuan', '')
            ->where('status_kirim', 'gagal')
            ->count());
    }

    public function test_command_task_notify_return_mengirim_broadcast_return(): void
    {
        $order = $this->createOrder([
            'status_order' => 'active',
            'status_pengiriman' => 'dalam_penyewaan',
            'tanggal_selesai' => now()->toDateString(),
            'jam_selesai' => '23:59',
        ]);

        $this->artisan('task:notify-return')->assertSuccessful();

        $log = WhatsappLog::where('type', 'task_inspeksi_return')
            ->where('order_id', $order->id)
            ->first();

        $this->assertNotNull($log);
        $this->assertSame($this->petugas->phone, $log->nomor_tujuan);
        $this->assertStringContainsString('Inspeksi Pengembalian (Return)', $log->pesan);

        // Dedup: sekali sehari — menjalankan ulang tidak menambah log.
        $this->artisan('task:notify-return')->assertSuccessful();
        $this->assertSame(1, WhatsappLog::where('type', 'task_inspeksi_return')
            ->where('order_id', $order->id)
            ->count());
    }

    public function test_command_task_notify_return_skip_batas_jauh_dan_order_berinspeksi(): void
    {
        $jauh = $this->createOrder([
            'status_order' => 'active',
            'status_pengiriman' => 'dalam_penyewaan',
            'tanggal_selesai' => now()->addDays(5)->toDateString(),
        ]);
        InspeksiKendaraan::create([
            'order_id' => $jauh->id,
            'jenis' => 'return',
            'status' => 'final',
            'ttd_customer' => 'inspeksi/ttd/a.png',
            'ttd_petugas' => 'inspeksi/ttd/b.png',
            'admin_id' => $this->petugas->id,
        ]);

        $this->artisan('task:notify-return')->assertSuccessful();

        $this->assertSame(0, WhatsappLog::where('type', 'task_inspeksi_return')->count());
    }

    public function test_kirim_kendaraan_mengirim_wa_supir_order_mulai(): void
    {
        Storage::fake('public');

        $order = $this->createOrder();

        // Simulasi klaim task pickup oleh petugas (endpoint /claim sudah dihapus).
        $order->update([
            'operator_id' => $this->petugas->id,
            'waktu_klaim' => now()->subMinutes(5),
        ]);

        $draft = $this->actingAs($this->petugas)->postJson('/api/inspeksi-kendaraans', $this->payloadInspeksi([
            'order_id' => $order->id,
            'jenis' => 'pickup',
            'ttd_customer' => null,
            'ttd_petugas' => null,
        ]))->assertStatus(201)->json();

        $this->actingAs($this->petugas)->postJson("/api/orders/{$order->id}/kirim", [
            'inspeksi_id' => $draft['id'],
            'ttd_customer' => UploadedFile::fake()->image('ttd-customer.png'),
            'ttd_petugas' => UploadedFile::fake()->image('ttd-petugas.png'),
        ])->assertOk();

        $log = WhatsappLog::where('type', 'supir_order_mulai')
            ->where('order_id', $order->id)
            ->first();

        $this->assertNotNull($log);
        $this->assertSame($this->supir->no_hp, $log->nomor_tujuan);
        $this->assertStringContainsString($order->kode_order, $log->pesan);
        $this->assertStringContainsString('Andi Kurniawan', $log->pesan);
    }

    public function test_reminder_h1_mengirim_wa_ke_supir(): void
    {
        $order = $this->createOrder([
            'status_order' => 'active',
            'status_pengiriman' => 'dalam_penyewaan',
            'tanggal_selesai' => now()->addDay()->toDateString(),
            'jam_selesai' => '10:00',
        ]);

        $this->artisan('order:reminder-h1')->assertSuccessful();

        $log = WhatsappLog::where('type', 'reminder_pengembalian_supir')
            ->where('order_id', $order->id)
            ->first();

        $this->assertNotNull($log);
        $this->assertSame($this->supir->no_hp, $log->nomor_tujuan);
        $this->assertStringContainsString('Andi Kurniawan', $log->pesan);
    }

    public function test_order_selesai_mengirim_wa_ke_supir(): void
    {
        Storage::fake('public');

        $order = $this->createOrder([
            'status_order' => 'active',
            'status_pengiriman' => 'dalam_penyewaan',
            'tanggal_mulai' => now()->toDateString(),
            'tanggal_selesai' => now()->addDays(2)->toDateString(),
        ]);

        $this->actingAs($this->petugas)->postJson("/api/orders/{$order->id}/kembali", $this->payloadInspeksi())->assertStatus(201);

        $this->actingAs($this->admin)->putJson("/api/orders/{$order->id}", [
            'status_order' => 'completed',
            'status_pembayaran' => 'paid',
            'jumlah_bayar' => 2000000,
            'bukti_pengembalian' => UploadedFile::fake()->image('pengembalian.jpg'),
        ])->assertOk();

        $log = WhatsappLog::where('type', 'supir_order_selesai')
            ->where('order_id', $order->id)
            ->first();

        $this->assertNotNull($log);
        $this->assertSame($this->supir->no_hp, $log->nomor_tujuan);
        $this->assertStringContainsString('SELESAI', $log->pesan);
        $this->assertStringContainsString('Rp', $log->pesan);
    }
}
