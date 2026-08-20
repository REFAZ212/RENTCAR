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

        $candidates = Order::whereIn('status_order', ['active', 'perlu_verifikasi'])
            ->with(['customer', 'kendaraan'])
            ->get()
            // Task return masih menunggu: belum ada inspeksi return & belum diklaim.
            ->filter(function (Order $order) {
                if ($order->operator_id) {
                    return false;
                }

                return ! $order->inspeksis()->where('jenis', 'return')->exists();
            })
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
                    ->whereDate('created_at', now()->toDateString())
                    ->exists();
            })
            ->values();

        if ($candidates->isEmpty()) {
            $this->info('Tidak ada task pengembalian yang perlu diberitahukan.');

            return self::SUCCESS;
        }

        $service = app(OrderService::class);

        foreach ($candidates as $order) {
            $service->kirimNotifTaskOperator($order, 'return');
        }

        $this->info("{$candidates->count()} task pengembalian di-broadcast ke petugas.");

        return self::SUCCESS;
    }
}
