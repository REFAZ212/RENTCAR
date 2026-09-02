<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            SettingSeeder::class,
            UserSeeder::class,
            KategoriSeeder::class,
            GarasiPartnerSeeder::class,
            TipeSeeder::class,
            KendaraanSeeder::class,
            FillHargaPartnerSeeder::class,
            CustomerSeeder::class,
            SupirCaloSeeder::class,
            OrderSeeder::class,
            PendapatanSeeder::class,
            GarasiRequestSeeder::class,
            WhatsappLogSeeder::class,
        ]);
    }
}
