<?php

namespace Database\Seeders;

use App\Models\SupirCalo;
use Illuminate\Database\Seeder;

class SupirCaloSeeder extends Seeder
{
    public function run(): void
    {
        $supirCalos = [
            // Supir
            [
                'jenis' => 'supir',
                'nama' => 'Andi Kurniawan',
                'no_hp' => '081234567101',
                'alamat' => 'Jl. Cendrawasih No. 3, Bandung',
                'status' => 'active',
                'no_sim' => '3273011001',
                'komisi' => 50000,
                'tarif_per_hari' => 200000,
                'catatan' => 'Supir senior, pengalaman 5 tahun',
            ],
            [
                'jenis' => 'supir',
                'nama' => 'Budi Hartono',
                'no_hp' => '081234567102',
                'alamat' => 'Jl. Sudirman No. 18, Bandung',
                'status' => 'active',
                'no_sim' => '3273011002',
                'komisi' => 45000,
                'tarif_per_hari' => 175000,
            ],
            [
                'jenis' => 'supir',
                'nama' => 'Cahya Nugraha',
                'no_hp' => '081234567103',
                'alamat' => 'Jl. Buah Batu No. 22, Bandung',
                'status' => 'active',
                'no_sim' => '3273011003',
                'komisi' => 40000,
                'tarif_per_hari' => 150000,
            ],
            [
                'jenis' => 'supir',
                'nama' => 'Dedi Firmansyah',
                'no_hp' => '081234567104',
                'alamat' => 'Jl. Gatot Subroto No. 7, Bandung',
                'status' => 'inactive',
                'no_sim' => '3273011004',
                'komisi' => 40000,
                'tarif_per_hari' => 150000,
                'catatan' => 'Sedang cuti, efektif Agustus 2026',
            ],

            // Calo
            [
                'jenis' => 'calo',
                'nama' => 'Eka Putri',
                'no_hp' => '081234567201',
                'alamat' => 'Jl. Asia Afrika No. 10, Bandung',
                'status' => 'active',
                'komisi' => 75000,
                'catatan' => 'Calo aktif, jaringan luas di Bandung Utara',
            ],
            [
                'jenis' => 'calo',
                'nama' => 'Fadli Ramadhan',
                'no_hp' => '081234567202',
                'alamat' => 'Jl. Dago No. 33, Bandung',
                'status' => 'active',
                'komisi' => 60000,
            ],
            [
                'jenis' => 'calo',
                'nama' => 'Gita Sari',
                'no_hp' => '081234567203',
                'alamat' => 'Jl. Riau No. 15, Bandung',
                'status' => 'active',
                'komisi' => 50000,
            ],
            [
                'jenis' => 'calo',
                'nama' => 'Hendra Lesmana',
                'no_hp' => '081234567204',
                'alamat' => 'Jl. Lebak Gede No. 8, Bandung',
                'status' => 'inactive',
                'komisi' => 55000,
                'catatan' => 'Pindah domisili ke Jakarta',
            ],
        ];

        foreach ($supirCalos as $item) {
            SupirCalo::create($item);
        }
    }
}
