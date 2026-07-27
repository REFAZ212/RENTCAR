<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;

class Setting extends Model
{
    use HasFactory;

    protected $fillable = [
        'key',
        'value',
    ];

    /**
     * Ambil nilai setting berdasarkan key. Di-cache per request supaya
     * tidak query DB berulang kali (setting jarang berubah).
     */
    public static function get(string $key, mixed $default = null): mixed
    {
        return Cache::remember("setting:{$key}", 3600, fn () => static::where('key', $key)->value('value') ?? $default);
    }

    /**
     * Simpan / update nilai setting + bust cache.
     */
    public static function set(string $key, mixed $value): static
    {
        Cache::forget("setting:{$key}");

        return static::updateOrCreate(['key' => $key], ['value' => $value]);
    }

    /**
     * Ambil semua pengaturan overtime sekaligus (rate + grace period).
     * Digunakan oleh Order model, SettingController, dan OvertimeCalculator.
     */
    public static function getOvertimeSettings(): array
    {
        return [
            'rate' => (int) static::get('overtime_rate_per_hour', 25000),
            'grace' => (int) static::get('grace_period_minutes', 0),
        ];
    }
}
