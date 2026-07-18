<?php

namespace App\Services;

use Carbon\Carbon;

/**
 * Menghitung keterlambatan (overtime) & denda untuk order sewa kendaraan.
 *
 * ATURAN BISNIS:
 * Setiap kelipatan jam mulai dari lewat batas waktu — walaupun cuma lewat
 * beberapa menit — dianggap 1 blok dan dikenakan tarif penuh Rp 25.000.
 * Artinya:
 *   - Terlambat 1 menit  s/d 60 menit  → 1 jam  → Rp 25.000
 *   - Terlambat 61 menit s/d 120 menit → 2 jam  → Rp 50.000
 *   - Tidak terlambat sama sekali      → 0 jam  → Rp 0
 *
 * Dipakai bersama oleh:
 *   - App\Models\Order (accessor real-time untuk order yang masih "active")
 *   - Endpoint "selesaikan order" di controller (finalisasi saat order completed)
 * supaya angka yang tampil ke user maupun yang tersimpan di database SELALU konsisten.
 */
class OvertimeCalculator
{
    /**
     * Tarif denda per blok jam keterlambatan.
     */
    public const RATE_PER_HOUR = 25000;

    /**
     * Jam berapa dianggap "batas toleransi tanpa denda" (dalam menit).
     * 0 = tidak ada toleransi sama sekali; telat 1 menit pun sudah kena 1 blok.
     * Diekspos sebagai konstanta supaya gampang diubah kalau suatu saat
     * bisnisnya butuh masa toleransi (mis. 15 menit gratis).
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
     * jam penuh (kena Rp 25.000).
     *
     * @param  Carbon  $batasWaktu  Tanggal + jam selesai sewa yang dijanjikan
     * @param  Carbon  $waktuAktual  Waktu pengembalian aktual (atau "sekarang" untuk overtime berjalan)
     */
    public static function hitungJamTerlambat(Carbon $batasWaktu, Carbon $waktuAktual): int
    {
        if ($waktuAktual->lessThanOrEqualTo($batasWaktu)) {
            return 0;
        }

        $detikTerlambat = $batasWaktu->diffInSeconds($waktuAktual) - (self::GRACE_PERIOD_MINUTES * 60);

        if ($detikTerlambat <= 0) {
            return 0;
        }

        return (int) ceil($detikTerlambat / 3600);
    }

    /**
     * Konversi jumlah jam terlambat menjadi nominal denda (Rupiah).
     */
    public static function hitungDenda(int $jamTerlambat): float
    {
        return max(0, $jamTerlambat) * self::RATE_PER_HOUR;
    }

    /**
     * Helper sekali panggil: kembalikan jam terlambat + denda sekaligus.
     *
     * @return array{jam_overtime: int, denda_overtime: float}
     */
    public static function hitung(Carbon $batasWaktu, Carbon $waktuAktual): array
    {
        $jam = self::hitungJamTerlambat($batasWaktu, $waktuAktual);

        return [
            'jam_overtime' => $jam,
            'denda_overtime' => self::hitungDenda($jam),
        ];
    }

    /**
     * Bangun objek Carbon "batas waktu seharusnya kembali" dari kolom
     * tanggal_selesai (date) + jam_selesai (time string "HH:mm" / "HH:mm:ss").
     * Kalau jam_selesai kosong, dianggap akhir hari (23:59) — konsisten
     * dengan asumsi yang dulu dipakai di frontend.
     */
    public static function batasWaktuDari(Carbon $tanggalSelesai, ?string $jamSelesai): Carbon
    {
        return Carbon::parse($tanggalSelesai->toDateString().' '.($jamSelesai ?: '23:59'));
    }
}
