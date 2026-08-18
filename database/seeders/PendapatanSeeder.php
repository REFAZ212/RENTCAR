<?php

namespace Database\Seeders;

use App\Models\Customer;
use App\Models\Kendaraan;
use App\Models\Order;
use App\Models\SupirCalo;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Seeder;

class PendapatanSeeder extends Seeder
{
    public function run(): void
    {
        $admin = User::where('role', 'admin_utama')->first();
        $petugas = User::where('role', 'petugas')->first();
        $admins = [$admin->id, $petugas->id];

        $customers = Customer::all()->pluck('id')->toArray();
        $kendaraans = Kendaraan::all();
        $supirs = SupirCalo::where('jenis', 'supir')->where('status', 'active')->pluck('id')->toArray();
        $calos = SupirCalo::where('jenis', 'calo')->where('status', 'active')->pluck('id')->toArray();

        if (empty($customers) || $kendaraans->isEmpty()) {
            return;
        }

        $kendaraanIds = $kendaraans->pluck('id')->toArray();
        $hargaPerHari = $kendaraans->pluck('harga_sewa_per_hari', 'id')->toArray();

        $metodePembayaran = ['cash', 'transfer', 'qris', 'transfer', 'cash', 'transfer'];
        $alamats = [
            'Jl. Asia Afrika No. 25, Bandung',
            'Jl. Buah Batu No. 100, Bandung',
            'Jl. Riau No. 45, Bandung',
            'Jl. Dago No. 78, Bandung',
            'Jl. Setiabudhi No. 32, Bandung',
            'Jl. Cendrawasih No. 5, Bandung',
            'Jl. Merdeka No. 12, Bandung',
            'Jl. Pahlawan No. 8, Bandung',
            'Jl. Sukajadi No. 15, Bandung',
            'Jl. Ciumbuleuit No. 20, Bandung',
        ];
        $tujuans = [
            'Hotel Preanger, Bandung',
            'Braga City Walk, Bandung',
            'Farmhouse Lembang',
            'Kawah Putih, Ciwidey',
            'Gedung Sate, Bandung',
            'Trans Studio Mall, Bandung',
            'Terminal Leuwi Panjang, Bandung',
            'Bandara Husein Sastranegara, Bandung',
            'Stasiun Bandung',
            'Cihampelas Walk, Bandung',
        ];
        $catatanPool = [
            'Sewa harian dengan supir',
            'Customer ambil sendiri',
            'Sewa untuk acara keluarga',
            'Drop off ke bandara',
            'Sewa wisata kota Bandung',
            'Acara kantor',
            'Pernikahan di hotel',
            'Sewa mingguan',
            'Antar jemput karyawan',
            'Liburan akhir pekan',
        ];

        $start = Carbon::create(2026, 7, 1);
        $end = Carbon::create(2026, 7, 28);
        $today = Carbon::today();

        $count = 0;

        for ($date = $start->copy(); $date->lte($end); $date->addDay()) {
            $isPast = $date->lt($today);
            $isToday = $date->isSameDay($today);

            $numOrders = match (true) {
                $isPast => rand(6, 10),
                $isToday => rand(5, 8),
                default => 0,
            };

            for ($i = 0; $i < $numOrders; $i++) {
                $kId = $kendaraanIds[array_rand($kendaraanIds)];
                $hph = (float) ($hargaPerHari[$kId] ?? 350000);
                $durasi = rand(1, 5);
                $mulai = $date->copy();
                $selesai = $date->copy()->addDays($durasi - 1);
                $hargaTotal = $hph * $durasi;

                $hasSupir = rand(1, 100) <= 40;
                $hasCalo = ! $hasSupir && rand(1, 100) <= 30;
                $hasOvertime = rand(1, 100) <= 10;
                $jamOvertime = $hasOvertime ? rand(1, 4) : 0;
                $dendaOvertime = $jamOvertime * 25000;
                $metode = $metodePembayaran[array_rand($metodePembayaran)];

                $jamMulai = sprintf('%02d:%02d', rand(6, 10), [0, 30][array_rand([0, 30])]);
                $jamSelesai = sprintf('%02d:%02d', rand(16, 22), [0, 30][array_rand([0, 30])]);

                $pengembalian = $selesai->copy()->setTime((int) substr($jamSelesai, 0, 2), (int) substr($jamSelesai, 3, 2));
                if ($hasOvertime) {
                    $pengembalian->addHours($jamOvertime);
                }

                $order = Order::create([
                    'kode_order' => 'ORD-'.strtoupper(substr(uniqid(), -8)),
                    'source' => rand(1, 100) <= 15 ? 'katalog' : 'admin',
                    'customer_id' => $customers[array_rand($customers)],
                    'kendaraan_id' => $kId,
                    'admin_id' => $admins[array_rand($admins)],
                    'supir_id' => $hasSupir ? ($supirs[array_rand($supirs)] ?? null) : null,
                    'calo_id' => $hasCalo ? ($calos[array_rand($calos)] ?? null) : null,
                    'alamat_jemput' => $alamats[array_rand($alamats)],
                    'tujuan' => $tujuans[array_rand($tujuans)],
                    'tanggal_mulai' => $mulai->toDateString(),
                    'tanggal_selesai' => $selesai->toDateString(),
                    'jam_mulai' => $jamMulai,
                    'jam_selesai' => $jamSelesai,
                    'durasi_hari' => $durasi,
                    'harga_per_hari' => $hph,
                    'harga_total' => $hargaTotal,
                    'status_order' => 'completed',
                    'metode_pembayaran' => $metode,
                    'status_pembayaran' => 'paid',
                    'status_pengiriman' => 'selesai',
                    'jam_overtime' => $jamOvertime,
                    'denda_overtime' => $dendaOvertime,
                    'tanggal_pengembalian_aktual' => $pengembalian->toDateTimeString(),
                    'catatan' => $catatanPool[array_rand($catatanPool)],
                    'opsi_supir' => $hasSupir ? 'dengan_supir' : 'lepas_kunci',
                ]);

                $order->forceFill([
                    'created_at' => $date->copy()->setTime(rand(8, 18), rand(0, 59)),
                    'updated_at' => $date->copy()->setTime(rand(8, 18), rand(0, 59)),
                ])->save();

                $count++;
            }
        }

        // Tambahkan beberapa order cancelled & pending di akhir bulan
        for ($i = 0; $i < 5; $i++) {
            $kId = $kendaraanIds[array_rand($kendaraanIds)];
            $hph = (float) ($hargaPerHari[$kId] ?? 350000);
            $durasi = rand(1, 3);
            $mulai = $today->copy()->addDays(rand(0, 3));
            $selesai = $mulai->copy()->addDays($durasi - 1);
            $hargaTotal = $hph * $durasi;

            $isCancelled = $i < 3;

            $order = Order::create([
                'kode_order' => 'ORD-'.strtoupper(substr(uniqid(), -8)),
                'source' => 'admin',
                'customer_id' => $customers[array_rand($customers)],
                'kendaraan_id' => $kId,
                'admin_id' => $admins[array_rand($admins)],
                'supir_id' => null,
                'calo_id' => null,
                'alamat_jemput' => $alamats[array_rand($alamats)],
                'tujuan' => $tujuans[array_rand($tujuans)],
                'tanggal_mulai' => $mulai->toDateString(),
                'tanggal_selesai' => $selesai->toDateString(),
                'jam_mulai' => '08:00',
                'jam_selesai' => '17:00',
                'durasi_hari' => $durasi,
                'harga_per_hari' => $hph,
                'harga_total' => $hargaTotal,
                'status_order' => $isCancelled ? 'cancelled' : 'pending',
                'metode_pembayaran' => $isCancelled ? null : 'transfer',
                'status_pembayaran' => 'unpaid',
                'status_pengiriman' => 'belum_diambil',
                'jam_overtime' => 0,
                'denda_overtime' => 0,
                'catatan' => $isCancelled ? 'Customer membatalkan' : 'Menunggu konfirmasi',
            ]);

            $order->forceFill([
                'created_at' => $today->copy()->setTime(rand(8, 18), rand(0, 59)),
                'updated_at' => $today->copy()->setTime(rand(8, 18), rand(0, 59)),
            ])->save();

            $count++;
        }

        $this->command->info("PendapatanSeeder: {$count} order dibuat dari {$start->format('d M')} - {$end->format('d M Y')}");
    }
}
