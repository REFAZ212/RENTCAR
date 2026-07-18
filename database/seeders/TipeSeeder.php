<?php

namespace Database\Seeders;

use App\Models\Kategori;
use App\Models\Tipe;
use Illuminate\Database\Seeder;

class TipeSeeder extends Seeder
{
    public function run(): void
    {
        $mobil = Kategori::where('nama_kategori', 'Mobil')->first();
        $motor = Kategori::where('nama_kategori', 'Motor')->first();

        $tipes = [
            // Mobil
            ['kategori_id' => $mobil?->id, 'nama_tipe' => 'MPV', 'deskripsi' => 'Multi Purpose Vehicle, cocok untuk keluarga', 'aktif' => true],
            ['kategori_id' => $mobil?->id, 'nama_tipe' => 'SUV', 'deskripsi' => 'Sport Utility Vehicle, tangguh di berbagai medan', 'aktif' => true],
            ['kategori_id' => $mobil?->id, 'nama_tipe' => 'Sedan', 'deskripsi' => 'Kendaraan mewah dan nyaman untuk perjalanan kota', 'aktif' => true],
            ['kategori_id' => $mobil?->id, 'nama_tipe' => 'Hatchback', 'deskripsi' => 'Kendaraan kompak dan irit bahan bakar', 'aktif' => true],
            ['kategori_id' => $mobil?->id, 'nama_tipe' => 'Pickup', 'deskripsi' => 'Kendaraan niaga untuk angkutan barang', 'aktif' => true],
            ['kategori_id' => $mobil?->id, 'nama_tipe' => 'Minibus', 'deskripsi' => 'Kendaraan besar untuk rombongan', 'aktif' => true],
            ['kategori_id' => $mobil?->id, 'nama_tipe' => 'Van', 'deskripsi' => 'Kendaraan angkut penumpang dan barang', 'aktif' => true],
            ['kategori_id' => $mobil?->id, 'nama_tipe' => 'Truk', 'deskripsi' => 'Kendaraan berat untuk distribusi', 'aktif' => true],

            // Motor
            ['kategori_id' => $motor?->id, 'nama_tipe' => 'Sport', 'deskripsi' => 'Motor sport performa tinggi', 'aktif' => true],
            ['kategori_id' => $motor?->id, 'nama_tipe' => 'Matic', 'deskripsi' => 'Motor matik, mudah dikendarai', 'aktif' => true],
            ['kategori_id' => $motor?->id, 'nama_tipe' => 'Bebek', 'deskripsi' => 'Motor bebek irit dan handal', 'aktif' => true],
            ['kategori_id' => $motor?->id, 'nama_tipe' => 'Trail', 'deskripsi' => 'Motor off-road untuk medan berat', 'aktif' => true],
        ];

        foreach ($tipes as $tipe) {
            Tipe::create($tipe);
        }
    }
}
