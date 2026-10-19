<?php

namespace App\Services;

use App\Models\GarasiPartner;
use App\Models\Setting;

class AdminContactService
{
    public const DEFAULT_WA = '62895361054272';

    public const DEFAULT_EMAIL = 'info@udin-renctcar.com';

    public const DEFAULT_ALAMAT = 'Jl. Contoh No. 123, Kota';

    /**
     * Kontak usaha yang tampil di seluruh situs publik (katalog, landing, dll).
     *
     * Nomor WhatsApp prioritas: Identitas Usaha (setting no_telp_usaha) →
     * No. HP garasi "Milik Sendiri" (is_own=true) → default. Email & alamat
     * mengikuti Identitas Usaha (settings email_usaha / alamat_usaha).
     *
     * Pengaturan nomor_wa_owner (tab Notifikasi) khusus untuk nomor penerima
     * notifikasi WhatsApp di internal, tidak memengaruhi kontak publik.
     *
     * @return array{wa: string, hp: string, email: string, alamat: string}
     */
    public static function kontak(): array
    {
        return [
            'wa' => self::resolveWa(),
            'hp' => '0'.substr(self::resolveWa(), 2),
            'email' => (string) Setting::get('email_usaha', self::DEFAULT_EMAIL),
            'alamat' => (string) Setting::get('alamat_usaha', self::DEFAULT_ALAMAT),
        ];
    }

    private static function resolveWa(): string
    {
        $identitas = (string) Setting::get('no_telp_usaha', '');

        if ($identitas !== '') {
            $wa = self::normalizeToWa($identitas);

            if ($wa !== '') {
                return $wa;
            }
        }

        $own = GarasiPartner::query()
            ->where('is_own', true)
            ->whereNotNull('no_hp')
            ->where('no_hp', '!=', '')
            ->orderBy('id')
            ->first();

        if ($own) {
            $garasi = self::normalizeToWa($own->no_hp);

            if ($garasi !== '') {
                return $garasi;
            }
        }

        return self::DEFAULT_WA;
    }

    private static function normalizeToWa(string $phone): string
    {
        $normalized = preg_replace('/[^0-9]/', '', $phone) ?? '';

        if (str_starts_with($normalized, '0')) {
            $normalized = '62'.substr($normalized, 1);
        } elseif (str_starts_with($normalized, '8')) {
            $normalized = '62'.$normalized;
        } elseif (! str_starts_with($normalized, '62')) {
            $normalized = '62'.$normalized;
        }

        return $normalized;
    }
}
