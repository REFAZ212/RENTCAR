<?php

namespace App\Services;

use App\Models\Customer;
use App\Models\Kendaraan;
use App\Models\Notification;
use App\Models\Order;
use App\Models\Pembayaran;
use App\Models\Setting;
use App\Models\SupirCalo;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\QueryException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;
use Symfony\Component\HttpKernel\Exception\ForbiddenHttpException;

class OrderService
{
    public function list(array $filters): array
    {
        $query = Order::with(['customer', 'kendaraan.garasiPartner', 'admin', 'supir', 'calo', 'pembayarans', 'garasiRequests']);

        if (! empty($filters['search'])) {
            $search = $filters['search'];
            $query->where(function ($q) use ($search) {
                whereLikeEscaped($q, 'kode_order', $search);
                $q->orWhereHas('customer', function ($cq) use ($search) {
                    whereLikeEscaped($cq, 'nama_lengkap', $search);
                });
                $q->orWhereHas('kendaraan', function ($kq) use ($search) {
                    whereLikeEscaped($kq, 'plat_nomor', $search);
                    $kq->orWhereRaw("nama_kendaraan LIKE ? ESCAPE '#'", ['%'.escapeLike($search).'%']);
                });
            });
        }

        if (! empty($filters['status_order'])) {
            $query->where('status_order', $filters['status_order']);
        }

        if (! empty($filters['status_pembayaran'])) {
            $query->where('status_pembayaran', $filters['status_pembayaran']);
        }

        if (! empty($filters['status_pengiriman'])) {
            $query->where('status_pengiriman', $filters['status_pengiriman']);
        }

        if (! empty($filters['tanggal_mulai']) && ! empty($filters['tanggal_selesai'])) {
            $query->where('tanggal_mulai', '<=', $filters['tanggal_selesai'])
                ->where('tanggal_selesai', '>=', $filters['tanggal_mulai']);
        }

        // "Overdue" bukan status di database — dihitung dari batas waktu
        // pengembalian (lihat Order::batasWaktuKembali(): tanggal_selesai @
        // jam_selesai, default 23:59). Dihitung via SQL (bukan dimuat ke
        // memori) supaya tetap ringan walau data sudah banyak.
        // Terlambat = tanggal_selesai sudah lewat hari ini, ATAU (hari ini
        // dan jam_selesai <= jam sekarang; jam kosong berarti batas 23:59).
        // whereDate() dipakai supaya kompatibel dengan MySQL (kolom DATE)
        // maupun SQLite (kolom DATE tersimpan sebagai datetime).
        // Grace period ikut diterapkan dengan menggeser "sekarang" ke belakang
        // (now - grace), supaya sama persis dengan accessor jam_overtime_saat_ini.
        $graceMinutes = (int) Setting::get('grace_period_minutes', 0);
        $waktuBatas = now()->subMinutes($graceMinutes);
        $nowDate = $waktuBatas->toDateString();
        $nowTime = $waktuBatas->format('H:i');
        $aktifTerlambat = Order::where('status_order', 'active')
            ->where(function ($q) use ($nowDate, $nowTime) {
                $q->whereDate('tanggal_selesai', '<', $nowDate)
                    ->orWhere(function ($q2) use ($nowDate, $nowTime) {
                        $q2->whereDate('tanggal_selesai', $nowDate)
                            ->where(function ($q3) use ($nowTime) {
                                // Perbandingan KETAT (<): deadline tepat sama
                                // dengan (now - grace) berarti selisih 0 detik →
                                // belum dianggap terlambat, sama seperti accessor.
                                $q3->where('jam_selesai', '<', $nowTime)
                                    ->orWhere(function ($q4) use ($nowTime) {
                                        $q4->whereNull('jam_selesai')
                                            ->whereRaw("'23:59' < ?", [$nowTime]);
                                    });
                            });
                    });
            })
            ->pluck('id');

        if (! empty($filters['overdue'])) {
            $query->whereIn('id', $aktifTerlambat);
        }

        $perPage = (int) ($filters['per_page'] ?? 15);
        $perPage = in_array($perPage, [15, 30, 50, 100], true) ? $perPage : 15;

        $paginator = $query->orderBy('created_at', 'desc')->paginate($perPage);

        return [
            'data' => $paginator->items(),
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'total' => $paginator->total(),
                'per_page' => $paginator->perPage(),
            ],
            'counts' => [
                'total' => $paginator->total(),
                'status' => Order::selectRaw('status_order, COUNT(*) as total')
                    ->groupBy('status_order')
                    ->pluck('total', 'status_order')
                    ->map(fn ($n) => (int) $n)
                    ->toArray(),
                'overdue' => $aktifTerlambat->count(),
            ],
        ];
    }

    public function getDetail(Order $order): Order
    {
        $order->load(['customer', 'kendaraan.garasiPartner', 'admin', 'supir', 'calo', 'garasiRequests.garasiPartner', 'pembayarans']);

        return $order;
    }

    public function create(array $validated, Request $request): Order
    {
        if (empty($validated['customer_id']) && empty($validated['customer_foto_ktp_path']) && empty($validated['customer_foto_sim_path'])) {
            throw ValidationException::withMessages([
                'customer_foto_ktp' => ['Dokumen identitas wajib diupload untuk customer baru.'],
            ]);
        }

        $foundSupir = null;
        if (! empty($validated['supir_id'])) {
            $foundSupir = SupirCalo::find($validated['supir_id']);
            if ($foundSupir && $foundSupir->jenis !== 'supir') {
                throw ValidationException::withMessages(['supir_id' => ['ID yang dipilih bukan supir.']]);
            }
        }
        $foundCalo = null;
        if (! empty($validated['calo_id'])) {
            $foundCalo = SupirCalo::find($validated['calo_id']);
            if ($foundCalo && $foundCalo->jenis !== 'calo') {
                throw ValidationException::withMessages(['calo_id' => ['ID yang dipilih bukan calo.']]);
            }
        }

        $komisiCalo = $validated['komisi_calo'] ?? null;
        if ($foundCalo && is_null($komisiCalo)) {
            $komisiCalo = $foundCalo->komisi;
        }

        // Supir tidak lagi dipilih spesifik di form — cukup opsi "dengan/tanpa supir".
        // Supir order ditentukan dari pemenang klaim task (lihat claimTask()).
        $opsiSupir = $validated['opsi_supir'] ?? ($foundSupir ? 'dengan_supir' : 'lepas_kunci');

        $statusPengiriman = $validated['status_pengiriman'] ?? 'belum_diambil';

        $kendaraan = Kendaraan::findOrFail($validated['kendaraan_id']);

        if (($validated['jam_mulai'] ?? null) && ($validated['jam_selesai'] ?? null)
            && $validated['tanggal_mulai'] === $validated['tanggal_selesai']
            && $validated['jam_mulai'] >= $validated['jam_selesai']) {
            throw ValidationException::withMessages([
                'jam_selesai' => ['Jam selesai harus setelah jam mulai untuk tanggal yang sama.'],
            ]);
        }

        $buktiPath = $validated['bukti_transfer_path'] ?? null;
        $buktiPengirimanPath = $validated['bukti_pengiriman_path'] ?? null;
        $buktiPengembalianPath = $validated['bukti_pengembalian_path'] ?? null;
        $customerFotoKtpPath = $validated['customer_foto_ktp_path'] ?? null;
        $customerFotoSimPath = $validated['customer_foto_sim_path'] ?? null;

        $oldCustomerPhotos = [];
        if (! empty($validated['customer_id'])) {
            $existingCustomer = Customer::find($validated['customer_id']);
            if ($existingCustomer) {
                if ($customerFotoKtpPath && $existingCustomer->foto_ktp) {
                    $oldCustomerPhotos[] = $existingCustomer->foto_ktp;
                }
                if (! empty($validated['customer_foto_ktp_delete']) && $existingCustomer->foto_ktp) {
                    $oldCustomerPhotos[] = $existingCustomer->foto_ktp;
                }
                if ($customerFotoSimPath && $existingCustomer->foto_sim) {
                    $oldCustomerPhotos[] = $existingCustomer->foto_sim;
                }
            }
        }

        $order = DB::transaction(function () use ($validated, $request, $kendaraan, $foundSupir, $komisiCalo, $statusPengiriman, $opsiSupir, $buktiPath, $buktiPengirimanPath, $buktiPengembalianPath, $customerFotoKtpPath, $customerFotoSimPath) {
            $customer = $this->resolveCustomer($validated, $customerFotoKtpPath, $customerFotoSimPath);

            // Lock the kendaraan row to prevent race conditions
            $kendaraan = Kendaraan::where('id', $validated['kendaraan_id'])->lockForUpdate()->first();

            // Kendaraan yang sedang disewa/servis/tidak tersedia tidak boleh dipesan.
            if (! $kendaraan || $kendaraan->status !== 'tersedia') {
                throw ValidationException::withMessages([
                    'kendaraan_id' => ['Kendaraan sedang tidak tersedia (disewa/servis) dan tidak dapat dipesan.'],
                ]);
            }

            $this->checkVehicleOverlap(
                $validated['kendaraan_id'],
                $validated['tanggal_mulai'],
                $validated['tanggal_selesai'],
                $validated['jam_mulai'] ?? null,
                $validated['jam_selesai'] ?? null
            );

            $hargaPerHari = $kendaraan->harga_sewa_per_hari;
            $mulaiDt = Carbon::parse($validated['tanggal_mulai'])->setTimeFromTimeString($validated['jam_mulai'] ?? '08:00');
            $selesaiDt = Carbon::parse($validated['tanggal_selesai'])->setTimeFromTimeString($validated['jam_selesai'] ?? '17:00');
            $durasi = max(1, (int) ceil($mulaiDt->diffInHours($selesaiDt) / 24));

            $supirTarif = $this->hitungTarifSupir($foundSupir, $opsiSupir);

            $order = Order::create([
                'customer_id' => $customer->id,
                'kendaraan_id' => $validated['kendaraan_id'],
                'alamat_jemput' => $validated['alamat_jemput'] ?? null,
                'tujuan' => $validated['tujuan'] ?? null,
                'tanggal_mulai' => $validated['tanggal_mulai'],
                'tanggal_selesai' => $validated['tanggal_selesai'],
                'jam_mulai' => $validated['jam_mulai'] ?? null,
                'jam_selesai' => $validated['jam_selesai'] ?? null,
                'harga_per_hari' => $hargaPerHari,
                'metode_pembayaran' => $validated['metode_pembayaran'] ?? 'cash',
                'status_order' => 'confirmed',
                'status_pembayaran' => $validated['status_pembayaran'] ?? 'unpaid',
                'status_pengiriman' => $statusPengiriman,
                'metode_penyerahan' => $validated['metode_penyerahan'] ?? 'ambil',
                'catatan' => $validated['catatan'] ?? null,
                'bukti_transfer' => $buktiPath,
                'bukti_pengiriman' => $buktiPengirimanPath,
                'bukti_pengembalian' => $buktiPengembalianPath,
                'durasi_hari' => $durasi,
                'harga_total' => ($durasi * $hargaPerHari) + ($supirTarif * $durasi),
                'opsi_supir' => $opsiSupir,
                'supir_id' => $validated['supir_id'] ?? null,
                'calo_id' => $validated['calo_id'] ?? null,
                'komisi_calo' => $komisiCalo,
                'admin_id' => $request->user()->id,
                'tanggal_jatuh_tempo' => $validated['tanggal_jatuh_tempo'] ?? null,
            ]);

            $this->validateAndRecordPayment($order, $request->user()->id, $validated);

            return $order;
        });

        foreach ($oldCustomerPhotos as $oldPath) {
            if (Storage::disk('public')->exists($oldPath)) {
                Storage::disk('public')->delete($oldPath);
            }
        }

        $order->load(['kendaraan', 'customer']);

        if ($order->status_order === 'confirmed') {
            $this->kirimNotifKonfirmasi($order);
        }

        return $order->load(['customer', 'kendaraan.garasiPartner', 'admin', 'supir', 'calo', 'pembayarans']);
    }

    private function kirimNotifKonfirmasi(Order $order): void
    {
        $nomorCustomer = $order->customer->no_hp ?? null;
        if (! $nomorCustomer || Setting::get('notif_booking_baru', '1') !== '1') {
            return;
        }

        $wa = app(WhatsAppService::class);
        $pesan = "Halo {$order->customer->nama_lengkap},\n\n"
            ."Order *{$order->kode_order}* telah Dikonfirmasi ✅\n"
            ."Kendaraan: {$order->kendaraan->nama_kendaraan}\n"
            ."Tanggal: *{$order->tanggal_mulai->format('d/m/Y')} - {$order->tanggal_selesai->format('d/m/Y')}*\n"
            .'Total: *Rp '.number_format((float) $order->harga_total, 0, ',', '.')."*\n\n"
            .'Terima kasih telah menggunakan layanan kami.';
        $wa->kirimPesanAsync($nomorCustomer, $pesan, 'order_dikonfirmasi', $order->id);

        $this->kirimNotifTaskOperator($order);
    }

    /**
     * Kirim WA + notifikasi sistem ke SEMUA petugas yang tidak sedang memegang
     * tugas (tidak punya order aktif/perlu_verifikasi yang masih berjalan).
     * Task diklaim ala GOJEK — petugas menekan tombol "Ambil Tugas" di aplikasi.
     *
     * @param  string|null  $jenis  'pickup' | 'return' | null (otomatis dari taskJenis)
     */
    public function kirimNotifTaskOperator(Order $order, ?string $jenis = null): void
    {
        if (Setting::get('notif_task_petugas', '1') !== '1') {
            return;
        }

        // Kolom operator_id & tabel pendukung belum ada di skema test lama — aman-skip.
        if (! Schema::hasColumn('orders', 'operator_id')
            || ! Schema::hasTable('inspeksi_kendaraans')
            || ! Schema::hasTable('whatsapp_logs')
            || ! Schema::hasTable('notifications')) {
            return;
        }

        $jenis = $jenis ?? $order->taskJenis() ?? 'pickup';

        $operatorIds = Order::whereIn('status_order', ['active', 'perlu_verifikasi'])
            ->whereNotNull('operator_id')
            ->pluck('operator_id')
            ->unique();

        $petugas = User::where('role', 'petugas')
            ->when($operatorIds->isNotEmpty(), fn ($q) => $q->whereNotIn('id', $operatorIds))
            ->get();

        if ($petugas->isEmpty()) {
            return;
        }

        $opsiLabel = $order->opsi_supir === 'dengan_supir' ? 'Dengan Supir' : 'Tanpa Supir';
        $jenisLabel = $jenis === 'return' ? 'Inspeksi Pengembalian (Return)' : 'Inspeksi & Penyerahan (Pickup)';
        $type = $jenis === 'return' ? 'task_inspeksi_return' : 'task_inspeksi_petugas';
        $batas = $order->batasWaktuKembali();

        $wa = app(WhatsAppService::class);
        $template = Setting::get('template_task_petugas', "📋 *Task Baru untuk Petugas*\n\nOrder: *{kode_order}*\nJenis: {jenis_task}\nKendaraan: {nama_kendaraan}\nCustomer: {nama_customer}\nTanggal: {tanggal}\nSupir: {opsi_supir}\n\nBuka aplikasi → tekan *AMBIL TUGAS* untuk mengerjakan inspeksi. Siapa cepat dia dapat!");
        $pesan = $wa->renderTemplate($template, [
            'kode_order' => $order->kode_order,
            'jenis_task' => $jenisLabel,
            'nama_kendaraan' => $order->kendaraan?->nama_kendaraan ?? '-',
            'nama_customer' => $order->customer?->nama_lengkap ?? '-',
            'tanggal' => $order->tanggal_mulai->format('d/m/Y').' - '.$order->tanggal_selesai->format('d/m/Y'),
            'opsi_supir' => $opsiLabel,
            'tanggal_kembali' => $batas?->format('d/m/Y') ?? '-',
            'jam_kembali' => $batas?->format('H:i') ?? '-',
        ]);

        foreach ($petugas as $petugasUser) {
            $wa->kirimPesanAsync($petugasUser->phone, $pesan, $type, $order->id);

            Notification::create([
                'user_id' => $petugasUser->id,
                'type' => $type,
                'title' => $jenis === 'return' ? 'Task Pengembalian Baru' : 'Task Inspeksi Baru',
                'message' => "Order {$order->kode_order} — ".($order->kendaraan?->nama_kendaraan ?? '-')." ({$opsiLabel}) — {$jenisLabel}. Ambil tugas sekarang!",
                'data' => [
                    'order_id' => $order->id,
                    'link' => '/inspeksi/?order_id='.$order->id.'&jenis='.$jenis,
                ],
            ]);
        }
    }

    /**
     * WA penugasan driver ke supir pemenang klaim (order "dengan supir").
     */
    private function kirimNotifPenugasanDriver(Order $order, SupirCalo $supir): void
    {
        if (Setting::get('notif_penugasan_driver', '1') !== '1' || ! $supir->no_hp) {
            return;
        }

        $wa = app(WhatsAppService::class);
        $template = Setting::get('template_penugasan_driver', 'Halo {nama_driver}, ada tugas baru:\nAntar {customer} — {kendaraan} ({plat_nomor})\n{tanggal} pukul {jam}\n\nBalas SIAP jika bisa, atau TIDAK jika berhalangan.');
        $pesan = $wa->renderTemplate($template, [
            'nama_driver' => $supir->nama,
            'customer' => $order->customer->nama_lengkap,
            'kendaraan' => $order->kendaraan->nama_kendaraan,
            'plat_nomor' => $order->kendaraan->plat_nomor,
            'tanggal' => $order->tanggal_mulai->format('d/m/Y'),
            'jam' => $order->jam_mulai ?? '00:00',
        ]);
        $wa->kirimPesanAsync($supir->no_hp, $pesan, 'penugasan_driver', $order->id);
    }

    /**
     * WA ke supir saat kendaraan resmi diserahkan / order mulai (status active).
     */
    public function kirimNotifSupirOrderMulai(Order $order): void
    {
        if (Setting::get('notif_supir_order_mulai', '1') !== '1') {
            return;
        }

        $supir = $order->supir;
        if (! $supir || ! $supir->no_hp) {
            return;
        }

        $wa = app(WhatsAppService::class);
        $template = Setting::get('template_supir_order_mulai', 'Halo *{nama_driver}*, tugas untuk order *{kode_order}* sudah mulai.\nKendaraan: {nama_kendaraan} ({plat_nomor})\nCustomer: {nama_customer}\nPeriode: {tanggal} s/d {tanggal_selesai}\n\nSelamat bekerja, hati-hati di jalan!');
        $pesan = $wa->renderTemplate($template, [
            'nama_driver' => $supir->nama,
            'kode_order' => $order->kode_order,
            'nama_kendaraan' => $order->kendaraan?->nama_kendaraan ?? '-',
            'plat_nomor' => $order->kendaraan?->plat_nomor ?? '-',
            'nama_customer' => $order->customer?->nama_lengkap ?? '-',
            'tanggal' => $order->tanggal_mulai->format('d/m/Y'),
            'tanggal_selesai' => $order->tanggal_selesai->format('d/m/Y'),
            'jam_mulai' => $order->jam_mulai ?? '00:00',
        ]);
        $wa->kirimPesanAsync($supir->no_hp, $pesan, 'supir_order_mulai', $order->id);
    }

    /**
     * WA ke supir saat order selesai (info tarif/komisi).
     */
    private function kirimNotifSupirSelesai(Order $order): void
    {
        if (Setting::get('notif_supir_order_selesai', '1') !== '1') {
            return;
        }

        $supir = $order->supir;
        if (! $supir || ! $supir->no_hp) {
            return;
        }

        $durasi = (int) $order->durasi_hari;
        $tarif = (float) ($supir->tarif_per_hari ?? 0);
        $total = $tarif * $durasi;

        $wa = app(WhatsAppService::class);
        $template = Setting::get('template_supir_order_selesai', 'Halo *{nama_driver}*, order *{kode_order}* telah *SELESAI* ✅\nKendaraan: {nama_kendaraan} ({plat_nomor})\nCustomer: {nama_customer}\nDurasi: {durasi_hari} hari\nTarif: {tarif_per_hari}/hari\nTotal pendapatan: *{total_supir}*\n\nTerima kasih atas kerja samanya!');
        $pesan = $wa->renderTemplate($template, [
            'nama_driver' => $supir->nama,
            'kode_order' => $order->kode_order,
            'nama_kendaraan' => $order->kendaraan?->nama_kendaraan ?? '-',
            'plat_nomor' => $order->kendaraan?->plat_nomor ?? '-',
            'nama_customer' => $order->customer?->nama_lengkap ?? '-',
            'durasi_hari' => $durasi,
            'tarif_per_hari' => 'Rp '.number_format($tarif, 0, ',', '.'),
            'total_supir' => 'Rp '.number_format($total, 0, ',', '.'),
        ]);
        $wa->kirimPesanAsync($supir->no_hp, $pesan, 'supir_order_selesai', $order->id);
    }

    public function updateOrder(Order $order, array $validated, Request $request): Order
    {
        foreach (['supir_id', 'calo_id'] as $field) {
            if (isset($validated[$field]) && $validated[$field] === '') {
                $validated[$field] = null;
            }
        }

        if (in_array($order->status_order, ['active', 'perlu_verifikasi', 'completed', 'cancelled'])
            || $this->confirmedBerAktivitas($order)) {
            $lockedFields = ['customer_id', 'customer_name', 'customer_no_hp', 'customer_email', 'customer_alamat', 'customer_no_sim', 'customer_no_ktp', 'customer_foto_ktp', 'customer_foto_sim', 'kendaraan_id', 'tanggal_mulai', 'tanggal_selesai', 'jam_mulai', 'jam_selesai', 'alamat_jemput', 'tujuan', 'metode_penyerahan', 'supir_id', 'opsi_supir', 'calo_id'];
            $attemptedLocked = array_intersect_key($validated, array_flip($lockedFields));
            if (! empty($attemptedLocked) || ! empty($validated['customer_foto_ktp_path']) || ! empty($validated['customer_foto_sim_path'])) {
                $pesanLock = $this->confirmedBerAktivitas($order)
                    ? 'Order confirmed sudah ber-aktivitas (pembayaran/request garasi/task petugas) — data inti terkunci. Koreksi kesepakatan via Batal.'
                    : 'Order ini sudah final (aktif/perlu verifikasi/selesai/dibatalkan). Hanya status, status pembayaran, metode bayar, bukti pembayaran, dan catatan yang bisa diperbarui.';
                throw ValidationException::withMessages([
                    'status_order' => [$pesanLock],
                ]);
            }
        }

        if (isset($validated['supir_id']) && $validated['supir_id'] !== null) {
            $supir = SupirCalo::find($validated['supir_id']);
            if ($supir && $supir->jenis !== 'supir') {
                throw ValidationException::withMessages(['supir_id' => ['ID yang dipilih bukan supir.']]);
            }
        }
        if (isset($validated['calo_id']) && $validated['calo_id'] !== null) {
            $calo = SupirCalo::find($validated['calo_id']);
            if ($calo && $calo->jenis !== 'calo') {
                throw ValidationException::withMessages(['calo_id' => ['ID yang dipilih bukan calo.']]);
            }
        }

        // Tanggal pengembalian aktual dipakai menghitung denda keterlambatan
        // FINAL. Kalau dibiarkan bebas, denda bisa dihapus diam-diam dengan
        // backdate. Batasi: tidak boleh sebelum tanggal mulai sewa dan tidak
        // boleh di masa depan (kecuali toleransi 5 menit karena jam device).
        if (isset($validated['tanggal_pengembalian_aktual'])) {
            $waktuAktual = Carbon::parse($validated['tanggal_pengembalian_aktual']);
            $mulaiSewa = Carbon::parse($order->tanggal_mulai->format('Y-m-d'));

            if ($waktuAktual->lessThan($mulaiSewa)) {
                throw ValidationException::withMessages([
                    'tanggal_pengembalian_aktual' => ['Tanggal pengembalian aktual tidak boleh sebelum tanggal mulai sewa.'],
                ]);
            }

            if ($waktuAktual->greaterThan(now()->addMinutes(5))) {
                throw ValidationException::withMessages([
                    'tanggal_pengembalian_aktual' => ['Tanggal pengembalian aktual tidak boleh di masa depan.'],
                ]);
            }
        }

        if (isset($validated['calo_id']) && ! isset($validated['komisi_calo'])) {
            $caloForKomisi = $validated['calo_id'] ? SupirCalo::find($validated['calo_id']) : null;
            $validated['komisi_calo'] = $caloForKomisi?->komisi;
        }

        $newStatusPengiriman = $validated['status_pengiriman'] ?? $order->status_pengiriman;

        $newStatusOrder = $validated['status_order'] ?? $order->status_order;
        if (Setting::get('wajib_bayar_sebelum_antar', '0') === '1'
            && in_array($newStatusPengiriman, ['sudah_diantarkan', 'dalam_penyewaan'])
            && $newStatusOrder === 'active'
            && $order->status_pembayaran === 'unpaid'
            && (float) ($validated['jumlah_bayar'] ?? 0) <= 0) {
            throw ValidationException::withMessages([
                'status_pengiriman' => ['Kebijakan toko: kendaraan tidak bisa diantar sebelum ada pembayaran. Catat DP/pelunasan terlebih dahulu.'],
            ]);
        }

        if (isset($validated['status_order']) && $validated['status_order'] !== $order->status_order) {
            if (! $order->canTransitionTo($validated['status_order'])) {
                throw ValidationException::withMessages([
                    'status_order' => ["Transisi status dari '{$order->status_order}' ke '{$validated['status_order']}' tidak diizinkan."],
                ]);
            }

            if ($validated['status_order'] === 'cancelled') {
                $biaya = $order->hitungBiayaPembatalan();
                $validated['biaya_pembatalan'] = $biaya['biaya'];
                $validated['alasan_pembatalan'] = $validated['alasan_pembatalan'] ?? null;
            }
        }

        $newStatusOrder = $validated['status_order'] ?? $order->status_order;

        $biayaKerusakanFinal = (float) ($validated['biaya_kerusakan'] ?? 0);
        $inspeksiTableAda = Schema::hasTable('inspeksi_kendaraans');
        if ($newStatusOrder === 'completed' && $inspeksiTableAda) {
            // Wajib: inspeksi akhir (return) bertanda tangan harus sudah tercatat
            // oleh operator. Tanpa ini admin tidak bisa menutup order.
            $inspeksiAkhir = $order->inspeksis()
                ->where('jenis', 'return')
                ->whereNotNull('ttd_customer')
                ->whereNotNull('ttd_petugas')
                ->latest('id')
                ->first();

            if (! $inspeksiAkhir) {
                throw ValidationException::withMessages([
                    'status_order' => ['Order belum bisa ditutup: inspeksi akhir (return) dengan tanda tangan pelanggan & petugas belum diisi operator.'],
                ]);
            }

            // Biaya kerusakan FINAL = angka yang diisi admin (jika dikirim),
            // fallback ke estimasi operator di inspeksi akhir.
            $biayaKerusakanFinal = isset($validated['biaya_kerusakan'])
                ? max(0, $biayaKerusakanFinal)
                : (float) ($inspeksiAkhir->biaya_kerusakan ?? 0);
        }

        if ($newStatusOrder === 'completed') {
            $waktuAktual = isset($validated['tanggal_pengembalian_aktual'])
                ? Carbon::parse($validated['tanggal_pengembalian_aktual'])
                : now();

            // Proyeksi total FINAL (sudah termasuk denda keterlambatan) — satu
            // sumber kebenaran sama dengan selesaikanSewa(). Tagihan memakai
            // durasi penuh sesuai kesepakatan: pengembalian lebih awal tidak
            // mengurangi tagihan dan tidak menghasilkan refund.
            $totalFinal = (float) $order->proyeksiSelesai($waktuAktual)['harga_total']
                + $biayaKerusakanFinal;

            $totalBayar = (float) $order->pembayarans()
                ->whereNull('deleted_at')
                ->where('status', '!=', 'refund')
                ->sum('jumlah');
            $jumlahBayar = (float) ($validated['jumlah_bayar'] ?? 0);
            $kurangBayar = $totalFinal - $totalBayar - $jumlahBayar;

            if ($kurangBayar > 0.01) {
                throw ValidationException::withMessages([
                    'jumlah_bayar' => ['Order masih kurang bayar Rp '.number_format($kurangBayar, 0, ',', '.').' (termasuk denda keterlambatan). Lunasi dahulu atau isi jumlah bayar sebelum menyelesaikan order.'],
                ]);
            }
        }

        $oldKendaraanId = $order->kendaraan_id;
        $newKendaraanId = $validated['kendaraan_id'] ?? $oldKendaraanId;
        $effectiveTanggalMulai = $validated['tanggal_mulai'] ?? $order->tanggal_mulai->format('Y-m-d');
        $effectiveTanggalSelesai = $validated['tanggal_selesai'] ?? $order->tanggal_selesai->format('Y-m-d');
        $statusSebelumUpdate = $order->status_order;

        $updateData = collect($validated)->except(['bukti_transfer', 'bukti_pengiriman', 'bukti_pengembalian', 'bukti_transfer_path', 'bukti_pengiriman_path', 'bukti_pengembalian_path', 'customer_foto_ktp_path', 'customer_foto_sim_path', 'customer_foto_ktp_delete', 'jumlah_bayar'])->toArray();

        // Simpan biaya kerusakan FINAL ke order saat penutupan (0 kalau tidak ada).
        if ($newStatusOrder === 'completed' && Schema::hasColumn('orders', 'biaya_kerusakan')) {
            $updateData['biaya_kerusakan'] = $biayaKerusakanFinal > 0 ? $biayaKerusakanFinal : null;
        }

        $filesToDelete = [];

        if (! empty($validated['bukti_transfer_path'])) {
            $updateData['bukti_transfer'] = $validated['bukti_transfer_path'];
        }
        if (! empty($validated['bukti_pengiriman_path'])) {
            if ($order->bukti_pengiriman) {
                $filesToDelete[] = $order->bukti_pengiriman;
            }
            $updateData['bukti_pengiriman'] = $validated['bukti_pengiriman_path'];
        }
        if (! empty($validated['bukti_pengembalian_path'])) {
            if ($order->bukti_pengembalian) {
                $filesToDelete[] = $order->bukti_pengembalian;
            }
            $updateData['bukti_pengembalian'] = $validated['bukti_pengembalian_path'];
        }

        $customerFotoKtpPath = $validated['customer_foto_ktp_path'] ?? null;
        $customerFotoSimPath = $validated['customer_foto_sim_path'] ?? null;

        if (! empty($validated['customer_id']) || ! empty($validated['customer_name'])) {
            $existingCustomer = ! empty($validated['customer_id'])
                ? Customer::find($validated['customer_id'])
                : null;
            if ($existingCustomer) {
                if ($customerFotoKtpPath && $existingCustomer->foto_ktp) {
                    $filesToDelete[] = $existingCustomer->foto_ktp;
                }
                if (! empty($validated['customer_foto_ktp_delete']) && $existingCustomer->foto_ktp) {
                    $filesToDelete[] = $existingCustomer->foto_ktp;
                }
                if ($customerFotoSimPath && $existingCustomer->foto_sim) {
                    $filesToDelete[] = $existingCustomer->foto_sim;
                }
            }
        }

        DB::transaction(function () use ($validated, $order, $updateData, $newKendaraanId, $oldKendaraanId, $statusSebelumUpdate, $effectiveTanggalMulai, $effectiveTanggalSelesai, $request, $customerFotoKtpPath, $customerFotoSimPath) {
            if (! empty($validated['customer_id'])) {
                $customer = Customer::find($validated['customer_id']);
                if ($customer) {
                    $this->updateCustomerFields($customer, $validated, $customerFotoKtpPath, $customerFotoSimPath);
                }
            } elseif (! empty($validated['customer_name'])) {
                $customer = $this->findOrCreateCustomer($validated, $customerFotoKtpPath, $customerFotoSimPath);
                $validated['customer_id'] = $customer->id;
                $updateData['customer_id'] = $customer->id;
            }

            // Ganti kendaraan: kendaraan baru harus tersedia (yang sedang disewa
            // karena order ini sendiri tetap diperbolehkan saat menyimpan ulang).
            if ($newKendaraanId !== $oldKendaraanId) {
                $newKendaraanLocked = Kendaraan::where('id', $newKendaraanId)->lockForUpdate()->first();
                if (! $newKendaraanLocked || $newKendaraanLocked->status !== 'tersedia') {
                    throw ValidationException::withMessages([
                        'kendaraan_id' => ['Kendaraan sedang tidak tersedia (disewa/servis) dan tidak dapat dipesan.'],
                    ]);
                }
            }

            $existingJamMulai = $validated['jam_mulai'] ?? $order->jam_mulai;
            $existingJamSelesai = $validated['jam_selesai'] ?? $order->jam_selesai;
            $this->checkVehicleOverlap(
                $newKendaraanId,
                $effectiveTanggalMulai,
                $effectiveTanggalSelesai,
                $existingJamMulai,
                $existingJamSelesai,
                $order->id
            );

            $mulai = $validated['tanggal_mulai'] ?? $order->tanggal_mulai;
            $selesai = $validated['tanggal_selesai'] ?? $order->tanggal_selesai;

            $priceChanged = isset($validated['kendaraan_id'])
                || isset($validated['tanggal_mulai'])
                || isset($validated['tanggal_selesai'])
                || array_key_exists('supir_id', $validated)
                || array_key_exists('opsi_supir', $validated)
                || isset($validated['jam_mulai'])
                || isset($validated['jam_selesai']);

            if ($priceChanged) {
                $targetKendaraan = $newKendaraanId ? Kendaraan::find($newKendaraanId) : null;
                $harga = $targetKendaraan ? $targetKendaraan->harga_sewa_per_hari : $order->harga_per_hari;

                $mulaiDt = Carbon::parse($mulai)->setTimeFromTimeString($validated['jam_mulai'] ?? $order->jam_mulai ?? '08:00');
                $selesaiDt = Carbon::parse($selesai)->setTimeFromTimeString($validated['jam_selesai'] ?? $order->jam_selesai ?? '17:00');
                $durasi = max(1, (int) ceil($mulaiDt->diffInHours($selesaiDt) / 24));

                $updateData['harga_per_hari'] = $harga;
                $updateData['durasi_hari'] = $durasi;

                $supirId = array_key_exists('supir_id', $validated)
                    ? $validated['supir_id']
                    : $order->supir_id;
                $supir = $supirId ? SupirCalo::find($supirId) : null;
                $opsiSupir = $validated['opsi_supir'] ?? $order->opsi_supir ?? null;
                $supirTarif = $this->hitungTarifSupir($supir, $opsiSupir);
                $updateData['harga_total'] = ($durasi * $harga) + ($supirTarif * $durasi);
            }

            $order->update($updateData);

            $this->handleStatusTransition($order, $validated, $statusSebelumUpdate, $request);

            $this->handlePaymentUpdate($order, $validated, $request);

            $order->load('kendaraan');

            if (isset($validated['status_order'])) {
                $this->manageKendaraanStatus($order, $validated['status_order'], $newKendaraanId, $oldKendaraanId);
            }
        });

        foreach ($filesToDelete as $oldPath) {
            if (Storage::disk('public')->exists($oldPath)) {
                Storage::disk('public')->delete($oldPath);
            }
        }

        return $order->load(['customer', 'kendaraan.garasiPartner', 'admin', 'supir', 'calo', 'pembayarans']);
    }

    public function delete(Order $order): void
    {
        if (in_array($order->status_order, ['active', 'perlu_verifikasi', 'completed', 'cancelled'])) {
            throw ValidationException::withMessages([
                'status_order' => ['Tidak bisa menghapus order aktif, perlu verifikasi, selesai, atau dibatalkan.'],
            ]);
        }

        // Order confirmed yang sudah punya riwayat pembayaran, request garasi,
        // ATAU task yang diklaim petugas tidak bisa dihapus langsung — data itu
        // menyangkut uang/koordinasi garasi/pekerjaan petugas. Arahkan ke Batal
        // (yang menangani refund + notifikasi WA) supaya datanya tetap aman
        // walau API dipanggil langsung.
        if ($order->status_order === 'confirmed'
            && ($order->operator_id !== null
                || $order->pembayarans()->withoutTrashed()->exists()
                || $order->garasiRequests()->withoutTrashed()->exists())) {
            throw ValidationException::withMessages([
                'status_order' => ['Order confirmed dengan pembayaran atau request garasi tidak bisa dihapus — gunakan Batal.'],
            ]);
        }

        $order->delete();
    }

    /**
     * Order confirmed dianggap "ber-aktivitas" bila sudah menyentuh uang
     * (pembayaran), koordinasi garasi (request garasi), atau pekerjaan petugas
     * (task diklaim). Data inti order ini terkunci — koreksi kesepakatan harus
     * lewat Batal, bukan edit/hapus diam-diam.
     */
    private function confirmedBerAktivitas(Order $order): bool
    {
        return $order->status_order === 'confirmed'
            && ($order->operator_id !== null
                || $order->pembayarans()->withoutTrashed()->exists()
                || $order->garasiRequests()->withoutTrashed()->exists());
    }

    /**
     * Tarif supir per hari untuk order.
     *
     * Opsi "dengan supir" selalu memakai tarif global dari pengaturan —
     * harga sudah disepakati saat order dibuat dan tidak berubah walau
     * supirnya berbeda (misal hasil klaim task). Tarif pribadi supir hanya
     * dipakai untuk data lama (order ber-opsi "lepas kunci" yang kebetulan
     * punya supir tertentu).
     */
    private function hitungTarifSupir(?SupirCalo $supir, ?string $opsiSupir): float
    {
        if ($opsiSupir === 'dengan_supir') {
            return (float) Setting::getTarifDenganDriverPerHari();
        }

        return $supir ? (float) ($supir->tarif_per_hari ?? 0) : 0;
    }

    /**
     * Klaim task inspeksi (pickup/return) ala GOJEK: siapa cepat dia dapat.
     * Transaction + row lock supaya dua petugas yang menekan bersamaan tidak
     * dobel mengklaim. Petugas lain akan mendapat 409 Conflict.
     *
     * Untuk order "dengan supir", pemenang klaim otomatis menjadi supir order
     * (bila punya data supirCalo) dan langsung mendapat WA penugasan driver.
     */
    public function claimTask(Order $order, User $user): Order
    {
        return DB::transaction(function () use ($order, $user) {
            $order = Order::whereKey($order->id)->lockForUpdate()->first();

            if (! $order) {
                throw new ConflictHttpException('Order tidak ditemukan.');
            }

            if (! $order->taskJenis()) {
                throw new ConflictHttpException('Tidak ada task menunggu untuk order ini.');
            }

            if ($order->operator_id && $order->operator_id !== $user->id) {
                $pengeklaim = $order->operator?->name ?? 'petugas lain';
                throw new ConflictHttpException("Task ini sudah diambil oleh {$pengeklaim}.");
            }

            $order->update([
                'operator_id' => $user->id,
                'waktu_klaim' => now(),
            ]);

            // Pemenang klaim order "dengan supir" otomatis jadi supir-nya.
            if ($order->opsi_supir === 'dengan_supir' && ! $order->supir_id) {
                $supirCalo = $user->supirCalo;
                if ($supirCalo) {
                    $order->update(['supir_id' => $supirCalo->id]);
                    $this->kirimNotifPenugasanDriver($order, $supirCalo);
                }
            }

            return $order->load(['customer', 'kendaraan', 'operator', 'supir']);
        });
    }

    /**
     * Lepas klaim task: petugas pemegang klaim atau admin.
     * Task kembali ke pool (bisa diklaim petugas lain).
     */
    public function releaseTask(Order $order, User $user): Order
    {
        return DB::transaction(function () use ($order, $user) {
            $order = Order::whereKey($order->id)->lockForUpdate()->first();

            if (! $order) {
                throw new ConflictHttpException('Order tidak ditemukan.');
            }

            $isAdmin = in_array($user->role, ['admin_utama', 'admin_operasional']);
            if (! $isAdmin && ! $order->isClaimant($user->id)) {
                throw new ForbiddenHttpException('Hanya pemegang klaim atau admin yang bisa melepas task ini.');
            }

            if (! $order->operator_id) {
                return $order;
            }

            $update = [
                'operator_id' => null,
                'waktu_klaim' => null,
            ];

            // Supir ikut dilepas hanya selama order belum dieksekusi (confirmed).
            if ($order->status_order === 'confirmed' && $order->opsi_supir === 'dengan_supir') {
                $update['supir_id'] = null;
            }

            $order->update($update);

            // Broadcast ulang ke petugas bebas supaya task kembali terlihat.
            $this->kirimNotifTaskOperator($order);

            return $order->load(['customer', 'kendaraan', 'operator', 'supir']);
        });
    }

    private function resolveCustomer(array $validated, ?string $fotoKtpPath, ?string $fotoSimPath): Customer
    {
        if (! empty($validated['customer_id'])) {
            $customer = Customer::findOrFail($validated['customer_id']);
            $custUpdateData = [];
            if (isset($validated['customer_name']) && trim($validated['customer_name']) !== '') {
                $custUpdateData['nama_lengkap'] = trim($validated['customer_name']);
            }
            if (! empty($validated['customer_no_hp'])) {
                $custUpdateData['no_hp'] = $this->normalizePhone($validated['customer_no_hp']);
            }
            if (isset($validated['customer_email'])) {
                $custUpdateData['email'] = $validated['customer_email'] ?: null;
            }
            if (isset($validated['customer_alamat'])) {
                $custUpdateData['alamat'] = $validated['customer_alamat'] ?: null;
            }
            if (isset($validated['customer_no_sim'])) {
                $custUpdateData['no_sim'] = $validated['customer_no_sim'] ?: null;
            }
            if (isset($validated['customer_no_ktp'])) {
                $custUpdateData['no_ktp'] = $validated['customer_no_ktp'] ?: null;
            }
            if (! empty($validated['customer_foto_ktp_delete'])) {
                $custUpdateData['foto_ktp'] = null;
            }
            if ($fotoKtpPath) {
                $custUpdateData['foto_ktp'] = $fotoKtpPath;
            }
            if ($fotoSimPath) {
                $custUpdateData['foto_sim'] = $fotoSimPath;
            }
            if ($custUpdateData) {
                $this->ensureUniqueIdentity($customer, $custUpdateData['no_ktp'] ?? null);
                $customer->update($custUpdateData);
            }

            return $customer;
        }

        return $this->findOrCreateCustomer($validated, $fotoKtpPath, $fotoSimPath);
    }

    /**
     * Pastikan No. KTP yang akan dipasang ke pelanggan tidak sedang dipakai
     * pelanggan lain (constraint unique di database). Kalau dipakai, hentikan
     * dengan pesan yang jelas daripada error database mentah (500).
     * No. HP sengaja tidak dicek — HP diperbolehkan sama antar pelanggan.
     */
    private function ensureUniqueIdentity(Customer $self, ?string $noKtp): void
    {
        if ($noKtp) {
            $other = Customer::where('no_ktp', $noKtp)->where('id', '!=', $self->id)->first();
            if ($other) {
                throw ValidationException::withMessages([
                    'customer_no_ktp' => ['No. KTP '.$noKtp.' sudah terdaftar atas nama '.$other->nama_lengkap.'.'],
                ]);
            }
        }
    }

    private function findOrCreateCustomer(array $validated, ?string $fotoKtpPath, ?string $fotoSimPath): Customer
    {
        $customerName = trim($validated['customer_name']);
        $normalizedHp = ! empty($validated['customer_no_hp']) ? $this->normalizePhone($validated['customer_no_hp']) : null;
        $noKtp = ! empty($validated['customer_no_ktp']) ? trim($validated['customer_no_ktp']) : null;

        $query = Customer::where('nama_lengkap', $customerName);
        if ($normalizedHp) {
            $query->where('no_hp', $normalizedHp);
        }
        $customer = $query->first();

        if (! $customer) {
            // No. KTP punya constraint unique — kalau sudah dipakai pelanggan
            // lain (beda nama/HP), hentikan dengan pesan yang jelas daripada
            // membiarkan database menolak dengan error mentah.
            if ($noKtp) {
                $pemilikKtp = Customer::where('no_ktp', $noKtp)->first();
                if ($pemilikKtp) {
                    throw ValidationException::withMessages([
                        'customer_no_ktp' => ['No. KTP '.$noKtp.' sudah terdaftar atas nama '.$pemilikKtp->nama_lengkap.'. Pilih pelanggan tersebut dari daftar, atau gunakan No. KTP yang berbeda.'],
                    ]);
                }
            }

            // No. HP sengaja tidak dicek — HP diperbolehkan sama antar
            // pelanggan (mis. HP keluarga). Identitas dipegang oleh No. KTP.

            $customerData = [
                'nama_lengkap' => $customerName,
                'no_hp' => $normalizedHp,
                'email' => $validated['customer_email'] ?? null,
                'alamat' => $validated['customer_alamat'] ?? null,
                'no_sim' => $validated['customer_no_sim'] ?? null,
                'no_ktp' => $noKtp,
            ];
            if ($fotoKtpPath) {
                $customerData['foto_ktp'] = $fotoKtpPath;
            }
            if ($fotoSimPath) {
                $customerData['foto_sim'] = $fotoSimPath;
            }
            try {
                $customer = Customer::create($customerData);
            } catch (QueryException $e) {
                // Unique constraint race — pelanggan dibuat request lain lebih
                // dulu. Beda-kan sumber duplikatnya dari pesan driver
                // (errorInfo[2]), BUKAN getMessage() yang menyertakan SQL
                // lengkap — kolom no_ktp selalu muncul di daftar kolom INSERT,
                // sehingga deteksi berbasis getMessage() selalu false-positive.
                if ($e->errorInfo[1] != 1062) {
                    throw $e;
                }

                $pesan = $e->errorInfo[2] ?? '';

                if (str_contains($pesan, 'no_ktp')) {
                    $pemilikKtp = $noKtp ? Customer::where('no_ktp', $noKtp)->first() : null;
                    throw ValidationException::withMessages([
                        'customer_no_ktp' => ['No. KTP '.$noKtp.' sudah terdaftar'.($pemilikKtp ? ' atas nama '.$pemilikKtp->nama_lengkap : '').'. Pilih pelanggan tersebut dari daftar, atau gunakan No. KTP yang berbeda.'],
                    ]);
                }

                throw $e;
            }
        }

        return $customer;
    }

    private function updateCustomerFields(Customer $customer, array $validated, ?string $fotoKtpPath, ?string $fotoSimPath): void
    {
        $custUpdateData = [];
        if (isset($validated['customer_name']) && trim($validated['customer_name']) !== '') {
            $custUpdateData['nama_lengkap'] = trim($validated['customer_name']);
        }
        if (! empty($validated['customer_no_hp'])) {
            $custUpdateData['no_hp'] = $this->normalizePhone($validated['customer_no_hp']);
        }
        if (isset($validated['customer_email'])) {
            $custUpdateData['email'] = $validated['customer_email'] ?: null;
        }
        if (isset($validated['customer_alamat'])) {
            $custUpdateData['alamat'] = $validated['customer_alamat'] ?: null;
        }
        if (isset($validated['customer_no_sim'])) {
            $custUpdateData['no_sim'] = $validated['customer_no_sim'] ?: null;
        }
        if (isset($validated['customer_no_ktp'])) {
            $custUpdateData['no_ktp'] = $validated['customer_no_ktp'] ?: null;
        }
        if (! empty($validated['customer_foto_ktp_delete'])) {
            $custUpdateData['foto_ktp'] = null;
        }
        if ($fotoKtpPath) {
            $custUpdateData['foto_ktp'] = $fotoKtpPath;
        }
        if ($fotoSimPath) {
            $custUpdateData['foto_sim'] = $fotoSimPath;
        }
        if ($custUpdateData) {
            $this->ensureUniqueIdentity($customer, $custUpdateData['no_ktp'] ?? null);
            $customer->update($custUpdateData);
        }
    }

    private function normalizePhone(string $phone): string
    {
        $normalized = preg_replace('/[^0-9]/', '', $phone);
        if (str_starts_with($normalized, '0')) {
            $normalized = '62'.substr($normalized, 1);
        } elseif (str_starts_with($normalized, '8')) {
            $normalized = '62'.$normalized;
        }

        return $normalized;
    }

    private function checkVehicleOverlap(int $kendaraanId, string $tanggalMulai, string $tanggalSelesai, ?string $jamMulai, ?string $jamSelesai, ?int $excludeOrderId = null): void
    {
        $newEffectiveStart = $tanggalMulai.' '.($jamMulai ?? '00:00');
        $newEffectiveEnd = $tanggalSelesai.' '.($jamSelesai ?? '23:59:59');

        $query = Order::where('kendaraan_id', $kendaraanId)
            ->whereNull('deleted_at')
            ->whereIn('status_order', ['pending', 'confirmed', 'active'])
            ->whereDate('tanggal_mulai', '<=', $tanggalSelesai)
            ->whereDate('tanggal_selesai', '>=', $tanggalMulai);

        if ($excludeOrderId) {
            $query->where('id', '!=', $excludeOrderId);
        }

        $candidates = $query->lockForUpdate()->get();

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
    }

    private function validateAndRecordPayment(Order $order, int $adminId, array $validated): void
    {
        $statusPembayaran = $validated['status_pembayaran'] ?? 'unpaid';
        if ($statusPembayaran === 'unpaid') {
            return;
        }

        $jumlahBayar = (float) ($validated['jumlah_bayar'] ?? 0);
        $hargaTotal = (float) $order->harga_total;

        if ($jumlahBayar <= 0) {
            throw ValidationException::withMessages([
                'jumlah_bayar' => ['Jumlah bayar harus lebih dari 0 saat status pembayaran '.$statusPembayaran.'.'],
            ]);
        }

        if ($jumlahBayar > $hargaTotal) {
            throw ValidationException::withMessages([
                'jumlah_bayar' => ['Jumlah bayar ('.number_format($jumlahBayar, 0, ',', '.').') tidak boleh melebihi harga total ('.number_format($hargaTotal, 0, ',', '.').').'],
            ]);
        }

        // Di awal (create) belum ada riwayat DP, jadi "Lunas" berarti langsung
        // bayar penuh dan "DP/partial" berarti bayar sebagian.
        if ($statusPembayaran === 'paid' && $jumlahBayar < $hargaTotal - 0.01) {
            throw ValidationException::withMessages([
                'jumlah_bayar' => ['Untuk status "Lunas", jumlah bayar harus sama dengan harga total (Rp '.number_format($hargaTotal, 0, ',', '.').').'],
            ]);
        }

        if ($statusPembayaran === 'partial' && abs($jumlahBayar - $hargaTotal) < 0.01) {
            throw ValidationException::withMessages([
                'status_pembayaran' => ['Jumlah bayar sudah mencapai harga total — gunakan status "Lunas".'],
            ]);
        }

        Pembayaran::create([
            'order_id' => $order->id,
            'admin_id' => $adminId,
            'jumlah' => $jumlahBayar,
            'metode_pembayaran' => $validated['metode_pembayaran'] ?? 'cash',
            'status' => $statusPembayaran === 'paid' ? 'pelunasan' : 'dp',
            'bukti_transfer' => $validated['bukti_transfer_path'] ?? null,
            'catatan' => $validated['catatan'] ?? null,
        ]);
    }

    private function handleStatusTransition(Order $order, array $validated, string $statusSebelumUpdate, Request $request): void
    {
        if (! isset($validated['status_order']) || $validated['status_order'] === $statusSebelumUpdate) {
            return;
        }

        $newStatus = $validated['status_order'];
        $wa = app(WhatsAppService::class);
        $nomorCustomer = $order->customer->no_hp ?? null;

        if ($newStatus === 'confirmed') {
            $this->kirimNotifKonfirmasi($order);
        }

        if ($newStatus === 'active' && $statusSebelumUpdate === 'perlu_verifikasi') {
            // Reaktivasi setelah verifikasi: janji freeze dicabut, denda dihitung
            // live kembali sampai order benar-benar diselesaikan.
            $order->update(['waktu_perlu_verifikasi' => null]);
        }

        if ($newStatus === 'active' && $nomorCustomer && Setting::get('notif_penugasan_driver', '1') === '1') {
            $pesan = "Halo {$order->customer->nama_lengkap},\n\n"
                ."Kendaraan *{$order->kendaraan->nama_kendaraan}* sedang dalam perjalanan 🚗\n"
                ."Status: *Sedang Disewakan*\n\n"
                .'Selamat menggunakan kendaraan kami!';
            $wa->kirimPesanAsync($nomorCustomer, $pesan, 'order_disewakan', $order->id);
        }

        if ($newStatus === 'active') {
            $this->kirimNotifSupirOrderMulai($order);
        }

        if (isset($validated['supir_id']) && $validated['supir_id'] !== null && Setting::get('notif_penugasan_driver', '1') === '1') {
            $supir = SupirCalo::find($validated['supir_id']);
            if ($supir && $supir->no_hp) {
                $template = Setting::get('template_penugasan_driver', 'Halo {nama_driver}, ada tugas baru:\nAntar {customer} — {kendaraan} ({plat_nomor})\n{tanggal} pukul {jam}\n\nBalas SIAP jika bisa, atau TIDAK jika berhalangan.');
                $pesan = $wa->renderTemplate($template, [
                    'nama_driver' => $supir->nama,
                    'customer' => $order->customer->nama_lengkap,
                    'kendaraan' => $order->kendaraan->nama_kendaraan,
                    'plat_nomor' => $order->kendaraan->plat_nomor,
                    'tanggal' => $order->tanggal_mulai->format('d/m/Y'),
                    'jam' => $order->jam_mulai ?? '00:00',
                ]);
                $wa->kirimPesanAsync($supir->no_hp, $pesan, 'penugasan_driver', $order->id);
            }
        }

        if ($newStatus === 'completed' && $statusSebelumUpdate !== 'completed') {
            $waktuAktual = isset($validated['tanggal_pengembalian_aktual'])
                ? Carbon::parse($validated['tanggal_pengembalian_aktual'])
                : now();

            // Kebijakan: pengembalian lebih awal TIDAK menghasilkan refund —
            // tagihan tetap sesuai kesepakatan. Cukup dicatat di catatan order
            // supaya ada jejak untuk admin.
            $hariLebihAwal = $order->hariLebihAwal($waktuAktual);

            $order->selesaikanSewa($waktuAktual);
            $order->save();

            if ($hariLebihAwal > 0) {
                $catatanLebihAwal = 'Dikembalikan lebih awal '.$hariLebihAwal.' hari dari kesepakatan (batas: '.($order->batasWaktuKembali()?->format('d/m/Y H:i') ?? '-').' WIB). Tagihan tetap sesuai kesepakatan, tanpa refund.';
                $existingNotes = $order->catatan ?? '';
                if (strpos($existingNotes, 'Dikembalikan lebih awal') === false) {
                    $order->update([
                        'catatan' => trim(($existingNotes ? $existingNotes."\n" : '').$catatanLebihAwal),
                    ]);
                }
            }

            if (Setting::get('notif_order_selesai', '1') === '1') {
                $pesan = "Halo {$order->customer->nama_lengkap},\n\n"
                    ."Order *{$order->kode_order}* telah *SELESAI* ✅\n";
                if ($hariLebihAwal > 0) {
                    $pesan .= "Pengembalian lebih awal {$hariLebihAwal} hari dari kesepakatan — tagihan tetap sesuai kesepakatan, tanpa refund.\n";
                }
                $pesan .= "Terima kasih telah menggunakan layanan kami.\n"
                    .'Sampai jumpa di pemesanan berikutnya! 🙏';
                $wa->kirimPesanAsync($order->customer->no_hp, $pesan, 'order_selesai', $order->id);
            }

            $this->kirimNotifSupirSelesai($order);
        }

        if ($newStatus === 'cancelled' && $statusSebelumUpdate !== 'cancelled') {
            $biayaPembatalan = (float) ($validated['biaya_pembatalan'] ?? $order->biaya_pembatalan ?? 0);
            $totalBayar = (float) $order->pembayarans()->whereNull('deleted_at')->where('status', '!=', 'refund')->sum('jumlah');
            $refund = max(0, $totalBayar - $biayaPembatalan);

            if ($refund > 0) {
                $order->total_refund = $refund;
                Pembayaran::create([
                    'order_id' => $order->id,
                    'admin_id' => $request->user()->id,
                    'jumlah' => $refund,
                    'metode_pembayaran' => $order->metode_pembayaran ?? 'cash',
                    'status' => 'refund',
                    'catatan' => 'Refund pembatalan: dibayar Rp '.number_format($totalBayar, 0, ',', '.').' - biaya pembatalan Rp '.number_format($biayaPembatalan, 0, ',', '.'),
                ]);
            }

            if (Setting::get('notif_booking_baru', '1') === '1' && $order->customer->no_hp) {
                $pesan = "Halo {$order->customer->nama_lengkap},\n\n"
                    ."Order *{$order->kode_order}* telah *DIBATALKAN* ❌\n";
                if ($biayaPembatalan > 0) {
                    $pesan .= 'Biaya pembatalan: Rp '.number_format($biayaPembatalan, 0, ',', '.')."\n";
                }
                if ($refund > 0) {
                    $pesan .= 'Refund: *Rp '.number_format($refund, 0, ',', '.')."*\n";
                }
                $pesan .= ($validated['alasan_pembatalan'] ?? $order->alasan_pembatalan)
                    ? 'Alasan: '.($validated['alasan_pembatalan'] ?? $order->alasan_pembatalan)."\n"
                    : '';
                $pesan .= "\nTerima kasih.";
                $wa->kirimPesanAsync($order->customer->no_hp, $pesan, 'order_dibatalkan', $order->id);
            }
        }

        if ($newStatus === 'completed') {
            $order->update(['status_pengiriman' => 'selesai']);
        }
    }

    private function handlePaymentUpdate(Order $order, array $validated, Request $request): void
    {
        $paymentChanged = isset($validated['status_pembayaran']) || array_key_exists('jumlah_bayar', $validated);
        if (! $paymentChanged) {
            return;
        }

        $hargaTotal = (float) $order->harga_total;
        $jumlahBayar = (float) ($validated['jumlah_bayar'] ?? 0);
        $effectiveStatus = $validated['status_pembayaran'] ?? $order->status_pembayaran;
        $totalPaid = (float) $order->pembayarans()->whereNull('deleted_at')->where('status', '!=', 'refund')->sum('jumlah');
        $totalSetelahBayar = $totalPaid + $jumlahBayar;

        // Denda keterlambatan ikut jadi batas pembayaran maksimal & syarat
        // "lunas": denda live untuk order active, denda beku (janji freeze
        // OrderVerifyOverdue) untuk order perlu_verifikasi. Aman dari dobel
        // hitung: di jalur penyelesaian, handleStatusTransition sudah
        // mengubah status jadi completed & harga_total final sebelum method
        // ini berjalan, sehingga dendaLive = 0 dan harga_total sudah
        // mencakup denda.
        $dendaLive = in_array($order->status_order, ['active', 'perlu_verifikasi'], true)
            ? (float) $order->denda_overtime_saat_ini
            : 0;
        $batasMaksimal = $hargaTotal + $dendaLive;

        // "Lunas" harus benar-benar menutup total (tidak boleh kurang).
        if ($effectiveStatus === 'paid' && $totalSetelahBayar < $batasMaksimal - 0.01) {
            throw ValidationException::withMessages([
                'jumlah_bayar' => ['Nominal belum mencukupi pelunasan: total dibayar Rp '.number_format($totalSetelahBayar, 0, ',', '.').' dari total yang harus dilunasi Rp '.number_format($batasMaksimal, 0, ',', '.').'.'],
            ]);
        }

        if ($effectiveStatus === 'partial' && $jumlahBayar > 0 && abs($totalSetelahBayar - $batasMaksimal) < 0.01) {
            throw ValidationException::withMessages([
                'status_pembayaran' => ['Nominal pembayaran sudah mencapai total yang harus dibayar — gunakan status "Lunas".'],
            ]);
        }

        // Cap melebihi total dikecualikan saat order sedang diselesaikan di request
        // yang sama: harga_total final (denda keterlambatan) baru diketahui server
        // setelah proyeksi penyelesaian, dan nominalnya divalidasi ulang oleh
        // cek "kurang bayar" pada jalur penyelesaian.
        $completing = isset($validated['status_order']) && $validated['status_order'] === 'completed';
        if ($totalSetelahBayar > $batasMaksimal + 0.01 && ! $completing) {
            throw ValidationException::withMessages([
                'jumlah_bayar' => ['Total pembayaran ('.number_format($totalSetelahBayar, 0, ',', '.').') melebihi total yang harus dibayar ('.number_format($batasMaksimal, 0, ',', '.').').'],
            ]);
        }

        if ($jumlahBayar > 0) {
            Pembayaran::create([
                'order_id' => $order->id,
                'admin_id' => $request->user()->id,
                'jumlah' => $jumlahBayar,
                'metode_pembayaran' => $validated['metode_pembayaran'] ?? $order->metode_pembayaran ?? 'cash',
                'status' => $totalSetelahBayar >= $batasMaksimal - 0.01 ? 'pelunasan' : 'dp',
                'bukti_transfer' => $validated['bukti_transfer_path'] ?? $order->bukti_transfer,
                'catatan' => $validated['catatan'] ?? null,
            ]);

            if (Setting::get('notif_pembayaran_masuk', '1') === '1') {
                $wa = app(WhatsAppService::class);
                $pesan = "💰 *Pembayaran masuk!*\n"
                    ."Order: *{$order->kode_order}*\n"
                    ."Customer: {$order->customer->nama_lengkap}\n"
                    .'Jumlah: *Rp '.number_format($jumlahBayar, 0, ',', '.')."*\n"
                    .'Status: *'.($totalSetelahBayar >= $batasMaksimal - 0.01 ? 'Lunas' : 'DP').'*';
                $wa->kirimKeOwnerAsync($pesan, 'pembayaran_masuk', $order->id);
            }
        }

        // Rekonsiliasi status_pembayaran dari nominal aktual — tidak pernah
        // "paid" tanpa pembayaran yang menutup total.
        if ($totalSetelahBayar >= $batasMaksimal - 0.01) {
            $statusFinal = 'paid';
        } elseif ($totalSetelahBayar > 0) {
            $statusFinal = 'partial';
        } else {
            $statusFinal = $effectiveStatus === 'unpaid' ? 'unpaid' : 'partial';
        }

        if ($order->status_pembayaran !== $statusFinal) {
            $order->update(['status_pembayaran' => $statusFinal]);
        }
    }

    private function manageKendaraanStatus(Order $order, string $newStatus, int $newKendaraanId, int $oldKendaraanId): void
    {
        if ($newKendaraanId != $oldKendaraanId) {
            $oldKendaraan = Kendaraan::find($oldKendaraanId);
            if ($oldKendaraan && $oldKendaraan->status === 'disewa') {
                $oldKendaraan->update(['status' => 'tersedia']);
            }
        }

        $currentKendaraan = $order->kendaraan;

        match ($newStatus) {
            'active' => $currentKendaraan->update(['status' => 'disewa']),
            'completed', 'cancelled' => $currentKendaraan->update([
                'status' => $currentKendaraan->activeOrders()
                    ->where('id', '!=', $order->id)
                    ->exists()
                    ? 'disewa'
                    : ($currentKendaraan->status === 'tidak_tersedia' ? 'tidak_tersedia' : 'tersedia'),
            ]),
            default => null,
        };
    }
}
