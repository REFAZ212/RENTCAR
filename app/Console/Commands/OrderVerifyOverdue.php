<?php

namespace App\Console\Commands;

use App\Models\Notification;
use App\Models\Order;
use App\Models\Setting;
use App\Services\OvertimeCalculator;
use App\Services\WhatsAppService;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

#[Signature('order:verify-overdue')]
#[Description('Mark overdue active orders as "perlu_verifikasi" (freeze overtime) and auto-complete long-stuck ones')]
class OrderVerifyOverdue extends Command
{
    public function handle(): int
    {
        $statusesUpdated = collect([
            'perlu_verifikasi' => $this->prosesPerluVerifikasi(),
            'auto_completed' => $this->prosesAutoComplete(),
        ]);

        $this->info('Perlu verifikasi: '.$statusesUpdated['perlu_verifikasi'].' order. Auto-complete: '.$statusesUpdated['auto_completed'].' order.');

        return self::SUCCESS;
    }

    /**
     * Lapis 1: order active yang lewat batas + setelah jam + auto_verify_after_hours
     * dipindahkan ke status "perlu_verifikasi" dan denda di-freeze.
     */
    private function prosesPerluVerifikasi(): int
    {
        if (Setting::get('auto_verify_enabled', '1') === '0') {
            return 0;
        }

        $afterHours = max(1, (int) Setting::get('auto_verify_after_hours', 24));
        $cutoff = now()->subHours($afterHours);

        $candidates = Order::where('status_order', 'active')
            ->with(['customer', 'kendaraan'])
            ->get()
            ->filter(fn (Order $order) => $order->batasWaktuKembali() !== null && $order->batasWaktuKembali()->lessThan($cutoff));

        if ($candidates->isEmpty()) {
            return 0;
        }

        $count = 0;
        foreach ($candidates as $order) {
            $batas = $order->batasWaktuKembali();
            $s = Setting::getOvertimeSettings();
            $hitung = OvertimeCalculator::hitung($batas, now(), $s['rate'], $s['grace']);

            DB::transaction(function () use ($order, $hitung) {
                $order->update([
                    'status_order' => 'perlu_verifikasi',
                    'waktu_perlu_verifikasi' => now(),
                    'jam_overtime' => $hitung['jam_overtime'],
                    'denda_overtime' => $hitung['denda_overtime'],
                ]);
            });

            $this->kirimNotifikasiVerifikasi($order, $hitung);
            $count++;
        }

        return $count;
    }

    /**
     * Lapis 2: order perlu_verifikasi yang dibiarkan lebih dari
     * auto_complete_after_hours otomatis diselesaikan (auto-complete)
     * bila pengaturan auto_complete_enabled aktif.
     */
    private function prosesAutoComplete(): int
    {
        if (Setting::get('auto_complete_enabled', '1') === '0') {
            return 0;
        }

        $hours = max(1, (int) Setting::get('auto_complete_after_hours', 72));
        $cutoff = now()->subHours($hours);

        $candidates = Order::where('status_order', 'perlu_verifikasi')
            ->whereNotNull('waktu_perlu_verifikasi')
            ->with(['customer', 'kendaraan'])
            ->get()
            ->filter(fn (Order $order) => $order->waktu_perlu_verifikasi->lessThan($cutoff));

        if ($candidates->isEmpty()) {
            return 0;
        }

        $count = 0;
        foreach ($candidates as $order) {
            // Syarat sama dengan penutupan manual oleh admin (OrderService::updateOrder):
            // harus ada inspeksi akhir (return) bertanda tangan lengkap. Tanpa itu
            // auto-complete diblokir dan admin diberi tahu lewat notifikasi.
            if (! $this->inspeksiReturnLengkap($order)) {
                $this->kirimNotifikasiAutoCompleteDiblokir($order);

                continue;
            }

            $waktuAktual = now();
            DB::transaction(function () use ($order, $waktuAktual) {
                $order->status_order = 'completed';
                $order->status_pengiriman = 'selesai';
                $order->waktu_perlu_verifikasi = null;
                $order->selesaikanSewa($waktuAktual);
                $order->save();
                $order->kendaraan?->update([
                    'status' => $order->kendaraan->activeOrders()
                        ->where('id', '!=', $order->id)
                        ->exists()
                        ? 'disewa'
                        : ($order->kendaraan->status === 'tidak_tersedia' ? 'tidak_tersedia' : 'tersedia'),
                ]);
            });

            $this->kirimNotifikasiAutoComplete($order);
            $count++;
        }

        return $count;
    }

    /**
     * Inspeksi akhir (return) dengan tanda tangan pelanggan & petugas harus
     * sudah tercatat sebelum order boleh di-auto-complete — kunci yang sama
     * dengan penutupan manual (OrderService::updateOrder).
     *
     * Legacy DB tanpa tabel inspeksi (mis. skema test lama) dianggap memenuhi.
     */
    private function inspeksiReturnLengkap(Order $order): bool
    {
        if (! Schema::hasTable('inspeksi_kendaraans')) {
            return true;
        }

        return $order->inspeksis()
            ->where('jenis', 'return')
            ->whereNotNull('ttd_customer')
            ->whereNotNull('ttd_petugas')
            ->exists();
    }

    private function kirimNotifikasiAutoCompleteDiblokir(Order $order): void
    {
        Notification::create([
            'type' => 'auto_complete_diblokir',
            'title' => 'Auto-complete Diblokir',
            'message' => "Order {$order->kode_order} ({$order->customer?->nama_lengkap}) tidak bisa diselesaikan otomatis: inspeksi pengembalian dengan tanda tangan pelanggan & petugas belum lengkap. Mohon verifikasi manual.",
            'data' => [
                'order_id' => $order->id,
                'kode_order' => $order->kode_order,
                'link' => '/orders/'.$order->id,
            ],
        ]);
    }

    private function kirimNotifikasiVerifikasi(Order $order, array $hitung): void
    {
        Notification::create([
            'type' => 'perlu_verifikasi',
            'title' => 'Kendaraan Belum dikonfirmasi',
            'message' => "Order {$order->kode_order} ({$order->customer?->nama_lengkap}) lewat batas waktu dan butuh verifikasi pengembalian. Denda difreeze: Rp ".number_format((float) $hitung['denda_overtime'], 0, ',', '.'),
            'data' => [
                'order_id' => $order->id,
                'kode_order' => $order->kode_order,
                'link' => '/orders/'.$order->id,
            ],
        ]);

        if (Setting::get('notif_perlu_verifikasi', '1') !== '1') {
            return;
        }

        $wa = app(WhatsAppService::class);
        $template = Setting::get('template_perlu_verifikasi', 'Halo, order {kode_order} ({nama_customer} — {nama_kendaraan}) melewati batas waktu pengembalian dan belum dikonfirmasi. Denda difreeze: {total}. Mohon segera verifikasi di aplikasi.');
        $pesan = $wa->renderTemplate($template, [
            'kode_order' => $order->kode_order,
            'nama_customer' => $order->customer?->nama_lengkap ?? '-',
            'nama_kendaraan' => $order->kendaraan?->nama_kendaraan ?? '-',
            'total' => 'Rp '.number_format((float) $hitung['denda_overtime'], 0, ',', '.'),
        ]);
        $wa->kirimKeOwnerAsync($pesan, 'perlu_verifikasi_freeze', $order->id);

        if ($order->customer?->no_hp) {
            $namaKendaraan = $order->kendaraan?->nama_kendaraan ?? 'sewa Anda';
            $pesanCustomer = "Halo {$order->customer->nama_lengkap}, kendaraan {$namaKendaraan} dengan order {$order->kode_order} sudah melewati batas waktu pengembalian. Mohon segera kembalikan kendaraan ke garasi. Denda keterlambatan terhitung: Rp ".number_format((float) $hitung['denda_overtime'], 0, ',', '.').'.';
            $wa->kirimPesanAsync($order->customer->no_hp, $pesanCustomer, 'notifikasi_customer', $order->id);
        }
    }

    private function kirimNotifikasiAutoComplete(Order $order): void
    {
        Notification::create([
            'type' => 'auto_completed',
            'title' => 'Order Otomatis Diselesaikan',
            'message' => "Order {$order->kode_order} ({$order->customer?->nama_lengkap}) di-auto-complete karena lewat batas verifikasi. Denda: {$order->denda_overtime}.",
            'data' => [
                'order_id' => $order->id,
                'kode_order' => $order->kode_order,
                'link' => '/orders/'.$order->id,
            ],
        ]);

        if (Setting::get('notif_perlu_verifikasi', '1') === '1') {
            $wa = app(WhatsAppService::class);
            $pesan = "Order *{$order->kode_order}* ({$order->customer?->nama_lengkap} — {$order->kendaraan?->nama_kendaraan}) otomatis diselesaikan karena tidak ada tindakan selama batas verifikasi.\n"
                .'Denda terkunci: Rp '.number_format((float) $order->denda_overtime, 0, ',', '.')."\n"
                .'Periksa dan koreksi jika perlu.';
            $wa->kirimKeOwnerAsync($pesan, 'perlu_verifikasi_auto_complete', $order->id);

            if ($order->customer?->no_hp) {
                $namaKendaraan = $order->kendaraan?->nama_kendaraan ?? 'sewa Anda';
                $pesanCustomer = "Halo {$order->customer->nama_lengkap}, order {$order->kode_order} ({$namaKendaraan}) telah diselesaikan karena melewati batas waktu verifikasi pengembalian. Denda keterlambatan terkunci: Rp ".number_format((float) $order->denda_overtime, 0, ',', '.').'. Hubungi kami jika ada pertanyaan.';
                $wa->kirimPesanAsync($order->customer->no_hp, $pesanCustomer, 'notifikasi_customer', $order->id);
            }
        }
    }
}
