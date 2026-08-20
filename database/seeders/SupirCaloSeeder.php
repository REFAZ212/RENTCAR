<?php

namespace Database\Seeders;

use App\Models\SupirCalo;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class SupirCaloSeeder extends Seeder
{
    public function run(): void
    {
        $supirs = [
            [
                'jenis' => 'supir',
                'nama' => 'Andi Kurniawan',
                'email' => 'andi@udin-renctcar.com',
                'password' => null,
                'no_hp' => '081234567101',
                'alamat' => 'Jl. Cendrawasih No. 3, Bandung',
                'status' => 'active',
                'no_sim' => '3273011001',
                'tarif_per_hari' => 200000,
                'catatan' => 'Supir senior, pengalaman 10 tahun',
            ],
            [
                'jenis' => 'supir',
                'nama' => 'Budi Hartono',
                'email' => 'budi@udin-renctcar.com',
                'password' => null,
                'no_hp' => '081234567102',
                'alamat' => 'Jl. Sudirman No. 18, Bandung',
                'status' => 'active',
                'no_sim' => '3273011002',
                'tarif_per_hari' => 175000,
            ],
            [
                'jenis' => 'supir',
                'nama' => 'Cahya Nugraha',
                'email' => 'cahya@udin-renctcar.com',
                'password' => null,
                'no_hp' => '081234567103',
                'alamat' => 'Jl. Buah Batu No. 22, Bandung',
                'status' => 'active',
                'no_sim' => '3273011003',
                'tarif_per_hari' => 150000,
            ],
            [
                'jenis' => 'supir',
                'nama' => 'Dedi Firmansyah',
                'email' => 'dedi@udin-renctcar.com',
                'password' => null,
                'no_hp' => '081234567104',
                'alamat' => 'Jl. Gatot Subroto No. 7, Bandung',
                'status' => 'inactive',
                'no_sim' => '3273011004',
                'tarif_per_hari' => 150000,
                'catatan' => 'Sedang cuti, efektif Agustus 2026',
            ],
            [
                'jenis' => 'supir',
                'nama' => 'Eko Saputra',
                'email' => 'eko@udin-renctcar.com',
                'password' => null,
                'no_hp' => '081234567105',
                'alamat' => 'Jl. Asia Afrika No. 45, Bandung',
                'status' => 'active',
                'no_sim' => '3273011005',
                'tarif_per_hari' => 200000,
                'catatan' => 'Spesialis rute luar kota',
            ],
            [
                'jenis' => 'supir',
                'nama' => 'Firman Hakim',
                'email' => 'firman@udin-renctcar.com',
                'password' => null,
                'no_hp' => '081234567106',
                'alamat' => 'Jl. Diponegoro No. 11, Bandung',
                'status' => 'active',
                'no_sim' => '3273011006',
                'tarif_per_hari' => 160000,
            ],
            [
                'jenis' => 'supir',
                'nama' => 'Gunawan Wibowo',
                'email' => 'gunawan@udin-renctcar.com',
                'password' => null,
                'no_hp' => '081234567107',
                'alamat' => 'Jl. Pahlawan No. 30, Bandung',
                'status' => 'active',
                'no_sim' => '3273011007',
                'tarif_per_hari' => 180000,
                'catatan' => 'Supir malam, biasa jaga shift malam',
            ],
            [
                'jenis' => 'supir',
                'nama' => 'Hadi Prasetyo',
                'email' => 'hadi@udin-renctcar.com',
                'password' => null,
                'no_hp' => '081234567108',
                'alamat' => 'Jl. Ahmad Yani No. 55, Bandung',
                'status' => 'active',
                'no_sim' => '3273011008',
                'tarif_per_hari' => 190000,
            ],
        ];

        $calos = [
            [
                'jenis' => 'calo',
                'nama' => 'Ika Putri',
                'email' => 'ika@udin-renctcar.com',
                'password' => null,
                'no_hp' => '081234567201',
                'alamat' => 'Jl. Asia Afrika No. 10, Bandung',
                'status' => 'active',
                'komisi' => 50000,
                'catatan' => 'Calo aktif, jaringan luas di Bandung Utara',
            ],
            [
                'jenis' => 'calo',
                'nama' => 'Joko Susilo',
                'email' => 'joko@udin-renctcar.com',
                'password' => null,
                'no_hp' => '081234567202',
                'alamat' => 'Jl. Dago No. 33, Bandung',
                'status' => 'active',
                'komisi' => 40000,
            ],
            [
                'jenis' => 'calo',
                'nama' => 'Kartika Sari',
                'email' => 'kartika@udin-renctcar.com',
                'password' => null,
                'no_hp' => '081234567203',
                'alamat' => 'Jl. Riau No. 15, Bandung',
                'status' => 'active',
                'komisi' => 35000,
            ],
            [
                'jenis' => 'calo',
                'nama' => 'Lukman Hakim',
                'email' => 'lukman@udin-renctcar.com',
                'password' => null,
                'no_hp' => '081234567204',
                'alamat' => 'Jl. Lebak Gede No. 8, Bandung',
                'status' => 'inactive',
                'komisi' => 45000,
                'catatan' => 'Pindah domisili ke Jakarta',
            ],
            [
                'jenis' => 'calo',
                'nama' => 'Mita Anggraeni',
                'email' => 'mita@udin-renctcar.com',
                'password' => null,
                'no_hp' => '081234567205',
                'alamat' => 'Jl. Buah Batu No. 88, Bandung',
                'status' => 'active',
                'komisi' => 60000,
                'catatan' => 'Calo top performer, banyak rekomendasi',
            ],
            [
                'jenis' => 'calo',
                'nama' => 'Nugroho Setiawan',
                'email' => 'nugroho@udin-renctcar.com',
                'password' => null,
                'no_hp' => '081234567206',
                'alamat' => 'Jl. Tamblong No. 20, Bandung',
                'status' => 'active',
                'komisi' => 45000,
            ],
        ];

        $rows = [];

        foreach ($supirs as $supir) {
            $plainPassword = Str::random(12);
            $rows[] = ['supir', $supir['email'], $plainPassword];
            SupirCalo::create([
                ...$supir,
                'password' => $plainPassword,
                'must_change_password' => true,
            ]);
        }

        foreach ($calos as $calo) {
            $plainPassword = Str::random(12);
            $rows[] = ['calo', $calo['email'], $plainPassword];
            SupirCalo::create([
                ...$calo,
                'password' => $plainPassword,
                'must_change_password' => true,
            ]);
        }

        $this->command?->warn('Password awal supir/calo (wajib diganti saat login pertama):');
        $this->command?->table(['Jenis', 'Email', 'Password Awal'], $rows);
    }
}
