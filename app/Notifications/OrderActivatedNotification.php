<?php

namespace App\Notifications;

use App\Models\Order;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class OrderActivatedNotification extends Notification
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
            ->subject('Kendaraan Siap Diambil')
            ->greeting("Halo {$order->customer->nama_lengkap},")
            ->line("Kendaraan untuk order *{$order->kode_order}* sudah siap diambil.")
            ->line("Kendaraan: {$order->kendaraan->nama_kendaraan}")
            ->line("Tanggal mulai: {$order->tanggal_mulai->format('d/m/Y')}")
            ->line("Jam selesai: {$order->jam_selesai}")
            ->action('Lihat Detail', url('/orders/'.$order->id))
            ->line('Silakan ambil kendaraan sesuai jadwal yang telah ditentukan.');
    }
}
