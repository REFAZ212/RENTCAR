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
        $kendaraans = Kendaraan::all();

        $supir1 = SupirCalo::where('jenis', 'supir')->where('nama', 'Andi Kurniawan')->first();
        $supir2 = SupirCalo::where('jenis', 'supir')->where('nama', 'Budi Hartono')->first();
        $calo1 = SupirCalo::where('jenis', 'calo')->where('nama', 'Eka Putri')->first();
        $calo2 = SupirCalo::where('jenis', 'calo')->where('nama', 'Fadli Ramadhan')->first();

        $orders = [
            // Order 1 - Active (disewa)
            [
                'customer_id' => $customers[0]->id,
                'kendaraan_id' => $kendaraans->where('nama_kendaraan', 'Honda HR-V')->first()->id,
                'admin_id' => $admin->id,
                'supir_id' => $supir1?->id,
                'calo_id' => $calo1?->id,
                'tanggal_mulai' => Carbon::now()->subDays(1)->toDateString(),
                'tanggal_selesai' => Carbon::now()->addDays(2)->toDateString(),
                'durasi_hari' => 3,
                'harga_per_hari' => 400000,
                'harga_total' => 1200000,
                'status_order' => 'active',
                'metode_pembayaran' => 'transfer',
                'status_pembayaran' => 'paid',
                'status_pengiriman' => 'dalam_penyewaan',
                'catatan' => 'Customer ingin jemput di bandara',
            ],
            // Order 2 - Completed
            [
                'customer_id' => $customers[1]->id,
                'kendaraan_id' => $kendaraans->where('nama_kendaraan', 'Toyota Avanza Veloz')->first()->id,
                'admin_id' => $petugas1->id,
                'supir_id' => $supir2?->id,
                'tanggal_mulai' => Carbon::now()->subDays(10)->toDateString(),
                'tanggal_selesai' => Carbon::now()->subDays(7)->toDateString(),
                'durasi_hari' => 3,
                'harga_per_hari' => 350000,
                'harga_total' => 1050000,
                'status_order' => 'completed',
                'metode_pembayaran' => 'cash',
                'status_pembayaran' => 'paid',
                'status_pengiriman' => 'selesai',
            ],
            // Order 3 - Pending
            [
                'customer_id' => $customers[2]->id,
                'kendaraan_id' => $kendaraans->where('nama_kendaraan', 'Toyota Fortuner VRZ')->first()->id,
                'admin_id' => $petugas1->id,
                'calo_id' => $calo2?->id,
                'tanggal_mulai' => Carbon::now()->addDays(3)->toDateString(),
                'tanggal_selesai' => Carbon::now()->addDays(5)->toDateString(),
                'durasi_hari' => 2,
                'harga_per_hari' => 600000,
                'harga_total' => 1200000,
                'status_order' => 'pending',
                'status_pembayaran' => 'unpaid',
                'status_pengiriman' => 'belum_diambil',
                'catatan' => 'Menunggu konfirmasi dari garasi',
            ],
            // Order 4 - Confirmed
            [
                'customer_id' => $customers[3]->id,
                'kendaraan_id' => $kendaraans->where('nama_kendaraan', 'Toyota Kijang Innova Reborn')->first()->id,
                'admin_id' => $admin->id,
                'supir_id' => $supir1?->id,
                'tanggal_mulai' => Carbon::now()->addDays(1)->toDateString(),
                'tanggal_selesai' => Carbon::now()->addDays(4)->toDateString(),
                'durasi_hari' => 3,
                'harga_per_hari' => 500000,
                'harga_total' => 1500000,
                'status_order' => 'confirmed',
                'metode_pembayaran' => 'transfer',
                'status_pembayaran' => 'partial',
                'status_pengiriman' => 'sudah_diantarkan',
                'catatan' => 'DP sudah dibayar, pelunasan saat serah terima',
            ],
            // Order 5 - Cancelled
            [
                'customer_id' => $customers[4]->id,
                'kendaraan_id' => $kendaraans->where('nama_kendaraan', 'Daihatsu Xenia')->first()->id,
                'admin_id' => $petugas2->id,
                'calo_id' => $calo1?->id,
                'tanggal_mulai' => Carbon::now()->subDays(5)->toDateString(),
                'tanggal_selesai' => Carbon::now()->subDays(3)->toDateString(),
                'durasi_hari' => 2,
                'harga_per_hari' => 300000,
                'harga_total' => 600000,
                'status_order' => 'cancelled',
                'status_pembayaran' => 'unpaid',
                'status_pengiriman' => 'belum_diambil',
                'catatan' => 'Customer membatalkan karena perubahan jadwal',
            ],
            // Order 6 - Completed
            [
                'customer_id' => $customers[5]->id,
                'kendaraan_id' => $kendaraans->where('nama_kendaraan', 'Toyota Vios')->first()->id,
                'admin_id' => $petugas1->id,
                'supir_id' => $supir2?->id,
                'calo_id' => $calo2?->id,
                'tanggal_mulai' => Carbon::now()->subDays(15)->toDateString(),
                'tanggal_selesai' => Carbon::now()->subDays(12)->toDateString(),
                'durasi_hari' => 3,
                'harga_per_hari' => 350000,
                'harga_total' => 1050000,
                'status_order' => 'completed',
                'metode_pembayaran' => 'qris',
                'status_pembayaran' => 'paid',
                'status_pengiriman' => 'selesai',
            ],
            // Order 7 - Active
            [
                'customer_id' => $customers[6]->id,
                'kendaraan_id' => $kendaraans->where('nama_kendaraan', 'Mitsubishi Colt Diesel')->first()->id,
                'admin_id' => $admin->id,
                'supir_id' => $supir1?->id,
                'calo_id' => $calo1?->id,
                'tanggal_mulai' => Carbon::now()->toDateString(),
                'tanggal_selesai' => Carbon::now()->addDays(7)->toDateString(),
                'durasi_hari' => 7,
                'harga_per_hari' => 800000,
                'harga_total' => 5600000,
                'status_order' => 'active',
                'metode_pembayaran' => 'transfer',
                'status_pembayaran' => 'paid',
                'status_pengiriman' => 'dalam_penyewaan',
                'catatan' => 'Sewa untuk acara pernikahan',
            ],
            // Order 8 - Pending
            [
                'customer_id' => $customers[7]->id,
                'kendaraan_id' => $kendaraans->where('nama_kendaraan', 'Toyota Camry')->first()->id,
                'admin_id' => $petugas2->id,
                'supir_id' => $supir2?->id,
                'tanggal_mulai' => Carbon::now()->addDays(5)->toDateString(),
                'tanggal_selesai' => Carbon::now()->addDays(6)->toDateString(),
                'durasi_hari' => 1,
                'harga_per_hari' => 750000,
                'harga_total' => 750000,
                'status_order' => 'pending',
                'status_pembayaran' => 'unpaid',
                'status_pengiriman' => 'belum_diambil',
                'catatan' => 'Sewa harian untuk acara formal',
            ],
        ];

        foreach ($orders as $order) {
            Order::create($order);
        }
    }
}
