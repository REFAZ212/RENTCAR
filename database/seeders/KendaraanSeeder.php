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
        $garasi1 = GarasiPartner::where('nama_garasi', 'Garasi Jaya Abadi')->first();
        $garasi2 = GarasiPartner::where('nama_garasi', 'Garasi Makmur Jaya')->first();
        $garasi3 = GarasiPartner::where('nama_garasi', 'Garasi Sentosa Abadi')->first();
        $garasi4 = GarasiPartner::where('nama_garasi', 'Garasi Prima Motor')->first();

        $mpvLow = Tipe::where('nama_tipe', 'Low MPV')->first();
        $mpvMed = Tipe::where('nama_tipe', 'Medium MPV')->first();
        $mpvHigh = Tipe::where('nama_tipe', 'High MPV')->first();
        $suvCompact = Tipe::where('nama_tipe', 'Compact SUV')->first();
        $suvMid = Tipe::where('nama_tipe', 'Mid-size SUV')->first();
        $sedanCompact = Tipe::where('nama_tipe', 'Compact Sedan')->first();
        $sedanMid = Tipe::where('nama_tipe', 'Mid-size Sedan')->first();
        $sedanFull = Tipe::where('nama_tipe', 'Full-size Sedan')->first();
        $hatchCity = Tipe::where('nama_tipe', 'City Car')->first();
        $hatchSport = Tipe::where('nama_tipe', 'Sport Hatchback')->first();
        $pickupSingle = Tipe::where('nama_tipe', 'Single Cab')->first();
        $pickupDouble = Tipe::where('nama_tipe', 'Double Cab')->first();
        $miniMicro = Tipe::where('nama_tipe', 'Microbus')->first();
        $vanPassenger = Tipe::where('nama_tipe', 'Passenger Van')->first();
        $trukLight = Tipe::where('nama_tipe', 'Light Truck')->first();
        $trukBox = Tipe::where('nama_tipe', 'Box Truck')->first();

        $mpv = Kategori::where('nama_kategori', 'MPV')->first();
        $suv = Kategori::where('nama_kategori', 'SUV')->first();
        $sedan = Kategori::where('nama_kategori', 'Sedan')->first();
        $hatchback = Kategori::where('nama_kategori', 'Hatchback')->first();
        $pickup = Kategori::where('nama_kategori', 'Pickup')->first();
        $minibus = Kategori::where('nama_kategori', 'Minibus')->first();
        $van = Kategori::where('nama_kategori', 'Van')->first();
        $truk = Kategori::where('nama_kategori', 'Truk')->first();

        $kendaraans = [
            // Garasi 1 - Jaya Abadi
            [
                'garasi_partner_id' => $garasi1->id,
                'kategori_id' => $mpv?->id,
                'tipe_id' => $mpvLow?->id,
                'nama_kendaraan' => 'Toyota Avanza Veloz',
                'plat_nomor' => 'D 1234 ABC',
                'tipe' => 'mpv',
                'merek' => 'Toyota',
                'model' => 'Avanza Veloz',
                'tahun' => 2023,
                'warna' => 'Putih',
                'kapasitas_penumpang' => 7,
                'harga_sewa_per_hari' => 350000,
                'status' => 'tersedia',
                'catatan' => 'Kondisi prima, baru servis',
            ],
            [
                'garasi_partner_id' => $garasi1->id,
                'kategori_id' => $hatchback?->id,
                'tipe_id' => $hatchCity?->id,
                'nama_kendaraan' => 'Honda Brio Satya',
                'plat_nomor' => 'D 5678 DEF',
                'tipe' => 'hatchback',
                'merek' => 'Honda',
                'model' => 'Brio Satya',
                'tahun' => 2022,
                'warna' => 'Merah',
                'kapasitas_penumpang' => 5,
                'harga_sewa_per_hari' => 250000,
                'status' => 'tersedia',
                'catatan' => 'Irit BBM, cocok untuk dalam kota',
            ],
            [
                'garasi_partner_id' => $garasi1->id,
                'kategori_id' => $suv?->id,
                'tipe_id' => $suvMid?->id,
                'nama_kendaraan' => 'Toyota Fortuner VRZ',
                'plat_nomor' => 'D 9012 GHI',
                'tipe' => 'suv',
                'merek' => 'Toyota',
                'model' => 'Fortuner VRZ',
                'tahun' => 2023,
                'warna' => 'Hitam',
                'kapasitas_penumpang' => 7,
                'harga_sewa_per_hari' => 600000,
                'status' => 'tersedia',
                'catatan' => 'SUV premium, fitur lengkap',
            ],
            [
                'garasi_partner_id' => $garasi1->id,
                'kategori_id' => $sedan?->id,
                'tipe_id' => $sedanCompact?->id,
                'nama_kendaraan' => 'Honda City Hatchback',
                'plat_nomor' => 'D 3456 JKL',
                'tipe' => 'hatchback',
                'merek' => 'Honda',
                'model' => 'City Hatchback',
                'tahun' => 2024,
                'warna' => 'Silver',
                'kapasitas_penumpang' => 5,
                'harga_sewa_per_hari' => 300000,
                'status' => 'tersedia',
            ],
            [
                'garasi_partner_id' => $garasi1->id,
                'kategori_id' => $pickup?->id,
                'tipe_id' => $pickupDouble?->id,
                'nama_kendaraan' => 'Toyota Hilux D-Cab',
                'plat_nomor' => 'D 7890 MNO',
                'tipe' => 'pickup',
                'merek' => 'Toyota',
                'model' => 'Hilux D-Cab',
                'tahun' => 2022,
                'warna' => 'Abu-abu',
                'kapasitas_penumpang' => 5,
                'harga_sewa_per_hari' => 450000,
                'status' => 'maintenance',
                'catatan' => 'Sedang ganti oli dan filter',
            ],

            // Garasi 2 - Makmur Jaya
            [
                'garasi_partner_id' => $garasi2->id,
                'kategori_id' => $mpv?->id,
                'tipe_id' => $mpvHigh?->id,
                'nama_kendaraan' => 'Toyota Kijang Innova Reborn',
                'plat_nomor' => 'D 1122 PQR',
                'tipe' => 'mpv',
                'merek' => 'Toyota',
                'model' => 'Innova Reborn',
                'tahun' => 2023,
                'warna' => 'Putih',
                'kapasitas_penumpang' => 7,
                'harga_sewa_per_hari' => 500000,
                'status' => 'tersedia',
                'catatan' => 'MPV premium, sangat nyaman',
            ],
            [
                'garasi_partner_id' => $garasi2->id,
                'kategori_id' => $mpv?->id,
                'tipe_id' => $mpvLow?->id,
                'nama_kendaraan' => 'Daihatsu Xenia',
                'plat_nomor' => 'D 3344 STU',
                'tipe' => 'mpv',
                'merek' => 'Daihatsu',
                'model' => 'Xenia',
                'tahun' => 2022,
                'warna' => 'Biru',
                'kapasitas_penumpang' => 7,
                'harga_sewa_per_hari' => 300000,
                'status' => 'tersedia',
            ],
            [
                'garasi_partner_id' => $garasi2->id,
                'kategori_id' => $suv?->id,
                'tipe_id' => $suvCompact?->id,
                'nama_kendaraan' => 'Honda HR-V',
                'plat_nomor' => 'D 5566 VWX',
                'tipe' => 'suv',
                'merek' => 'Honda',
                'model' => 'HR-V',
                'tahun' => 2024,
                'warna' => 'Merah Marun',
                'kapasitas_penumpang' => 5,
                'harga_sewa_per_hari' => 400000,
                'status' => 'disewa',
                'catatan' => 'Disewa oleh customer Ahmad Fauzi, 15-17 Juli 2026',
            ],
            [
                'garasi_partner_id' => $garasi2->id,
                'kategori_id' => $sedan?->id,
                'tipe_id' => $sedanMid?->id,
                'nama_kendaraan' => 'Toyota Vios',
                'plat_nomor' => 'D 7788 YZA',
                'tipe' => 'sedan',
                'merek' => 'Toyota',
                'model' => 'Vios',
                'tahun' => 2023,
                'warna' => 'Silver',
                'kapasitas_penumpang' => 5,
                'harga_sewa_per_hari' => 350000,
                'status' => 'tersedia',
            ],

            // Garasi 3 - Sentosa Abadi
            [
                'garasi_partner_id' => $garasi3->id,
                'kategori_id' => $minibus?->id,
                'tipe_id' => $miniMicro?->id,
                'nama_kendaraan' => 'Mitsubishi Colt Diesel',
                'plat_nomor' => 'D 9900 BCD',
                'tipe' => 'minibus',
                'merek' => 'Mitsubishi',
                'model' => 'Colt Diesel 120PS',
                'tahun' => 2022,
                'warna' => 'Kuning',
                'kapasitas_penumpang' => 16,
                'harga_sewa_per_hari' => 800000,
                'status' => 'tersedia',
                'catatan' => 'Minibus untuk rombongan',
            ],
            [
                'garasi_partner_id' => $garasi3->id,
                'kategori_id' => $van?->id,
                'tipe_id' => $vanPassenger?->id,
                'nama_kendaraan' => 'Hyundai Stargazer',
                'plat_nomor' => 'D 2233 EFG',
                'tipe' => 'mpv',
                'merek' => 'Hyundai',
                'model' => 'Stargazer',
                'tahun' => 2024,
                'warna' => 'Putih',
                'kapasitas_penumpang' => 8,
                'harga_sewa_per_hari' => 550000,
                'status' => 'tersedia',
            ],
            [
                'garasi_partner_id' => $garasi3->id,
                'kategori_id' => $pickup?->id,
                'tipe_id' => $pickupSingle?->id,
                'nama_kendaraan' => 'Mitsubishi L300',
                'plat_nomor' => 'D 4456 HIJ',
                'tipe' => 'pickup',
                'merek' => 'Mitsubishi',
                'model' => 'L300',
                'tahun' => 2021,
                'warna' => 'Putih',
                'kapasitas_penumpang' => 3,
                'harga_sewa_per_hari' => 350000,
                'status' => 'tersedia',
            ],

            // Garasi 4 - Prima Motor
            [
                'garasi_partner_id' => $garasi4->id,
                'kategori_id' => $sedan?->id,
                'tipe_id' => $sedanFull?->id,
                'nama_kendaraan' => 'Toyota Camry',
                'plat_nomor' => 'D 6678 KLM',
                'tipe' => 'sedan',
                'merek' => 'Toyota',
                'model' => 'Camry',
                'tahun' => 2024,
                'warna' => 'Hitam',
                'kapasitas_penumpang' => 5,
                'harga_sewa_per_hari' => 750000,
                'status' => 'tersedia',
                'catatan' => 'Sedan premium, full feature',
            ],
            [
                'garasi_partner_id' => $garasi4->id,
                'kategori_id' => $suv?->id,
                'tipe_id' => $suvMid?->id,
                'nama_kendaraan' => 'Mitsubishi Pajero Sport',
                'plat_nomor' => 'D 8890 NOP',
                'tipe' => 'suv',
                'merek' => 'Mitsubishi',
                'model' => 'Pajero Sport Dakar',
                'tahun' => 2023,
                'warna' => 'Abu-abu',
                'kapasitas_penumpang' => 7,
                'harga_sewa_per_hari' => 650000,
                'status' => 'tersedia',
            ],
            [
                'garasi_partner_id' => $garasi4->id,
                'kategori_id' => $hatchback?->id,
                'tipe_id' => $hatchSport?->id,
                'nama_kendaraan' => 'Suzuki Swift Sport',
                'plat_nomor' => 'D 1122 QRS',
                'tipe' => 'hatchback',
                'merek' => 'Suzuki',
                'model' => 'Swift Sport',
                'tahun' => 2023,
                'warna' => 'Biru',
                'kapasitas_penumpang' => 5,
                'harga_sewa_per_hari' => 350000,
                'status' => 'tersedia',
            ],
            [
                'garasi_partner_id' => $garasi4->id,
                'kategori_id' => $truk?->id,
                'tipe_id' => $trukBox?->id,
                'nama_kendaraan' => 'Mitsubishi Colt Diesel Box',
                'plat_nomor' => 'D 3344 TUV',
                'tipe' => 'truk',
                'merek' => 'Mitsubishi',
                'model' => 'Colt Diesel Box',
                'tahun' => 2022,
                'warna' => 'Putih',
                'kapasitas_penumpang' => 3,
                'harga_sewa_per_hari' => 900000,
                'status' => 'maintenance',
                'catatan' => 'Sedang perbaikan mesin',
            ],
        ];

        foreach ($kendaraans as $kendaraan) {
            Kendaraan::create($kendaraan);
        }
    }
}
