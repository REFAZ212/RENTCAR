<?php

namespace Database\Seeders;

use App\Models\GarasiPartner;
use App\Models\Kategori;
use App\Models\Kendaraan;
use App\Models\Tipe;
use Illuminate\Database\Seeder;

class KendaraanSeeder extends Seeder
{
    public function run(): void
    {
        $garasi = GarasiPartner::all();
        $mobil = Kategori::where('nama_kategori', 'Mobil')->first();
        $motor = Kategori::where('nama_kategori', 'Motor')->first();

        $mpv = Tipe::where('nama_tipe', 'MPV')->first();
        $suv = Tipe::where('nama_tipe', 'SUV')->first();
        $sedan = Tipe::where('nama_tipe', 'Sedan')->first();
        $hatchback = Tipe::where('nama_tipe', 'Hatchback')->first();
        $pickup = Tipe::where('nama_tipe', 'Pickup')->first();
        $minibus = Tipe::where('nama_tipe', 'Minibus')->first();
        $matic = Tipe::where('nama_tipe', 'Matic')->first();
        $sport = Tipe::where('nama_tipe', 'Sport')->first();
        $bebek = Tipe::where('nama_tipe', 'Bebek')->first();

        $platHuruf = ['A', 'B', 'D', 'E', 'F', 'H', 'L', 'T', 'Z'];
        $warna = ['Putih', 'Hitam', 'Silver', 'Merah', 'Biru', 'Abu-abu', 'Biru Muda', 'Merah Marun', 'Putih Mutiara', 'Hitam Metallik'];

        $kendaraans = [
            [
                'garasi_partner_id' => $garasi[0]->id,
                'kategori_id' => $mobil->id,
                'tipe_id' => $mpv->id,
                'nama_kendaraan' => 'Toyota Avanza Veloz',
                'plat_nomor' => 'D 1234 ABC',
                'merek' => 'Toyota',
                'model' => 'Avanza Veloz',
                'tahun' => 2023,
                'warna' => 'Putih',
                'kapasitas_penumpang' => 7,
                'harga_sewa_per_hari' => 350000,
                'harga_partner_per_hari' => 280000,
                'status' => 'tersedia',
                'catatan' => 'Kondisi prima, baru servis',
            ],
            [
                'garasi_partner_id' => $garasi[0]->id,
                'kategori_id' => $mobil->id,
                'tipe_id' => $hatchback->id,
                'nama_kendaraan' => 'Honda Brio Satya',
                'plat_nomor' => 'D 5678 DEF',
                'merek' => 'Honda',
                'model' => 'Brio Satya',
                'tahun' => 2022,
                'warna' => 'Merah',
                'kapasitas_penumpang' => 5,
                'harga_sewa_per_hari' => 250000,
                'harga_partner_per_hari' => 200000,
                'status' => 'tersedia',
                'catatan' => 'Irit BBM, cocok untuk dalam kota',
            ],
            [
                'garasi_partner_id' => $garasi[0]->id,
                'kategori_id' => $mobil->id,
                'tipe_id' => $suv->id,
                'nama_kendaraan' => 'Toyota Fortuner VRZ',
                'plat_nomor' => 'D 9012 GHI',
                'merek' => 'Toyota',
                'model' => 'Fortuner VRZ',
                'tahun' => 2023,
                'warna' => 'Hitam',
                'kapasitas_penumpang' => 7,
                'harga_sewa_per_hari' => 600000,
                'harga_partner_per_hari' => 480000,
                'status' => 'tersedia',
                'catatan' => 'SUV premium, fitur lengkap',
            ],
            [
                'garasi_partner_id' => $garasi[1]->id,
                'kategori_id' => $mobil->id,
                'tipe_id' => $mpv->id,
                'nama_kendaraan' => 'Toyota Kijang Innova Reborn',
                'plat_nomor' => 'D 1122 PQR',
                'merek' => 'Toyota',
                'model' => 'Innova Reborn',
                'tahun' => 2023,
                'warna' => 'Putih',
                'kapasitas_penumpang' => 7,
                'harga_sewa_per_hari' => 500000,
                'harga_partner_per_hari' => 400000,
                'status' => 'tersedia',
                'catatan' => 'MPV premium, sangat nyaman',
            ],
            [
                'garasi_partner_id' => $garasi[1]->id,
                'kategori_id' => $mobil->id,
                'tipe_id' => $mpv->id,
                'nama_kendaraan' => 'Daihatsu Xenia',
                'plat_nomor' => 'D 3344 STU',
                'merek' => 'Daihatsu',
                'model' => 'Xenia',
                'tahun' => 2022,
                'warna' => 'Biru',
                'kapasitas_penumpang' => 7,
                'harga_sewa_per_hari' => 300000,
                'harga_partner_per_hari' => 240000,
                'status' => 'tersedia',
            ],
            [
                'garasi_partner_id' => $garasi[1]->id,
                'kategori_id' => $mobil->id,
                'tipe_id' => $suv->id,
                'nama_kendaraan' => 'Honda HR-V',
                'plat_nomor' => 'D 5566 VWX',
                'merek' => 'Honda',
                'model' => 'HR-V',
                'tahun' => 2024,
                'warna' => 'Merah Marun',
                'kapasitas_penumpang' => 5,
                'harga_sewa_per_hari' => 400000,
                'harga_partner_per_hari' => 320000,
                'status' => 'tersedia',
            ],
            [
                'garasi_partner_id' => $garasi[2]->id,
                'kategori_id' => $mobil->id,
                'tipe_id' => $sedan->id,
                'nama_kendaraan' => 'Toyota Vios',
                'plat_nomor' => 'D 7788 YZA',
                'merek' => 'Toyota',
                'model' => 'Vios',
                'tahun' => 2023,
                'warna' => 'Silver',
                'kapasitas_penumpang' => 5,
                'harga_sewa_per_hari' => 350000,
                'harga_partner_per_hari' => 280000,
                'status' => 'tersedia',
            ],
            [
                'garasi_partner_id' => $garasi[2]->id,
                'kategori_id' => $mobil->id,
                'tipe_id' => $minibus->id,
                'nama_kendaraan' => 'Mitsubishi Colt Diesel',
                'plat_nomor' => 'D 9900 BCD',
                'merek' => 'Mitsubishi',
                'model' => 'Colt Diesel 120PS',
                'tahun' => 2022,
                'warna' => 'Kuning',
                'kapasitas_penumpang' => 16,
                'harga_sewa_per_hari' => 800000,
                'harga_partner_per_hari' => 640000,
                'status' => 'tersedia',
                'catatan' => 'Minibus untuk rombongan',
            ],
            [
                'garasi_partner_id' => $garasi[2]->id,
                'kategori_id' => $mobil->id,
                'tipe_id' => $pickup->id,
                'nama_kendaraan' => 'Mitsubishi L300',
                'plat_nomor' => 'D 4456 HIJ',
                'merek' => 'Mitsubishi',
                'model' => 'L300',
                'tahun' => 2021,
                'warna' => 'Putih',
                'kapasitas_penumpang' => 3,
                'harga_sewa_per_hari' => 350000,
                'harga_partner_per_hari' => 280000,
                'status' => 'tersedia',
            ],
            [
                'garasi_partner_id' => $garasi[3]->id,
                'kategori_id' => $mobil->id,
                'tipe_id' => $sedan->id,
                'nama_kendaraan' => 'Toyota Camry',
                'plat_nomor' => 'D 6678 KLM',
                'merek' => 'Toyota',
                'model' => 'Camry',
                'tahun' => 2024,
                'warna' => 'Hitam',
                'kapasitas_penumpang' => 5,
                'harga_sewa_per_hari' => 750000,
                'harga_partner_per_hari' => 600000,
                'status' => 'tersedia',
                'catatan' => 'Sedan premium, full feature',
            ],
            [
                'garasi_partner_id' => $garasi[3]->id,
                'kategori_id' => $mobil->id,
                'tipe_id' => $suv->id,
                'nama_kendaraan' => 'Mitsubishi Pajero Sport',
                'plat_nomor' => 'D 8890 NOP',
                'merek' => 'Mitsubishi',
                'model' => 'Pajero Sport Dakar',
                'tahun' => 2023,
                'warna' => 'Abu-abu',
                'kapasitas_penumpang' => 7,
                'harga_sewa_per_hari' => 650000,
                'harga_partner_per_hari' => 520000,
                'status' => 'tersedia',
            ],
            [
                'garasi_partner_id' => $garasi[3]->id,
                'kategori_id' => $mobil->id,
                'tipe_id' => $hatchback->id,
                'nama_kendaraan' => 'Suzuki Swift Sport',
                'plat_nomor' => 'D 1122 QRS',
                'merek' => 'Suzuki',
                'model' => 'Swift Sport',
                'tahun' => 2023,
                'warna' => 'Biru',
                'kapasitas_penumpang' => 5,
                'harga_sewa_per_hari' => 350000,
                'harga_partner_per_hari' => 280000,
                'status' => 'tersedia',
            ],
            [
                'garasi_partner_id' => $garasi[0]->id,
                'kategori_id' => $mobil->id,
                'tipe_id' => $hatchback->id,
                'nama_kendaraan' => 'Honda City Hatchback',
                'plat_nomor' => 'D 3456 JKL',
                'merek' => 'Honda',
                'model' => 'City Hatchback',
                'tahun' => 2024,
                'warna' => 'Silver',
                'kapasitas_penumpang' => 5,
                'harga_sewa_per_hari' => 300000,
                'harga_partner_per_hari' => 240000,
                'status' => 'tersedia',
            ],
            [
                'garasi_partner_id' => $garasi[0]->id,
                'kategori_id' => $mobil->id,
                'tipe_id' => $pickup->id,
                'nama_kendaraan' => 'Toyota Hilux D-Cab',
                'plat_nomor' => 'D 7890 MNO',
                'merek' => 'Toyota',
                'model' => 'Hilux D-Cab',
                'tahun' => 2022,
                'warna' => 'Abu-abu',
                'kapasitas_penumpang' => 5,
                'harga_sewa_per_hari' => 450000,
                'harga_partner_per_hari' => 360000,
                'status' => 'tersedia',
                'catatan' => 'Pickup double cabin, tangguh',
            ],
            [
                'garasi_partner_id' => $garasi[1]->id,
                'kategori_id' => $motor->id,
                'tipe_id' => $matic->id,
                'nama_kendaraan' => 'Honda Vario 160',
                'plat_nomor' => 'D 2345 SE',
                'merek' => 'Honda',
                'model' => 'Vario 160',
                'tahun' => 2024,
                'warna' => 'Putih',
                'kapasitas_penumpang' => 2,
                'harga_sewa_per_hari' => 75000,
                'harga_partner_per_hari' => 60000,
                'status' => 'tersedia',
                'catatan' => 'Motor matic irit, cocok untuk harian',
            ],
        ];

        foreach ($kendaraans as $kendaraan) {
            Kendaraan::create($kendaraan);
        }
    }
}
