<?php

namespace App\Traits;

use App\Models\GarasiPartner;
use App\Models\Setting;
use Illuminate\Support\Facades\DB;

trait HandlesGarasiUtama
{
    protected function handleGarasiUtama(GarasiPartner $garasi, bool $isUtama): void
    {
        if (! $isUtama) {
            return;
        }

        DB::transaction(function () use ($garasi) {
            // Pastikan hanya 1 garasi utama
            GarasiPartner::where('id', '!=', $garasi->id)
                ->where('is_utama', true)
                ->update(['is_utama' => false]);

            // Pastikan record ini jadi utama
            if (! $garasi->is_utama) {
                $garasi->is_utama = true;
                $garasi->saveQuietly();
            }

            // Sinkronkan ke Pengaturan Bisnis (global)
            $this->syncToBusinessSettings($garasi);
        });
    }

    protected function syncToBusinessSettings(GarasiPartner $garasi): void
    {
        $map = [
            'nama_usaha' => $garasi->nama_garasi,
            'nama_pemilik' => $garasi->nama_pemilik,
            'no_telp_usaha' => $garasi->no_hp,
            'email_usaha' => $garasi->email,
            'alamat_usaha' => $garasi->alamat,
            'kota' => $garasi->kota,
        ];

        foreach ($map as $key => $value) {
            if ($value === null || $value === '') {
                continue;
            }

            Setting::updateOrCreate(
                ['key' => $key],
                ['value' => $value]
            );
        }
    }

    protected function enforceSingleUtama(): void
    {
        $utama = GarasiPartner::where('is_utama', true)->orderBy('id')->first();
        if ($utama) {
            GarasiPartner::where('id', '!=', $utama->id)
                ->where('is_utama', true)
                ->update(['is_utama' => false]);

            return;
        }

        $first = GarasiPartner::orderBy('id')->first();
        if ($first) {
            $first->is_utama = true;
            $first->saveQuietly();
        }
    }
}
