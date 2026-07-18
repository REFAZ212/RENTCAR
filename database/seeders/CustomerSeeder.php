<?php

namespace Database\Seeders;

use App\Models\Customer;
use Illuminate\Database\Seeder;

class CustomerSeeder extends Seeder
{
    public function run(): void
    {
        $customers = [
            [
                'nama_lengkap' => 'Ahmad Fauzi',
                'no_hp' => '085678901234',
                'email' => 'ahmad.fauzi@email.com',
                'alamat' => 'Jl. Merdeka No. 5, Bandung',
                'no_ktp' => '3273011234560001',
                'no_sim' => '327301123456',
                'catatan' => 'Customer rutin, sering sewa untuk dinas',
            ],
            [
                'nama_lengkap' => 'Dewi Lestari',
                'no_hp' => '085678901235',
                'email' => 'dewi.lestari@email.com',
                'alamat' => 'Jl. Kenanga No. 12, Bandung',
                'no_ktp' => '3273011234560002',
                'no_sim' => '327301123457',
            ],
            [
                'nama_lengkap' => 'Rizky Pratama',
                'no_hp' => '085678901236',
                'email' => 'rizky.pratama@email.com',
                'alamat' => 'Jl. Anggrek No. 8, Bandung',
                'no_ktp' => '3273011234560003',
                'no_sim' => '327301123458',
            ],
            [
                'nama_lengkap' => 'Siti Nurhaliza',
                'no_hp' => '085678901237',
                'email' => 'siti.nurhaliza@email.com',
                'alamat' => 'Jl. Melati No. 20, Bandung',
                'no_ktp' => '3273011234560004',
            ],
            [
                'nama_lengkap' => 'Bambang Supriyadi',
                'no_hp' => '085678901238',
                'alamat' => 'Jl. Veteran No. 3, Bandung',
                'no_ktp' => '3273011234560005',
                'no_sim' => '327301123459',
                'catatan' => 'Sering sewa mobil untuk rombongan',
            ],
            [
                'nama_lengkap' => 'Putri Ayu Lestari',
                'no_hp' => '085678901239',
                'email' => 'putri.ayu@email.com',
                'alamat' => 'Jl. Cendana No. 7, Bandung',
                'no_ktp' => '3273011234560006',
                'no_sim' => '327301123460',
            ],
            [
                'nama_lengkap' => 'Deni Kurniawan',
                'no_hp' => '085678901240',
                'alamat' => 'Jl. Mawar No. 15, Bandung',
                'no_ktp' => '3273011234560007',
            ],
            [
                'nama_lengkap' => 'Rina Wulandari',
                'no_hp' => '085678901241',
                'email' => 'rina.wulandari@email.com',
                'alamat' => 'Jl. Dahlia No. 9, Bandung',
                'no_ktp' => '3273011234560008',
                'no_sim' => '327301123461',
            ],
            [
                'nama_lengkap' => 'Fajar Nugroho',
                'no_hp' => '085678901242',
                'alamat' => 'Jl. Sudirman No. 22, Bandung',
                'no_ktp' => '3273011234560009',
                'no_sim' => '327301123462',
                'catatan' => 'Customer korporat',
            ],
            [
                'nama_lengkap' => 'Maya Sari',
                'no_hp' => '085678901243',
                'email' => 'maya.sari@email.com',
                'alamat' => 'Jl. Thamrin No. 11, Bandung',
                'no_ktp' => '3273011234560010',
            ],
        ];

        foreach ($customers as $customer) {
            Customer::create($customer);
        }
    }
}
