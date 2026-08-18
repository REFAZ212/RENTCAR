<?php

namespace Tests\Feature;

use App\Console\Commands\OrderCancelNoPickup;
use App\Console\Commands\OrderExpirePending;
use App\Console\Commands\OrderReminderH1;
use App\Console\Commands\OrderReminderPayment;
use App\Console\Commands\OrderReminderVerifikasi;
use App\Console\Commands\OrderVerifyOverdue;
use App\Jobs\SendWhatsAppMessage;
use App\Models\Customer;
use App\Models\GarasiPartner;
use App\Models\InspeksiKendaraan;
use App\Models\Kendaraan;
use App\Models\Notification;
use App\Models\Order;
use App\Models\Pembayaran;
use App\Models\Setting;
use App\Models\User;
use App\Models\WhatsappLog;
use App\Services\WhatsAppService;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class OrderSchedulerCommandTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        Schema::dropIfExists('whatsapp_logs');
        Schema::dropIfExists('notifications');
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
            $t->decimal('komisi_calo', 12, 2)->nullable();
            $t->decimal('denda_overtime', 14, 2)->default(0);
            $t->integer('jam_overtime')->default(0);
            $t->timestamp('tanggal_pengembalian_aktual')->nullable();
            $t->timestamp('waktu_perlu_verifikasi')->nullable();
            $t->text('alasan_pembatalan')->nullable();
            $t->date('tanggal_jatuh_tempo')->nullable();
            $t->decimal('biaya_pembatalan', 14, 2)->nullable();
            $t->decimal('total_refund', 14, 2)->nullable();
            $t->timestamps();
            $t->softDeletes();
        });
        Schema::create('settings', function ($t) {
            $t->id();
            $t->string('key')->unique();
            $t->text('value')->nullable();
            $t->timestamps();
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
        Schema::create('notifications', function ($t) {
            $t->id();
            $t->string('type');
            $t->string('title');
            $t->text('message');
            $t->json('data')->nullable();
            $t->timestamp('read_at')->nullable();
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

    private function makeOrder(array $overrides = []): Order
    {
        return Order::create(array_merge([
            'kode_order' => 'ORD-'.strtoupper(uniqid()),
            'source' => 'katalog',
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
            'jam_mulai' => '08:00',
            'jam_selesai' => '17:00',
        ], $overrides));
    }

    public function test_expired_pending_order_is_cancelled(): void
    {
        Queue::fake();

        $order = $this->makeOrder([
            'tanggal_mulai' => now()->subDays(2)->toDateString(),
            'jam_mulai' => '08:00',
        ]);

        $this->artisan(OrderExpirePending::class)->assertSuccessful();

        $fresh = $order->fresh();
        $this->assertSame('cancelled', $fresh->status_order);
        $this->assertSame('selesai', $fresh->status_pengiriman);
        $this->assertSame(0.0, (float) $fresh->biaya_pembatalan);
        $this->assertNull($fresh->total_refund);
        $this->assertNotNull($fresh->alasan_pembatalan);
        $this->assertSame(1, Notification::where('type', 'order_expired')->count());
        $this->assertSame(1, WhatsappLog::where('order_id', $order->id)->where('type', 'order_dibatalkan')->count());
    }

    public function test_expired_pending_order_with_dp_gets_full_refund(): void
    {
        Queue::fake();

        $order = $this->makeOrder([
            'tanggal_mulai' => now()->subDays(2)->toDateString(),
            'jam_mulai' => '08:00',
            'status_pembayaran' => 'partial',
            'metode_pembayaran' => 'transfer',
        ]);
        Pembayaran::create([
            'order_id' => $order->id,
            'admin_id' => $this->admin->id,
            'jumlah' => 200000,
            'metode_pembayaran' => 'transfer',
            'status' => 'dp',
        ]);

        $this->artisan(OrderExpirePending::class)->assertSuccessful();

        $fresh = $order->fresh();
        $this->assertSame('cancelled', $fresh->status_order);
        $this->assertSame('selesai', $fresh->status_pengiriman);
        $this->assertSame(0.0, (float) $fresh->biaya_pembatalan);
        $this->assertEquals(200000, (float) $fresh->total_refund);

        $refunds = $fresh->pembayarans()->where('status', 'refund')->get();
        $this->assertCount(1, $refunds);
        $this->assertEquals(200000, (float) $refunds->first()->jumlah);

        $waLog = WhatsappLog::where('order_id', $order->id)->where('type', 'order_dibatalkan')->first();
        $this->assertNotNull($waLog);
        $this->assertStringContainsString('refund', strtolower($waLog->pesan));
    }

    public function test_expired_pending_order_with_full_payment_gets_full_refund(): void
    {
        Queue::fake();

        $order = $this->makeOrder([
            'tanggal_mulai' => now()->subDays(2)->toDateString(),
            'jam_mulai' => '08:00',
            'status_pembayaran' => 'paid',
            'metode_pembayaran' => 'cash',
        ]);
        Pembayaran::create([
            'order_id' => $order->id,
            'admin_id' => $this->admin->id,
            'jumlah' => 1000000,
            'metode_pembayaran' => 'cash',
            'status' => 'pelunasan',
        ]);

        $this->artisan(OrderExpirePending::class)->assertSuccessful();

        $fresh = $order->fresh();
        $this->assertSame('cancelled', $fresh->status_order);
        $this->assertEquals(1000000, (float) $fresh->total_refund);

        $refunds = $fresh->pembayarans()->where('status', 'refund')->get();
        $this->assertCount(1, $refunds);
        $this->assertEquals(1000000, (float) $refunds->first()->jumlah);
    }

    public function test_future_pending_order_is_kept(): void
    {
        $order = $this->makeOrder([
            'tanggal_mulai' => now()->addDays(5)->toDateString(),
        ]);

        $this->artisan(OrderExpirePending::class)->assertSuccessful();

        $this->assertSame('pending', $order->fresh()->status_order);
    }

    public function test_non_pending_orders_are_untouched(): void
    {
        $confirmed = $this->makeOrder([
            'tanggal_mulai' => now()->subDays(2)->toDateString(),
            'status_order' => 'confirmed',
        ]);

        $this->artisan(OrderExpirePending::class)->assertSuccessful();

        $this->assertSame('confirmed', $confirmed->fresh()->status_order);
    }

    public function test_custom_expire_hours_setting_is_respected(): void
    {
        Setting::set('pending_expire_hours', 72);

        $order = $this->makeOrder([
            'tanggal_mulai' => now()->subDays(2)->toDateString(),
        ]);

        $this->artisan(OrderExpirePending::class)->assertSuccessful();

        $this->assertSame('pending', $order->fresh()->status_order);
    }

    public function test_confirmed_order_not_picked_up_is_cancelled_with_dp_forfeited(): void
    {
        Queue::fake();

        $order = $this->makeOrder([
            'tanggal_mulai' => now()->subDays(2)->toDateString(),
            'jam_mulai' => '08:00',
            'status_order' => 'confirmed',
            'status_pembayaran' => 'partial',
            'metode_pembayaran' => 'cash',
        ]);
        Pembayaran::create([
            'order_id' => $order->id,
            'admin_id' => $this->admin->id,
            'jumlah' => 200000,
            'metode_pembayaran' => 'cash',
            'status' => 'dp',
        ]);

        $this->artisan(OrderCancelNoPickup::class)->assertSuccessful();

        $fresh = $order->fresh();
        $this->assertSame('cancelled', $fresh->status_order);
        $this->assertSame('selesai', $fresh->status_pengiriman);
        // Jadwal sudah lewat → biaya pembatalan 100% dari harga total (sama
        // dengan pembatalan manual). DP hangus — tidak ada refund.
        $this->assertEquals(1000000, (float) $fresh->biaya_pembatalan);
        $this->assertNull($fresh->total_refund);
        $this->assertCount(0, $fresh->pembayarans()->where('status', 'refund')->get());
        $this->assertSame(1, Notification::where('type', 'order_no_pickup_cancelled')->count());

        $waLog = WhatsappLog::where('order_id', $order->id)->where('type', 'order_dibatalkan')->first();
        $this->assertNotNull($waLog);
        $this->assertStringContainsString('HANGUS', $waLog->pesan);
    }

    public function test_confirmed_order_not_picked_up_unpaid_notifies_customer(): void
    {
        Queue::fake();

        $order = $this->makeOrder([
            'tanggal_mulai' => now()->subDays(2)->toDateString(),
            'jam_mulai' => '08:00',
            'status_order' => 'confirmed',
        ]);

        $this->artisan(OrderCancelNoPickup::class)->assertSuccessful();

        $this->assertSame('cancelled', $order->fresh()->status_order);
        $this->assertSame(1, WhatsappLog::where('order_id', $order->id)->where('type', 'order_dibatalkan')->count());
    }

    public function test_confirmed_order_before_expire_time_is_kept(): void
    {
        $order = $this->makeOrder([
            'tanggal_mulai' => now()->addDays(1)->toDateString(),
            'status_order' => 'confirmed',
        ]);

        $this->artisan(OrderCancelNoPickup::class)->assertSuccessful();

        $this->assertSame('confirmed', $order->fresh()->status_order);
    }

    public function test_no_pickup_custom_expire_hours_setting_is_respected(): void
    {
        Setting::set('confirmed_no_pickup_expire_hours', 72);

        $order = $this->makeOrder([
            'tanggal_mulai' => now()->subDays(2)->toDateString(),
            'status_order' => 'confirmed',
        ]);

        $this->artisan(OrderCancelNoPickup::class)->assertSuccessful();

        $this->assertSame('confirmed', $order->fresh()->status_order);
    }

    public function test_no_pickup_cancel_skips_active_and_pending_orders(): void
    {
        $active = $this->makeOrder([
            'tanggal_mulai' => now()->subDays(2)->toDateString(),
            'status_order' => 'active',
        ]);
        $pending = $this->makeOrder([
            'tanggal_mulai' => now()->subDays(2)->toDateString(),
            'status_order' => 'pending',
        ]);

        $this->artisan(OrderCancelNoPickup::class)->assertSuccessful();

        $this->assertSame('active', $active->fresh()->status_order);
        $this->assertSame('pending', $pending->fresh()->status_order);
    }

    public function test_reminder_is_sent_to_unpaid_customer(): void
    {
        Queue::fake();

        $order = $this->makeOrder([
            'status_order' => 'active',
            'status_pembayaran' => 'unpaid',
        ]);

        $this->artisan(OrderReminderPayment::class)->assertSuccessful();

        $this->assertSame(1, Notification::where('type', 'reminder_pembayaran')->count());
        $this->assertSame(1, WhatsappLog::where('order_id', $order->id)->where('type', 'reminder_pembayaran')->count());
    }

    public function test_reminder_is_not_sent_twice_on_same_day(): void
    {
        Queue::fake();

        $order = $this->makeOrder([
            'status_order' => 'active',
            'status_pembayaran' => 'unpaid',
        ]);

        $this->artisan(OrderReminderPayment::class)->assertSuccessful();
        $this->artisan(OrderReminderPayment::class)->assertSuccessful();

        $this->assertSame(1, Notification::where('type', 'reminder_pembayaran')->count());
        $this->assertSame(1, WhatsappLog::where('order_id', $order->id)->where('type', 'reminder_pembayaran')->count());
    }

    public function test_reminder_skips_paid_order(): void
    {
        Queue::fake();

        $this->makeOrder([
            'status_order' => 'active',
            'status_pembayaran' => 'paid',
        ]);

        $this->artisan(OrderReminderPayment::class)->assertSuccessful();

        $this->assertSame(0, Notification::where('type', 'reminder_pembayaran')->count());
    }

    public function test_reminder_respects_disabled_setting(): void
    {
        Queue::fake();
        Setting::set('notif_pengingat_bayar', '0');

        $this->makeOrder([
            'status_order' => 'active',
            'status_pembayaran' => 'unpaid',
        ]);

        $this->artisan(OrderReminderPayment::class)->assertSuccessful();

        $this->assertSame(0, Notification::where('type', 'reminder_pembayaran')->count());
    }

    public function test_overdue_active_order_becomes_perlu_verifikasi_with_frozen_denda(): void
    {
        Queue::fake();
        Setting::set('auto_verify_after_hours', 1);

        $this->kendaraan->update(['status' => 'disewa']);
        $order = $this->makeOrder([
            'status_order' => 'active',
            'tanggal_mulai' => now()->subDays(3)->toDateString(),
            'tanggal_selesai' => now()->subDay()->toDateString(),
            'durasi_hari' => 2,
            'jam_selesai' => '10:00',
        ]);

        $this->artisan(OrderVerifyOverdue::class)->assertSuccessful();

        $fresh = $order->fresh();
        $this->assertSame('perlu_verifikasi', $fresh->status_order);
        $this->assertNotNull($fresh->waktu_perlu_verifikasi);
        $this->assertGreaterThan(0, (int) $fresh->jam_overtime);
        // Denda dibekukan: accessor mengembalikan nilai tersimpan, bukan hitung ulang.
        $this->assertSame((int) $fresh->jam_overtime, $fresh->jam_overtime_saat_ini);
        // Kendaraan tetap terkunci â€” belum dilepas ke tersedia.
        $this->assertSame('disewa', $this->kendaraan->fresh()->status);
        $this->assertSame(1, Notification::where('type', 'perlu_verifikasi')->count());
        $this->assertSame(1, WhatsappLog::where('order_id', $order->id)->where('type', 'perlu_verifikasi_freeze')->count());
    }

    public function test_overdue_within_grace_is_not_verified(): void
    {
        Queue::fake();
        Setting::set('auto_verify_after_hours', 100000);

        $order = $this->makeOrder([
            'status_order' => 'active',
            'tanggal_mulai' => now()->subDays(3)->toDateString(),
            'jam_selesai' => '00:00',
        ]);

        $this->artisan(OrderVerifyOverdue::class)->assertSuccessful();

        $this->assertSame('active', $order->fresh()->status_order);
        $this->assertSame(0, Notification::where('type', 'perlu_verifikasi')->count());
    }

    public function test_auto_verify_respects_disabled_setting(): void
    {
        Queue::fake();
        Setting::set('auto_verify_enabled', '0');
        Setting::set('auto_verify_after_hours', 1);

        $order = $this->makeOrder([
            'status_order' => 'active',
            'tanggal_mulai' => now()->subDays(3)->toDateString(),
            'jam_selesai' => '00:00',
        ]);

        $this->artisan(OrderVerifyOverdue::class)->assertSuccessful();

        $this->assertSame('active', $order->fresh()->status_order);
    }

    public function test_auto_complete_completes_stuck_verification(): void
    {
        Queue::fake();
        Setting::set('auto_complete_after_hours', 24);

        $order = $this->makeOrder([
            'status_order' => 'perlu_verifikasi',
            'waktu_perlu_verifikasi' => now()->subHours(30),
        ]);

        $this->artisan(OrderVerifyOverdue::class)->assertSuccessful();

        $fresh = $order->fresh();
        $this->assertSame('completed', $fresh->status_order);
        $this->assertSame('selesai', $fresh->status_pengiriman);
        $this->assertNull($fresh->waktu_perlu_verifikasi);
        $this->assertNotNull($fresh->tanggal_pengembalian_aktual);
        // Kendaraan dilepas kembali ke tersedia setelah auto-complete.
        $this->assertSame('tersedia', $this->kendaraan->fresh()->status);
        $this->assertSame(1, Notification::where('type', 'auto_completed')->count());
    }

    public function test_auto_complete_respects_disabled_setting(): void
    {
        Queue::fake();
        Setting::set('auto_complete_enabled', '0');
        Setting::set('auto_complete_after_hours', '1');

        $order = $this->makeOrder([
            'status_order' => 'perlu_verifikasi',
            'waktu_perlu_verifikasi' => now()->subHours(30),
        ]);

        $this->artisan(OrderVerifyOverdue::class)->assertSuccessful();

        $this->assertSame('perlu_verifikasi', $order->fresh()->status_order);
        $this->assertSame(0, Notification::where('type', 'auto_completed')->count());
    }

    private function createInspeksiTable(): void
    {
        Schema::create('inspeksi_kendaraans', function ($t) {
            $t->id();
            $t->foreignId('order_id');
            $t->string('jenis');
            $t->string('status')->default('final');
            $t->string('ttd_customer')->nullable();
            $t->string('ttd_petugas')->nullable();
            $t->timestamps();
        });
    }

    private function createReturnInspeksi(Order $order, bool $denganTtd = true): InspeksiKendaraan
    {
        return InspeksiKendaraan::create([
            'order_id' => $order->id,
            'jenis' => 'return',
            'status' => 'final',
            'ttd_customer' => $denganTtd ? 'inspeksi/ttd/customer.png' : null,
            'ttd_petugas' => $denganTtd ? 'inspeksi/ttd/petugas.png' : null,
        ]);
    }

    public function test_auto_complete_diblokir_tanpa_inspeksi_return_bertanda_tangan(): void
    {
        Queue::fake();
        Setting::set('auto_complete_after_hours', 24);
        $this->createInspeksiTable();

        $order = $this->makeOrder([
            'status_order' => 'perlu_verifikasi',
            'waktu_perlu_verifikasi' => now()->subHours(30),
        ]);

        $this->artisan(OrderVerifyOverdue::class)->assertSuccessful();

        $fresh = $order->fresh();
        $this->assertSame('perlu_verifikasi', $fresh->status_order);
        $this->assertNotNull($fresh->waktu_perlu_verifikasi);
        $this->assertSame(1, Notification::where('type', 'auto_complete_diblokir')->count());
        $this->assertSame(0, Notification::where('type', 'auto_completed')->count());
    }

    public function test_auto_complete_diblokir_saat_ttd_inspeksi_return_belum_lengkap(): void
    {
        Queue::fake();
        Setting::set('auto_complete_after_hours', 24);
        $this->createInspeksiTable();

        $order = $this->makeOrder([
            'status_order' => 'perlu_verifikasi',
            'waktu_perlu_verifikasi' => now()->subHours(30),
        ]);
        $this->createReturnInspeksi($order, denganTtd: false);

        $this->artisan(OrderVerifyOverdue::class)->assertSuccessful();

        $this->assertSame('perlu_verifikasi', $order->fresh()->status_order);
        $this->assertSame(1, Notification::where('type', 'auto_complete_diblokir')->count());
        $this->assertSame(0, Notification::where('type', 'auto_completed')->count());
    }

    public function test_auto_complete_menghormati_denda_yang_difreeze(): void
    {
        Queue::fake();
        Setting::set('auto_complete_after_hours', 24);
        $this->createInspeksiTable();

        $order = $this->makeOrder([
            'status_order' => 'perlu_verifikasi',
            'waktu_perlu_verifikasi' => now()->subHours(30),
            'jam_overtime' => 20,
            'denda_overtime' => 500000,
        ]);
        $this->createReturnInspeksi($order);

        $this->artisan(OrderVerifyOverdue::class)->assertSuccessful();

        $fresh = $order->fresh();
        $this->assertSame('completed', $fresh->status_order);
        // Janji freeze ditepati: denda tidak dihitung ulang membengkak.
        $this->assertSame(20, (int) $fresh->jam_overtime);
        $this->assertSame(500000.0, (float) $fresh->denda_overtime);
        $this->assertSame(1500000.0, (float) $fresh->harga_total);
        $this->assertSame(1, Notification::where('type', 'auto_completed')->count());
    }

    public function test_reminder_verifikasi_sent_once_per_day(): void
    {
        Queue::fake();

        $order = $this->makeOrder([
            'status_order' => 'perlu_verifikasi',
            'waktu_perlu_verifikasi' => now()->subHours(30),
        ]);

        $this->artisan(OrderReminderVerifikasi::class)->assertSuccessful();
        $this->artisan(OrderReminderVerifikasi::class)->assertSuccessful();

        $this->assertSame(1, Notification::where('type', 'perlu_verifikasi')->count());
        $this->assertSame(1, WhatsappLog::where('order_id', $order->id)->where('type', 'perlu_verifikasi_reminder')->count());
    }

    public function test_reminder_verifikasi_respects_disabled_setting(): void
    {
        Queue::fake();
        Setting::set('notif_perlu_verifikasi', '0');

        $this->makeOrder([
            'status_order' => 'perlu_verifikasi',
            'waktu_perlu_verifikasi' => now()->subHours(30),
        ]);

        $this->artisan(OrderReminderVerifikasi::class)->assertSuccessful();

        $this->assertSame(0, Notification::where('type', 'perlu_verifikasi')->count());
    }

    public function test_perlu_verifikasi_can_transition_manually(): void
    {
        $order = $this->makeOrder(['status_order' => 'perlu_verifikasi']);

        $this->assertTrue($order->canTransitionTo('active'));
        $this->assertTrue($order->canTransitionTo('completed'));
        $this->assertTrue($order->canTransitionTo('cancelled'));
        $this->assertFalse($order->canTransitionTo('pending'));
    }

    public function test_active_cannot_skip_to_verify_then_back_forever(): void
    {
        $active = $this->makeOrder(['status_order' => 'active']);
        $this->assertTrue($active->canTransitionTo('perlu_verifikasi'));

        $pending = $this->makeOrder(['status_order' => 'pending']);
        $this->assertFalse($pending->canTransitionTo('perlu_verifikasi'));
    }

    public function test_async_job_updates_log_to_terkirim_on_gateway_success(): void
    {
        Setting::set('fonnte_token', 'test-token');
        Http::fake([
            'api.fonnte.com/*' => Http::response(['status' => true], 200),
        ]);

        $order = $this->makeOrder(['status_order' => 'confirmed']);

        app(WhatsAppService::class)->kirimPesanAsync('081234567890', 'Pesan uji', 'reminder_pembayaran', $order->id);

        $log = WhatsappLog::where('type', 'reminder_pembayaran')->first();
        $this->assertNotNull($log);
        $this->assertSame('terkirim', $log->status_kirim);
        $this->assertSame(1, WhatsappLog::where('order_id', $order->id)->where('type', 'reminder_pembayaran')->count());
    }

    public function test_async_whatsapp_log_tracks_gateway_failure_honestly(): void
    {
        Setting::set('fonnte_token', 'test-token');
        Http::fake([
            'api.fonnte.com/*' => Http::response(['status' => false], 200),
        ]);

        $order = $this->makeOrder(['status_order' => 'confirmed']);

        app(WhatsAppService::class)->kirimPesanAsync('081234567890', 'Pesan uji', 'reminder_pembayaran', $order->id);

        $log = WhatsappLog::where('type', 'reminder_pembayaran')->first();
        $this->assertNotNull($log);
        $this->assertSame('gagal', $log->status_kirim);
        $this->assertStringContainsString('"status":false', (string) $log->response);
    }

    public function test_async_job_with_missing_log_is_skipped_gracefully(): void
    {
        $job = new SendWhatsAppMessage(999999);
        $job->handle(app(WhatsAppService::class));

        $this->assertSame(0, WhatsappLog::count());
    }

    public function test_reminder_payment_records_single_honest_log_per_order(): void
    {
        Setting::set('fonnte_token', 'test-token');
        Http::fake([
            'api.fonnte.com/*' => Http::response(['status' => true], 200),
        ]);

        $order = $this->makeOrder(['status_order' => 'confirmed', 'status_pembayaran' => 'unpaid']);

        $this->artisan(OrderReminderPayment::class)->assertSuccessful();
        $this->artisan(OrderReminderPayment::class)->assertSuccessful();

        $this->assertSame(1, WhatsappLog::where('order_id', $order->id)->where('type', 'reminder_pembayaran')->count());
        $this->assertSame('terkirim', WhatsappLog::where('order_id', $order->id)->where('type', 'reminder_pembayaran')->first()->status_kirim);
    }

    public function test_reminder_h1_sends_to_orders_due_tomorrow(): void
    {
        Setting::set('fonnte_token', 'test-token');
        Http::fake([
            'api.fonnte.com/*' => Http::response(['status' => true], 200),
        ]);

        $due = $this->makeOrder([
            'status_order' => 'active',
            'tanggal_mulai' => now()->subDay()->toDateString(),
            'tanggal_selesai' => now()->addDay()->toDateString(),
            'durasi_hari' => 2,
            'jam_selesai' => '10:00',
        ]);
        $later = $this->makeOrder([
            'status_order' => 'active',
            'tanggal_mulai' => now()->toDateString(),
            'tanggal_selesai' => now()->addDays(5)->toDateString(),
            'durasi_hari' => 5,
            'jam_selesai' => '10:00',
        ]);

        $this->artisan(OrderReminderH1::class)->assertSuccessful();

        $this->assertSame(1, WhatsappLog::where('order_id', $due->id)->where('type', 'reminder_pengembalian')->count());
        $this->assertSame(0, WhatsappLog::where('order_id', $later->id)->where('type', 'reminder_pengembalian')->count());
    }

    public function test_reminder_h1_not_sent_twice_per_day(): void
    {
        Setting::set('fonnte_token', 'test-token');
        Http::fake([
            'api.fonnte.com/*' => Http::response(['status' => true], 200),
        ]);

        $order = $this->makeOrder([
            'status_order' => 'active',
            'tanggal_mulai' => now()->subDay()->toDateString(),
            'tanggal_selesai' => now()->addDay()->toDateString(),
            'durasi_hari' => 2,
            'jam_selesai' => '10:00',
        ]);

        $this->artisan(OrderReminderH1::class)->assertSuccessful();
        $this->artisan(OrderReminderH1::class)->assertSuccessful();

        $this->assertSame(1, WhatsappLog::where('order_id', $order->id)->where('type', 'reminder_pengembalian')->count());
    }

    public function test_reminder_h1_respects_disabled_setting(): void
    {
        Setting::set('notif_pengingat_kembali', '0');
        Http::fake();

        $this->makeOrder([
            'status_order' => 'active',
            'tanggal_mulai' => now()->subDay()->toDateString(),
            'durasi_hari' => 2,
            'jam_selesai' => '10:00',
        ]);

        $this->artisan(OrderReminderH1::class)->assertSuccessful();

        $this->assertSame(0, WhatsappLog::count());
    }

    public function test_failed_job_marks_queued_log_as_gagal(): void
    {
        Setting::set('fonnte_token', 'test-token');
        Http::fake([
            'api.fonnte.com/*' => Http::throw(),
        ]);

        $order = $this->makeOrder(['status_order' => 'confirmed']);

        app(WhatsAppService::class)->kirimPesanAsync('081234567890', 'Pesan uji', 'reminder_pembayaran', $order->id);

        $log = WhatsappLog::where('type', 'reminder_pembayaran')->first();
        $this->assertNotNull($log);
        $this->assertSame('gagal', $log->status_kirim);
        $this->assertStringContainsString('error', (string) $log->response);
    }

    public function test_update_notifikasi_menyimpan_token_baru(): void
    {
        Setting::set('fonnte_token', 'token-asli-123');
        Setting::set('nomor_wa_owner', '628111111111');

        $this->actingAs($this->admin)->putJson('/api/pengaturan/notifikasi', [
            'fonnte_token' => 'token-baru-456',
            'nomor_wa_owner' => '628222222222',
            'notif_order_selesai' => true,
        ])->assertOk();

        $this->assertSame('token-baru-456', Setting::get('fonnte_token'));
        $this->assertSame('628222222222', Setting::get('nomor_wa_owner'));
    }

    public function test_update_token_ter_mask_tidak_menimpa_token_asli(): void
    {
        Setting::set('fonnte_token', 'token-asli-123456');
        Setting::set('nomor_wa_owner', '628111111111');

        $this->actingAs($this->admin)->putJson('/api/pengaturan/notifikasi', [
            'fonnte_token' => '****-3456',
            'nomor_wa_owner' => '628222222222',
            'notif_order_selesai' => false,
        ])->assertOk();

        $this->assertSame('token-asli-123456', Setting::get('fonnte_token'));
        $this->assertSame('628222222222', Setting::get('nomor_wa_owner'));
    }

    public function test_reminder_h1_in_app_notification_hanya_sekali_per_hari(): void
    {
        Setting::set('notif_pengingat_kembali', '0');
        Http::fake();

        $order = $this->makeOrder([
            'status_order' => 'active',
            'tanggal_mulai' => now()->subDay()->toDateString(),
            'tanggal_selesai' => now()->addDay()->toDateString(),
            'durasi_hari' => 2,
            'jam_selesai' => '10:00',
        ]);

        $this->artisan(OrderReminderH1::class)->assertSuccessful();
        $this->artisan(OrderReminderH1::class)->assertSuccessful();

        $this->assertSame(1, Notification::where('type', 'reminder_pengembalian')->count());
        $this->assertSame(0, WhatsappLog::count());
    }

    public function test_whatsapp_logs_index_hanya_menampilkan_diantri_dan_gagal(): void
    {
        WhatsappLog::create(['type' => 'order_selesai', 'nomor_tujuan' => '081111', 'pesan' => 'A', 'status_kirim' => 'terkirim']);
        WhatsappLog::create(['type' => 'reminder_pembayaran', 'nomor_tujuan' => '081222', 'pesan' => 'B', 'status_kirim' => 'diantri']);
        WhatsappLog::create(['type' => 'reminder_pengembalian', 'nomor_tujuan' => '081333', 'pesan' => 'C', 'status_kirim' => 'gagal']);

        $res = $this->actingAs($this->admin)->getJson('/api/whatsapp-logs')->assertOk();

        $items = collect($res->json('data'));
        $this->assertSame(['diantri', 'gagal'], $items->pluck('status_kirim')->all());
        $this->assertSame(2, $res->json('total'));
    }

    public function test_whatsapp_logs_index_dapat_difilter_status(): void
    {
        WhatsappLog::create(['type' => 'order_selesai', 'nomor_tujuan' => '081111', 'pesan' => 'A', 'status_kirim' => 'terkirim']);
        WhatsappLog::create(['type' => 'reminder_pembayaran', 'nomor_tujuan' => '081222', 'pesan' => 'B', 'status_kirim' => 'gagal']);

        $res = $this->actingAs($this->admin)->getJson('/api/whatsapp-logs?status=terkirim')->assertOk();

        $this->assertSame(1, $res->json('total'));
        $this->assertSame('terkirim', $res->json('data.0.status_kirim'));
    }

    public function test_whatsapp_logs_index_ditolak_tanpa_auth(): void
    {
        $this->getJson('/api/whatsapp-logs')->assertUnauthorized();
    }

    public function test_whatsapp_logs_retry_membuat_log_baru(): void
    {
        Setting::set('fonnte_token', 'test-token');
        Http::fake([
            'api.fonnte.com/*' => Http::response(['status' => true], 200),
        ]);

        $order = $this->makeOrder(['status_order' => 'confirmed']);
        $log = WhatsappLog::create([
            'type' => 'reminder_pembayaran',
            'order_id' => $order->id,
            'nomor_tujuan' => '081234567890',
            'pesan' => 'Pesan asli',
            'status_kirim' => 'gagal',
        ]);

        $this->actingAs($this->admin)->postJson("/api/whatsapp-logs/{$log->id}/retry")->assertOk();

        $new = WhatsappLog::where('id', '!=', $log->id)->first();
        $this->assertNotNull($new);
        $this->assertSame('terkirim', $new->status_kirim);
        $this->assertSame($log->nomor_tujuan, $new->nomor_tujuan);
        $this->assertSame('gagal', $log->fresh()->status_kirim);
    }

    public function test_whatsapp_logs_retry_ditolak_untuk_log_terkirim(): void
    {
        $log = WhatsappLog::create([
            'type' => 'order_selesai',
            'nomor_tujuan' => '081234567890',
            'pesan' => 'Pesan',
            'status_kirim' => 'terkirim',
        ]);

        $this->actingAs($this->admin)->postJson("/api/whatsapp-logs/{$log->id}/retry")->assertStatus(422);

        $this->assertSame(1, WhatsappLog::count());
    }

    public function test_whatsapp_logs_retry_ditolak_untuk_petugas(): void
    {
        $petugas = User::create([
            'name' => 'Petugas 1',
            'email' => 'petugas@test.com',
            'password' => 'password',
            'role' => 'petugas',
        ]);
        $log = WhatsappLog::create([
            'type' => 'reminder_pembayaran',
            'nomor_tujuan' => '081234567890',
            'pesan' => 'Pesan',
            'status_kirim' => 'gagal',
        ]);

        $this->actingAs($petugas)->postJson("/api/whatsapp-logs/{$log->id}/retry")->assertForbidden();

        $this->assertSame(1, WhatsappLog::count());
    }

    public function test_whatsapp_logs_index_ditolak_untuk_petugas(): void
    {
        $petugas = User::create([
            'name' => 'Petugas 1',
            'email' => 'petugas@test.com',
            'password' => 'password',
            'role' => 'petugas',
        ]);
        WhatsappLog::create(['type' => 'reminder_pembayaran', 'nomor_tujuan' => '081222', 'pesan' => 'B', 'status_kirim' => 'gagal']);

        $this->actingAs($petugas)->getJson('/api/whatsapp-logs')->assertForbidden();
    }
}
