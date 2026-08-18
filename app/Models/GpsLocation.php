<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class GpsLocation extends Model
{
    use HasFactory;

    protected $fillable = [
        'gps_device_id',
        'lat',
        'lng',
        'speed_kmh',
        'heading',
        'fuel_percent',
        'recorded_at',
    ];

    protected $casts = [
        'lat' => 'decimal:7',
        'lng' => 'decimal:7',
        'speed_kmh' => 'integer',
        'heading' => 'integer',
        'fuel_percent' => 'integer',
        'recorded_at' => 'datetime',
    ];

    public function device(): BelongsTo
    {
        return $this->belongsTo(GpsDevice::class, 'gps_device_id');
    }
}
