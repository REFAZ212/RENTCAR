<?php

namespace App\Services;

use Carbon\Carbon;

/**
 * Menghitung keterlambatan (overtime) & denda untuk order sewa kendaraan.
 *
 * ATURAN BISNIS:
 * Setiap kelipatan jam mulai dari lewat batas waktu — walaupun cuma lewat
 * beberapa menit — dianggap 1 blok dan dikenakan tarif penuh.
 * Artinya:
 *   - Terlambat 1 menit  s/d 60 menit  → 1 jam  → tarif penuh
 *   - Terlambat 61 menit s/d 120 menit → 2 jam  → 2× tarif
 *   - Tidak terlambat sama sekali      → 0 jam  → Rp 0
 *
 * Tarif & grace period sekarang diambil dari database (tabel settings)
 * via Setting::getOvertimeSettings(). Konstanta di bawah hanya fallback
 * untuk test/unit yang tidak punya akses DB.
 *
 * Dipakai bersama oleh:
 *   - App\Models\Order (accessor real-time untuk order yang masih "active")
 *   - Endpoint "selesaikan order" di controller (finalisasi saat order completed)
 * supaya angka yang tampil ke user maupun yang tersimpan di database SELALU konsisten.
 */
class OvertimeCalculator
{
    /**
     * Fallback tarif — dipakai hanya saat caller tidak mengirim parameter.
     */
    public const RATE_PER_HOUR = 25000;

    /**
     * Fallback grace period (menit).
     */
    public const GRACE_PERIOD_MINUTES = 0;

    /**
     * Hitung jumlah blok jam keterlambatan (dibulatkan ke atas) antara
     * batas waktu pengembalian yang seharusnya dan waktu aktual.
     *
     * PENTING: dihitung berbasis DETIK, bukan menit. Kalau dihitung pakai
     * diffInMinutes(), telat 1–59 detik akan dibulatkan Carbon menjadi
     * "0 menit" dan lolos tanpa denda — itu bug yang salah dan sudah
     * diperbaiki di sini. Telat walau 1 detik tetap dianggap masuk 1 blok
     * jam penuh.
     *
     * @param  Carbon  $batasWaktu  Tanggal + jam selesai sewa yang dijanjikan
     * @param  Carbon  $waktuAktual  Waktu pengembalian aktual (atau "sekarang" untuk overtime berjalan)
     * @param  int  $rate  Tarif denda per jam (null = pakai konstanta fallback)
     * @param  int  $grace  Grace period dalam menit (null = pakai konstanta fallback)
     */
    public static function hitungJamTerlambat(Carbon $batasWaktu, Carbon $waktuAktual, ?int $grace = null): int
    {
        if ($waktuAktual->lessThanOrEqualTo($batasWaktu)) {
            return 0;
        }

        $graceMinutes = $grace ?? self::GRACE_PERIOD_MINUTES;
        $detikTerlambat = $batasWaktu->diffInSeconds($waktuAktual) - ($graceMinutes * 60);

        if ($detikTerlambat <= 0) {
            return 0;
        }

        return (int) ceil($detikTerlambat / 3600);
    }

    /**
     * Konversi jumlah jam terlambat menjadi nominal denda (Rupiah).
     *
     * @param  int  $jamTerlambat  Jumlah blok jam keterlambatan
     * @param  int  $rate  Tarif per jam (null = pakai konstanta fallback)
     */
    public static function hitungDenda(int $jamTerlambat, ?int $rate = null): float
    {
        return max(0, $jamTerlambat) * ($rate ?? self::RATE_PER_HOUR);
    }

    /**
     * Helper sekali panggil: kembalikan jam terlambat + denda sekaligus.
     *
     * @param  int  $rate  Tarif per jam (null = pakai konstanta fallback)
     * @param  int  $grace  Grace period dalam menit (null = pakai konstanta fallback)
     * @return array{jam_overtime: int, denda_overtime: float}
     */
    public static function hitung(Carbon $batasWaktu, Carbon $waktuAktual, ?int $rate = null, ?int $grace = null): array
    {
        $jam = self::hitungJamTerlambat($batasWaktu, $waktuAktual, $grace);

        return [
            'jam_overtime' => $jam,
            'denda_overtime' => self::hitungDenda($jam, $rate),
        ];
    }
}
