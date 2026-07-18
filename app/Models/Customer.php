<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Customer extends Model
{
    use HasFactory;

    protected $fillable = [
        'nama_lengkap',
        'no_hp',
        'email',
        'alamat',
        'no_ktp',
        'no_sim',
        'foto_ktp',
        'foto_sim',
        'catatan',
    ];

    public function orders(): HasMany
    {
        return $this->hasMany(Order::class);
    }
}
