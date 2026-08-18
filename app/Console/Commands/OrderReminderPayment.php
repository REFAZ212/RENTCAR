<?php

namespace App\Console\Commands;

use App\Models\Notification;
use App\Models\Order;
use App\Models\Setting;
use App\Models\WhatsappLog;
use App\Services\WhatsAppService;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

#[Signature('order:reminder-payment')]
#[Description('Send payment reminders to customers with unpaid or partially paid active/completed orders')]
class OrderReminderPayment extends Command
{
    public function handle(): int
    {
        if (Setting::get('notif_pengingat_bayar', '1') === '0') {
            $this->info('Pengingat pembayaran nonaktif — dilewati.');

            return self::SUCCESS;
        }

        $orders = Order::whereIn('status_order', ['confirmed', 'active'])
            ->whereIn('status_pembayaran', ['unpaid', 'partial'])
            ->with(['customer', 'kendaraan'])
            ->get();

        $sentCount = 0;
        $wa = app(WhatsAppService::class);

        foreach ($orders as $order) {
            $customer = $order->customer;

            if (! $customer || ! $customer->no_hp) {
                $this->warn("Order {$order->kode_order}: customer tanpa no HP, skip.");

                continue;
            }

            $alreadySentToday = WhatsappLog::where('order_id', $order->id)
                ->where('type', 'reminder_pembayaran')
                ->whereDate('created_at', now()->toDateString())
                ->exists();

            if ($alreadySentToday) {
                continue;
            }

            $template = Setting::get(
                'template_pengingat_bayar',
                'Halo {nama_customer}, kami ingin mengingatkan pembayaran untuk order {kode_order} (kendaraan {nama_kendaraan}) senilai {total}. Terima kasih.'
            );
            $pesan = $wa->renderTemplate($template, [
                'nama_customer' => $customer->nama_lengkap,
                'kode_order' => $order->kode_order,
                'nama_kendaraan' => $order->kendaraan?->nama_kendaraan ?? '-',
                'total' => 'Rp '.number_format((float) $order->harga_total, 0, ',', '.'),
            ]);
            $wa->kirimPesanAsync($customer->no_hp, $pesan, 'reminder_pembayaran', $order->id);
            $sentCount++;

            Notification::create([
                'type' => 'reminder_pembayaran',
                'title' => 'Pengingat Pembayaran',
                'message' => "Order {$order->kode_order} ({$customer->nama_lengkap}) masih {$order->status_pembayaran}. Total: Rp ".number_format((float) $order->harga_total, 0, ',', '.'),
                'data' => [
                    'order_id' => $order->id,
                    'kode_order' => $order->kode_order,
                    'status_pembayaran' => $order->status_pembayaran,
                    'link' => '/orders/'.$order->id,
                ],
            ]);
        }

        $this->info("{$orders->count()} order dengan pembayaran belum lunas. {$sentCount} pesan WA terkirim.");

        return self::SUCCESS;
    }
}
