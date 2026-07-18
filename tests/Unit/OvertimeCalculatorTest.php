<?php

namespace Tests\Unit;

use App\Services\OvertimeCalculator;
use Carbon\Carbon;
use PHPUnit\Framework\TestCase;

class OvertimeCalculatorTest extends TestCase
{
    public function test_tidak_terlambat_tidak_kena_denda(): void
    {
        $batas = Carbon::parse('2026-01-10 17:00');
        $aktual = Carbon::parse('2026-01-10 17:00'); // tepat waktu

        $hasil = OvertimeCalculator::hitung($batas, $aktual);

        $this->assertSame(0, $hasil['jam_overtime']);
        $this->assertSame(0.0, $hasil['denda_overtime']);
    }

    public function test_kembali_lebih_awal_tidak_kena_denda(): void
    {
        $batas = Carbon::parse('2026-01-10 17:00');
        $aktual = Carbon::parse('2026-01-10 15:00');

        $hasil = OvertimeCalculator::hitung($batas, $aktual);

        $this->assertSame(0, $hasil['jam_overtime']);
        $this->assertSame(0.0, $hasil['denda_overtime']);
    }

    public function test_terlambat_satu_detik_tetap_kena_satu_blok_penuh(): void
    {
        // Regression test: sebelumnya pakai diffInMinutes() yang membulatkan
        // ke bawah, jadi telat 1 detik dianggap "0 menit" dan lolos tanpa
        // denda. Sekarang harus tetap kena 1 blok jam penuh.
        $batas = Carbon::parse('2026-01-10 17:00:00');
        $aktual = Carbon::parse('2026-01-10 17:00:01');

        $hasil = OvertimeCalculator::hitung($batas, $aktual);

        $this->assertSame(1, $hasil['jam_overtime']);
        $this->assertSame(25000.0, $hasil['denda_overtime']);
    }

    public function test_terlambat_satu_menit_tetap_kena_satu_blok_penuh(): void
    {
        $batas = Carbon::parse('2026-01-10 17:00');
        $aktual = Carbon::parse('2026-01-10 17:01');

        $hasil = OvertimeCalculator::hitung($batas, $aktual);

        $this->assertSame(1, $hasil['jam_overtime']);
        $this->assertSame(25000.0, $hasil['denda_overtime']);
    }

    public function test_terlambat_tepat_satu_jam_kena_satu_blok(): void
    {
        $batas = Carbon::parse('2026-01-10 17:00');
        $aktual = Carbon::parse('2026-01-10 18:00');

        $hasil = OvertimeCalculator::hitung($batas, $aktual);

        $this->assertSame(1, $hasil['jam_overtime']);
        $this->assertSame(25000.0, $hasil['denda_overtime']);
    }

    public function test_terlambat_satu_jam_satu_menit_masuk_blok_kedua(): void
    {
        $batas = Carbon::parse('2026-01-10 17:00');
        $aktual = Carbon::parse('2026-01-10 18:01');

        $hasil = OvertimeCalculator::hitung($batas, $aktual);

        $this->assertSame(2, $hasil['jam_overtime']);
        $this->assertSame(50000.0, $hasil['denda_overtime']);
    }

    public function test_terlambat_lintas_hari_dihitung_benar(): void
    {
        $batas = Carbon::parse('2026-01-10 23:30');
        $aktual = Carbon::parse('2026-01-11 01:15'); // telat 1 jam 45 menit

        $hasil = OvertimeCalculator::hitung($batas, $aktual);

        $this->assertSame(2, $hasil['jam_overtime']);
        $this->assertSame(50000.0, $hasil['denda_overtime']);
    }

    public function test_batas_waktu_dari_pakai_default_23_59_kalau_jam_kosong(): void
    {
        $tanggal = Carbon::parse('2026-01-10');

        $batas = OvertimeCalculator::batasWaktuDari($tanggal, null);

        $this->assertSame('2026-01-10 23:59:00', $batas->toDateTimeString());
    }

    public function test_hitung_denda_langsung_dari_jumlah_jam(): void
    {
        $this->assertSame(0.0, OvertimeCalculator::hitungDenda(0));
        $this->assertSame(25000.0, OvertimeCalculator::hitungDenda(1));
        $this->assertSame(125000.0, OvertimeCalculator::hitungDenda(5));
    }
}
