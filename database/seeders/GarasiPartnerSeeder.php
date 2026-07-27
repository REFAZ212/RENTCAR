<?php

namespace Database\Seeders;

use App\Models\GarasiPartner;
use Illuminate\Database\Seeder;

class GarasiPartnerSeeder extends Seeder
{
    public function run(): void
    {
        GarasiPartner::create([
            'nama_garasi' => 'Garasi Jaya Abadi',
            'nama_pemilik' => 'Budi Santoso',
            'alamat' => 'Jl. Raya Baru No. 10, Bandung',
            'no_hp' => '081234567892',
            'email' => 'jayaabadi@email.com',
            'status_aktif' => true,
            'is_own' => true,
            'catatan' => 'Garasi partner utama, lokasi strategis',
        ]);

        GarasiPartner::create([
            'nama_garasi' => 'Garasi Makmur Jaya',
            'nama_pemilik' => 'Siti Rahayu',
            'alamat' => 'Jl. Sejahtera No. 25, Bandung',
            'no_hp' => '081234567893',
            'email' => 'makmurjaya@email.com',
            'status_aktif' => true,
            'is_own' => false,
            'metode_bagi_hasil' => 'persentase',
            'persentase_bagi_hasil' => 60.00,
            'catatan' => 'Garasi partner kedua',
        ]);

        GarasiPartner::create([
            'nama_garasi' => 'Garasi Sentosa Abadi',
            'nama_pemilik' => 'Hendra Wijaya',
            'alamat' => 'Jl. Pahlawan No. 8, Bandung',
            'no_hp' => '081234567894',
            'email' => 'sentosa@email.com',
            'status_aktif' => true,
            'is_own' => false,
            'metode_bagi_hasil' => 'persentase',
            'persentase_bagi_hasil' => 55.00,
        ]);

        GarasiPartner::create([
            'nama_garasi' => 'Garasi Prima Motor',
            'nama_pemilik' => 'Rina Susanti',
            'alamat' => 'Jl. Gatot Subroto No. 45, Bandung',
            'no_hp' => '081234567895',
            'email' => 'prima@email.com',
            'status_aktif' => true,
            'is_own' => false,
            'metode_bagi_hasil' => 'persentase',
            'persentase_bagi_hasil' => 65.00,
            'catatan' => 'Fokus pada kendaraan premium',
        ]);

        GarasiPartner::create([
            'nama_garasi' => 'Garasi Berkah Jaya',
            'nama_pemilik' => 'Agus Pratama',
            'alamat' => 'Jl. Ahmad Yani No. 12, Bandung',
            'no_hp' => '081234567896',
            'status_aktif' => false,
            'is_own' => false,
            'catatan' => 'Sedang dalam perawatan, sementara tidak aktif',
        ]);
    }
}
