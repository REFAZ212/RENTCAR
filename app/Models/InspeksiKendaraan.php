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
        'status',
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
        'fotos',
        'videos',
        'checklist_serah_terima',
        'ttd_customer',
        'ttd_petugas',
        'biaya_kerusakan',
        'inspeksi_oleh',
        'admin_id',
    ];

    protected $casts = [
        'ada_damagenya' => 'boolean',
        'biaya_kerusakan' => 'decimal:2',
        'fotos' => 'array',
        'videos' => 'array',
        'checklist_serah_terima' => 'array',
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
