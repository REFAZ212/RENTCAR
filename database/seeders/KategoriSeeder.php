<?php

namespace Database\Seeders;

use App\Models\Kategori;
use Illuminate\Database\Seeder;

class KategoriSeeder extends Seeder
{
    public function run(): void
    {
        $kategoris = [
            ['nama_kategori' => 'Mobil', 'deskripsi' => 'Kendaraan roda empat untuk sewa harian, bulanan, atau rental', 'aktif' => true],
            ['nama_kategori' => 'Motor', 'deskripsi' => 'Kendaraan roda dua untuk sewa harian atau antar jemput', 'aktif' => true],
            ['nama_kategori' => 'Sepeda', 'deskripsi' => 'Sepeda untuk disewa, cocok untuk rekreasi atau olahraga', 'aktif' => true],
        ];

        foreach ($kategoris as $kategori) {
            Kategori::create($kategori);
        }
    }
}
