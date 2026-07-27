<?php

namespace App\Notifications;

use App\Models\Order;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class OrderConfirmedNotification extends Notification
{
    use Queueable;

    public function __construct(private Order $order) {}

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $order = $this->order;

        return (new MailMessage)
            ->subject("Order {$order->kode_order} Dikonfirmasi")
            ->greeting("Halo {$order->customer->nama_lengkap},")
            ->line("Order *{$order->kode_order}* telah dikonfirmasi.")
            ->line("Kendaraan: {$order->kendaraan->nama_kendaraan}")
            ->line("Tanggal: {$order->tanggal_mulai->format('d/m/Y')} - {$order->tanggal_selesai->format('d/m/Y')}")
            ->line('Total: Rp '.number_format((float) $order->harga_total, 0, ',', '.'))
            ->action('Lihat Detail', url('/orders/'.$order->id))
            ->line('Terima kasih telah menggunakan layanan kami.');
    }
}
