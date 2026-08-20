<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\GarasiPartner;
use App\Models\Kategori;
use App\Models\Kendaraan;
use App\Models\Order;
use App\Models\Tipe;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class KatalogOrderRequestTest extends TestCase
{
    protected User $admin;

    protected Kategori $kategori;

    protected Tipe $tipe;

    protected GarasiPartner $garasi;

    protected Kendaraan $kendaraan;

    protected function setUp(): void
    {
        parent::setUp();

        Schema::dropIfExists('notifications');
        Schema::dropIfExists('orders');
        Schema::dropIfExists('kendaraans');
        Schema::dropIfExists('kategoris');
        Schema::dropIfExists('tipes');
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
        Schema::create('kategoris', function ($t) {
            $t->id();
            $t->string('nama_kategori');
            $t->string('slug')->unique();
            $t->text('deskripsi')->nullable();
            $t->boolean('aktif')->default(true);
            $t->timestamps();
        });
        Schema::create('tipes', function ($t) {
            $t->id();
            $t->string('nama_tipe');
            $t->string('slug')->unique();
            $t->text('deskripsi')->nullable();
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
            $t->string('tipe')->default('sedan');
            $t->string('merek');
            $t->year('tahun');
            $t->string('warna');
            $t->integer('kapasitas_penumpang');
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
            $t->timestamps();
            $t->softDeletes();
        });
        Schema::create('notifications', function ($t) {
            $t->id();
            $t->foreignId('user_id')->nullable();
            $t->string('type');
            $t->string('title');
            $t->text('message');
            $t->json('data')->nullable();
            $t->timestamp('read_at')->nullable();
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

        $this->admin = User::create([
            'name' => 'Admin Utama',
            'email' => 'admin@test.dev',
            'password' => bcrypt('password'),
            'role' => 'admin_utama',
        ]);
        $this->kategori = Kategori::create(['nama_kategori' => 'SUV', 'slug' => 'suv']);
        $this->tipe = Tipe::create(['nama_tipe' => 'Automatic', 'slug' => 'automatic']);
        $this->garasi = GarasiPartner::create([
            'nama_garasi' => 'Garasi Udin',
            'nama_pemilik' => 'Udin',
            'alamat' => 'Jl. Test 1',
            'no_hp' => '6281234567890',
        ]);
        $this->kendaraan = Kendaraan::create([
            'garasi_partner_id' => $this->garasi->id,
            'kategori_id' => $this->kategori->id,
            'tipe_id' => $this->tipe->id,
            'nama_kendaraan' => 'Toyota Avanza',
            'plat_nomor' => 'B 1234 CDE',
            'merek' => 'Toyota',
            'tahun' => 2022,
            'warna' => 'Putih',
            'kapasitas_penumpang' => 7,
            'harga_sewa_per_hari' => 500000,
            'status' => 'tersedia',
        ]);
    }

    private function payload(array $overrides = []): array
    {
        return array_merge([
            'nama_lengkap' => 'Budi Santoso',
            'no_hp' => '081234567890',
            'kendaraan_id' => $this->kendaraan->id,
            'tanggal_mulai' => '2026-12-01',
            'tanggal_selesai' => '2026-12-03',
            'opsi_supir' => 'lepas_kunci',
        ], $overrides);
    }

    public function test_order_request_rejects_jam_mulai_past_for_today(): void
    {
        Carbon::setTestNow('2026-12-01 10:00:00');
        try {
            $response = $this->postJson('/api/katalog/order-request', $this->payload([
                'jam_mulai' => '08:00',
                'jam_selesai' => '17:00',
            ]));

            $response->assertStatus(422);
            $response->assertJsonValidationErrors('jam_mulai');
            $this->assertDatabaseCount('orders', 0);
        } finally {
            Carbon::setTestNow();
        }
    }

    public function test_order_request_accepts_jam_mulai_later_today(): void
    {
        Carbon::setTestNow('2026-12-01 10:00:00');
        try {
            $response = $this->postJson('/api/katalog/order-request', $this->payload([
                'jam_mulai' => '11:00',
                'jam_selesai' => '17:00',
            ]));

            $response->assertStatus(201);
            $this->assertDatabaseCount('orders', 1);
            $order = Order::first();
            $this->assertSame('11:00', $order->jam_mulai);
            $this->assertSame('katalog', $order->source);
        } finally {
            Carbon::setTestNow();
        }
    }

    public function test_order_request_rejects_jam_selesai_past_for_today(): void
    {
        Carbon::setTestNow('2026-12-01 10:00:00');
        try {
            $response = $this->postJson('/api/katalog/order-request', $this->payload([
                'tanggal_selesai' => '2026-12-01',
                'jam_mulai' => '11:00',
                'jam_selesai' => '09:00',
            ]));

            $response->assertStatus(422);
            $response->assertJsonValidationErrors('jam_selesai');
        } finally {
            Carbon::setTestNow();
        }
    }

    public function test_order_request_accepts_past_jam_for_future_date(): void
    {
        Carbon::setTestNow('2026-12-01 10:00:00');
        try {
            $response = $this->postJson('/api/katalog/order-request', $this->payload([
                'tanggal_mulai' => '2026-12-02',
                'tanggal_selesai' => '2026-12-04',
                'jam_mulai' => '08:00',
                'jam_selesai' => '17:00',
            ]));

            $response->assertStatus(201);
            $this->assertDatabaseCount('orders', 1);
        } finally {
            Carbon::setTestNow();
        }
    }

    public function test_order_request_accepts_no_jam_for_today(): void
    {
        Carbon::setTestNow('2026-12-01 10:00:00');
        try {
            $response = $this->postJson('/api/katalog/order-request', $this->payload());

            $response->assertStatus(201);
            $this->assertDatabaseCount('orders', 1);
        } finally {
            Carbon::setTestNow();
        }
    }

    public function test_order_request_rejects_jam_selesai_before_jam_mulai_same_date(): void
    {
        Carbon::setTestNow('2026-12-01 10:00:00');
        try {
            $response = $this->postJson('/api/katalog/order-request', $this->payload([
                'tanggal_mulai' => '2026-12-01',
                'tanggal_selesai' => '2026-12-01',
                'jam_mulai' => '15:00',
                'jam_selesai' => '12:00',
            ]));

            $response->assertStatus(422);
            $response->assertJsonValidationErrors('jam_selesai');
            $this->assertDatabaseCount('orders', 0);
        } finally {
            Carbon::setTestNow();
        }
    }

    public function test_order_request_keeps_existing_customer_name(): void
    {
        Customer::create([
            'nama_lengkap' => 'Nama Lama',
            'no_hp' => '6281234567890',
        ]);

        $response = $this->postJson('/api/katalog/order-request', $this->payload([
            'nama_lengkap' => 'Nama Baru',
        ]));

        $response->assertStatus(201);
        $this->assertDatabaseHas('customers', [
            'no_hp' => '6281234567890',
            'nama_lengkap' => 'Nama Lama',
        ]);
        $customerId = Customer::where('no_hp', '6281234567890')->value('id');
        $this->assertDatabaseHas('orders', [
            'customer_id' => $customerId,
            'source' => 'katalog',
        ]);
    }

    public function test_order_request_throttles_per_phone_number(): void
    {
        $dates = [
            ['2026-12-01', '2026-12-02'],
            ['2026-12-05', '2026-12-06'],
            ['2026-12-10', '2026-12-11'],
            ['2026-12-15', '2026-12-16'],
        ];

        foreach ($dates as $i => [$mulai, $selesai]) {
            $response = $this->postJson('/api/katalog/order-request', $this->payload([
                'tanggal_mulai' => $mulai,
                'tanggal_selesai' => $selesai,
            ]));

            if ($i < 3) {
                $response->assertStatus(201);
            } else {
                $response->assertStatus(422);
                $response->assertJsonValidationErrors('no_hp');
            }
        }

        $this->assertDatabaseCount('orders', 3);
    }
}
