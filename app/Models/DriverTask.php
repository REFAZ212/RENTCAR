<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class DriverTask extends Model
{
    use HasFactory;

    public const STATUS_PENDING = 'pending';

    public const STATUS_AVAILABLE = 'available';

    public const STATUS_ACCEPTED = 'accepted';

    public const STATUS_INSPECTION_BEFORE = 'inspection_before';

    public const STATUS_ON_DELIVERY = 'on_delivery';

    public const STATUS_ARRIVED = 'arrived';

    public const STATUS_INSPECTION_AFTER = 'inspection_after';

    public const STATUS_COMPLETED = 'completed';

    public const STATUS_CANCELLED = 'cancelled';

    protected $fillable = [
        'kode_task',
        'order_id',
        'kendaraan_id',
        'judul',
        'deskripsi',
        'pickup_location',
        'pickup_lat',
        'pickup_lng',
        'destination_location',
        'destination_lat',
        'destination_lng',
        'status',
        'assigned_driver_id',
        'accepted_at',
        'inspection_before_id',
        'inspection_after_id',
        'started_delivery_at',
        'start_lat',
        'start_lng',
        'start_accuracy',
        'arrived_at',
        'arrive_lat',
        'arrive_lng',
        'arrive_accuracy',
        'completed_at',
        'cancelled_at',
        'cancel_reason',
        'created_by',
    ];

    protected $casts = [
        'pickup_lat' => 'decimal:7',
        'pickup_lng' => 'decimal:7',
        'destination_lat' => 'decimal:7',
        'destination_lng' => 'decimal:7',
        'start_lat' => 'decimal:7',
        'start_lng' => 'decimal:7',
        'start_accuracy' => 'decimal:2',
        'arrive_lat' => 'decimal:7',
        'arrive_lng' => 'decimal:7',
        'arrive_accuracy' => 'decimal:2',
        'accepted_at' => 'datetime',
        'started_delivery_at' => 'datetime',
        'arrived_at' => 'datetime',
        'completed_at' => 'datetime',
        'cancelled_at' => 'datetime',
    ];

    protected static function booted(): void
    {
        static::creating(function (DriverTask $task) {
            if (empty($task->kode_task)) {
                $task->kode_task = 'TRX-'.strtoupper(Str::random(8));
            }
        });
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    public function kendaraan(): BelongsTo
    {
        return $this->belongsTo(Kendaraan::class);
    }

    public function assignedDriver(): BelongsTo
    {
        return $this->belongsTo(SupirCalo::class, 'assigned_driver_id');
    }

    public function inspectionBefore(): BelongsTo
    {
        return $this->belongsTo(InspeksiKendaraan::class, 'inspection_before_id');
    }

    public function inspectionAfter(): BelongsTo
    {
        return $this->belongsTo(InspeksiKendaraan::class, 'inspection_after_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function isAssignedTo(SupirCalo $supir): bool
    {
        return $this->assigned_driver_id === $supir->id;
    }

    public function isActive(): bool
    {
        return in_array($this->status, [
            self::STATUS_ACCEPTED,
            self::STATUS_INSPECTION_BEFORE,
            self::STATUS_ON_DELIVERY,
            self::STATUS_ARRIVED,
            self::STATUS_INSPECTION_AFTER,
        ]);
    }
}
