<?php

namespace App\Models;

use App\Services\OvertimeCalculator;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class Order extends Model
{
    use HasFactory;

    /**
     * @deprecated Pakai App\Services\OvertimeCalculator::RATE_PER_HOUR.
     * Tetap disediakan supaya kode lama yang masih mereferensikan
     * Order::OVERTIME_RATE_PER_HOUR tidak langsung rusak.
     */
    public const OVERTIME_RATE_PER_HOUR = OvertimeCalculator::RATE_PER_HOUR;

    protected $fillable = [
        'kode_order',
        'customer_id',
        'kendaraan_id',
        'admin_id',
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
        'bukti_transfer',
        'bukti_pengiriman',
        'bukti_pengembalian',
        'jam_overtime',
        'denda_overtime',
        'supir_id',
        'calo_id',
        'catatan',
    ];

    protected $casts = [
        'tanggal_mulai' => 'date',
        'tanggal_selesai' => 'date',
        'durasi_hari' => 'integer',
        'harga_per_hari' => 'decimal:2',
        'harga_total' => 'decimal:2',
        'jam_overtime' => 'integer',
        'denda_overtime' => 'decimal:2',
    ];

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
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function kendaraan(): BelongsTo
    {
        return $this->belongsTo(Kendaraan::class);
    }

    public function admin(): BelongsTo
    {
        return $this->belongsTo(User::class, 'admin_id');
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

    /**
     * Batas waktu order ini seharusnya sudah dikembalikan.
     * Dihitung dari tanggal_mulai + durasi_hari + jam_selesai,
     * bukan dari tanggal_selesai langsung karena tanggal_selesai
     * bisa salah input (mis. sama dengan tanggal_mulai).
     */
    public function batasWaktuKembali(): ?Carbon
    {
        if (! $this->tanggal_mulai || ! $this->durasi_hari) {
            return null;
        }

        $batas = Carbon::parse($this->tanggal_mulai)->addDays($this->durasi_hari);

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

        if ($this->status_order !== 'active' || ! $batas) {
            return 0;
        }

        return OvertimeCalculator::hitungJamTerlambat($batas, now());
    }

    public function getDendaOvertimeSaatIniAttribute(): float
    {
        return OvertimeCalculator::hitungDenda($this->jam_overtime_saat_ini);
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
     * dasar (harga_per_hari × durasi_hari), bukan menambah denda berkali-kali
     * ke harga_total yang sudah ada.
     *
     * Contoh pakai di controller:
     *   $order->status_order = 'completed';
     *   $order->status_pengiriman = 'selesai';
     *   $order->bukti_pengembalian = $path;
     *   $order->selesaikanSewa();
     *   $order->save();
     */
    public function selesaikanSewa(): void
    {
        $batas = $this->batasWaktuKembali();
        $hasil = $batas
            ? OvertimeCalculator::hitung($batas, now())
            : ['jam_overtime' => 0, 'denda_overtime' => 0];

        $hargaDasar = (float) $this->harga_per_hari * (int) $this->durasi_hari;

        $supirTarif = 0;
        if ($this->supir_id) {
            $supir = SupirCalo::find($this->supir_id);
            $supirTarif = (float) ($supir->tarif_per_hari ?? 0);
        }

        $this->jam_overtime = $hasil['jam_overtime'];
        $this->denda_overtime = $hasil['denda_overtime'];
        $this->harga_total = $hargaDasar + ($supirTarif * (int) $this->durasi_hari) + $hasil['denda_overtime'];

        if ($hasil['jam_overtime'] > 0) {
            $waktuSelesai = $batas->format('d/m/Y H:i');
            $this->catatan = trim(($this->catatan ? $this->catatan."\n" : '')
                ."Kendaraan terlambat dikembalikan. Batas pengembalian: {$waktuSelesai} WIB. "
                ."Dikenakan denda keterlambatan {$hasil['jam_overtime']} jam × "
                .number_format(OvertimeCalculator::RATE_PER_HOUR, 0, ',', '.')
                .' = Rp '.number_format($hasil['denda_overtime'], 0, ',', '.').'.');
        }
    }
}
