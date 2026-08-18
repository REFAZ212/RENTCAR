<?php

namespace App\Console\Commands;

use App\Models\Order;
use App\Models\Setting;
use App\Services\OrderService;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

#[Signature('order:check-claim-timeout')]
#[Description('Release inspection task claims that exceeded the execution window (durasi_klaim_menit)')]
class OrderCheckClaimTimeout extends Command
{
    public function handle(): int
    {
        $durasiMenit = max(0, (int) Setting::get('durasi_klaim_menit', 30));
        $batas = now()->subMinutes($durasiMenit);

        $expired = Order::whereNotNull('operator_id')
            ->whereNotNull('waktu_klaim')
            ->where('waktu_klaim', '<', $batas)
            ->get()
            // Order yang sedang disewa (active) tidak punya task yang bisa
            // "lepas" — klaim pickup sudah selesai dieksekusi (waktu_klaim
            // dikosongkan kirimKendaraan). Guard defensif untuk data lama.
            ->filter(fn (Order $o) => $o->taskJenis() !== null && $o->status_order !== 'active');

        if ($expired->isEmpty()) {
            $this->info('Tidak ada klaim yang kadaluarsa.');

            return self::SUCCESS;
        }

        $service = app(OrderService::class);
        $count = 0;

        foreach ($expired as $order) {
            $order->update([
                'operator_id' => null,
                'waktu_klaim' => null,
                'supir_id' => $order->status_order === 'confirmed' && $order->opsi_supir === 'dengan_supir'
                    ? null
                    : $order->supir_id,
            ]);

            // Broadcast ulang ke petugas bebas supaya task kembali ke pool.
            $service->kirimNotifTaskOperator($order->fresh());

            $count++;
        }

        $this->info("{$count} klaim kadaluarsa dilepas dan kembali ke daftar tugas.");

        return self::SUCCESS;
    }
}
