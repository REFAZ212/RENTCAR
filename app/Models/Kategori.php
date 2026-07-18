<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class Kategori extends Model
{
    use HasFactory;

    protected $fillable = [
        'nama_kategori',
        'slug',
        'deskripsi',
        'aktif',
    ];

    protected $casts = [
        'aktif' => 'boolean',
    ];

    protected static function booted(): void
    {
        static::creating(function (Kategori $kategori) {
            if (empty($kategori->slug)) {
                $kategori->slug = Str::slug($kategori->nama_kategori);
            }
        });

        static::updating(function (Kategori $kategori) {
            if ($kategori->isDirty('nama_kategori') && ! $kategori->isDirty('slug')) {
                $kategori->slug = Str::slug($kategori->nama_kategori);
            }
        });
    }

    public function tipes(): HasMany
    {
        return $this->hasMany(Tipe::class);
    }

    public function kendaraans(): HasMany
    {
        return $this->hasMany(Kendaraan::class);
    }
}
