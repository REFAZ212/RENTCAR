<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            UserSeeder::class,
            KategoriSeeder::class,
            GarasiPartnerSeeder::class,
            TipeSeeder::class,
            KendaraanSeeder::class,
            CustomerSeeder::class,
            SupirCaloSeeder::class,
            OrderSeeder::class,
            GarasiRequestSeeder::class,
            WhatsappLogSeeder::class,
        ]);
    }
}
