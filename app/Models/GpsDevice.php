<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class GpsDevice extends Model
{
    use HasFactory;

    protected $fillable = [
        'kendaraan_id',
        'api_key',
        'device_identifier',
        'nama_perangkat',
        'status_aktif',
        'catatan',
    ];

    protected $casts = [
        'status_aktif' => 'boolean',
    ];

    public function kendaraan(): BelongsTo
    {
        return $this->belongsTo(Kendaraan::class);
    }

    public function locations(): HasMany
    {
        return $this->hasMany(GpsLocation::class);
    }

    /**
     * Buat api_key baru (dipakai payload push vendor / simulasi).
     */
    public static function generateApiKey(): string
    {
        return 'gps_'.Str::random(40);
    }
}
