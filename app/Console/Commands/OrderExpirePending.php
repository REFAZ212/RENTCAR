<?php

namespace App\Console\Commands;

use App\Models\Notification;
use App\Models\Order;
use App\Models\Pembayaran;
use App\Models\Setting;
use App\Services\WhatsAppService;
use Carbon\Carbon;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

#[Signature('order:expire-pending')]
#[Description('Cancel pending (katalog) orders that were never confirmed after their start date passes. Any money already paid is fully refunded and the customer is notified.')]
class OrderExpirePending extends Command
{
    public function handle(): int
    {
        $hours = max(1, (int) Setting::get('pending_expire_hours', 24));
        $cutoff = now()->subHours($hours);

        // Pending order "expired" kalau jadwal mulai-nya sudah lewat lebih dari
        // $hours jam — artinya pemesan tidak pernah dikonfirmasi. Ambil hanya
        // yang colom tanggal_mulai/jam_mulai-nya sudah lewat dari cutoff.
        // Hanya ID yang diambil di sini — validasi ulang dilakukan di dalam
        // transaksi terkunci supaya tidak memproses order yang berubah status.
        $candidateIds = Order::where('status_order', 'pending')
            ->get(['id', 'tanggal_mulai', 'jam_mulai'])
            ->filter(function (Order $order) use ($cutoff) {
                $mulai = Carbon::parse($order->tanggal_mulai);

                if ($order->jam_mulai) {
                    $mulai->setTimeFromTimeString($order->jam_mulai);
                }

                return $mulai->lessThan($cutoff);
            })
            ->pluck('id');

        if ($candidateIds->isEmpty()) {
            $this->info('Tidak ada order pending yang kedaluwarsa.');

            return self::SUCCESS;
        }

        $processed = collect();

        foreach ($candidateIds as $orderId) {
            $order = $this->batalkanOrder($orderId);

            if ($order === null) {
                continue;
            }

            $processed->push($order);

            // WA dikirim SETELAH commit — hanya untuk order yang benar-benar
            // dibatalkan oleh eksekusi ini (aman dari double-send).
            $this->kirimNotifikasiPembatalan($order);
        }

        if ($processed->isEmpty()) {
            $this->info('Tidak ada order pending yang kedaluwarsa.');

            return self::SUCCESS;
        }

        Notification::create([
            'type' => 'order_expired',
            'title' => 'Pesanan Otomatis Dibatalkan',
            'message' => "{$processed->count()} pesanan katalog dibatalkan otomatis karena belum dikonfirmasi hingga lewat jadwal mulai",
            'data' => [
                'count' => $processed->count(),
                'link' => '/orders',
            ],
        ]);

        $this->info($processed->count().' order pending dibatalkan otomatis (timeout).');

        return self::SUCCESS;
    }

    /**
     * Kunci baris order lalu batalkan bila masih pending. Mengembalikan order
     * yang sudah diperbarui (beserta relasi customer), atau null jika order
     * sudah diproses/dikonfirmasi pihak lain sebelum lock didapat.
     */
    private function batalkanOrder(int $orderId): ?Order
    {
        return DB::transaction(function () use ($orderId): ?Order {
            $order = Order::whereKey($orderId)->lockForUpdate()->first();

            // Re-check di dalam lock: admin mungkin baru saja mengonfirmasi,
            // atau tick scheduler lain sudah memproses order ini.
            if ($order === null || $order->status_order !== 'pending') {
                return null;
            }

            // Kebijakan: pesanan yang TIDAK PERNAH dikonfirmasi bukan salah
            // customer — semua uang yang sudah dibayar dikembalikan penuh
            // (refund), tanpa biaya pembatalan.
            $totalBayar = (float) $order->pembayarans()
                ->whereNull('deleted_at')
                ->where('status', '!=', 'refund')
                ->sum('jumlah');

            $update = [
                'status_order' => 'cancelled',
                'status_pengiriman' => 'selesai',
                'biaya_pembatalan' => 0,
                'alasan_pembatalan' => 'Otomatis: pesanan tidak dikonfirmasi sebelum jadwal mulai — seluruh pembayaran dikembalikan (refund).',
            ];

            if ($totalBayar > 0) {
                $update['total_refund'] = $totalBayar;

                Pembayaran::create([
                    'order_id' => $order->id,
                    'admin_id' => null,
                    'jumlah' => $totalBayar,
                    'metode_pembayaran' => $order->metode_pembayaran ?? 'cash',
                    'status' => 'refund',
                    'catatan' => 'Refund pembatalan otomatis (belum dikonfirmasi): Rp '.number_format($totalBayar, 0, ',', '.').' dikembalikan penuh.',
                ]);
            }

            $order->update($update);

            return $order->fresh(['customer']);
        });
    }

    private function kirimNotifikasiPembatalan(Order $order): void
    {
        if (Setting::get('notif_booking_baru', '1') !== '1' || ! $order->customer?->no_hp) {
            return;
        }

        $totalBayar = (float) ($order->total_refund ?? 0);
        $wa = app(WhatsAppService::class);
        $pesan = "Halo {$order->customer->nama_lengkap},\n\n"
            ."Pesanan *{$order->kode_order}* telah *DIBATALKAN* otomatis karena belum dikonfirmasi hingga lewat jadwal mulai.\n";
        if ($totalBayar > 0) {
            $pesan .= 'Pembayaran Anda sebesar *Rp '.number_format($totalBayar, 0, ',', '.')."* dikembalikan penuh (refund). Tim kami akan menghubungi Anda untuk proses pengembalian dana.\n";
        }
        $pesan .= "\nTerima kasih telah menghubungi kami.";

        $wa->kirimPesanAsync($order->customer->no_hp, $pesan, 'order_dibatalkan', $order->id);
    }
}
