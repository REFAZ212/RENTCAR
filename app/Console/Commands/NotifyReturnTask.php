<?php

namespace App\Console\Commands;

use App\Models\Order;
use App\Models\WhatsappLog;
use App\Services\OrderService;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

#[Signature('task:notify-return')]
#[Description('Broadcast return-inspection tasks to free petugas via WhatsApp when the return deadline is near or overdue')]
class NotifyReturnTask extends Command
{
    public function handle(): int
    {
        $batasBawah = now()->subHours(24);
        $batasAtas = now()->addHours(24);

        // `lazyById` memproses order per-batch — tidak memuat semua ke memori.
        // Pre-load boolean `has_return_inspeksi` lewat `withExists` supaya tidak
        // N+1 (1 query per order untuk cek inspeksi return).
        $service = app(OrderService::class);
        $count = 0;

        Order::whereIn('status_order', ['active', 'perlu_verifikasi'])
            ->with(['customer', 'kendaraan'])
            ->withExists(['inspeksis as has_return_inspeksi' => fn ($q) => $q->where('jenis', 'return')])
            ->lazyById(200, 'id')
            // Task return masih menunggu: belum ada inspeksi return & belum diklaim.
            ->filter(fn (Order $order) => ! $order->operator_id && ! $order->has_return_inspeksi)
            // Batas pengembalian di jendela ±24 jam: sudah lewat (max 24 jam)
            // atau akan jatuh tempo dalam 24 jam ke depan.
            ->filter(function (Order $order) use ($batasBawah, $batasAtas) {
                $batas = $order->batasWaktuKembali();

                return $batas && $batas->gte($batasBawah) && $batas->lte($batasAtas);
            })
            // Hanya sekali sehari per order — hindari spam tiap 30 menit.
            ->filter(function (Order $order) {
                return ! WhatsappLog::where('type', 'task_inspeksi_return')
                    ->where('order_id', $order->id)
                    ->whereBetween('created_at', [now()->startOfDay(), now()->copy()->endOfDay()])
                    ->exists();
            })
            ->each(function (Order $order) use ($service, &$count): void {
                $service->kirimNotifTaskOperator($order, 'return');
                $count++;
            });

        $this->info("{$count} task pengembalian di-broadcast ke petugas.");

        return self::SUCCESS;
    }
}
