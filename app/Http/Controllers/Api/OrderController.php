<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Models\Kendaraan;
use App\Models\Order;
use App\Models\Pembayaran;
use App\Models\Setting;
use App\Models\SupirCalo;
use App\Services\WatermarkService;
use App\Services\WhatsAppService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

class OrderController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Order::with(['customer', 'kendaraan.garasiPartner', 'admin', 'supir', 'calo', 'pembayarans']);

        if ($request->search) {
            $search = $request->search;
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

        if ($request->filled('status_order')) {
            $query->where('status_order', $request->status_order);
        }

        if ($request->filled('status_pembayaran')) {
            $query->where('status_pembayaran', $request->status_pembayaran);
        }

        if ($request->filled('status_pengiriman')) {
            $query->where('status_pengiriman', $request->status_pengiriman);
        }

        if ($request->filled('tanggal_mulai') && $request->filled('tanggal_selesai')) {
            $query->where('tanggal_mulai', '<=', $request->tanggal_selesai)
                ->where('tanggal_selesai', '>=', $request->tanggal_mulai);
        }

        $orders = $query->orderBy('created_at', 'desc')->paginate(15);

        return response()->json($orders);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'customer_id' => 'nullable|exists:customers,id',
            'customer_name' => 'required_without:customer_id|string|max:255',
            'customer_no_hp' => 'required|string|max:20',
            'customer_email' => 'nullable|email',
            'customer_alamat' => 'required|string|max:500',
            'customer_no_sim' => 'required|string|max:20',
            'customer_no_ktp' => 'nullable|string|max:30',
            'customer_foto_ktp' => 'nullable|image|max:2048',
            'customer_foto_ktp_delete' => 'nullable|boolean',
            'customer_foto_sim' => 'nullable|image|max:2048',
            'kendaraan_id' => 'required|exists:kendaraans,id',
            'alamat_jemput' => 'nullable|string|max:500',
            'tujuan' => 'required|string|max:500',
            'tanggal_mulai' => 'required|date|after_or_equal:today',
            'tanggal_selesai' => 'required|date|after_or_equal:tanggal_mulai',
            'jam_mulai' => 'nullable|date_format:H:i',
            'jam_selesai' => 'nullable|date_format:H:i',
            'metode_pembayaran' => 'nullable|in:cash,transfer,qris,lainnya',
            'status_pembayaran' => 'nullable|in:unpaid,partial,paid',
            'status_pengiriman' => 'nullable|in:belum_diambil,sudah_diantarkan,dalam_penyewaan,selesai',
            'bukti_transfer' => 'nullable|image|max:2048',
            'bukti_pengiriman' => 'nullable|image|max:2048',
            'bukti_pengembalian' => 'nullable|image|max:2048',
            'supir_id' => 'nullable|exists:supir_calos,id',
            'calo_id' => 'nullable|exists:supir_calos,id',
            'komisi_calo' => 'nullable|numeric|min:0',
            'catatan' => 'nullable|string',
            'jumlah_bayar' => 'nullable|numeric|min:0',
        ]);

        // ── Validasi awal (SEBELUM customer handling) ──────────────────
        // Dipindahkan ke depan supaya kalau gagal, customer belum dibuat
        // dan tidak ada data yang "menggantung" di database/storage.
        if (empty($validated['customer_id']) && ! $request->hasFile('customer_foto_ktp') && ! $request->hasFile('customer_foto_sim')) {
            return response()->json(['message' => 'Dokumen identitas wajib diupload untuk customer baru.'], 422);
        }

        // Order baru SELALU dimulai dari 'pending' — transisi status hanya
        // boleh dilakukan via update().
        $statusOrder = 'pending';

        $foundSupir = null;
        if (! empty($validated['supir_id'])) {
            $foundSupir = SupirCalo::find($validated['supir_id']);
            if ($foundSupir && $foundSupir->jenis !== 'supir') {
                return response()->json(['message' => 'ID yang dipilih bukan supir.'], 422);
            }
        }
        $foundCalo = null;
        if (! empty($validated['calo_id'])) {
            $foundCalo = SupirCalo::find($validated['calo_id']);
            if ($foundCalo && $foundCalo->jenis !== 'calo') {
                return response()->json(['message' => 'ID yang dipilih bukan calo.'], 422);
            }
        }

        $komisiCalo = $validated['komisi_calo'] ?? null;
        if ($foundCalo && is_null($komisiCalo)) {
            $komisiCalo = $foundCalo->komisi;
        }

        $statusPengiriman = $validated['status_pengiriman'] ?? 'belum_diambil';
        if (in_array($statusPengiriman, ['sudah_diantarkan', 'dalam_penyewaan']) && ! $request->hasFile('bukti_pengiriman')) {
            return response()->json([
                'message' => 'Bukti foto pengiriman wajib diunggah saat status pengiriman "'.$statusPengiriman.'".',
            ], 422);
        }

        $kendaraan = Kendaraan::findOrFail($validated['kendaraan_id']);

        // M12: Validate jam_mulai > jam_selesai on same day (negative time window)
        if (($validated['jam_mulai'] ?? null) && ($validated['jam_selesai'] ?? null)
            && $validated['tanggal_mulai'] === $validated['tanggal_selesai']
            && $validated['jam_mulai'] >= $validated['jam_selesai']) {
            return response()->json(['message' => 'Jam selesai harus setelah jam mulai untuk tanggal yang sama.'], 422);
        }

        // ── Simpan file bukti + foto customer di luar transaction ──────
        $buktiPath = null;
        if ($request->hasFile('bukti_transfer')) {
            $buktiPath = $request->file('bukti_transfer')->store('bukti-transfer', 'public');
        }
        $buktiPengirimanPath = null;
        if ($request->hasFile('bukti_pengiriman')) {
            $buktiPengirimanPath = $request->file('bukti_pengiriman')->store('bukti-pengiriman', 'public');
        }
        $buktiPengembalianPath = null;
        if ($request->hasFile('bukti_pengembalian')) {
            $buktiPengembalianPath = $request->file('bukti_pengembalian')->store('bukti-pengembalian', 'public');
        }

        $customerFotoKtpPath = null;
        $customerFotoSimPath = null;
        $oldCustomerPhotos = [];
        if ($request->hasFile('customer_foto_ktp')) {
            $customerFotoKtpPath = $request->file('customer_foto_ktp')->store('customers', 'public');
        }
        if ($request->hasFile('customer_foto_sim')) {
            $customerFotoSimPath = $request->file('customer_foto_sim')->store('customers', 'public');
        }

        // ── Watermark (dilakukan setelah file tersimpan, di luar transaksi) ──
        $watermarkPaths = array_filter([$buktiPath, $buktiPengirimanPath, $buktiPengembalianPath]);
        $identityPaths = array_filter([$customerFotoKtpPath, $customerFotoSimPath]);
        try {
            $watermark = app(WatermarkService::class);
            foreach ($watermarkPaths as $path) {
                $watermark->applyToStoragePath($path);
            }
            foreach ($identityPaths as $path) {
                $watermark->applyToStoragePath($path, 'CVPILAR • Identitas');
            }
        } catch (\Throwable) {
            // GD extension not available in test env — skip silently.
        }
        // Collect old customer photo paths for deferred deletion after transaction commits.
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

        // ── Customer + Order dalam satu transaction ────────────────────
        $order = DB::transaction(function () use ($request, $validated, $kendaraan, $statusOrder, $statusPengiriman, $buktiPath, $buktiPengirimanPath, $buktiPengembalianPath, $customerFotoKtpPath, $customerFotoSimPath, $foundSupir, $komisiCalo) {
            if (! empty($validated['customer_id'])) {
                $customer = Customer::findOrFail($validated['customer_id']);
                $custUpdateData = [];
                if (isset($validated['customer_name']) && trim($validated['customer_name']) !== '') {
                    $custUpdateData['nama_lengkap'] = trim($validated['customer_name']);
                }
                if (! empty($validated['customer_no_hp'])) {
                    $normalizedHp = preg_replace('/[^0-9]/', '', $validated['customer_no_hp']);
                    if (str_starts_with($normalizedHp, '0')) {
                        $normalizedHp = '62'.substr($normalizedHp, 1);
                    } elseif (str_starts_with($normalizedHp, '8')) {
                        $normalizedHp = '62'.$normalizedHp;
                    }
                    $custUpdateData['no_hp'] = $normalizedHp;
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
                if ($customerFotoKtpPath) {
                    $custUpdateData['foto_ktp'] = $customerFotoKtpPath;
                }
                if ($customerFotoSimPath) {
                    $custUpdateData['foto_sim'] = $customerFotoSimPath;
                }
                if ($custUpdateData) {
                    $customer->update($custUpdateData);
                }
            } else {
                $customerName = trim($validated['customer_name']);
                $normalizedHp = null;
                if (! empty($validated['customer_no_hp'])) {
                    $normalizedHp = preg_replace('/[^0-9]/', '', $validated['customer_no_hp']);
                    if (str_starts_with($normalizedHp, '0')) {
                        $normalizedHp = '62'.substr($normalizedHp, 1);
                    } elseif (str_starts_with($normalizedHp, '8')) {
                        $normalizedHp = '62'.$normalizedHp;
                    }
                }

                $query = Customer::where('nama_lengkap', $customerName);
                if ($normalizedHp) {
                    $query->where('no_hp', $normalizedHp);
                }
                $customer = $query->first();

                if (! $customer) {
                    $customerData = [
                        'nama_lengkap' => $customerName,
                        'no_hp' => $normalizedHp,
                        'email' => $validated['customer_email'] ?? null,
                        'alamat' => $validated['customer_alamat'] ?? null,
                        'no_sim' => $validated['customer_no_sim'] ?? null,
                        'no_ktp' => $validated['customer_no_ktp'] ?? null,
                    ];
                    if ($customerFotoKtpPath) {
                        $customerData['foto_ktp'] = $customerFotoKtpPath;
                    }
                    if ($customerFotoSimPath) {
                        $customerData['foto_sim'] = $customerFotoSimPath;
                    }
                    $customer = Customer::create($customerData);
                }
            }

            // Overlap check inside transaction with row-level lock
            // Membandingkan datetime: jika jam kosong, default 00:00 (mulai) / 23:59 (selesai)
            $newEffectiveStart = $validated['tanggal_mulai'].' '.($validated['jam_mulai'] ?? '00:00');
            $newEffectiveEnd = $validated['tanggal_selesai'].' '.($validated['jam_selesai'] ?? '23:59');

            $candidates = Order::where('kendaraan_id', $validated['kendaraan_id'])
                ->whereIn('status_order', ['pending', 'confirmed', 'active'])
                ->whereDate('tanggal_mulai', '<=', $validated['tanggal_selesai'])
                ->whereDate('tanggal_selesai', '>=', $validated['tanggal_mulai'])
                ->lockForUpdate()
                ->get();

            $hasOverlap = $candidates->contains(function ($existing) use ($newEffectiveStart, $newEffectiveEnd) {
                $existingStart = $existing->tanggal_mulai->format('Y-m-d').' '.($existing->jam_mulai ?? '00:00');
                $existingEnd = $existing->tanggal_selesai->format('Y-m-d').' '.($existing->jam_selesai ?? '23:59');

                return $existingStart <= $newEffectiveEnd && $existingEnd >= $newEffectiveStart;
            });

            if ($hasOverlap) {
                throw ValidationException::withMessages([
                    'kendaraan_id' => ['Kendaraan sudah memiliki order pada tanggal yang beririsan.'],
                ]);
            }

            $hargaPerHari = $kendaraan->harga_sewa_per_hari;
            $mulaiDt = Carbon::parse($validated['tanggal_mulai']);
            $selesaiDt = Carbon::parse($validated['tanggal_selesai']);
            $durasi = (int) $mulaiDt->startOfDay()->diffInDays($selesaiDt->startOfDay());
            if ($durasi < 1) {
                $durasi = 1;
            }

            $supirTarif = 0;
            if ($foundSupir) {
                $supirTarif = (float) ($foundSupir->tarif_per_hari ?? 0);
            }

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
                'status_order' => $statusOrder,
                'status_pembayaran' => $validated['status_pembayaran'] ?? 'unpaid',
                'status_pengiriman' => $statusPengiriman,
                'catatan' => $validated['catatan'] ?? null,
                'bukti_transfer' => $buktiPath,
                'bukti_pengiriman' => $buktiPengirimanPath,
                'bukti_pengembalian' => $buktiPengembalianPath,
                'durasi_hari' => $durasi,
                'harga_total' => ($durasi * $hargaPerHari) + ($supirTarif * $durasi),
                'supir_id' => $validated['supir_id'] ?? null,
                'calo_id' => $validated['calo_id'] ?? null,
                'komisi_calo' => $komisiCalo,
                'admin_id' => $request->user()->id,
            ]);

            // ── Validasi jumlah_bayar terhadap harga_total ──
            $statusPembayaran = $validated['status_pembayaran'] ?? 'unpaid';
            if (in_array($statusPembayaran, ['partial', 'paid'])) {
                $jumlahBayar = $validated['jumlah_bayar'] ?? 0;
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
            }

            // ── Catat pembayaran awal DI DALAM transaksi ──
            if ($statusPembayaran !== 'unpaid') {
                Pembayaran::create([
                    'order_id' => $order->id,
                    'admin_id' => $request->user()->id,
                    'jumlah' => $validated['jumlah_bayar'] ?? 0,
                    'metode_pembayaran' => $validated['metode_pembayaran'] ?? 'cash',
                    'status' => $statusPembayaran === 'paid' ? 'pelunasan' : 'dp',
                    'bukti_transfer' => $buktiPath,
                    'catatan' => $validated['catatan'] ?? null,
                ]);
            }

            return $order;
        });

        // Delete old customer photos AFTER transaction commits — prevents data loss on rollback.
        foreach ($oldCustomerPhotos as $oldPath) {
            if (Storage::disk('public')->exists($oldPath)) {
                Storage::disk('public')->delete($oldPath);
            }
        }

        return response()->json($order->load(['customer', 'kendaraan.garasiPartner', 'admin', 'supir', 'calo', 'pembayarans']), 201);
    }

    public function show(Order $order): JsonResponse
    {
        $order->load(['customer', 'kendaraan.garasiPartner', 'admin', 'supir', 'calo', 'garasiRequests.garasiPartner', 'pembayarans']);

        return response()->json($order);
    }

    public function update(Request $request, Order $order): JsonResponse
    {
        // Frontend mengirim '' (empty string) saat admin melepas supir/calo dari
        // order. Laravel 'nullable' hanya menerima null, bukan '' — jadi ''
        // lolos nullable lalu gagal di exists karena MySQL cast '' ke id 0.
        // Konversi ke null sebelum validasi agar 'nullable' bekerja seharusnya.
        foreach (['supir_id', 'calo_id'] as $field) {
            if ($request->input($field) === '') {
                $request->merge([$field => null]);
            }
        }

        $validated = $request->validate([
            'customer_id' => 'nullable|exists:customers,id',
            'customer_name' => 'sometimes|required|string|max:255',
            'customer_no_hp' => 'sometimes|required|string|max:20',
            'customer_email' => 'nullable|email',
            'customer_alamat' => 'sometimes|required|string|max:500',
            'customer_no_sim' => 'sometimes|required|string|max:20',
            'customer_no_ktp' => 'nullable|string|max:30',
            'customer_foto_ktp' => 'nullable|image|max:2048',
            'customer_foto_ktp_delete' => 'nullable|boolean',
            'customer_foto_sim' => 'nullable|image|max:2048',
            'kendaraan_id' => 'sometimes|required|exists:kendaraans,id',
            'alamat_jemput' => 'nullable|string|max:500',
            'tujuan' => 'sometimes|required|string|max:500',
            'tanggal_mulai' => 'sometimes|date|after_or_equal:today',
            'tanggal_selesai' => 'sometimes|date|after_or_equal:tanggal_mulai',
            'jam_mulai' => 'nullable|date_format:H:i',
            'jam_selesai' => 'nullable|date_format:H:i',
            'tanggal_pengembalian_aktual' => 'nullable|date',
            'status_order' => 'nullable|in:pending,confirmed,active,completed,cancelled',
            'metode_pembayaran' => 'nullable|in:cash,transfer,qris,lainnya',
            'status_pembayaran' => 'nullable|in:unpaid,partial,paid',
            'status_pengiriman' => 'nullable|in:belum_diambil,sudah_diantarkan,dalam_penyewaan,selesai',
            'bukti_transfer' => 'nullable|image|max:2048',
            'bukti_pengiriman' => 'nullable|image|max:2048',
            'bukti_pengembalian' => 'nullable|image|max:2048',
            'supir_id' => 'nullable|exists:supir_calos,id',
            'calo_id' => 'nullable|exists:supir_calos,id',
            'komisi_calo' => 'nullable|numeric|min:0',
            'catatan' => 'nullable|string',
            'jumlah_bayar' => 'nullable|numeric|min:0',
        ]);

        // ── Validasi awal (SEBELUM customer handling) ──────────────────
        // Dipindahkan ke depan supaya kalau gagal, customer belum termodifikasi.

        // Order terminal: data inti terkunci — hanya status_order (dengan validasi transisi),
        // status_pembayaran, metode bayar, bukti pembayaran, dan catatan yang boleh diubah.
        if (in_array($order->status_order, ['active', 'completed', 'cancelled'])) {
            $lockedFields = ['customer_id', 'customer_name', 'customer_no_hp', 'customer_email', 'customer_alamat', 'customer_no_sim', 'customer_no_ktp', 'customer_foto_ktp', 'customer_foto_sim', 'kendaraan_id', 'tanggal_mulai', 'tanggal_selesai', 'jam_mulai', 'jam_selesai', 'alamat_jemput', 'tujuan', 'supir_id', 'calo_id'];
            $attemptedLocked = array_intersect_key($validated, array_flip($lockedFields));
            if (! empty($attemptedLocked) || $request->hasFile('customer_foto_ktp') || $request->hasFile('customer_foto_sim')) {
                return response()->json(['message' => 'Order ini sudah final (aktif/selesai/dibatalkan). Hanya status, status pembayaran, metode bayar, bukti pembayaran, dan catatan yang bisa diperbarui.'], 422);
            }
        }

        if (isset($validated['supir_id']) && $validated['supir_id'] !== null) {
            $supir = SupirCalo::find($validated['supir_id']);
            if ($supir && $supir->jenis !== 'supir') {
                return response()->json(['message' => 'ID yang dipilih bukan supir.'], 422);
            }
        }
        if (isset($validated['calo_id']) && $validated['calo_id'] !== null) {
            $calo = SupirCalo::find($validated['calo_id']);
            if ($calo && $calo->jenis !== 'calo') {
                return response()->json(['message' => 'ID yang dipilih bukan calo.'], 422);
            }
        }

        if (isset($validated['calo_id']) && ! isset($validated['komisi_calo'])) {
            $caloForKomisi = $validated['calo_id'] ? SupirCalo::find($validated['calo_id']) : null;
            $validated['komisi_calo'] = $caloForKomisi?->komisi;
        }

        $newStatusPengiriman = $validated['status_pengiriman'] ?? $order->status_pengiriman;
        if (in_array($newStatusPengiriman, ['sudah_diantarkan', 'dalam_penyewaan']) && ! $request->hasFile('bukti_pengiriman') && ! $order->bukti_pengiriman) {
            return response()->json([
                'message' => 'Bukti foto pengiriman wajib diunggah saat status pengiriman "'.$newStatusPengiriman.'".',
            ], 422);
        }

        // ── Validasi transisi status_order (SEBELUM validasi bukti) ──
        if (isset($validated['status_order']) && $validated['status_order'] !== $order->status_order) {
            if (! $order->canTransitionTo($validated['status_order'])) {
                $dari = $order->status_order;
                $ke = $validated['status_order'];

                return response()->json([
                    'message' => "Transisi status dari '{$dari}' ke '{$ke}' tidak diizinkan.",
                ], 422);
            }
        }

        $newStatusOrder = $validated['status_order'] ?? $order->status_order;
        if ($newStatusOrder === 'completed' && ! $request->hasFile('bukti_pengembalian') && ! $order->bukti_pengembalian) {
            return response()->json([
                'message' => 'Bukti foto pengembalian kendaraan wajib diunggah saat menyelesaikan order.',
            ], 422);
        }

        if ($newStatusOrder === 'completed') {
            $order->load('pembayarans');
            $totalBayar = $order->pembayarans->whereNull('deleted_at')->sum('jumlah');
            $kurangBayar = (float) $order->harga_total - (float) $totalBayar;
            if ($kurangBayar > 0 && ! $request->hasFile('bukti_pengembalian')) {
                return response()->json([
                    'message' => 'Order masih kurang bayar Rp '.number_format($kurangBayar, 0, ',', '.').'. Upload bukti pelunasan atau lunasi terlebih dahulu.',
                ], 422);
            }
        }

        $oldKendaraanId = $order->kendaraan_id;
        $newKendaraanId = $validated['kendaraan_id'] ?? $oldKendaraanId;
        $effectiveTanggalMulai = $validated['tanggal_mulai'] ?? $order->tanggal_mulai->format('Y-m-d');
        $effectiveTanggalSelesai = $validated['tanggal_selesai'] ?? $order->tanggal_selesai->format('Y-m-d');

        // Ditangkap SEBELUM $order->update() di bawah, supaya kita tahu apakah
        // order ini BARU SAJA berubah menjadi "completed" pada request ini,
        // atau memang sudah "completed" sejak sebelumnya (mis. admin cuma
        // membetulkan catatan/typo pada order yang sudah lama selesai).
        $statusSebelumUpdate = $order->status_order;

        // ── Simpan file bukti di luar transaction (filesystem, bukan DB) ──
        // Old files are deleted AFTER the transaction commits to prevent data loss
        // if the transaction rolls back.
        $updateData = collect($validated)->except(['bukti_transfer', 'bukti_pengiriman', 'bukti_pengembalian'])->toArray();
        $filesToDelete = [];

        $newBuktiTransferPath = null;
        if ($request->hasFile('bukti_transfer')) {
            // Jangan hapus file lama — bisa jadi direferensikan oleh record Pembayaran historis.
            $newBuktiTransferPath = $request->file('bukti_transfer')->store('bukti-transfer', 'public');
            $updateData['bukti_transfer'] = $newBuktiTransferPath;
        }

        if ($request->hasFile('bukti_pengiriman')) {
            if ($order->bukti_pengiriman) {
                $filesToDelete[] = $order->bukti_pengiriman;
            }
            $updateData['bukti_pengiriman'] = $request->file('bukti_pengiriman')->store('bukti-pengiriman', 'public');
        }

        if ($request->hasFile('bukti_pengembalian')) {
            if ($order->bukti_pengembalian) {
                $filesToDelete[] = $order->bukti_pengembalian;
            }
            $updateData['bukti_pengembalian'] = $request->file('bukti_pengembalian')->store('bukti-pengembalian', 'public');
        }

        // M1+H1: Customer photo handling outside transaction — store new, collect old for deferred deletion.
        $customerFotoKtpPath = null;
        $customerFotoSimPath = null;
        if ($request->hasFile('customer_foto_ktp')) {
            $customerFotoKtpPath = $request->file('customer_foto_ktp')->store('customers', 'public');
        }
        if ($request->hasFile('customer_foto_sim')) {
            $customerFotoSimPath = $request->file('customer_foto_sim')->store('customers', 'public');
        }

        // ── Watermark (dilakukan setelah file tersimpan, di luar transaksi) ──
        $watermarkPaths = array_filter([$newBuktiTransferPath, $updateData['bukti_pengiriman'] ?? null, $updateData['bukti_pengembalian'] ?? null]);
        $identityPaths = array_filter([$customerFotoKtpPath, $customerFotoSimPath]);
        try {
            $watermark = app(WatermarkService::class);
            foreach ($watermarkPaths as $path) {
                $watermark->applyToStoragePath($path);
            }
            foreach ($identityPaths as $path) {
                $watermark->applyToStoragePath($path, 'CVPILAR • Identitas');
            }
        } catch (\Throwable) {
            // GD extension not available in test env — skip silently.
        }

        // Collect old customer photo paths for deferred deletion.
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

        // ── Customer + Order update dalam satu transaction ─────────────
        DB::transaction(function () use ($request, $validated, $order, $updateData, $newKendaraanId, $oldKendaraanId, $statusSebelumUpdate, $effectiveTanggalMulai, $effectiveTanggalSelesai, $newBuktiTransferPath, $customerFotoKtpPath, $customerFotoSimPath) {
            if (! empty($validated['customer_id'])) {
                $customer = Customer::find($validated['customer_id']);
                if ($customer) {
                    $custUpdateData = [];
                    if (isset($validated['customer_name']) && trim($validated['customer_name']) !== '') {
                        $custUpdateData['nama_lengkap'] = trim($validated['customer_name']);
                    }
                    if (! empty($validated['customer_no_hp'])) {
                        $normalizedHp = preg_replace('/[^0-9]/', '', $validated['customer_no_hp']);
                        if (str_starts_with($normalizedHp, '0')) {
                            $normalizedHp = '62'.substr($normalizedHp, 1);
                        } elseif (str_starts_with($normalizedHp, '8')) {
                            $normalizedHp = '62'.$normalizedHp;
                        }
                        $custUpdateData['no_hp'] = $normalizedHp;
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
                    if ($customerFotoKtpPath) {
                        $custUpdateData['foto_ktp'] = $customerFotoKtpPath;
                    }
                    if ($customerFotoSimPath) {
                        $custUpdateData['foto_sim'] = $customerFotoSimPath;
                    }
                    if ($custUpdateData) {
                        $customer->update($custUpdateData);
                    }
                }
            } elseif (! empty($validated['customer_name'])) {
                $customerName = trim($validated['customer_name']);
                $normalizedHp = null;
                if (! empty($validated['customer_no_hp'])) {
                    $normalizedHp = preg_replace('/[^0-9]/', '', $validated['customer_no_hp']);
                    if (str_starts_with($normalizedHp, '0')) {
                        $normalizedHp = '62'.substr($normalizedHp, 1);
                    } elseif (str_starts_with($normalizedHp, '8')) {
                        $normalizedHp = '62'.$normalizedHp;
                    }
                }

                $query = Customer::where('nama_lengkap', $customerName);
                if ($normalizedHp) {
                    $query->where('no_hp', $normalizedHp);
                }
                $customer = $query->first();

                if (! $customer) {
                    $customerData = [
                        'nama_lengkap' => $customerName,
                        'no_hp' => $normalizedHp,
                        'email' => $validated['customer_email'] ?? null,
                        'alamat' => $validated['customer_alamat'] ?? null,
                        'no_sim' => $validated['customer_no_sim'] ?? null,
                        'no_ktp' => $validated['customer_no_ktp'] ?? null,
                    ];
                    if ($customerFotoKtpPath) {
                        $customerData['foto_ktp'] = $customerFotoKtpPath;
                    }
                    if ($customerFotoSimPath) {
                        $customerData['foto_sim'] = $customerFotoSimPath;
                    }
                    $customer = Customer::create($customerData);
                }
                $validated['customer_id'] = $customer->id;
                $updateData['customer_id'] = $customer->id;
            }

            // Overlap check inside transaction with row-level lock
            // Membandingkan datetime: jika jam kosong, default 00:00 (mulai) / 23:59 (selesai)
            $existingJamMulai = $validated['jam_mulai'] ?? $order->jam_mulai;
            $existingJamSelesai = $validated['jam_selesai'] ?? $order->jam_selesai;
            $newEffectiveStart = $effectiveTanggalMulai.' '.($existingJamMulai ?? '00:00');
            $newEffectiveEnd = $effectiveTanggalSelesai.' '.($existingJamSelesai ?? '23:59');

            $candidates = Order::where('kendaraan_id', $newKendaraanId)
                ->whereIn('status_order', ['pending', 'confirmed', 'active'])
                ->where('id', '!=', $order->id)
                ->whereDate('tanggal_mulai', '<=', $effectiveTanggalSelesai)
                ->whereDate('tanggal_selesai', '>=', $effectiveTanggalMulai)
                ->lockForUpdate()
                ->get();

            $hasOverlap = $candidates->contains(function ($existing) use ($newEffectiveStart, $newEffectiveEnd) {
                $existingStart = $existing->tanggal_mulai->format('Y-m-d').' '.($existing->jam_mulai ?? '00:00');
                $existingEnd = $existing->tanggal_selesai->format('Y-m-d').' '.($existing->jam_selesai ?? '23:59');

                return $existingStart <= $newEffectiveEnd && $existingEnd >= $newEffectiveStart;
            });

            if ($hasOverlap) {
                throw ValidationException::withMessages([
                    'kendaraan_id' => ['Kendaraan sudah memiliki order pada tanggal yang beririsan.'],
                ]);
            }

            $mulai = $validated['tanggal_mulai'] ?? $order->tanggal_mulai;
            $selesai = $validated['tanggal_selesai'] ?? $order->tanggal_selesai;

            // Only recalculate harga when a price-affecting field changes —
            // prevents silently overriding the agreed-upon price when admin
            // only updates status/notes on an existing order.
            $priceChanged = isset($validated['kendaraan_id'])
                || isset($validated['tanggal_mulai'])
                || isset($validated['tanggal_selesai'])
                || array_key_exists('supir_id', $validated);

            if ($priceChanged) {
                if ($newKendaraanId) {
                    $targetKendaraan = Kendaraan::find($newKendaraanId);
                    $harga = $targetKendaraan->harga_sewa_per_hari;
                } else {
                    $harga = $order->harga_per_hari;
                }

                $mulaiDt = Carbon::parse($mulai);
                $selesaiDt = Carbon::parse($selesai);
                $durasi = (int) $mulaiDt->startOfDay()->diffInDays($selesaiDt->startOfDay());
                if ($durasi < 1) {
                    $durasi = 1;
                }

                $updateData['harga_per_hari'] = $harga;
                $updateData['durasi_hari'] = $durasi;

                $supirTarif = 0;
                $supirId = array_key_exists('supir_id', $validated) ? $validated['supir_id'] : $order->supir_id;
                if (! empty($supirId)) {
                    $supir = SupirCalo::find($supirId);
                    $supirTarif = (float) ($supir->tarif_per_hari ?? 0);
                }
                $updateData['harga_total'] = ($durasi * $harga) + ($supirTarif * $durasi);
            }

            $order->update($updateData);

            if (isset($validated['status_order']) && $validated['status_order'] !== $statusSebelumUpdate) {
                $wa = app(WhatsAppService::class);
                $nomorCustomer = $order->customer->no_hp ?? null;

                if ($validated['status_order'] === 'confirmed' && $nomorCustomer && Setting::get('notif_booking_baru', '1') === '1') {
                    $pesan = "Halo {$order->customer->nama_lengkap},\n\n"
                        ."Order *{$order->kode_order}* telah Dikonfirmasi ✅\n"
                        ."Kendaraan: {$order->kendaraan->nama_kendaraan}\n"
                        ."Tanggal: *{$order->tanggal_mulai->format('d/m/Y')} - {$order->tanggal_selesai->format('d/m/Y')}*\n"
                        .'Total: *Rp '.number_format((float) $order->harga_total, 0, ',', '.')."*\n\n"
                        .'Terima kasih telah menggunakan layanan kami.';
                    $wa->kirimPesan($nomorCustomer, $pesan);
                }

                if ($validated['status_order'] === 'active' && $nomorCustomer && Setting::get('notif_penugasan_driver', '1') === '1') {
                    $pesan = "Halo {$order->customer->nama_lengkap},\n\n"
                        ."Kendaraan *{$order->kendaraan->nama_kendaraan}* sedang dalam perjalanan 🚗\n"
                        ."Status: *Sedang Disewakan*\n\n"
                        .'Selamat menggunakan kendaraan kami!';
                    $wa->kirimPesan($nomorCustomer, $pesan);
                }
            }

            if (isset($validated['supir_id']) && $validated['supir_id'] !== null && Setting::get('notif_penugasan_driver', '1') === '1') {
                $supir = SupirCalo::find($validated['supir_id']);
                if ($supir && $supir->no_hp) {
                    $wa = app(WhatsAppService::class);
                    $template = Setting::get('template_penugasan_driver', 'Halo {nama_driver}, ada tugas baru:\nAntar {customer} — {kendaraan} ({plat_nomor})\n{tanggal} pukul {jam}\n\nBalas SIAP jika bisa, atau TIDAK jika berhalangan.');
                    $pesan = $wa->renderTemplate($template, [
                        'nama_driver' => $supir->nama,
                        'customer' => $order->customer->nama_lengkap,
                        'kendaraan' => $order->kendaraan->nama_kendaraan,
                        'plat_nomor' => $order->kendaraan->plat_nomor,
                        'tanggal' => $order->tanggal_mulai->format('d/m/Y'),
                        'jam' => $order->jam_selesai ?? '00:00',
                    ]);
                    $wa->kirimPesan($supir->no_hp, $pesan);
                }
            }

            // ── H2+H3+H4: Validasi jumlah_bayar ──
            // H2: Also validate when jumlah_bayar is present without explicit status_pembayaran.
            $effectiveStatusPembayaran = $validated['status_pembayaran'] ?? $order->status_pembayaran;
            $hasJumlahBayar = array_key_exists('jumlah_bayar', $validated) && $validated['jumlah_bayar'] > 0;

            if (($hasJumlahBayar || in_array($effectiveStatusPembayaran, ['partial', 'paid']))) {
                $jumlahBayar = $validated['jumlah_bayar'] ?? 0;
                $hargaTotal = (float) $order->harga_total;

                if ($hasJumlahBayar && in_array($effectiveStatusPembayaran, ['partial', 'paid'])) {
                    if ($jumlahBayar <= 0) {
                        throw ValidationException::withMessages([
                            'jumlah_bayar' => ['Jumlah bayar harus lebih dari 0 saat status pembayaran '.$effectiveStatusPembayaran.'.'],
                        ]);
                    }
                    // H3: Cumulative check — sum of existing payments + new amount <= harga_total
                    $totalPaid = (float) $order->pembayarans()->whereNull('deleted_at')->sum('jumlah');
                    if ($totalPaid + $jumlahBayar > $hargaTotal) {
                        throw ValidationException::withMessages([
                            'jumlah_bayar' => ['Total pembayaran ('
                                .number_format($totalPaid + $jumlahBayar, 0, ',', '.')
                               .') melebihi harga total ('.number_format($hargaTotal, 0, ',', '.').').'],
                        ]);
                    }
                }
            }

            // ── H4: Catat pembayaran baru dengan idempotency check ──
            $jumlahBayar = $validated['jumlah_bayar'] ?? 0;

            $paymentChanged = isset($validated['status_pembayaran'])
                || array_key_exists('jumlah_bayar', $validated);

            // H4: Idempotency — don't create payment if total already covers harga_total
            $totalPaid = (float) $order->pembayarans()->whereNull('deleted_at')->sum('jumlah');
            $alreadyFullyPaid = $totalPaid >= (float) $order->harga_total;

            if ($paymentChanged && $jumlahBayar > 0 && ! $alreadyFullyPaid && (($validated['status_pembayaran'] ?? $order->getOriginal('status_pembayaran')) !== 'unpaid')) {
                $statusPembayaran = $validated['status_pembayaran'] ?? $order->status_pembayaran;
                Pembayaran::create([
                    'order_id' => $order->id,
                    'admin_id' => $request->user()->id,
                    'jumlah' => $jumlahBayar,
                    'metode_pembayaran' => $validated['metode_pembayaran'] ?? $order->metode_pembayaran ?? 'cash',
                    'status' => $statusPembayaran === 'paid' ? 'pelunasan' : 'dp',
                    'bukti_transfer' => $newBuktiTransferPath ?? $order->bukti_transfer,
                    'catatan' => $validated['catatan'] ?? null,
                ]);

                if (Setting::get('notif_pembayaran_masuk', '1') === '1') {
                    $wa = app(WhatsAppService::class);
                    $pesan = "💰 *Pembayaran masuk!*\n"
                        ."Order: *{$order->kode_order}*\n"
                        ."Customer: {$order->customer->nama_lengkap}\n"
                        .'Jumlah: *Rp '.number_format($jumlahBayar, 0, ',', '.')."*\n"
                        .'Status: *'.($statusPembayaran === 'paid' ? 'Lunas' : 'DP').'*';
                    $wa->kirimKeOwner($pesan);
                }
            }

            // Refresh stale relationships — kendaraan may have changed
            $order->load('kendaraan');

            if (isset($validated['status_order'])) {
                $currentKendaraan = $order->kendaraan;

                if ($newKendaraanId && $newKendaraanId != $oldKendaraanId) {
                    $oldKendaraan = Kendaraan::find($oldKendaraanId);
                    if ($oldKendaraan && $oldKendaraan->status === 'disewa') {
                        $oldKendaraan->update(['status' => 'tersedia']);
                    }
                }

                match ($validated['status_order']) {
                    'active' => $currentKendaraan->update(['status' => 'disewa']),
                    'completed', 'cancelled' => $currentKendaraan->update([
                        'status' => $currentKendaraan->activeOrders()
                            ->where('id', '!=', $order->id)
                            ->exists()
                            ? 'disewa'
                            : 'tersedia',
                    ]),
                    default => null,
                };

                if (in_array($validated['status_order'], ['completed', 'cancelled'])) {
                    $order->update(['status_pengiriman' => 'selesai']);
                }

                if ($validated['status_order'] === 'completed' && $statusSebelumUpdate !== 'completed') {
                    $waktuAktual = isset($validated['tanggal_pengembalian_aktual'])
                        ? Carbon::parse($validated['tanggal_pengembalian_aktual'])
                        : now();
                    $order->selesaikanSewa($waktuAktual);
                    $order->save();

                    if (Setting::get('notif_kendaraan_terlambat', '1') === '1') {
                        $wa = app(WhatsAppService::class);
                        $pesan = "Halo {$order->customer->nama_lengkap},\n\n"
                            ."Order *{$order->kode_order}* telah *SELESAI* ✅\n"
                            ."Terima kasih telah menggunakan layanan kami.\n"
                            .'Sampai jumpa di pemesanan berikutnya! 🙏';
                        $wa->kirimPesan($order->customer->no_hp, $pesan);
                    }
                }
            }
        });

        // Delete old files AFTER transaction commits — prevents data loss on rollback
        foreach ($filesToDelete as $oldPath) {
            if (Storage::disk('public')->exists($oldPath)) {
                Storage::disk('public')->delete($oldPath);
            }
        }

        return response()->json($order->load(['customer', 'kendaraan.garasiPartner', 'admin', 'supir', 'calo', 'pembayarans']));
    }

    public function destroy(Order $order): JsonResponse
    {
        if (in_array($order->status_order, ['active', 'completed', 'cancelled'])) {
            return response()->json(['message' => 'Tidak bisa menghapus order aktif, selesai, atau dibatalkan.'], 422);
        }

        $order->delete();

        return response()->json(['message' => 'Order berhasil dihapus']);
    }
}
