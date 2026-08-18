<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;

class Setting extends Model
{
    use HasFactory;

    public const DEFAULT_BIAYA_DENGAN_DRIVER_PER_HARI = 150000;

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
        try {
            return Cache::remember("setting:{$key}", 3600, fn () => static::where('key', $key)->value('value') ?? $default);
        } catch (\Throwable) {
            return static::where('key', $key)->value('value') ?? $default;
        }
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

    /**
     * Tarif supir global untuk opsi "dengan supir" (per hari).
     */
    public static function getTarifDenganDriverPerHari(): int
    {
        return (int) static::get('biaya_dengan_driver_per_hari', self::DEFAULT_BIAYA_DENGAN_DRIVER_PER_HARI);
    }
}
