<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class Kendaraan extends Model
{
    use HasFactory, LogsActivity;

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logAll()
            ->logOnlyDirty();
    }

    protected $fillable = [
        'garasi_partner_id',
        'kategori_id',
        'tipe_id',
        'nama_kendaraan',
        'plat_nomor',
        'merek',
        'model',
        'tahun',
        'warna',
        'kapasitas_penumpang',
        'harga_sewa_per_hari',
        'harga_partner_per_hari',
        'status',
        'foto',
        'catatan',
    ];

    protected $casts = [
        'tahun' => 'integer',
        'kapasitas_penumpang' => 'integer',
        'harga_sewa_per_hari' => 'decimal:2',
        'harga_partner_per_hari' => 'decimal:2',
    ];

    protected $appends = ['margin_per_hari', 'margin_persen'];

    public function getMarginPerHariAttribute(): ?float
    {
        if (! $this->harga_partner_per_hari) {
            return null;
        }

        return $this->harga_sewa_per_hari - $this->harga_partner_per_hari;
    }

    public function getMarginPersenAttribute(): ?float
    {
        if (! $this->harga_partner_per_hari || $this->harga_sewa_per_hari == 0) {
            return null;
        }

        return round(($this->margin_per_hari / $this->harga_sewa_per_hari) * 100, 1);
    }

    public function garasiPartner(): BelongsTo
    {
        return $this->belongsTo(GarasiPartner::class);
    }

    public function kategori(): BelongsTo
    {
        return $this->belongsTo(Kategori::class);
    }

    public function tipe(): BelongsTo
    {
        return $this->belongsTo(Tipe::class);
    }

    public function orders(): HasMany
    {
        return $this->hasMany(Order::class);
    }

    public function activeOrders(): HasMany
    {
        return $this->hasMany(Order::class)
            ->whereNull('deleted_at')
            ->whereIn('status_order', ['pending', 'confirmed', 'active', 'perlu_verifikasi']);
    }

    /**
     * Selaraskan kolom `status` dengan order yang sedang berjalan.
     *
     * Kendaraan dengan order belum-dihapus (active/perlu_verifikasi) wajib
     * berstatus `disewa`, sedangkan kendaraan `disewa` yang tidak lagi punya
     * order berjalan dikembalikan ke `tersedia`. Status manual lainnya
     * (tersedia/maintenance/tidak_tersedia) tanpa order berjalan tetap dibiarkan.
     * Idempotent — aman dipanggil berulang.
     */
    public static function sinkronkanStatusDariOrder(): void
    {
        $berjalan = fn ($q) => $q
            ->whereNull('deleted_at')
            ->whereIn('status_order', ['active', 'perlu_verifikasi']);

        static::where('status', '!=', 'disewa')
            ->whereHas('orders', $berjalan)
            ->update(['status' => 'disewa']);

        static::where('status', 'disewa')
            ->whereDoesntHave('orders', $berjalan)
            ->update(['status' => 'tersedia']);
    }

    public function gpsDevices(): HasMany
    {
        return $this->hasMany(GpsDevice::class);
    }
}
