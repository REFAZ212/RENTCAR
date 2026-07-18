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
            'email' => 'admin@cvpilar.com',
            'phone' => '0895361054272',
            'role' => 'admin',
            'password' => Hash::make('password'),
        ]);

        User::create([
            'name' => 'Petugas 1',
            'email' => 'petugas@cvpilar.com',
            'phone' => '081234567891',
            'role' => 'petugas',
            'password' => Hash::make('password'),
        ]);

        User::create([
            'name' => 'Petugas 2',
            'email' => 'petugas2@cvpilar.com',
            'phone' => '081234567892',
            'role' => 'petugas',
            'password' => Hash::make('password'),
        ]);
    }
}
