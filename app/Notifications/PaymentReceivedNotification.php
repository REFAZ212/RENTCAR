<?php

namespace App\Notifications;

use App\Models\Order;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class PaymentReceivedNotification extends Notification
{
    use Queueable;

    public function __construct(
        private Order $order,
        private float $amount,
        private string $paymentStatus,
    ) {}

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $order = $this->order;

        return (new MailMessage)
            ->subject('Pembayaran Diterima')
            ->greeting("Halo {$order->customer->nama_lengkap},")
            ->line("Pembayaran untuk order *{$order->kode_order}* telah diterima.")
            ->line('Jumlah: Rp '.number_format($this->amount, 0, ',', '.'))
            ->line("Status: {$this->paymentStatus}")
            ->line('Total order: Rp '.number_format((float) $order->harga_total, 0, ',', '.'))
            ->action('Lihat Detail', url('/orders/'.$order->id))
            ->line('Terima kasih atas pembayaran Anda.');
    }
}
