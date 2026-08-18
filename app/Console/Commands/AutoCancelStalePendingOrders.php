<?php

namespace App\Console\Commands;

use App\Models\Kendaraan;
use App\Models\Notification;
use App\Models\Order;
use App\Models\Setting;
use App\Services\WhatsAppService;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

#[Signature('order:auto-cancel-stale')]
#[Description('Cancel pending orders that exceeded the timeout after tanggal_mulai')]
class AutoCancelStalePendingOrders extends Command
{
    public function handle(): int
    {
        $timeoutHours = (int) Setting::get('auto_cancel_timeout_hours', '24');
        $waEnabled = Setting::get('notif_pembatalan_otomatis', '1') === '1';
        $deadline = now()->timezone('Asia/Jakarta')->subHours($timeoutHours);

        $staleOrders = Order::where('status_order', 'pending')
            ->whereNotNull('tanggal_mulai')
            ->where('tanggal_mulai', '<', $deadline)
            ->with(['customer', 'kendaraan'])
            ->get();

        if ($staleOrders->isEmpty()) {
            $this->info('Tidak ada order pending yang kedaluwarsa.');

            return self::SUCCESS;
        }

        $cancelledCount = 0;

        foreach ($staleOrders as $order) {
            $customer = $order->customer;
            $kendaraan = $order->kendaraan;
            $totalBayar = (float) $order->pembayarans()
                ->whereNull('deleted_at')
                ->where('status', '!=', 'refund')
                ->sum('jumlah');

            $dpHangus = $totalBayar > 0;

            $alasan = $dpHangus
                ? 'Otomatis: tidak mengambil kendaraan sesuai jadwal (DP hangus)'
                : 'Otomatis: melebihi batas waktu konfirmasi';

            $order->update([
                'status_order' => 'cancelled',
                'alasan_pembatalan' => $alasan,
                'biaya_pembatalan' => $totalBayar,
                'total_refund' => 0,
            ]);

            $this->manageKendaraanStatus($order);

            // WhatsApp notification
            if ($waEnabled && $customer && $customer->no_hp) {
                $wa = app(WhatsAppService::class);
                $namaKendaraan = $kendaraan?->nama_kendaraan ?? '-';

                if ($dpHangus) {
                    $pesan = "Halo {$customer->nama_lengkap},\n\n"
                        ."Order *{$order->kode_order}* untuk kendaraan *{$namaKendaraan}* telah *DIBATALKAN* secara otomatis ❌\n\n"
                        .'Alasan: Melebihi batas waktu pengambilan kendaraan.'."\n"
                        .'DP sebesar *Rp '.number_format($totalBayar, 0, ',', '.').'* dianggap hangus.'."\n\n"
                        .'Terima kasih.';
                } else {
                    $pesan = "Halo {$customer->nama_lengkap},\n\n"
                        ."Order *{$order->kode_order}* untuk kendaraan *{$namaKendaraan}* telah *DIBATALKAN* secara otomatis ❌\n\n"
                        .'Alasan: Melebihi batas waktu konfirmasi ('.$timeoutHours.' jam).'."\n\n"
                        .'Terima kasih.';
                }

                $wa->kirimPesanAsync($customer->no_hp, $pesan);
            }

            $cancelledCount++;
        }

        // In-app notification
        Notification::create([
            'type' => 'auto_cancel_pending',
            'title' => 'Order Pending Dibatalkan Otomatis',
            'message' => "{$cancelledCount} order pending dibatalkan otomatis (melebihi batas waktu {$timeoutHours} jam).",
            'data' => [
                'count' => $cancelledCount,
                'timeout_hours' => $timeoutHours,
                'link' => '/orders',
            ],
        ]);

        $this->info("{$cancelledCount} order pending dibatalkan otomatis.");

        return self::SUCCESS;
    }

    /**
     * Update kendaraan status setelah order dibatalkan.
     */
    private function manageKendaraanStatus(Order $order): void
    {
        $kendaraan = $order->kendaraan;

        if (! $kendaraan) {
            return;
        }

        $hasOtherActiveOrders = $kendaraan->activeOrders()
            ->where('id', '!=', $order->id)
            ->exists();

        $kendaraan->update([
            'status' => $hasOtherActiveOrders ? 'disewa' : 'tersedia',
        ]);
    }
}
