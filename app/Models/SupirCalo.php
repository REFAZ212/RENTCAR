<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SupirCalo extends Model
{
    use HasFactory;

    protected $fillable = [
        'jenis',
        'nama',
        'no_hp',
        'alamat',
        'status',
        'no_sim',
        'foto',
        'tarif_per_hari',
        'catatan',
    ];

    protected $casts = [
        'tarif_per_hari' => 'decimal:2',
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

    public function orders(): HasMany
    {
        return $this->hasMany(Order::class);
    }
}
