<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        User::create([
            'name' => 'Admin Utama',
            'email' => 'admin@udin-renctcar.com',
            'phone' => '0895361054272',
            'role' => 'admin_utama',
            'password' => Hash::make('password'),
        ]);

        User::create([
            'name' => 'Admin Operasional',
            'email' => 'opsional@udin-renctcar.com',
            'phone' => '081234567890',
            'role' => 'admin_operasional',
            'password' => Hash::make('password'),
        ]);

        User::create([
            'name' => 'Petugas 1',
            'email' => 'petugas@udin-renctcar.com',
            'phone' => '081234567891',
            'role' => 'petugas',
            'password' => Hash::make('password'),
        ]);
    }
}
