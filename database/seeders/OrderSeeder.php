<?php

namespace Database\Seeders;

use App\Models\Customer;
use App\Models\Kendaraan;
use App\Models\Order;
use App\Models\SupirCalo;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Seeder;

class OrderSeeder extends Seeder
{
    public function run(): void
    {
        $admin = User::where('role', 'admin_utama')->first();
        $petugas = User::where('role', 'petugas')->first();

        $customers = Customer::all();
        $kendaraans = Kendaraan::all();
        $supirs = SupirCalo::where('jenis', 'supir')->where('status', 'active')->get();
        $calos = SupirCalo::where('jenis', 'calo')->where('status', 'active')->get();

        if ($customers->isEmpty() || $kendaraans->isEmpty()) return;

        $orders = [
            // 1 — ACTIVE: supir + calo, transfer, paid, dalam_penyewaan
            [
                'source' => 'admin',
                'customer_id' => $customers[0]->id,
                'kendaraan_id' => $kendaraans->where('status', 'tersedia')->first()->id ?? $kendaraans[0]->id,
                'admin_id' => $admin->id,
                'supir_id' => $supirs[0]->id ?? null,
                'calo_id' => $calos[0]->id ?? null,
                'tanggal_mulai' => Carbon::now()->subDay()->toDateString(),
                'tanggal_selesai' => Carbon::now()->addDays(2)->toDateString(),
                'jam_mulai' => '08:00',
                'jam_selesai' => '17:00',
                'durasi_hari' => 3,
                'harga_per_hari' => 400000,
                'harga_total' => 1200000,
                'alamat_jemput' => 'Bandara Husein Sastranegara, Bandung',
                'tujuan' => 'Hotel Preanger, Jl. Asia Afrika No. 25, Bandung',
                'status_order' => 'active',
                'metode_pembayaran' => 'transfer',
                'status_pembayaran' => 'paid',
                'status_pengiriman' => 'dalam_penyewaan',
                'catatan' => 'Customer minta jemput di bandara, antar ke hotel',
            ],

            // 2 — COMPLETED: supir only, cash, paid, selesai
            [
                'source' => 'admin',
                'customer_id' => $customers[1]->id,
                'kendaraan_id' => $kendaraans[1]->id,
                'admin_id' => $petugas->id,
                'supir_id' => $supirs[1]->id ?? $supirs[0]->id ?? null,
                'calo_id' => null,
                'tanggal_mulai' => Carbon::now()->subDays(10)->toDateString(),
                'tanggal_selesai' => Carbon::now()->subDays(7)->toDateString(),
                'jam_mulai' => '07:00',
                'jam_selesai' => '18:00',
                'durasi_hari' => 3,
                'harga_per_hari' => 350000,
                'harga_total' => 1050000,
                'alamat_jemput' => 'Jl. Kenanga No. 12, Bandung',
                'tujuan' => 'Jl. Raya Lembang, Bandung Barat',
                'status_order' => 'completed',
                'metode_pembayaran' => 'cash',
                'status_pembayaran' => 'paid',
                'status_pengiriman' => 'selesai',
                'tanggal_pengembalian_aktual' => Carbon::now()->subDays(7)->setTime(17, 50),
            ],

            // 3 — PENDING: calo only, unpaid, belum_diambil
            [
                'source' => 'admin',
                'customer_id' => $customers[2]->id,
                'kendaraan_id' => $kendaraans[2]->id,
                'admin_id' => $petugas->id,
                'supir_id' => null,
                'calo_id' => $calos[1]->id ?? $calos[0]->id ?? null,
                'tanggal_mulai' => Carbon::now()->addDays(3)->toDateString(),
                'tanggal_selesai' => Carbon::now()->addDays(5)->toDateString(),
                'jam_mulai' => '08:00',
                'jam_selesai' => '17:00',
                'durasi_hari' => 2,
                'harga_per_hari' => 600000,
                'harga_total' => 1200000,
                'alamat_jemput' => 'Jl. Anggrek No. 8, Bandung',
                'tujuan' => 'Terminal Leuwi Panjang, Bandung',
                'status_order' => 'pending',
                'status_pembayaran' => 'unpaid',
                'status_pengiriman' => 'belum_diambil',
                'catatan' => 'Menunggu konfirmasi dari garasi',
            ],

            // 4 — CONFIRMED: supir only, transfer, partial, sudah_diantarkan
            [
                'source' => 'admin',
                'customer_id' => $customers[3]->id,
                'kendaraan_id' => $kendaraans[3]->id,
                'admin_id' => $admin->id,
                'supir_id' => $supirs[2]->id ?? $supirs[0]->id ?? null,
                'calo_id' => null,
                'tanggal_mulai' => Carbon::now()->addDay()->toDateString(),
                'tanggal_selesai' => Carbon::now()->addDays(4)->toDateString(),
                'jam_mulai' => '09:00',
                'jam_selesai' => '18:00',
                'durasi_hari' => 3,
                'harga_per_hari' => 500000,
                'harga_total' => 1500000,
                'alamat_jemput' => 'Jl. Melati No. 20, Bandung',
                'tujuan' => 'Kota Tasikmalaya',
                'status_order' => 'confirmed',
                'metode_pembayaran' => 'transfer',
                'status_pembayaran' => 'partial',
                'status_pengiriman' => 'sudah_diantarkan',
                'catatan' => 'DP 50% sudah dibayar, pelunasan saat serah terima',
            ],

            // 5 — CANCELLED: tanpa supir/calo
            [
                'source' => 'admin',
                'customer_id' => $customers[4]->id,
                'kendaraan_id' => $kendaraans[4]->id,
                'admin_id' => $petugas->id,
                'supir_id' => null,
                'calo_id' => null,
                'tanggal_mulai' => Carbon::now()->subDays(5)->toDateString(),
                'tanggal_selesai' => Carbon::now()->subDays(3)->toDateString(),
                'durasi_hari' => 2,
                'harga_per_hari' => 300000,
                'harga_total' => 600000,
                'status_order' => 'cancelled',
                'status_pembayaran' => 'unpaid',
                'status_pengiriman' => 'belum_diambil',
                'catatan' => 'Customer membatalkan, pindah jadwal',
            ],

            // 6 — COMPLETED + OVERTIME: supir + calo, qris, paid + denda
            [
                'source' => 'admin',
                'customer_id' => $customers[5]->id,
                'kendaraan_id' => $kendaraans[5]->id,
                'admin_id' => $petugas->id,
                'supir_id' => $supirs[3]->id ?? $supirs[0]->id ?? null,
                'calo_id' => $calos[2]->id ?? $calos[0]->id ?? null,
                'tanggal_mulai' => Carbon::now()->subDays(15)->toDateString(),
                'tanggal_selesai' => Carbon::now()->subDays(12)->toDateString(),
                'jam_mulai' => '06:00',
                'jam_selesai' => '18:00',
                'durasi_hari' => 3,
                'harga_per_hari' => 350000,
                'harga_total' => 1050000,
                'alamat_jemput' => 'Jl. Cendana No. 7, Bandung',
                'tujuan' => 'Jl. Raya Ciwidey, Bandung Selatan',
                'status_order' => 'completed',
                'metode_pembayaran' => 'qris',
                'status_pembayaran' => 'paid',
                'status_pengiriman' => 'selesai',
                'jam_overtime' => 2,
                'denda_overtime' => 50000,
                'tanggal_pengembalian_aktual' => Carbon::now()->subDays(12)->setTime(20, 15),
                'catatan' => 'Pengembalian terlambat 2 jam, denda Rp 50.000',
            ],

            // 7 — ACTIVE (long rental): supir + calo, transfer, paid
            [
                'source' => 'admin',
                'customer_id' => $customers[6]->id,
                'kendaraan_id' => $kendaraans[6]->id,
                'admin_id' => $admin->id,
                'supir_id' => $supirs[4]->id ?? $supirs[0]->id ?? null,
                'calo_id' => $calos[0]->id ?? null,
                'tanggal_mulai' => Carbon::now()->toDateString(),
                'tanggal_selesai' => Carbon::now()->addDays(7)->toDateString(),
                'jam_mulai' => '06:00',
                'jam_selesai' => '22:00',
                'durasi_hari' => 7,
                'harga_per_hari' => 800000,
                'harga_total' => 5600000,
                'alamat_jemput' => 'Jl. Mawar No. 15, Bandung',
                'tujuan' => 'Gedung Serbaguna, Jl. Otto Iskandardinata, Bandung',
                'status_order' => 'active',
                'metode_pembayaran' => 'transfer',
                'status_pembayaran' => 'paid',
                'status_pengiriman' => 'dalam_penyewaan',
                'catatan' => 'Sewa untuk acara pernikahan, butuh supir seharian',
            ],

            // 8 — PENDING (no supir/calo): customer ambil sendiri
            [
                'source' => 'admin',
                'customer_id' => $customers[7]->id,
                'kendaraan_id' => $kendaraans[7]->id,
                'admin_id' => $petugas->id,
                'supir_id' => null,
                'calo_id' => null,
                'tanggal_mulai' => Carbon::now()->addDays(5)->toDateString(),
                'tanggal_selesai' => Carbon::now()->addDays(6)->toDateString(),
                'jam_mulai' => '10:00',
                'jam_selesai' => '22:00',
                'durasi_hari' => 1,
                'harga_per_hari' => 750000,
                'harga_total' => 750000,
                'status_order' => 'pending',
                'metode_pembayaran' => 'lainnya',
                'status_pembayaran' => 'unpaid',
                'status_pengiriman' => 'belum_diambil',
                'catatan' => 'Customer ambil sendiri, bayar saat jemput',
            ],

            // 9 — COMPLETED (katalog source): no supir/calo, transfer, paid
            [
                'source' => 'katalog',
                'customer_id' => $customers[8]->id,
                'kendaraan_id' => $kendaraans[8]->id,
                'admin_id' => $admin->id,
                'supir_id' => null,
                'calo_id' => null,
                'tanggal_mulai' => Carbon::now()->subDays(8)->toDateString(),
                'tanggal_selesai' => Carbon::now()->subDays(6)->toDateString(),
                'durasi_hari' => 2,
                'harga_per_hari' => 350000,
                'harga_total' => 700000,
                'status_order' => 'completed',
                'metode_pembayaran' => 'transfer',
                'status_pembayaran' => 'paid',
                'status_pengiriman' => 'selesai',
                'tanggal_pengembalian_aktual' => Carbon::now()->subDays(6)->setTime(16, 30),
                'catatan' => 'Order via katalog online, customer ambil sendiri',
            ],

            // 10 — ACTIVE: supir only, cash, paid
            [
                'source' => 'admin',
                'customer_id' => $customers[9]->id,
                'kendaraan_id' => $kendaraans[9]->id,
                'admin_id' => $petugas->id,
                'supir_id' => $supirs[5]->id ?? $supirs[0]->id ?? null,
                'calo_id' => null,
                'tanggal_mulai' => Carbon::now()->subHours(6)->toDateString(),
                'tanggal_selesai' => Carbon::now()->addDay()->toDateString(),
                'jam_mulai' => '07:00',
                'jam_selesai' => '19:00',
                'durasi_hari' => 2,
                'harga_per_hari' => 250000,
                'harga_total' => 500000,
                'alamat_jemput' => 'Jl. Thamrin No. 11, Bandung',
                'tujuan' => 'Cihampelas Walk, Bandung',
                'status_order' => 'active',
                'metode_pembayaran' => 'cash',
                'status_pembayaran' => 'paid',
                'status_pengiriman' => 'dalam_penyewaan',
                'catatan' => 'Sewa harian dengan supir, bayar cash di muka',
            ],

            // 11 — COMPLETED: lepas kunci, transfer, paid
            [
                'source' => 'admin',
                'customer_id' => $customers[10]->id,
                'kendaraan_id' => $kendaraans[10]->id,
                'admin_id' => $admin->id,
                'supir_id' => null,
                'calo_id' => $calos[3]->id ?? $calos[0]->id ?? null,
                'tanggal_mulai' => Carbon::now()->subDays(20)->toDateString(),
                'tanggal_selesai' => Carbon::now()->subDays(18)->toDateString(),
                'jam_mulai' => '08:00',
                'jam_selesai' => '18:00',
                'durasi_hari' => 2,
                'harga_per_hari' => 450000,
                'harga_total' => 900000,
                'status_order' => 'completed',
                'metode_pembayaran' => 'transfer',
                'status_pembayaran' => 'paid',
                'status_pengiriman' => 'selesai',
                'tanggal_pengembalian_aktual' => Carbon::now()->subDays(18)->setTime(17, 45),
                'catatan' => 'Sewa lepas kunci untuk liburan keluarga',
            ],

            // 12 — PENDING: calo, belum bayar
            [
                'source' => 'admin',
                'customer_id' => $customers[11]->id,
                'kendaraan_id' => $kendaraans[11]->id,
                'admin_id' => $petugas->id,
                'supir_id' => null,
                'calo_id' => $calos[4]->id ?? $calos[0]->id ?? null,
                'tanggal_mulai' => Carbon::now()->addDays(7)->toDateString(),
                'tanggal_selesai' => Carbon::now()->addDays(9)->toDateString(),
                'jam_mulai' => '06:00',
                'jam_selesai' => '20:00',
                'durasi_hari' => 2,
                'harga_per_hari' => 650000,
                'harga_total' => 1300000,
                'status_order' => 'pending',
                'status_pembayaran' => 'unpaid',
                'status_pengiriman' => 'belum_diambil',
                'catatan' => 'Customer mau sewa untuk acara kantor',
            ],
        ];

        foreach ($orders as $order) {
            Order::create($order);
        }
    }
}
