<?php

namespace App\Console\Commands;

use App\Models\Notification;
use App\Models\Order;
use App\Models\Setting;
use App\Services\WhatsAppService;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

#[Signature('order:reminder-h1')]
#[Description('Send H-1 return deadline reminders to customers via WhatsApp')]
class OrderReminderH1 extends Command
{
    public function handle(): int
    {
        $tomorrow = now()->timezone('Asia/Jakarta')->startOfDay()->addDay();
        $endOfTomorrow = (clone $tomorrow)->endOfDay();

        $activeOrders = Order::where('status_order', 'active')
            ->with(['customer', 'kendaraan'])
            ->get()
            ->filter(function (Order $order) use ($tomorrow, $endOfTomorrow) {
                $batas = $order->batasWaktuKembali();

                return $batas && $batas->gte($tomorrow) && $batas->lte($endOfTomorrow);
            })
            ->values();

        if ($activeOrders->isEmpty()) {
            $this->info('Tidak ada order yang jatuh tempo besok.');

            return self::SUCCESS;
        }

        $waEnabled = Setting::get('notif_pengingat_kembali', '1') === '1';
        $sentCount = 0;

        foreach ($activeOrders as $order) {
            $customer = $order->customer;
            $kendaraan = $order->kendaraan;
            $batas = $order->batasWaktuKembali();

            if (! $customer || ! $customer->no_hp) {
                $this->warn("Order {$order->kode_order}: customer tanpa no HP, skip.");

                continue;
            }

            // ── WhatsApp reminder ──
            if ($waEnabled) {
                $wa = app(WhatsAppService::class);
                $template = Setting::get('template_pengingat_kembali', 'Halo {nama_customer}, ini pengingat bahwa kendaraan {nama_kendaraan} ({kode_order}) harus dikembalikan pada {tanggal_kembali} pukul {jam_kembali}. Terima kasih.');
                $pesan = $wa->renderTemplate($template, [
                    'nama_customer' => $customer->nama_lengkap,
                    'nama_kendaraan' => $kendaraan?->nama_kendaraan ?? '-',
                    'kode_order' => $order->kode_order,
                    'tanggal_kembali' => $batas->format('d/m/Y'),
                    'jam_kembali' => $batas->format('H:i'),
                ]);
                $wa->kirimPesan($customer->no_hp, $pesan);
                $sentCount++;
            }

            // ── In-app notification (for admin_utama) ──
            $namaKendaraan = $kendaraan?->nama_kendaraan ?? '-';
            Notification::create([
                'type' => 'reminder_pengembalian',
                'title' => 'Pengingat Pengembalian H-1',
                'message' => "Order {$order->kode_order} ({$customer->nama_lengkap}) jatuh tempo besok pukul {$batas->format('H:i')}. Kendaraan: {$namaKendaraan}.",
                'data' => [
                    'order_id' => $order->id,
                    'kode_order' => $order->kode_order,
                    'deadline' => $batas->toIso8601String(),
                    'link' => '/orders/'.$order->id,
                ],
            ]);
        }

        $this->info("{$activeOrders->count()} order jatuh tempo besok. {$sentCount} pesan WA terkirim.");

        return self::SUCCESS;
    }
}
