<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Kendaraan extends Model
{
    use HasFactory;

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
        'status',
        'foto',
        'catatan',
    ];

    protected $casts = [
        'tahun' => 'integer',
        'kapasitas_penumpang' => 'integer',
        'harga_sewa_per_hari' => 'decimal:2',
    ];

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
}
