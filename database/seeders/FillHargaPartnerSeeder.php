<?php

namespace Database\Seeders;

use App\Models\Kendaraan;
use Illuminate\Database\Seeder;

class FillHargaPartnerSeeder extends Seeder
{
    /**
     * Isi harga_partner_per_hari yang masih kosong untuk kendaraan garasi partner.
     *
     * Kolom harga_partner_per_hari ditambahkan via migration setelah KendaraanSeeder
     * ditulis, sehingga data lama tidak pernah memilikinya. Seeder ini mengisi ulang
     * kendaraan yang punya garasi_partner_id tapi belum punya harga beli, memakai
     * 80% dari harga_sewa_per_hari (margin perusahaan ~20%). Idempotent — hanya
     * mengisi yang kosong, tidak menimpa nilai yang sudah ada.
     */
    public function run(): void
    {
        $updated = 0;

        Kendaraan::whereNotNull('garasi_partner_id')
            ->where(fn ($q) => $q->whereNull('harga_partner_per_hari')->orWhere('harga_partner_per_hari', '<=', 0))
            ->get()
            ->each(function (Kendaraan $kendaraan) use (&$updated) {
                $hargaSewa = (float) $kendaraan->harga_sewa_per_hari;

                if ($hargaSewa <= 0) {
                    return;
                }

                $kendaraan->update([
                    'harga_partner_per_hari' => round($hargaSewa * 0.80, 2),
                ]);

                $updated++;
            });

        $this->command?->info("harga_partner_per_hari terisi untuk {$updated} kendaraan.");
    }
}
