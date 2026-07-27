<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class GarasiPartner extends Model
{
    use HasFactory;

    protected $fillable = [
        'nama_garasi',
        'nama_pemilik',
        'alamat',
        'no_hp',
        'email',
        'status_aktif',
        'is_own',
        'metode_bagi_hasil',
        'persentase_bagi_hasil',
        'catatan',
    ];

    protected $casts = [
        'status_aktif' => 'boolean',
        'is_own' => 'boolean',
        'persentase_bagi_hasil' => 'decimal:2',
    ];

    public function kendaraans(): HasMany
    {
        return $this->hasMany(Kendaraan::class);
    }

    public function garasiRequests(): HasMany
    {
        return $this->hasMany(GarasiRequest::class);
    }
}
