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
        $admin = User::where('role', 'admin')->first();
        $petugas1 = User::where('email', 'petugas@cvpilar.com')->first();
        $petugas2 = User::where('email', 'petugas2@cvpilar.com')->first();

        $customers = Customer::all();

        $supir1 = SupirCalo::where('jenis', 'supir')->where('nama', 'Andi Kurniawan')->first();
        $supir2 = SupirCalo::where('jenis', 'supir')->where('nama', 'Budi Hartono')->first();
        $calo1 = SupirCalo::where('jenis', 'calo')->where('nama', 'Eka Putri')->first();
        $calo2 = SupirCalo::where('jenis', 'calo')->where('nama', 'Fadli Ramadhan')->first();

        $hrv = Kendaraan::where('nama_kendaraan', 'Honda HR-V')->first();
        $avanza = Kendaraan::where('nama_kendaraan', 'Toyota Avanza Veloz')->first();
        $fortuner = Kendaraan::where('nama_kendaraan', 'Toyota Fortuner VRZ')->first();
        $innova = Kendaraan::where('nama_kendaraan', 'Toyota Kijang Innova Reborn')->first();
        $xenia = Kendaraan::where('nama_kendaraan', 'Daihatsu Xenia')->first();
        $vios = Kendaraan::where('nama_kendaraan', 'Toyota Vios')->first();
        $colt = Kendaraan::where('nama_kendaraan', 'Mitsubishi Colt Diesel')->first();
        $camry = Kendaraan::where('nama_kendaraan', 'Toyota Camry')->first();
        $brio = Kendaraan::where('nama_kendaraan', 'Honda Brio Satya')->first();
        $vario = Kendaraan::where('nama_kendaraan', 'Honda Vario 160')->first();

        $orders = [
            // 1 ─ ACTIVE: supir + calo, transfer, paid, dalam_penyewaan
            //    Skenario: customer sedang menyewa, supir mengemudi, calo mengurus administrasi
            [
                'source' => 'admin',
                'customer_id' => $customers[0]->id,
                'kendaraan_id' => $hrv->id,
                'admin_id' => $admin->id,
                'supir_id' => $supir1->id,
                'calo_id' => $calo1->id,
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

            // 2 ─ COMPLETED: supir only, cash, paid, selesai + tanggal_pengembalian_aktual
            //    Skenario: sudah selesai, dikembalikan tepat waktu
            [
                'source' => 'admin',
                'customer_id' => $customers[1]->id,
                'kendaraan_id' => $avanza->id,
                'admin_id' => $petugas1->id,
                'supir_id' => $supir2->id,
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

            // 3 ─ PENDING: calo only, unpaid, belum_diambil
            //    Skenario: baru masuk, menunggu konfirmasi garasi
            [
                'source' => 'admin',
                'customer_id' => $customers[2]->id,
                'kendaraan_id' => $fortuner->id,
                'admin_id' => $petugas1->id,
                'supir_id' => null,
                'calo_id' => $calo2->id,
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

            // 4 ─ CONFIRMED: supir only, transfer, partial, sudah_diantarkan
            //    Skenario: sudah dikonfirmasi, DP dibayar, kendaraan sudah diantarkan
            [
                'source' => 'admin',
                'customer_id' => $customers[3]->id,
                'kendaraan_id' => $innova->id,
                'admin_id' => $admin->id,
                'supir_id' => $supir1->id,
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

            // 5 ─ CANCELLED: calo only, unpaid, belum_diambil
            //    Skenario: customer membatalkan sebelum kendaraan disiapkan
            [
                'source' => 'admin',
                'customer_id' => $customers[4]->id,
                'kendaraan_id' => $xenia->id,
                'admin_id' => $petugas2->id,
                'supir_id' => null,
                'calo_id' => $calo1->id,
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

            // 6 ─ COMPLETED + OVERTIME: supir + calo, qris, paid + denda
            //    Skenario: dikembalikan terlambat, ada denda overtime
            [
                'source' => 'admin',
                'customer_id' => $customers[5]->id,
                'kendaraan_id' => $vios->id,
                'admin_id' => $petugas1->id,
                'supir_id' => $supir2->id,
                'calo_id' => $calo2->id,
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

            // 7 ─ ACTIVE (long rental): supir + calo, transfer, paid, 7 hari
            //    Skenario: sewa panjang untuk acara pernikahan
            [
                'source' => 'admin',
                'customer_id' => $customers[6]->id,
                'kendaraan_id' => $colt->id,
                'admin_id' => $admin->id,
                'supir_id' => $supir1->id,
                'calo_id' => $calo1->id,
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

            // 8 ─ PENDING (no supir/calo): lainnya, unpaid
            //    Skenario: customer mau ambil sendiri, bayar di tempat
            [
                'source' => 'admin',
                'customer_id' => $customers[7]->id,
                'kendaraan_id' => $camry->id,
                'admin_id' => $petugas2->id,
                'supir_id' => null,
                'calo_id' => null,
                'tanggal_mulai' => Carbon::now()->addDays(5)->toDateString(),
                'tanggal_selesai' => Carbon::now()->addDays(6)->toDateString(),
                'jam_mulai' => '10:00',
                'jam_selesai' => '22:00',
                'durasi_hari' => 1,
                'harga_per_hari' => 750000,
                'harga_total' => 750000,
                'alamat_jemput' => null,
                'tujuan' => null,
                'status_order' => 'pending',
                'metode_pembayaran' => 'lainnya',
                'status_pembayaran' => 'unpaid',
                'status_pengiriman' => 'belum_diambil',
                'catatan' => 'Customer ambil sendiri, bayar saat jemput',
            ],

            // 9 ─ COMPLETED (katalog source): no supir/calo, transfer, paid
            //    Skenario: order dari halaman katalog publik, customer ambil sendiri
            [
                'source' => 'katalog',
                'customer_id' => $customers[8]->id,
                'kendaraan_id' => $vario->id,
                'admin_id' => $admin->id,
                'supir_id' => null,
                'calo_id' => null,
                'tanggal_mulai' => Carbon::now()->subDays(8)->toDateString(),
                'tanggal_selesai' => Carbon::now()->subDays(6)->toDateString(),
                'durasi_hari' => 2,
                'harga_per_hari' => 75000,
                'harga_total' => 150000,
                'status_order' => 'completed',
                'metode_pembayaran' => 'transfer',
                'status_pembayaran' => 'paid',
                'status_pengiriman' => 'selesai',
                'tanggal_pengembalian_aktual' => Carbon::now()->subDays(6)->setTime(16, 30),
                'catatan' => 'Order via katalog online, customer ambil sendiri',
            ],

            // 10 ─ ACTIVE: supir only, cash, paid + alamat_jemput/tujuan
            //     Skenario: sewa harian dengan supir, bayar cash
            [
                'source' => 'admin',
                'customer_id' => $customers[9]->id,
                'kendaraan_id' => $brio->id,
                'admin_id' => $petugas2->id,
                'supir_id' => $supir2->id,
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
        ];

        foreach ($orders as $order) {
            Order::create($order);
        }
    }
}
