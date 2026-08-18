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

#[Signature('order:reminder-verifikasi')]
#[Description('Daily WhatsApp reminder to owner for orders stuck in perlu_verifikasi')]
class OrderReminderVerifikasi extends Command
{
    public function handle(): int
    {
        if (Setting::get('notif_perlu_verifikasi', '1') === '0') {
            $this->info('Notifikasi perlu verifikasi nonaktif — dilewati.');

            return self::SUCCESS;
        }

        $orders = Order::where('status_order', 'perlu_verifikasi')
            ->with(['customer', 'kendaraan'])
            ->get();

        if ($orders->isEmpty()) {
            $this->info('Tidak ada order perlu verifikasi.');

            return self::SUCCESS;
        }

        $alreadySentToday = WhatsappLog::where('type', 'perlu_verifikasi_reminder')
            ->whereDate('created_at', now()->toDateString())
            ->pluck('order_id')
            ->values()
            ->all();

        $sentCount = 0;
        $wa = app(WhatsAppService::class);

        foreach ($orders as $order) {
            if (in_array($order->id, $alreadySentToday, true)) {
                continue;
            }

            $template = Setting::get('template_perlu_verifikasi', 'Halo, order {kode_order} ({nama_customer} — {nama_kendaraan}) melewati batas waktu pengembalian dan belum dikonfirmasi. Denda difreeze: {total}. Mohon segera verifikasi di aplikasi.');
            $pesan = $wa->renderTemplate($template, [
                'kode_order' => $order->kode_order,
                'nama_customer' => $order->customer?->nama_lengkap ?? '-',
                'nama_kendaraan' => $order->kendaraan?->nama_kendaraan ?? '-',
                'total' => 'Rp '.number_format((float) $order->denda_overtime, 0, ',', '.'),
            ]);
            $wa->kirimKeOwnerAsync($pesan, 'perlu_verifikasi_reminder', $order->id);
            $sentCount++;

            Notification::create([
                'type' => 'perlu_verifikasi',
                'title' => 'Kendaraan Belum dikonfirmasi',
                'message' => "Order {$order->kode_order} ({$order->customer?->nama_lengkap}) masih perlu verifikasi pengembalian. Denda terkunci: Rp ".number_format((float) $order->denda_overtime, 0, ',', '.'),
                'data' => [
                    'order_id' => $order->id,
                    'kode_order' => $order->kode_order,
                    'link' => '/orders/'.$order->id,
                ],
            ]);
        }

        $this->info("{$sentCount} pengingat perlu verifikasi terkirim.");

        return self::SUCCESS;
    }
}
