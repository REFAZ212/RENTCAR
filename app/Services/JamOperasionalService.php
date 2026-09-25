<?php

namespace App\Services;

use App\Models\Setting;
use Carbon\Carbon;

class JamOperasionalService
{
    /**
     * Baris jam operasional untuk hari "waktu" (default: sekarang WIB).
     * Mengembalikan null bila belum ada konfigurasi jam operasional.
     */
    public static function barisHariIni(?Carbon $waktu = null): ?array
    {
        $waktu = self::normalizeTime($waktu);
        $config = json_decode(Setting::get('jam_operasional', '[]'), true);

        if (! is_array($config) || count($config) === 0) {
            return null;
        }

        $namaHari = self::namaHariIndonesia($waktu->dayOfWeek);

        foreach ($config as $row) {
            if (($row['hari'] ?? null) === $namaHari) {
                return $row;
            }
        }

        return null;
    }

    /**
     * Apakah saat ini di luar jam operasional (libur / sebelum buka / setelah
     * tutup)? Tanpa konfigurasi jam operasional → selalu buka (tidak dibatasi).
     */
    public static function sedangTutup(?Carbon $waktu = null): bool
    {
        $row = self::barisHariIni($waktu);

        if ($row === null) {
            return false;
        }

        if (! empty($row['libur'])) {
            return true;
        }

        $buka = (string) ($row['buka'] ?? '');
        $tutup = (string) ($row['tutup'] ?? '');

        if ($buka === '' || $tutup === '') {
            return true;
        }

        $sekarang = self::normalizeTime($waktu)->format('H:i');

        return $sekarang < $buka || $sekarang > $tutup;
    }

    /**
     * Pesan yang jelas untuk ditampilkan ke user saat booking ditolak.
     */
    public static function pesanTutup(?Carbon $waktu = null): string
    {
        $waktu = self::normalizeTime($waktu);
        $namaHari = self::namaHariIndonesia($waktu->dayOfWeek);
        $row = self::barisHariIni($waktu);

        if ($row !== null && ! empty($row['libur'])) {
            return "Hari ini ({$namaHari}) merupakan hari libur. Silakan lakukan pemesanan pada jam operasional berikutnya.";
        }

        if ($row !== null) {
            $buka = (string) ($row['buka'] ?? '-');
            $tutup = (string) ($row['tutup'] ?? '-');

            return "Saat ini di luar jam operasional ({$namaHari} {$buka}-{$tutup}). Silakan lakukan pemesanan pada jam operasional.";
        }

        return 'Pemesanan baru hanya dapat diproses pada jam operasional.';
    }

    private static function normalizeTime(?Carbon $waktu): Carbon
    {
        return ($waktu ?? now())->copy()->timezone('Asia/Jakarta');
    }

    private static function namaHariIndonesia(int $dayOfWeek): string
    {
        return [
            0 => 'Minggu',
            1 => 'Senin',
            2 => 'Selasa',
            3 => 'Rabu',
            4 => 'Kamis',
            5 => 'Jumat',
            6 => 'Sabtu',
        ][$dayOfWeek] ?? '';
    }
}
