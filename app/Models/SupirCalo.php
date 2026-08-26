<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Laravel\Sanctum\HasApiTokens;

class SupirCalo extends Authenticatable
{
    use HasApiTokens, HasFactory;

    protected $fillable = [
        'user_id',
        'jenis',
        'nama',
        'email',
        'password',
        'must_change_password',
        'no_hp',
        'alamat',
        'status',
        'driver_status',
        'fcm_token',
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
        'must_change_password' => 'boolean',
        'tarif_per_hari' => 'decimal:2',
        'komisi' => 'decimal:2',
    ];

    public function scopeJenis(Builder $query, string $jenis): Builder
    {
        return $query->where('jenis', $jenis);
    }

    /**
     * Tugas yang sedang dikerjakan pengemudi ini (accepted s/d inspection_after).
     * Dipakai mobile app untuk memblokir supir busy mengambil tugas baru.
     */
    public function activeDriverTask(): ?DriverTask
    {
        return DriverTask::where('assigned_driver_id', $this->id)
            ->whereIn('status', [
                DriverTask::STATUS_ACCEPTED,
                DriverTask::STATUS_INSPECTION_BEFORE,
                DriverTask::STATUS_ON_DELIVERY,
                DriverTask::STATUS_ARRIVED,
                DriverTask::STATUS_INSPECTION_AFTER,
            ])
            ->orderByDesc('id')
            ->first();
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
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
