<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserDevice extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'device_id',
        'device_name',
        'ip_address',
        'user_agent',
        'last_used_at',
        'trusted_until',
    ];

    protected $casts = [
        'last_used_at' => 'datetime',
        'trusted_until' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function isTrusted(): bool
    {
        return $this->trusted_until !== null
            && $this->trusted_until->isFuture();
    }
}