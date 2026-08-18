<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Laravel\Sanctum\HasApiTokens;

class SupirCalo extends Authenticatable
{
    use HasApiTokens, HasFactory;

    protected $fillable = [
        'jenis',
        'nama',
        'email',
        'password',
        'no_hp',
        'alamat',
        'status',
        'no_sim',
        'foto',
        'tarif_per_hari',
        'komisi',
        'catatan',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected $casts = [
        'password' => 'hashed',
        'tarif_per_hari' => 'decimal:2',
        'komisi' => 'decimal:2',
    ];

    public function scopeJenis(Builder $query, string $jenis): Builder
    {
        return $query->where('jenis', $jenis);
    }

    public function ordersAsSupir(): HasMany
    {
        return $this->hasMany(Order::class, 'supir_id');
    }

    public function ordersAsCalo(): HasMany
    {
        return $this->hasMany(Order::class, 'calo_id');
    }
}
