<?php

namespace App\Models;

use App\Services\OvertimeCalculator;
use Carbon\Carbon;
use DateTimeInterface;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class Order extends Model
{
    use HasFactory, LogsActivity, SoftDeletes;

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logAll()
            ->logOnlyDirty();
    }

    /**
     * @deprecated Pakai App\Services\OvertimeCalculator::RATE_PER_HOUR.
     * Tetap disediakan supaya kode lama yang masih mereferensikan
     * Order::OVERTIME_RATE_PER_HOUR tidak langsung rusak.
     */
    public const OVERTIME_RATE_PER_HOUR = OvertimeCalculator::RATE_PER_HOUR;

    protected $fillable = [
        'kode_order',
        'source',
        'customer_id',
        'kendaraan_id',
        'alamat_jemput',
        'tujuan',
        'admin_id',
        'operator_id',
        'waktu_klaim',
        'tanggal_mulai',
        'tanggal_selesai',
        'jam_mulai',
        'jam_selesai',
        'durasi_hari',
        'harga_per_hari',
        'harga_total',
        'status_order',
        'metode_pembayaran',
        'status_pembayaran',
        'status_pengiriman',
        'metode_penyerahan',
        'bukti_transfer',
        'bukti_pengiriman',
        'bukti_pengembalian',
        'supir_id',
        'calo_id',
        'opsi_supir',
        'komisi_calo',
        'catatan',
        'alasan_pembatalan',
        'tanggal_pengembalian_aktual',
        'waktu_perlu_verifikasi',
        'tanggal_jatuh_tempo',
        'jam_overtime',
        'denda_overtime',
        'biaya_pembatalan',
        'total_refund',
        'biaya_kerusakan',
    ];

    protected $casts = [
        'tanggal_mulai' => 'date',
        'tanggal_selesai' => 'date',
        'tanggal_pengembalian_aktual' => 'datetime',
        'waktu_perlu_verifikasi' => 'datetime',
        'waktu_klaim' => 'datetime',
        'tanggal_jatuh_tempo' => 'date',
        'durasi_hari' => 'integer',
        'harga_per_hari' => 'decimal:2',
        'harga_total' => 'decimal:2',
        'komisi_calo' => 'decimal:2',
        'jam_overtime' => 'integer',
        'denda_overtime' => 'decimal:2',
        'biaya_pembatalan' => 'decimal:2',
        'total_refund' => 'decimal:2',
        'biaya_kerusakan' => 'decimal:2',
    ];

    /**
     * Serialisasi tanggal untuk response JSON.
     *
     * Kolom bertipe DATE (tanggal_mulai, tanggal_selesai, tanggal_jatuh_tempo)
     * selalu tengah malam WIB, jadi dikirim polos "Y-m-d" supaya frontend
     * menampilkan tanggal yang sama dengan yang dipilih user. Kalau dibiarkan
     * default (ISO8601 UTC), tanggal 05 00:00 WIB berubah jadi "04T17:00Z" dan
     * tampil mundur 1 hari di admin panel.
     *
     * Kolom bertipe DATETIME (created_at, updated_at, dsb.) tetap dikirim
     * ISO8601 supaya `new Date(...)` di JavaScript bisa parse dengan benar.
     */
    protected function serializeDate(DateTimeInterface $date): string
    {
        $wib = Carbon::instance($date)->setTimezone(config('app.timezone'));

        return $wib->format('H:i:s') === '00:00:00'
            ? $wib->format('Y-m-d')
            : $date->toJSON();
    }

    /**
     * Selalu ikut dikirim di response JSON, supaya frontend tidak perlu
     * menghitung ulang overtime pakai jam di browser (rawan salah timezone).
     */
    protected $appends = [
        'jam_overtime_saat_ini',
        'denda_overtime_saat_ini',
    ];

    protected static function booted(): void
    {
        static::creating(function (Order $order) {
            if (empty($order->kode_order)) {
                $order->kode_order = 'ORD-'.strtoupper(Str::random(8));
            }
        });

        static::forceDeleting(function (Order $order) {
            foreach (['bukti_transfer', 'bukti_pengiriman', 'bukti_pengembalian'] as $field) {
                if ($order->$field && Storage::disk('public')->exists($order->$field)) {
                    Storage::disk('public')->delete($order->$field);
                }
            }
        });
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class)->withTrashed();
    }

    public function kendaraan(): BelongsTo
    {
        return $this->belongsTo(Kendaraan::class);
    }

    public function admin(): BelongsTo
    {
        return $this->belongsTo(User::class, 'admin_id');
    }

    public function operator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'operator_id');
    }

    public function supir(): BelongsTo
    {
        return $this->belongsTo(SupirCalo::class, 'supir_id');
    }

    public function calo(): BelongsTo
    {
        return $this->belongsTo(SupirCalo::class, 'calo_id');
    }

    public function garasiRequests(): HasMany
    {
        return $this->hasMany(GarasiRequest::class);
    }

    public function pembayarans(): HasMany
    {
        return $this->hasMany(Pembayaran::class);
    }

    public function inspeksis(): HasMany
    {
        return $this->hasMany(InspeksiKendaraan::class);
    }

    /**
     * Jenis task yang sedang menanti petugas: 'pickup' (order dikonfirmasi,
     * belum ada inspeksi pickup), 'return' (order aktif/perlu verifikasi,
     * belum ada inspeksi return), atau null (tidak ada task).
     */
    public function taskJenis(): ?string
    {
        if ($this->status_order === 'confirmed' && ! $this->inspeksis()->where('jenis', 'pickup')->exists()) {
            return 'pickup';
        }

        if (in_array($this->status_order, ['active', 'perlu_verifikasi']) && ! $this->inspeksis()->where('jenis', 'return')->exists()) {
            return 'return';
        }

        return null;
    }

    /**
     * Apakah task order ini sudah diklaim petugas (operator) lain?
     */
    public function isTaskClaimed(): bool
    {
        return $this->operator_id !== null;
    }

    /**
     * Apakah user yang diberikan adalah pemegang klaim task ini?
     */
    public function isClaimant(int $userId): bool
    {
        return $this->operator_id === $userId;
    }

    /**
     * Apakah klaim sudah melewati batas waktu eksekusi (setting durasi_klaim_menit)?
     */
    public function isClaimExpired(): bool
    {
        if (! $this->waktu_klaim) {
            return false;
        }

        $durasiMenit = (int) Setting::get('durasi_klaim_menit', 30);

        return $this->waktu_klaim->copy()->addMinutes($durasiMenit)->lessThan(now());
    }

    /**
     * Peta transisi status_order yang diizinkan.
     * Kunci = status asal, nilai = array status tujuan yang valid.
     * Order yang sudah "terminal" (completed/cancelled) tidak boleh berubah.
     */
    private const ALLOWED_TRANSITIONS = [
        'pending' => ['confirmed', 'active', 'cancelled'],
        'confirmed' => ['active', 'cancelled'],
        'active' => ['perlu_verifikasi', 'completed', 'cancelled'],
        'perlu_verifikasi' => ['active', 'completed', 'cancelled'],
    ];

    /**
     * Cek apakah transisi dari status saat ini ke $newStatus diperbolehkan.
     */
    public function canTransitionTo(string $newStatus): bool
    {
        if (! isset(self::ALLOWED_TRANSITIONS[$this->status_order])) {
            return false;
        }

        return in_array($newStatus, self::ALLOWED_TRANSITIONS[$this->status_order]);
    }

    /**
     * Batas waktu order ini seharusnya sudah dikembalikan.
     * Dihitung langsung dari tanggal_selesai (kesepakatan) + jam_selesai.
     * durasi_hari tidak dipakai di sini karena sifatnya tagihan (pembulatan
     * ke atas per 24 jam) — bukan penunjuk tanggal kalender.
     */
    public function batasWaktuKembali(): ?Carbon
    {
        if (! $this->tanggal_selesai) {
            return null;
        }

        $batas = Carbon::parse($this->tanggal_selesai);

        if ($this->jam_selesai) {
            $batas->setTimeFromTimeString($this->jam_selesai);
        } else {
            $batas->setTime(23, 59);
        }

        return $batas;
    }

    /**
     * Jam keterlambatan REAL-TIME untuk order yang masih berjalan (status "active").
     * Dihitung pakai waktu server (bukan waktu browser admin), jadi hasilnya konsisten
     * untuk semua orang yang membuka aplikasi ini dari device manapun.
     *
     * Untuk order yang sudah "completed", pakai kolom `jam_overtime` (nilai final
     * yang di-set oleh selesaikanSewa()) — bukan accessor ini.
     */
    public function getJamOvertimeSaatIniAttribute(): int
    {
        $batas = $this->batasWaktuKembali();

        // For terminal/frozen orders, return the stored final value.
        // "perlu_verifikasi" sudah di-freeze oleh OrderVerifyOverdue, jadi
        // denda tidak boleh terus membengkak sebelum admin menindaklanjuti.
        if (in_array($this->status_order, ['completed', 'cancelled', 'perlu_verifikasi'])) {
            return (int) $this->getOriginal('jam_overtime', 0);
        }

        if ($this->status_order !== 'active' || ! $batas) {
            return 0;
        }

        $s = Setting::getOvertimeSettings();

        return OvertimeCalculator::hitungJamTerlambat($batas, now(), $s['grace']);
    }

    public function getDendaOvertimeSaatIniAttribute(): float
    {
        // For terminal/frozen orders, return the stored final value.
        if (in_array($this->status_order, ['completed', 'cancelled', 'perlu_verifikasi'])) {
            return (float) $this->getOriginal('denda_overtime', 0);
        }

        $s = Setting::getOvertimeSettings();

        return OvertimeCalculator::hitungDenda($this->jam_overtime_saat_ini, $s['rate']);
    }

    /**
     * Proyeksi nilai final saat sewa diselesaikan: jam & denda keterlambatan,
     * harga total (sudah termasuk denda & tarif supir), dan durasi aktual.
     *
     * Satu-satunya sumber kebenaran untuk perhitungan penyelesaian — dipakai
     * oleh selesaikanSewa() (penyimpanan final) DAN oleh OrderService untuk
     * validasi "kurang bayar" sebelum order di-complete, supaya angkanya
     * selalu konsisten.
     *
     * @param  Carbon|null  $waktuAktual  Waktu kendaraan benar-benar dikembalikan.
     *                                    null = fallback ke now().
     * @return array{jam_overtime: int, denda_overtime: float, harga_total: float, durasi_hari: int}
     */
    public function proyeksiSelesai(?Carbon $waktuAktual = null): array
    {
        $batas = $this->batasWaktuKembali();
        $s = Setting::getOvertimeSettings();
        $waktuAktual = $waktuAktual ?? now();
        $durasiAktual = (int) $this->durasi_hari;

        $hargaDasar = (float) $this->harga_per_hari * $durasiAktual;

        $supirTarif = 0;
        if ($this->supir_id) {
            $supir = SupirCalo::find($this->supir_id);
            $supirTarif = (float) ($supir?->tarif_per_hari ?? 0);
        } elseif ($this->opsi_supir === 'dengan_supir') {
            $supirTarif = (float) Setting::getTarifDenganDriverPerHari();
        }

        // Order yang pernah di-freeze oleh OrderVerifyOverdue (perlu_verifikasi):
        // denda mengikuti JANJI freeze yang sudah disampaikan, bukan dihitung
        // ulang dari nol. Hitungan aktual di waktu pengembalian dipakai hanya
        // jika LEBIH KECIL (tidak pernah menagih melebihi janji). Deteksi via
        // getOriginal() karena pemanggil (auto-complete) mengosongkan atribut
        // `waktu_perlu_verifikasi` sebelum memanggil metode ini.
        if ($this->getOriginal('waktu_perlu_verifikasi')) {
            $hitungAktual = $batas
                ? OvertimeCalculator::hitung($batas, $waktuAktual, $s['rate'], $s['grace'])
                : ['jam_overtime' => 0, 'denda_overtime' => 0];

            $jam = min((int) $this->getOriginal('jam_overtime', 0), $hitungAktual['jam_overtime']);
            $denda = min((float) $this->getOriginal('denda_overtime', 0), $hitungAktual['denda_overtime']);

            return [
                'jam_overtime' => $jam,
                'denda_overtime' => $denda,
                'harga_total' => $hargaDasar + ($supirTarif * $durasiAktual) + $denda,
                'durasi_hari' => $durasiAktual,
            ];
        }

        $hasil = $batas
            ? OvertimeCalculator::hitung($batas, $waktuAktual, $s['rate'], $s['grace'])
            : ['jam_overtime' => 0, 'denda_overtime' => 0];

        return [
            'jam_overtime' => $hasil['jam_overtime'],
            'denda_overtime' => $hasil['denda_overtime'],
            'harga_total' => $hargaDasar + ($supirTarif * $durasiAktual) + $hasil['denda_overtime'],
            'durasi_hari' => $durasiAktual,
        ];
    }

    /**
     * Finalisasi order: hitung overtime & denda per waktu SEKARANG (saat kendaraan
     * benar-benar dikembalikan), lalu simpan ke kolom jam_overtime / denda_overtime
     * dan perbarui harga_total supaya sudah termasuk denda. TIDAK menyimpan
     * (save()) sendiri — supaya controller bebas menggabungkannya dengan
     * perubahan lain (status_order, status_pengiriman, bukti_pengembalian, dst)
     * dalam satu kali save.
     *
     * Idempotent: aman dipanggil ulang, hasilnya selalu dihitung dari harga
     * dasar (harga_per_hari × durasi aktual), bukan menambah denda berkali-kali
     * ke harga_total yang sudah ada.
     *
     * Contoh pakai di controller:
     *   $order->status_order = 'completed';
     *   $order->status_pengiriman = 'selesai';
     *   $order->bukti_pengembalian = $path;
     *   $order->selesaikanSewa();
     *   $order->save();
     *
     * @param  Carbon|null  $waktuAktual  Waktu kendaraan benar-benar dikembalikan.
     *                                    null = fallback ke now() (backward-compat).
     */
    public function selesaikanSewa(?Carbon $waktuAktual = null): void
    {
        $s = Setting::getOvertimeSettings();
        $waktuAktual = $waktuAktual ?? now();
        $proyeksi = $this->proyeksiSelesai($waktuAktual);
        $batas = $this->batasWaktuKembali();

        $this->jam_overtime = $proyeksi['jam_overtime'];
        $this->denda_overtime = $proyeksi['denda_overtime'];
        $this->harga_total = $proyeksi['harga_total'];
        $this->durasi_hari = $proyeksi['durasi_hari'];
        $this->tanggal_pengembalian_aktual = $waktuAktual;

        if ($proyeksi['jam_overtime'] > 0 && $batas) {
            $waktuSelesai = $batas->format('d/m/Y H:i');
            $overtimeNote = "Kendaraan terlambat dikembalikan. Batas pengembalian: {$waktuSelesai} WIB. "
                ."Dikenakan denda keterlambatan {$proyeksi['jam_overtime']} jam × "
                .number_format($s['rate'], 0, ',', '.')
                .' = Rp '.number_format($proyeksi['denda_overtime'], 0, ',', '.').'.';
            // Idempotent: don't append if the note is already present (e.g. called twice).
            $existingNotes = $this->catatan ?? '';
            if (strpos($existingNotes, 'Dikenakan denda keterlambatan') === false) {
                $this->catatan = trim(($existingNotes ? $existingNotes."\n" : '').$overtimeNote);
            }
        }
    }

    /**
     * Hitung biaya pembatalan berdasarkan timing pembatalan.
     *
     * Kebijakan:
     * - > 7 hari sebelum mulai: GRATIS (0%)
     * - 3-7 hari sebelum mulai: 25% dari harga_total
     * - 1-3 hari sebelum mulai: 50% dari harga_total
     * - Hari H atau sudah aktif: 100% dari harga_total (tidak ada refund)
     *
     * @return array{biaya: float, persentase: int, keterangan: string}
     */
    public function hitungBiayaPembatalan(): array
    {
        $hargaTotal = (float) $this->harga_total;

        if ($this->status_order === 'active') {
            return [
                'biaya' => $hargaTotal,
                'persentase' => 100,
                'keterangan' => 'Order sudah aktif, tidak ada refund.',
            ];
        }

        $tanggalMulai = Carbon::parse($this->tanggal_mulai);
        $hariSebelumMulai = (int) now()->startOfDay()->diffInDays($tanggalMulai->startOfDay(), false);

        if ($hariSebelumMulai > 7) {
            return [
                'biaya' => 0,
                'persentase' => 0,
                'keterangan' => 'Pembatalan gratis (> 7 hari sebelum mulai).',
            ];
        }

        if ($hariSebelumMulai > 3) {
            $biaya = $hargaTotal * 0.25;

            return [
                'biaya' => $biaya,
                'persentase' => 25,
                'keterangan' => 'Denda pembatalan 25% (3-7 hari sebelum mulai): Rp '.number_format($biaya, 0, ',', '.'),
            ];
        }

        if ($hariSebelumMulai > 0) {
            $biaya = $hargaTotal * 0.50;

            return [
                'biaya' => $biaya,
                'persentase' => 50,
                'keterangan' => 'Denda pembatalan 50% (1-3 hari sebelum mulai): Rp '.number_format($biaya, 0, ',', '.'),
            ];
        }

        return [
            'biaya' => $hargaTotal,
            'persentase' => 100,
            'keterangan' => 'Pembatalan hari H atau sudah lewat jadwal, tidak ada refund.',
        ];
    }

    /**
     * Jumlah hari pengembalian lebih awal dari kesepakatan (tanggal_selesai).
     * 0 = tepat waktu atau telat.
     *
     * Kebijakan: pengembalian lebih awal TIDAK menghasilkan refund — tagihan
     * tetap sesuai kesepakatan (durasi penuh). Nilai ini hanya dipakai untuk
     * catatan otomatis di order & pesan WhatsApp.
     */
    public function hariLebihAwal(?Carbon $tanggalKembali = null): int
    {
        $kembali = ($tanggalKembali ?? now())->copy()->startOfDay();

        // diffInDays(..., false) = selisih bertanda (tanggal_selesai − kembali):
        // positif bila kembali lebih awal dari tanggal_selesai, negatif/0 bila
        // tepat waktu atau telat.
        return max(0, (int) $kembali->diffInDays($this->tanggal_selesai->startOfDay(), false));
    }
}
