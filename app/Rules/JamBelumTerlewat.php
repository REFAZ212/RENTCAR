<?php

namespace App\Rules;

use Carbon\Carbon;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

/**
 * Menolak jam (jam_mulai / jam_selesai) yang sudah terlewat di hari yang sama.
 *
 * Aturan tanggal (mis. after_or_equal:today) hanya membandingkan TANGGAL,
 * jadi order "hari ini" tetap bisa dibuat dengan jam yang sudah lewat
 * (mis. jam_mulai 08:00 padahal sekarang sudah 15:00). Rule ini menutup
 * celah tersebut: kalau tanggal yang bersangkutan adalah HARI INI, jamnya
 * harus masih setelah waktu sekarang.
 *
 * Untuk tanggal selain hari ini (besok/lusa) rule ini selalu lolos —
 * booking untuk hari lain bebas jam berapa pun.
 */
class JamBelumTerlewat implements ValidationRule
{
    private ?string $tanggal;

    public function __construct(?string $tanggal)
    {
        $this->tanggal = $tanggal;
    }

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (! $this->tanggal || ! $value) {
            return;
        }

        $tanggal = Carbon::parse($this->tanggal);
        if (! $tanggal->isToday()) {
            return;
        }

        $jamWaktu = Carbon::parse($value);
        if ($jamWaktu->lessThanOrEqualTo(now())) {
            $label = $attribute === 'jam_mulai' ? 'Jam mulai' : 'Jam selesai';
            $fail("{$label} ({$value}) sudah terlewat dari waktu sekarang. Pilih jam setelah sekarang.");
        }
    }
}
