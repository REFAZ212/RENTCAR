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
     * Nomor WhatsApp prioritas: No. HP garasi "Milik Sendiri" (is_own=true) →
     * pengaturan nomor_wa_owner → default. Email & alamat mengikuti Identitas
     * Usaha (settings email_usaha / alamat_usaha).
     *
     * @return array{wa: string, hp: string, email: string, alamat: string}
     */
    public static function kontak(): array
    {
        $own = GarasiPartner::query()
            ->where('is_own', true)
            ->whereNotNull('no_hp')
            ->where('no_hp', '!=', '')
            ->orderBy('id')
            ->first();

        if ($own) {
            $wa = self::normalizeToWa($own->no_hp);

            if ($wa) {
                return [
                    'wa' => $wa,
                    'hp' => '0'.substr($wa, 2),
                    'email' => (string) Setting::get('email_usaha', self::DEFAULT_EMAIL),
                    'alamat' => (string) Setting::get('alamat_usaha', self::DEFAULT_ALAMAT),
                ];
            }
        }

        $raw = (string) Setting::get('nomor_wa_owner', self::DEFAULT_WA);
        $wa = self::normalizeToWa($raw) ?: self::DEFAULT_WA;

        return [
            'wa' => $wa,
            'hp' => '0'.substr($wa, 2),
            'email' => (string) Setting::get('email_usaha', self::DEFAULT_EMAIL),
            'alamat' => (string) Setting::get('alamat_usaha', self::DEFAULT_ALAMAT),
        ];
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
