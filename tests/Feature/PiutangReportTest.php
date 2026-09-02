<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\Kendaraan;
use App\Models\Order;
use App\Models\Pembayaran;
use App\Models\User;
use App\Services\ReportService;
use Illuminate\Foundation\Testing\WithFaker;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class PiutangReportTest extends TestCase
{
    use WithFaker;

    private User $admin;

    private Customer $customer;

    private Kendaraan $kendaraan;

    protected function setUp(): void
    {
        parent::setUp();

        Schema::dropIfExists('whatsapp_logs');
        Schema::dropIfExists('supir_calos');
        Schema::dropIfExists('settings');
        Schema::dropIfExists('garasi_requests');
        Schema::dropIfExists('pembayarans');
        Schema::dropIfExists('orders');
        Schema::dropIfExists('kendaraans');
        Schema::dropIfExists('kategoris');
        Schema::dropIfExists('garasi_partners');
        Schema::dropIfExists('customers');
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
        Schema::create('kategoris', function ($t) {
            $t->id();
            $t->string('nama_kategori');
            $t->string('slug')->nullable();
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

    private function buatOrder(array $overrides = []): Order
    {
        return Order::create(array_merge([
            'kode_order' => 'ORD-'.random_int(1000, 9999),
            'customer_id' => $this->customer->id,
            'kendaraan_id' => $this->kendaraan->id,
            'admin_id' => $this->admin->id,
            'tanggal_mulai' => '2026-01-01',
            'tanggal_selesai' => '2026-01-02',
            'durasi_hari' => 1,
            'harga_per_hari' => 1000000,
            'harga_total' => 1000000,
            'status_order' => 'completed',
            'status_pembayaran' => 'unpaid',
        ], $overrides));
    }

    public function test_piutang_aging_dihitung_dari_tanggal_pengembalian_aktual(): void
    {
        $this->buatOrder([
            'kode_order' => 'ORD-SLAMAT',
            'harga_total' => 2000000,
            'harga_per_hari' => 2000000,
            'tanggal_pengembalian_aktual' => Carbon::now()->subDays(40),
        ]);

        $orderPartial = $this->buatOrder([
            'kode_order' => 'ORD-BARU',
            'harga_total' => 1000000,
            'status_pembayaran' => 'partial',
            'tanggal_pengembalian_aktual' => Carbon::now(),
        ]);
        Pembayaran::create([
            'order_id' => $orderPartial->id,
            'admin_id' => $this->admin->id,
            'jumlah' => 400000,
            'metode_pembayaran' => 'transfer',
            'status' => 'dp',
        ]);

        $this->buatOrder([
            'kode_order' => 'ORD-AKTIF',
            'harga_total' => 800000,
            'status_order' => 'active',
        ]);

        $this->buatOrder([
            'kode_order' => 'ORD-LUNAS',
            'harga_total' => 500000,
            'status_pembayaran' => 'paid',
        ]);

        $response = $this->actingAs($this->admin)->getJson('/api/laporan/piutang');

        $response->assertOk();

        $rows = collect(data_get($response->json(), 'data.data'));
        $this->assertCount(3, $rows);

        $this->assertSame('31_60_hari', $rows->firstWhere('kode_order', 'ORD-SLAMAT')['aging']);
        $this->assertSame(40, $rows->firstWhere('kode_order', 'ORD-SLAMAT')['hari_tertunggak']);
        $this->assertSame(Carbon::now()->subDays(40)->toDateString(), $rows->firstWhere('kode_order', 'ORD-SLAMAT')['tanggal_pengembalian']);

        $baru = $rows->firstWhere('kode_order', 'ORD-BARU');
        $this->assertSame('belum_tertunggak', $baru['aging']);
        $this->assertEquals(600000, $baru['sisa_pembayaran']);

        $aktif = $rows->firstWhere('kode_order', 'ORD-AKTIF');
        $this->assertSame('belum_tertunggak', $aktif['aging']);
        $this->assertNull($rows->firstWhere('kode_order', 'ORD-LUNAS'));

        $ringkasan = data_get($response->json(), 'data.ringkasan');
        $this->assertEquals(2000000, $ringkasan['total_tertunggak']);
        $this->assertSame(2, $ringkasan['aging_buckets']['belum_tertunggak']['count']);
        $this->assertEquals(1400000, $ringkasan['aging_buckets']['belum_tertunggak']['total']);
    }

    public function test_sections_piutang_tidak_memakai_jatuh_tempo(): void
    {
        $this->buatOrder(['kode_order' => 'ORD-SEC', 'harga_total' => 900000]);

        $service = new ReportService('2026-01-01', '2026-12-31');
        $sections = $service->sectionsPiutang();

        $detail = collect($sections)->firstWhere('title', 'Detail Piutang');
        $this->assertNotContains('Jatuh Tempo', $detail['headers']);
        $this->assertContains('Tgl Kembali', $detail['headers']);

        $aging = collect($sections)->firstWhere('title', 'Aging Buckets');
        $this->assertContains('Belum Tertunggak', array_column($aging['rows'], 0));
    }

    public function test_api_order_create_mengabaikan_tanggal_jatuh_tempo(): void
    {
        Storage::fake('public');

        $response = $this->actingAs($this->admin)->postJson('/api/orders', [
            'customer_id' => $this->customer->id,
            'customer_no_hp' => '6281234567890',
            'customer_alamat' => 'Jakarta',
            'customer_no_sim' => 'SIM123',
            'kendaraan_id' => $this->kendaraan->id,
            'tanggal_mulai' => '2026-12-01',
            'tanggal_selesai' => '2026-12-04',
            'tujuan' => 'Bandung',
            'status_pembayaran' => 'partial',
            'metode_pembayaran' => 'transfer',
            'jumlah_bayar' => 750000,
            'tanggal_jatuh_tempo' => '2026-12-20',
        ]);

        $response->assertStatus(201);
        $order = Order::where('customer_id', $this->customer->id)->first();
        $this->assertNotNull($order);
        $this->assertSame('partial', $order->status_pembayaran);
    }
}
