<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class InspeksiKendaraan extends Model
{
    use HasFactory, LogsActivity;

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logAll()
            ->logOnlyDirty();
    }

    protected $fillable = [
        'order_id',
        'jenis',
        'odometer',
        'fuel_level',
        'kondisi_body',
        'kondisi_interior',
        'kondisi_ban',
        'kondisi_ac',
        'kondisi_lampu',
        'ada_damagenya',
        'deskripsi_kondisi',
        'catatan',
        'foto',
        'inspeksi_oleh',
        'admin_id',
    ];

    protected $casts = [
        'odometer' => 'integer',
        'ada_damagenya' => 'boolean',
    ];

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    public function admin(): BelongsTo
    {
        return $this->belongsTo(User::class, 'admin_id');
    }
}
