<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;

class Customer extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'nama_lengkap',
        'no_hp',
        'email',
        'alamat',
        'no_ktp',
        'no_sim',
        'foto_ktp',
        'foto_sim',
        'foto_paspor',
        'catatan',
    ];

    public function setNoHpAttribute(string $value): void
    {
        $normalized = preg_replace('/[^0-9]/', '', $value);
        if (str_starts_with($normalized, '0')) {
            $normalized = '62'.substr($normalized, 1);
        } elseif (str_starts_with($normalized, '8')) {
            $normalized = '62'.$normalized;
        }
        $this->attributes['no_hp'] = $normalized;
    }

    public function orders(): HasMany
    {
        return $this->hasMany(Order::class);
    }

    public function latestOrder(): HasOne
    {
        return $this->hasOne(Order::class)->latestOfMany();
    }
}
