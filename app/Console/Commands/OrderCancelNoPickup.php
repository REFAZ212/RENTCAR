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
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

#[Signature('order:cancel-no-pickup')]
#[Description('Cancel confirmed orders whose vehicle was never picked up/delivered after the start time passes. The 100% cancellation fee applies: payments already made are forfeited (DP hangus).')]
class OrderCancelNoPickup extends Command
{
    public function handle(): int
    {
        $hours = max(1, (int) Setting::get('confirmed_no_pickup_expire_hours', 24));
        $cutoff = now()->subHours($hours);

        // Order "confirmed" yang sudah lewat jam mulai lebih dari $hours jam
        // tanpa diambil/diserahkan — berarti kendaraan tidak pernah keluar.
        $candidates = Order::where('status_order', 'confirmed')
            ->with(['customer'])
            ->get(['id', 'kode_order', 'customer_id', 'kendaraan_id', 'tanggal_mulai', 'jam_mulai', 'harga_total', 'metode_pembayaran'])
            ->filter(function (Order $order) use ($cutoff) {
                $mulai = Carbon::parse($order->tanggal_mulai);

                if ($order->jam_mulai) {
                    $mulai->setTimeFromTimeString($order->jam_mulai);
                }

                return $mulai->lessThan($cutoff);
            })
            ->filter(function (Order $order) {
                // Pengaman: kalau sudah ada inspeksi pickup (draft/final) berarti
                // serah terima sedang berjalan — jangan dibatalkan otomatis.
                if (! Schema::hasTable('inspeksi_kendaraans')) {
                    return true;
                }

                return ! $order->inspeksis()->where('jenis', 'pickup')->exists();
            });

        if ($candidates->isEmpty()) {
            $this->info('Tidak ada order confirmed yang tidak diambil.');

            return self::SUCCESS;
        }

        $bayarPerOrder = [];
        $count = DB::transaction(function () use ($candidates, $hours, &$bayarPerOrder) {
            foreach ($candidates as $order) {
                // Kebijakan: sudah dikonfirmasi tapi kendaraan tidak diambil —
                // biaya pembatalan mengikuti aturan manual (jadwal sudah lewat →
                // 100% harga total), jadi pembayaran hangus tanpa refund.
                $totalBayar = (float) $order->pembayarans()
                    ->whereNull('deleted_at')
                    ->where('status', '!=', 'refund')
                    ->sum('jumlah');

                $update = [
                    'status_order' => 'cancelled',
                    'status_pengiriman' => 'selesai',
                    'biaya_pembatalan' => $order->hitungBiayaPembatalan()['biaya'],
                    'alasan_pembatalan' => 'Otomatis: kendaraan tidak diambil/diserahkan hingga '.$hours.' jam setelah jadwal mulai — biaya pembatalan 100%, pembayaran hangus.',
                ];

                // Kolom klaim task mungkin tidak ada di skema legacy — aman-skip.
                if (Schema::hasColumn('orders', 'operator_id')) {
                    $update['operator_id'] = null;
                }
                if (Schema::hasColumn('orders', 'waktu_klaim')) {
                    $update['waktu_klaim'] = null;
                }

                $order->update($update);

                $bayarPerOrder[$order->id] = $totalBayar;
            }

            return $candidates->count();
        });

        Notification::create([
            'type' => 'order_no_pickup_cancelled',
            'title' => 'Pesanan Dibatalkan (Kendaraan Tidak Diambil)',
            'message' => "{$count} pesanan confirmed dibatalkan otomatis karena kendaraan tidak diambil/diserahkan hingga lewat jadwal mulai",
            'data' => [
                'count' => $count,
                'link' => '/orders',
            ],
        ]);

        foreach ($candidates as $order) {
            $this->kirimNotifikasiPembatalan($order->fresh(), (float) ($bayarPerOrder[$order->id] ?? 0));
        }

        $this->info("{$count} order confirmed dibatalkan otomatis (tidak diambil).");

        return self::SUCCESS;
    }

    private function kirimNotifikasiPembatalan(Order $order, float $totalBayar): void
    {
        if (Setting::get('notif_booking_baru', '1') !== '1' || ! $order->customer?->no_hp) {
            return;
        }

        $wa = app(WhatsAppService::class);
        $pesan = "Halo {$order->customer->nama_lengkap},\n\n"
            ."Pesanan *{$order->kode_order}* telah *DIBATALKAN* otomatis karena kendaraan tidak diambil/diserahkan hingga lewat jadwal mulai.\n";
        if ($totalBayar > 0) {
            $pesan .= 'Sesuai kebijakan pembatalan, pembayaran sebesar *Rp '.number_format($totalBayar, 0, ',', '.')."* HANGUS / tidak dapat dikembalikan.\n";
        }
        $pesan .= "\nHubungi kami jika ada pertanyaan.";

        $wa->kirimPesanAsync($order->customer->no_hp, $pesan, 'order_dibatalkan', $order->id);
    }
}
