<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\Kategori;
use App\Models\Kendaraan;
use App\Models\Order;
use App\Models\User;
use App\Services\ReportService;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class ReportServiceTest extends TestCase
{
    private User $admin;

    private Customer $customerX;

    private Customer $customerY;

    private Customer $customerZ;

    private Kendaraan $kendaraanA;

    private Kendaraan $kendaraanB;

    protected function setUp(): void
    {
        parent::setUp();

        Schema::dropIfExists('garasi_requests');
        Schema::dropIfExists('orders');
        Schema::dropIfExists('tipes');
        Schema::dropIfExists('kategoris');
        Schema::dropIfExists('kendaraans');
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
            $t->timestamps();
        });
        Schema::create('tipes', function ($t) {
            $t->id();
            $t->string('nama_tipe');
            $t->timestamps();
        });
        Schema::create('kendaraans', function ($t) {
            $t->id();
            $t->foreignId('garasi_partner_id')->nullable();
            $t->foreignId('kategori_id')->nullable();
            $t->foreignId('tipe_id')->nullable();
            $t->string('nama_kendaraan');
            $t->string('plat_nomor')->unique();
            $t->string('merek')->nullable();
            $t->string('tahun')->nullable();
            $t->string('warna');
            $t->decimal('harga_sewa_per_hari', 12, 2);
            $t->decimal('harga_partner_per_hari', 12, 2)->nullable();
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
            $t->string('status_pengiriman')->nullable();
            $t->decimal('denda_overtime', 14, 2)->default(0);
            $t->integer('jam_overtime')->default(0);
            $t->text('catatan')->nullable();
            $t->timestamps();
            $t->softDeletes();
        });
        Schema::create('garasi_requests', function ($t) {
            $t->id();
            $t->foreignId('order_id');
            $t->foreignId('garasi_partner_id');
            $t->string('status_permintaan')->default('pending');
            $t->timestamps();
            $t->softDeletes();
        });
        Schema::create('inspeksi_kendaraans', function ($t) {
            $t->id();
            $t->foreignId('order_id');
            $t->timestamps();
        });

        $this->admin = User::create([
            'name' => 'Admin Utama',
            'email' => 'admin-report@test.com',
            'password' => 'password',
            'role' => 'admin_utama',
        ]);
        $this->customerX = Customer::create(['nama_lengkap' => 'Customer X', 'no_hp' => '628100000001']);
        $this->customerY = Customer::create(['nama_lengkap' => 'Customer Y', 'no_hp' => '628100000002']);
        $this->customerZ = Customer::create(['nama_lengkap' => 'Customer Z', 'no_hp' => '628100000003']);
        $this->kendaraanA = Kendaraan::create([
            'nama_kendaraan' => 'Toyota Avanza',
            'plat_nomor' => 'B 1000 ABC',
            'warna' => 'Putih',
            'harga_sewa_per_hari' => 500000,
            'status' => 'tersedia',
        ]);
        $this->kendaraanB = Kendaraan::create([
            'nama_kendaraan' => 'Honda Brio',
            'plat_nomor' => 'B 2000 DEF',
            'warna' => 'Merah',
            'harga_sewa_per_hari' => 400000,
            'status' => 'tersedia',
        ]);
    }

    private function createOrder(array $overrides = [], ?string $createdAt = null): Order
    {
        $order = Order::create(array_merge([
            'customer_id' => $this->customerX->id,
            'kendaraan_id' => $this->kendaraanA->id,
            'admin_id' => $this->admin->id,
            'tanggal_mulai' => '2026-08-01',
            'tanggal_selesai' => '2026-08-03',
            'durasi_hari' => 2,
            'harga_per_hari' => 500000,
            'harga_total' => 1000000,
            'status_order' => 'completed',
            'status_pembayaran' => 'unpaid',
            'denda_overtime' => 0,
        ], $overrides));

        if ($createdAt) {
            $order->timestamps = false;
            $order->created_at = $createdAt;
            $order->save();
        }

        return $order;
    }

    public function test_ringkasan_orders_keuangan_hanya_menghitung_completed(): void
    {
        $this->createOrder(['status_order' => 'completed', 'harga_total' => 1000000, 'denda_overtime' => 100000], createdAt: '2026-08-10 10:00:00');
        $this->createOrder(['status_order' => 'pending', 'denda_overtime' => 50000], createdAt: '2026-08-11 10:00:00');
        $this->createOrder(['status_order' => 'cancelled', 'denda_overtime' => 25000], createdAt: '2026-08-12 10:00:00');

        $service = new ReportService('2026-08-01', '2026-08-31');
        $r = $service->ringkasan();

        $this->assertSame(3, $r['total_orders']);
        $this->assertSame(1, $r['completed_orders']);
        $this->assertSame(1000000.0, $r['total_revenue']);
        $this->assertSame(100000.0, $r['total_fines']);
        $this->assertSame(1000000.0, $r['avg_order_value']);
    }

    public function test_kendaraan_terpopuler_hanya_menghitung_kompleted(): void
    {
        $this->createOrder(['kendaraan_id' => $this->kendaraanA->id, 'status_order' => 'completed', 'harga_total' => 1000000], createdAt: '2026-08-10 10:00:00');
        $this->createOrder(['kendaraan_id' => $this->kendaraanB->id, 'status_order' => 'cancelled', 'harga_total' => 500000], createdAt: '2026-08-11 10:00:00');
        $this->createOrder(['kendaraan_id' => $this->kendaraanB->id, 'status_order' => 'cancelled', 'harga_total' => 500000], createdAt: '2026-08-12 10:00:00');

        $service = new ReportService('2026-08-01', '2026-08-31');
        $top = $service->kendaraan()['kendaraan_terpopuler'];

        $this->assertCount(1, $top);
        $this->assertSame($this->kendaraanA->id, $top->first()['kendaraan_id']);
        $this->assertSame(1, $top->first()['order_count']);
        $this->assertSame(1000000.0, (float) $top->first()['total_revenue']);
    }

    public function test_customer_top_menghormati_status_dan_range_tanggal(): void
    {
        $this->createOrder(['customer_id' => $this->customerX->id, 'status_order' => 'completed', 'harga_total' => 2000000], createdAt: '2026-08-10 10:00:00');
        $this->createOrder(['customer_id' => $this->customerY->id, 'status_order' => 'cancelled', 'harga_total' => 3000000], createdAt: '2026-08-11 10:00:00');
        $this->createOrder(['customer_id' => $this->customerZ->id, 'status_order' => 'completed', 'harga_total' => 9999999], createdAt: '2026-09-01 10:00:00');

        $service = new ReportService('2026-08-01', '2026-08-31');
        $top = $service->customer()['customer_top'];

        $this->assertCount(1, $top);
        $this->assertSame($this->customerX->id, $top->first()['customer_id']);
        $this->assertSame(1, $top->first()['order_count']);
        $this->assertSame(2000000.0, (float) $top->first()['total_spend']);
    }

    public function test_order_denda_dan_rata_rata_durasi_hanya_menghitung_kompleted(): void
    {
        $this->createOrder(['status_order' => 'completed', 'denda_overtime' => 100000, 'durasi_hari' => 2], createdAt: '2026-08-10 10:00:00');
        $this->createOrder(['status_order' => 'active', 'denda_overtime' => 50000, 'durasi_hari' => 5], createdAt: '2026-08-11 10:00:00');

        $service = new ReportService('2026-08-01', '2026-08-31');
        $order = $service->order();

        $this->assertSame(2, $order['total_orders']);
        $this->assertSame(100000.0, $order['total_denda']);
        $this->assertSame(2.0, $order['rata_rata_durasi']);
    }

    public function test_detail_order_dapat_difilter_kategori_id(): void
    {
        $kategoriA = Kategori::create(['nama_kategori' => 'MPV']);
        $kategoriB = Kategori::create(['nama_kategori' => 'Hatchback']);

        $this->kendaraanA->update(['kategori_id' => $kategoriA->id]);
        $this->kendaraanB->update(['kategori_id' => $kategoriB->id]);

        $this->createOrder(['kendaraan_id' => $this->kendaraanA->id, 'harga_total' => 1000000], createdAt: '2026-08-10 10:00:00');
        $this->createOrder(['kendaraan_id' => $this->kendaraanB->id, 'harga_total' => 500000], createdAt: '2026-08-11 10:00:00');

        $service = new ReportService('2026-08-01', '2026-08-31');
        $filtered = $service->detailOrder(['kategori_id' => $kategoriB->id], 25, 1);

        $this->assertCount(1, $filtered['data']);
        $this->assertSame('Hatchback', $filtered['data'][0]['kategori']);
        $this->assertSame(500000.0, (float) $filtered['data'][0]['harga_total']);
    }

    public function test_dashboard_decision_per_kategori_memiliki_kategori_id(): void
    {
        $kategoriA = Kategori::create(['nama_kategori' => 'MPV']);
        $this->kendaraanA->update(['kategori_id' => $kategoriA->id]);

        $this->createOrder(['kendaraan_id' => $this->kendaraanA->id, 'harga_total' => 1000000], createdAt: '2026-08-10 10:00:00');

        $service = new ReportService('2026-08-01', '2026-08-31');
        $decision = $service->dashboardDecision();

        $mpv = collect($decision['per_kategori'])->firstWhere('nama_kategori', 'MPV');
        $this->assertNotNull($mpv);
        $this->assertSame($kategoriA->id, $mpv['kategori_id'] ?? null);
    }
}
