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
        $sepeda = Kategori::where('nama_kategori', 'Sepeda')->first();

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

            // Sepeda
            ['kategori_id' => $sepeda?->id, 'nama_tipe' => 'Gunung (MTB)', 'deskripsi' => 'Sepeda gunung untuk medan off-road dan tanjakan', 'aktif' => true],
            ['kategori_id' => $sepeda?->id, 'nama_tipe' => 'Jalan (Road Bike)', 'deskripsi' => 'Sepeda jalan untuk kecepatan di aspal', 'aktif' => true],
            ['kategori_id' => $sepeda?->id, 'nama_tipe' => 'Lipat', 'deskripsi' => 'Sepeda lipat, praktis untuk transportasi', 'aktif' => true],
            ['kategori_id' => $sepeda?->id, 'nama_tipe' => 'BMX', 'deskripsi' => 'Sepeda BMX untuk freestyle dan balap', 'aktif' => true],
            ['kategori_id' => $sepeda?->id, 'nama_tipe' => 'Listrik', 'deskripsi' => 'Sepeda elektrik dengan motor bantu', 'aktif' => true],
            ['kategori_id' => $sepeda?->id, 'nama_tipe' => 'Kota', 'deskripsi' => 'Sepeda kota untuk perjalanan ringan sehari-hari', 'aktif' => true],
        ];

        foreach ($tipes as $tipe) {
            Tipe::create($tipe);
        }
    }
}
