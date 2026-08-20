<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Models\Kendaraan;
use App\Models\Notification;
use App\Models\Order;
use App\Models\Setting;
use App\Models\User;
use App\Rules\JamBelumTerlewat;
use App\Services\WhatsAppService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class KatalogOrderRequestController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'nama_lengkap' => 'required|string|max:255',
            'no_hp' => 'required|string|max:20',
            'kendaraan_id' => 'required|exists:kendaraans,id',
            'tanggal_mulai' => 'required|date|after_or_equal:today',
            'tanggal_selesai' => 'required|date|after_or_equal:tanggal_mulai',
            'jam_mulai' => ['nullable', 'date_format:H:i', new JamBelumTerlewat($request->input('tanggal_mulai'))],
            'jam_selesai' => ['nullable', 'date_format:H:i', 'required_with:jam_mulai', new JamBelumTerlewat($request->input('tanggal_selesai'))],
            'opsi_supir' => 'nullable|in:dengan_supir,lepas_kunci',
            'catatan' => 'nullable|string|max:500',
        ]);

        $kendaraan = Kendaraan::with('tipe', 'kategori', 'garasiPartner')
            ->where('id', $validated['kendaraan_id'])
            ->first();

        if (! $kendaraan) {
            return response()->json(['message' => 'Kendaraan tidak ditemukan.'], 422);
        }

        if (($validated['jam_mulai'] ?? null) && ($validated['jam_selesai'] ?? null)
            && $validated['tanggal_mulai'] === $validated['tanggal_selesai']
            && $validated['jam_mulai'] >= $validated['jam_selesai']) {
            throw ValidationException::withMessages([
                'jam_selesai' => ['Jam selesai harus setelah jam mulai untuk tanggal yang sama.'],
            ]);
        }

        $tanggalMulai = Carbon::parse($validated['tanggal_mulai']);
        $tanggalSelesai = Carbon::parse($validated['tanggal_selesai']);
        $hargaPerHari = (float) $kendaraan->harga_sewa_per_hari;

        $jamMulai = $validated['jam_mulai'] ?? null;
        $jamSelesai = $validated['jam_selesai'] ?? null;
        $opsiSupir = $validated['opsi_supir'] ?? null;

        if ($jamMulai && $jamSelesai) {
            $startDt = Carbon::parse($validated['tanggal_mulai'].' '.$jamMulai);
            $endDt = Carbon::parse($validated['tanggal_selesai'].' '.$jamSelesai);
            $diffHours = $startDt->diffInSeconds($endDt) / 3600;
            $durasi = max(1, (int) ceil($diffHours / 24));
        } else {
            $durasi = max(1, (int) $tanggalMulai->startOfDay()->diffInDays($tanggalSelesai->startOfDay()) + 1);
        }

        $hargaTotal = $durasi * $hargaPerHari;

        $normalizedHp = preg_replace('/[^0-9]/', '', $validated['no_hp']);
        if (str_starts_with($normalizedHp, '0')) {
            $normalizedHp = '62'.substr($normalizedHp, 1);
        } elseif (str_starts_with($normalizedHp, '8')) {
            $normalizedHp = '62'.$normalizedHp;
        }

        $recentOrdersCount = Order::where('source', 'katalog')
            ->where('created_at', '>=', now()->subHour())
            ->whereIn('status_order', ['pending', 'confirmed', 'active'])
            ->whereHas('customer', function ($q) use ($normalizedHp) {
                $q->where('no_hp', $normalizedHp);
            })
            ->count();

        if ($recentOrdersCount >= 3) {
            throw ValidationException::withMessages([
                'no_hp' => ['Terlalu banyak pemesanan dalam waktu singkat. Silakan coba lagi nanti.'],
            ]);
        }

        $result = DB::transaction(function () use ($kendaraan, $validated, $tanggalMulai, $tanggalSelesai, $durasi, $hargaPerHari, $hargaTotal, $jamMulai, $jamSelesai, $opsiSupir, $normalizedHp) {
            $lockedKendaraan = Kendaraan::where('id', $kendaraan->id)->lockForUpdate()->first();

            if ($lockedKendaraan->status !== 'tersedia') {
                throw ValidationException::withMessages([
                    'kendaraan_id' => ['Kendaraan tidak tersedia.'],
                ]);
            }

            // No. HP diperbolehkan sama antar pelanggan: kalau HP sudah dipakai
            // tepat satu pelanggan, pakai data itu; kalau dipakai beberapa
            // pelanggan, buat data baru — jangan menebak milik siapa.
            $existing = Customer::where('no_hp', $normalizedHp)->get();

            if ($existing->count() === 1) {
                $customer = $existing->first();
            } else {
                $customer = Customer::create([
                    'no_hp' => $normalizedHp,
                    'nama_lengkap' => $validated['nama_lengkap'],
                ]);
            }

            // Nama customer lama tidak ditimpa — nama baru hanya berlaku saat
            // customer belum pernah tercatat sebelumnya.
            $customerNama = $customer->nama_lengkap;

            // Datetime-aware overlap check — matches OrderController logic.
            $newEffectiveStart = $validated['tanggal_mulai'].' '.($jamMulai ?? '00:00');
            $newEffectiveEnd = $tanggalSelesai->toDateString().' '.($jamSelesai ?? '23:59:59');

            $candidates = Order::where('kendaraan_id', $kendaraan->id)
                ->whereIn('status_order', ['pending', 'confirmed', 'active'])
                ->whereDate('tanggal_mulai', '<=', $tanggalSelesai->toDateString())
                ->whereDate('tanggal_selesai', '>=', $validated['tanggal_mulai'])
                ->lockForUpdate()
                ->get();

            $hasOverlap = $candidates->contains(function ($existing) use ($newEffectiveStart, $newEffectiveEnd) {
                $existingStart = $existing->tanggal_mulai->format('Y-m-d').' '.($existing->jam_mulai ?? '00:00');
                $existingEnd = $existing->tanggal_selesai->format('Y-m-d').' '.($existing->jam_selesai ?? '23:59:59');

                return $existingStart <= $newEffectiveEnd && $existingEnd >= $newEffectiveStart;
            });

            if ($hasOverlap) {
                throw ValidationException::withMessages([
                    'kendaraan_id' => ['Kendaraan sudah memiliki order pada tanggal yang beririsan.'],
                ]);
            }

            $adminId = User::where('role', 'admin_utama')->value('id')
                ?? User::where('role', 'admin')->value('id')
                ?? 1;

            $order = Order::create([
                'kode_order' => 'ORD-'.strtoupper(Str::random(8)),
                'source' => 'katalog',
                'customer_id' => $customer->id,
                'kendaraan_id' => $kendaraan->id,
                'admin_id' => $adminId,
                'tanggal_mulai' => $tanggalMulai->toDateString(),
                'tanggal_selesai' => $tanggalSelesai->toDateString(),
                'jam_mulai' => $jamMulai,
                'jam_selesai' => $jamSelesai,
                'durasi_hari' => $durasi,
                'harga_per_hari' => $hargaPerHari,
                'harga_total' => $hargaTotal,
                'opsi_supir' => $opsiSupir,
                'status_order' => 'pending',
                'status_pembayaran' => 'unpaid',
                'status_pengiriman' => 'belum_diambil',
                'catatan' => $validated['catatan'] ?? null,
            ]);

            return ['customer' => $customer, 'customer_nama' => $customerNama, 'order' => $order];
        });

        $customer = $result['customer'];
        $customerNama = $result['customer_nama'];
        $order = $result['order'];

        Notification::create([
            'type' => 'order_baru',
            'title' => 'Pesanan Baru dari Katalog',
            'message' => "{$customerNama} memesan {$kendaraan->nama_kendaraan} ({$durasi} hari, Rp ".number_format($hargaTotal, 0, ',', '.').')',
            'data' => [
                'order_id' => $order->id,
                'kode_order' => $order->kode_order,
                'customer_name' => $customerNama,
                'kendaraan_name' => $kendaraan->nama_kendaraan,
                'durasi_hari' => $durasi,
                'harga_total' => $hargaTotal,
                'link' => '/orders',
            ],
        ]);

        if (Setting::get('notif_booking_baru', '1') === '1') {
            $wa = app(WhatsAppService::class);
            $template = Setting::get('template_notifikasi_owner', '[BOOKING] {kendaraan} untuk {customer}\nDriver: {driver} — {tanggal}\nStatus: {status}');
            $pesan = $wa->renderTemplate($template, [
                'kendaraan' => $kendaraan->nama_kendaraan,
                'customer' => $customerNama,
                'driver' => $opsiSupir === 'dengan_supir' ? 'Diperlukan' : '-',
                'tanggal' => $tanggalMulai->format('d/m/Y'),
                'status' => 'Baru Masuk',
            ]);
            $wa->kirimKeOwnerAsync("[BOOKING BARU] {$pesan}", 'booking_baru', $order->id);
        }

        $waMessage = $this->buildWALink(
            $order,
            $kendaraan,
            $customer,
            $customerNama,
            $validated['no_hp'],
            $durasi,
            $tanggalMulai,
            $tanggalSelesai,
            $hargaTotal,
            $jamMulai,
            $jamSelesai,
            $opsiSupir,
            $validated['catatan'] ?? null
        );

        // Data pribadi partner & margin internal tidak boleh bocor ke publik
        // di respons konfirmasi pemesanan.
        $order->load(['customer', 'kendaraan.tipe', 'kendaraan.kategori', 'kendaraan.garasiPartner']);
        $order->kendaraan?->makeHidden(['catatan', 'margin_per_hari', 'margin_persen', 'harga_partner_per_hari']);
        $order->kendaraan?->garasiPartner?->makeHidden([
            'nama_pemilik',
            'alamat',
            'no_hp',
            'email',
            'status_aktif',
            'is_own',
            'metode_bagi_hasil',
            'persentase_bagi_hasil',
            'catatan',
        ]);

        return response()->json([
            'order' => $order,
            'wa_link' => $waMessage,
        ], 201);
    }

    private function buildWALink(
        Order $order,
        Kendaraan $kendaraan,
        Customer $customer,
        string $namaLengkap,
        string $noHp,
        int $durasi,
        Carbon $tanggalMulai,
        Carbon $tanggalSelesai,
        float $hargaTotal,
        ?string $jamMulai,
        ?string $jamSelesai,
        ?string $opsiSupir,
        ?string $catatan,
    ): string {
        $opsiLabel = $opsiSupir === 'dengan_supir' ? 'Dengan Supir' : 'Lepas Kunci';

        $pesan = "Halo, saya ingin memesan kendaraan:\n\n"
            ."*Kendaraan*\n"
            ."{$kendaraan->nama_kendaraan} ({$kendaraan->tahun})\n"
            ."Plat: {$kendaraan->plat_nomor}\n"
            .'Harga: Rp '.number_format($hargaTotal / $durasi, 0, ',', '.')."/hari\n\n"
            ."*Tanggal Sewa*\n"
            ."Mulai: {$tanggalMulai->format('d/m/Y')}".($jamMulai ? " jam {$jamMulai}" : '')."\n"
            ."Selesai: {$tanggalSelesai->format('d/m/Y')}".($jamSelesai ? " jam {$jamSelesai}" : '')."\n"
            ."Durasi: {$durasi} hari\n\n"
            ."*Opsi*: {$opsiLabel}\n\n"
            .'*Total Harga*: Rp '.number_format($hargaTotal, 0, ',', '.')." (belum termasuk biaya supir)\n\n"
            ."*Data Diri*\n"
            ."Nama: {$namaLengkap}\n"
            ."WA: {$noHp}\n";

        if ($catatan) {
            $pesan .= "\n*Catatan*: {$catatan}\n";
        }

        $pesan .= "\nMohon konfirmasi ketersediaan. Terima kasih.";

        $adminPhone = Setting::get('nomor_wa_owner', '62895361054272');

        return 'https://wa.me/'.$adminPhone.'?text='.urlencode($pesan);
    }
}
