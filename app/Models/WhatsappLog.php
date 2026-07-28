<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WhatsappLog extends Model
{
    use HasFactory;

    protected $fillable = [
        'garasi_request_id',
        'order_id',
        'type',
        'nomor_tujuan',
        'pesan',
        'status_kirim',
        'response',
    ];

    public function garasiRequest(): BelongsTo
    {
        return $this->belongsTo(GarasiRequest::class);
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }
}
