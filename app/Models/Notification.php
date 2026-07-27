<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Notification extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'type',
        'title',
        'message',
        'data',
        'read_at',
    ];

    protected $casts = [
        'user_id' => 'integer',
        'data' => 'array',
        'read_at' => 'datetime',
    ];

    public function markAsRead(): void
    {
        if (is_null($this->read_at)) {
            $this->update(['read_at' => now()]);
        }
    }

    public function markAllAsRead(?int $userId = null): void
    {
        $query = static::query()->whereNull('read_at');
        if ($userId) {
            $query->where('user_id', $userId);
        }
        $query->update(['read_at' => now()]);
    }

    public function scopeForUser($query, ?int $userId)
    {
        if ($userId) {
            $query->where('user_id', $userId);
        }

        return $query;
    }
}
