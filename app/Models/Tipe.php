<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class Tipe extends Model
{
    use HasFactory;

    protected $fillable = [
        'kategori_id',
        'nama_tipe',
        'slug',
        'deskripsi',
        'aktif',
    ];

    protected $casts = [
        'aktif' => 'boolean',
    ];

    protected static function booted(): void
    {
        static::creating(function (Tipe $tipe) {
            if (empty($tipe->slug)) {
                $tipe->slug = Str::slug($tipe->nama_tipe);
            }
        });

        static::updating(function (Tipe $tipe) {
            if ($tipe->isDirty('nama_tipe') && ! $tipe->isDirty('slug')) {
                $tipe->slug = Str::slug($tipe->nama_tipe);
            }
        });
    }

    public function kategori(): BelongsTo
    {
        return $this->belongsTo(Kategori::class);
    }

    public function kendaraans(): HasMany
    {
        return $this->hasMany(Kendaraan::class);
    }
}
