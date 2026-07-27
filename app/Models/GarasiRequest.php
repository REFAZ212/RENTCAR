<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class GarasiRequest extends Model
{
    use HasFactory, SoftDeletes;

    private const ALLOWED_TRANSITIONS = [
        'pending' => ['tersedia', 'tidak_terjawab'],
    ];

    public function canTransitionTo(string $status): bool
    {
        if (! isset(self::ALLOWED_TRANSITIONS[$this->status_permintaan])) {
            return false;
        }

        return in_array($status, self::ALLOWED_TRANSITIONS[$this->status_permintaan]);
    }

    protected $fillable = [
        'order_id',
        'garasi_partner_id',
        'token',
        'status_permintaan',
        'pesan_wa_terkirim',
        'waktu_kirim',
        'waktu_respon',
        'deadline',
        'catatan_admin',
        'catatan_garasi',
    ];

    protected $casts = [
        'waktu_kirim' => 'datetime',
        'waktu_respon' => 'datetime',
        'deadline' => 'datetime',
    ];

    protected static function booted(): void
    {
        static::creating(function (GarasiRequest $request) {
            if (empty($request->token)) {
                $request->token = Str::random(64);
            }
        });
    }

    public function isExpired(): bool
    {
        return $this->deadline && $this->deadline->isPast() && $this->status_permintaan === 'pending';
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    public function garasiPartner(): BelongsTo
    {
        return $this->belongsTo(GarasiPartner::class);
    }

    public function whatsappLogs(): HasMany
    {
        return $this->hasMany(WhatsappLog::class);
    }
}
