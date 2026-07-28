<?php

namespace App\Console\Commands;

use App\Models\Notification;
use App\Models\Order;
use App\Models\Setting;
use App\Services\WhatsAppService;
use Carbon\Carbon;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

#[Signature('order:reminder-payment')]
#[Description('Send payment due date reminders to customers via WhatsApp')]
class OrderReminderPayment extends Command
{
    public function handle(): int
    {
        $today = now()->timezone('Asia/Jakarta')->startOfDay();

        $ordersWithDueDate = Order::whereNotNull('tanggal_jatuh_tempo')
            ->whereIn('status_order', ['pending', 'confirmed', 'active'])
            ->whereIn('status_pembayaran', ['unpaid', 'partial'])
            ->with(['customer', 'kendaraan'])
            ->get()
            ->filter(function (Order $order) use ($today) {
                $jatuhTempo = Carbon::parse($order->tanggal_jatuh_tempo);
                $hari = (int) $today->diffInDays($jatuhTempo->startOfDay(), false);

                return $hari >= -3 && $hari <= 3;
            })
            ->values();

        if ($ordersWithDueDate->isEmpty()) {
            $this->info('Tidak ada order dengan pembayaran mendekati jatuh tempo.');

            return self::SUCCESS;
        }

        $waEnabled = Setting::get('notif_pengingat_pembayaran', '1') === '1';
        $sentCount = 0;

        foreach ($ordersWithDueDate as $order) {
            $customer = $order->customer;
            $jatuhTempo = Carbon::parse($order->tanggal_jatuh_tempo);
            $hari = (int) now()->timezone('Asia/Jakarta')->startOfDay()->diffInDays($jatuhTempo->startOfDay(), false);

            if (! $customer || ! $customer->no_hp) {
                $this->warn("Order {$order->kode_order}: customer tanpa no HP, skip.");

                continue;
            }

            $totalBayar = (float) $order->pembayarans()->whereNull('deleted_at')->where('status', '!=', 'refund')->sum('jumlah');
            $kurangBayar = (float) $order->harga_total - $totalBayar;

            if ($kurangBayar <= 0) {
                continue;
            }

            $statusHari = match (true) {
                $hari < 0 => 'telat '.abs($hari).' hari',
                $hari === 0 => 'hari ini',
                $hari === 1 => 'besok',
                default => "dalam {$hari} hari",
            };

            if ($waEnabled) {
                $wa = app(WhatsAppService::class);
                $pesan = "Halo {$customer->nama_lengkap},\n\n"
                    ."Pengingat pembayaran untuk order *{$order->kode_order}*\n"
                    .'Kurang bayar: *Rp '.number_format($kurangBayar, 0, ',', '.')."*\n"
                    ."Jatuh tempo: *{$jatuhTempo->format('d/m/Y')}* ({$statusHari})\n\n"
                    .'Mohon segera lakukan pembayaran. Terima kasih.';
                $wa->kirimPesanAsync($customer->no_hp, $pesan);
                $sentCount++;
            }

            Notification::create([
                'type' => 'reminder_pembayaran',
                'title' => 'Pengingat Pembayaran',
                'message' => "Order {$order->kode_order} ({$customer->nama_lengkap}): kurang bayar Rp ".number_format($kurangBayar, 0, ',', '.')." jatuh tempo {$statusHari}.",
                'data' => [
                    'order_id' => $order->id,
                    'kode_order' => $order->kode_order,
                    'kurang_bayar' => $kurangBayar,
                    'tanggal_jatuh_tempo' => $jatuhTempo->toDateString(),
                    'link' => '/orders/'.$order->id,
                ],
            ]);
        }

        $this->info("{$ordersWithDueDate->count()} order perlu pengingat pembayaran. {$sentCount} pesan WA terkirim.");

        return self::SUCCESS;
    }
}
