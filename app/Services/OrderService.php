<?php

namespace App\Services;

use App\Models\Customer;
use App\Models\Kendaraan;
use App\Models\Order;
use App\Models\Pembayaran;
use App\Models\Setting;
use App\Models\SupirCalo;
use Carbon\Carbon;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

class OrderService
{
    public function list(array $filters): LengthAwarePaginator
    {
        $query = Order::with(['customer', 'kendaraan.garasiPartner', 'admin', 'supir', 'calo', 'pembayarans']);

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

        return $query->orderBy('created_at', 'desc')->paginate(15);
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

        $statusPengiriman = $validated['status_pengiriman'] ?? 'belum_diambil';
        if (in_array($statusPengiriman, ['sudah_diantarkan', 'dalam_penyewaan']) && empty($validated['bukti_pengiriman_path'])) {
            throw ValidationException::withMessages([
                'status_pengiriman' => ['Bukti foto pengiriman wajib diunggah saat status pengiriman "'.$statusPengiriman.'".'],
            ]);
        }

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

        $order = DB::transaction(function () use ($validated, $request, $kendaraan, $foundSupir, $komisiCalo, $statusPengiriman, $buktiPath, $buktiPengirimanPath, $buktiPengembalianPath, $customerFotoKtpPath, $customerFotoSimPath) {
            $customer = $this->resolveCustomer($validated, $customerFotoKtpPath, $customerFotoSimPath);

            $this->checkVehicleOverlap(
                $validated['kendaraan_id'],
                $validated['tanggal_mulai'],
                $validated['tanggal_selesai'],
                $validated['jam_mulai'] ?? null,
                $validated['jam_selesai'] ?? null
            );

            $hargaPerHari = $kendaraan->harga_sewa_per_hari;
            $mulaiDt = Carbon::parse($validated['tanggal_mulai']);
            $selesaiDt = Carbon::parse($validated['tanggal_selesai']);
            $durasi = max(1, (int) $mulaiDt->startOfDay()->diffInDays($selesaiDt->startOfDay()));

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
                'status_order' => 'pending',
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

            $this->validateAndRecordPayment($order, $request->user()->id, $validated);

            return $order;
        });

        foreach ($oldCustomerPhotos as $oldPath) {
            if (Storage::disk('public')->exists($oldPath)) {
                Storage::disk('public')->delete($oldPath);
            }
        }

        return $order->load(['customer', 'kendaraan.garasiPartner', 'admin', 'supir', 'calo', 'pembayarans']);
    }

    public function updateOrder(Order $order, array $validated, Request $request): Order
    {
        foreach (['supir_id', 'calo_id'] as $field) {
            if (isset($validated[$field]) && $validated[$field] === '') {
                $validated[$field] = null;
            }
        }

        if (in_array($order->status_order, ['active', 'completed', 'cancelled'])) {
            $lockedFields = ['customer_id', 'customer_name', 'customer_no_hp', 'customer_email', 'customer_alamat', 'customer_no_sim', 'customer_no_ktp', 'customer_foto_ktp', 'customer_foto_sim', 'kendaraan_id', 'tanggal_mulai', 'tanggal_selesai', 'jam_mulai', 'jam_selesai', 'alamat_jemput', 'tujuan', 'supir_id', 'calo_id'];
            $attemptedLocked = array_intersect_key($validated, array_flip($lockedFields));
            if (! empty($attemptedLocked) || ! empty($validated['customer_foto_ktp_path']) || ! empty($validated['customer_foto_sim_path'])) {
                throw ValidationException::withMessages([
                    'status_order' => ['Order ini sudah final (aktif/selesai/dibatalkan). Hanya status, status pembayaran, metode bayar, bukti pembayaran, dan catatan yang bisa diperbarui.'],
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

        if (isset($validated['calo_id']) && ! isset($validated['komisi_calo'])) {
            $caloForKomisi = $validated['calo_id'] ? SupirCalo::find($validated['calo_id']) : null;
            $validated['komisi_calo'] = $caloForKomisi?->komisi;
        }

        $newStatusPengiriman = $validated['status_pengiriman'] ?? $order->status_pengiriman;
        if (in_array($newStatusPengiriman, ['sudah_diantarkan', 'dalam_penyewaan']) && empty($validated['bukti_pengiriman_path']) && ! $order->bukti_pengiriman) {
            throw ValidationException::withMessages([
                'status_pengiriman' => ['Bukti foto pengiriman wajib diunggah saat status pengiriman "'.$newStatusPengiriman.'".'],
            ]);
        }

        if (isset($validated['status_order']) && $validated['status_order'] !== $order->status_order) {
            if (! $order->canTransitionTo($validated['status_order'])) {
                throw ValidationException::withMessages([
                    'status_order' => ["Transisi status dari '{$order->status_order}' ke '{$validated['status_order']}' tidak diizinkan."],
                ]);
            }
        }

        $newStatusOrder = $validated['status_order'] ?? $order->status_order;
        if ($newStatusOrder === 'completed' && empty($validated['bukti_pengembalian_path']) && ! $order->bukti_pengembalian) {
            throw ValidationException::withMessages([
                'bukti_pengembalian' => ['Bukti foto pengembalian kendaraan wajib diunggah saat menyelesaikan order.'],
            ]);
        }

        if ($newStatusOrder === 'completed') {
            $order->load('pembayarans');
            $totalBayar = $order->pembayarans->whereNull('deleted_at')->sum('jumlah');
            $kurangBayar = (float) $order->harga_total - (float) $totalBayar;
            if ($kurangBayar > 0 && empty($validated['bukti_pengembalian_path'])) {
                throw ValidationException::withMessages([
                    'jumlah_bayar' => ['Order masih kurang bayar Rp '.number_format($kurangBayar, 0, ',', '.').'. Upload bukti pelunasan atau lunasi terlebih dahulu.'],
                ]);
            }
        }

        $oldKendaraanId = $order->kendaraan_id;
        $newKendaraanId = $validated['kendaraan_id'] ?? $oldKendaraanId;
        $effectiveTanggalMulai = $validated['tanggal_mulai'] ?? $order->tanggal_mulai->format('Y-m-d');
        $effectiveTanggalSelesai = $validated['tanggal_selesai'] ?? $order->tanggal_selesai->format('Y-m-d');
        $statusSebelumUpdate = $order->status_order;

        $updateData = collect($validated)->except(['bukti_transfer', 'bukti_pengiriman', 'bukti_pengembalian', 'bukti_transfer_path', 'bukti_pengiriman_path', 'bukti_pengembalian_path', 'customer_foto_ktp_path', 'customer_foto_sim_path', 'customer_foto_ktp_delete', 'jumlah_bayar'])->toArray();

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
                || array_key_exists('supir_id', $validated);

            if ($priceChanged) {
                $targetKendaraan = $newKendaraanId ? Kendaraan::find($newKendaraanId) : null;
                $harga = $targetKendaraan ? $targetKendaraan->harga_sewa_per_hari : $order->harga_per_hari;

                $mulaiDt = Carbon::parse($mulai);
                $selesaiDt = Carbon::parse($selesai);
                $durasi = max(1, (int) $mulaiDt->startOfDay()->diffInDays($selesaiDt->startOfDay()));

                $updateData['harga_per_hari'] = $harga;
                $updateData['durasi_hari'] = $durasi;

                $supirId = array_key_exists('supir_id', $validated) ? $validated['supir_id'] : $order->supir_id;
                $supirTarif = 0;
                if (! empty($supirId)) {
                    $supir = SupirCalo::find($supirId);
                    $supirTarif = (float) ($supir?->tarif_per_hari ?? 0);
                }
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
        if (in_array($order->status_order, ['active', 'completed', 'cancelled'])) {
            throw ValidationException::withMessages([
                'status_order' => ['Tidak bisa menghapus order aktif, selesai, atau dibatalkan.'],
            ]);
        }

        $order->delete();
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
                $customer->update($custUpdateData);
            }

            return $customer;
        }

        return $this->findOrCreateCustomer($validated, $fotoKtpPath, $fotoSimPath);
    }

    private function findOrCreateCustomer(array $validated, ?string $fotoKtpPath, ?string $fotoSimPath): Customer
    {
        $customerName = trim($validated['customer_name']);
        $normalizedHp = ! empty($validated['customer_no_hp']) ? $this->normalizePhone($validated['customer_no_hp']) : null;

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
            if ($fotoKtpPath) {
                $customerData['foto_ktp'] = $fotoKtpPath;
            }
            if ($fotoSimPath) {
                $customerData['foto_sim'] = $fotoSimPath;
            }
            $customer = Customer::create($customerData);
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
        $newEffectiveEnd = $tanggalSelesai.' '.($jamSelesai ?? '23:59');

        $query = Order::where('kendaraan_id', $kendaraanId)
            ->whereIn('status_order', ['pending', 'confirmed', 'active'])
            ->whereDate('tanggal_mulai', '<=', $tanggalSelesai)
            ->whereDate('tanggal_selesai', '>=', $tanggalMulai);

        if ($excludeOrderId) {
            $query->where('id', '!=', $excludeOrderId);
        }

        $candidates = $query->lockForUpdate()->get();

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
    }

    private function validateAndRecordPayment(Order $order, int $adminId, array $validated): void
    {
        $statusPembayaran = $validated['status_pembayaran'] ?? 'unpaid';
        if ($statusPembayaran === 'unpaid') {
            return;
        }

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

        // Validasi: pelunasan hanya boleh jika sudah ada DP
        if ($statusPembayaran === 'paid') {
            $sudahBayar = $order->pembayarans()->sum('jumlah');
            if ($sudahBayar <= 0) {
                throw ValidationException::withMessages([
                    'status_pembayaran' => ['Pelunasan hanya bisa dilakukan setelah pembayaran DP.'],
                ]);
            }
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

        if ($newStatus === 'confirmed' && $nomorCustomer && Setting::get('notif_booking_baru', '1') === '1') {
            $pesan = "Halo {$order->customer->nama_lengkap},\n\n"
                ."Order *{$order->kode_order}* telah Dikonfirmasi ✅\n"
                ."Kendaraan: {$order->kendaraan->nama_kendaraan}\n"
                ."Tanggal: *{$order->tanggal_mulai->format('d/m/Y')} - {$order->tanggal_selesai->format('d/m/Y')}*\n"
                .'Total: *Rp '.number_format((float) $order->harga_total, 0, ',', '.')."*\n\n"
                .'Terima kasih telah menggunakan layanan kami.';
            $wa->kirimPesanAsync($nomorCustomer, $pesan);
        }

        if ($newStatus === 'active' && $nomorCustomer && Setting::get('notif_penugasan_driver', '1') === '1') {
            $pesan = "Halo {$order->customer->nama_lengkap},\n\n"
                ."Kendaraan *{$order->kendaraan->nama_kendaraan}* sedang dalam perjalanan 🚗\n"
                ."Status: *Sedang Disewakan*\n\n"
                .'Selamat menggunakan kendaraan kami!';
            $wa->kirimPesanAsync($nomorCustomer, $pesan);
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
                    'jam' => $order->jam_selesai ?? '00:00',
                ]);
                $wa->kirimPesanAsync($supir->no_hp, $pesan);
            }
        }

        if ($newStatus === 'completed' && $statusSebelumUpdate !== 'completed') {
            $waktuAktual = isset($validated['tanggal_pengembalian_aktual'])
                ? Carbon::parse($validated['tanggal_pengembalian_aktual'])
                : now();
            $order->selesaikanSewa($waktuAktual);
            $order->save();

            if (Setting::get('notif_kendaraan_terlambat', '1') === '1') {
                $pesan = "Halo {$order->customer->nama_lengkap},\n\n"
                    ."Order *{$order->kode_order}* telah *SELESAI* ✅\n"
                    ."Terima kasih telah menggunakan layanan kami.\n"
                    .'Sampai jumpa di pemesanan berikutnya! 🙏';
                $wa->kirimPesanAsync($order->customer->no_hp, $pesan);
            }
        }

        if (in_array($newStatus, ['completed', 'cancelled'])) {
            $order->update(['status_pengiriman' => 'selesai']);
        }
    }

    private function handlePaymentUpdate(Order $order, array $validated, Request $request): void
    {
        $effectiveStatusPembayaran = $validated['status_pembayaran'] ?? $order->status_pembayaran;
        $hasJumlahBayar = array_key_exists('jumlah_bayar', $validated) && $validated['jumlah_bayar'] > 0;

        if ($hasJumlahBayar || in_array($effectiveStatusPembayaran, ['partial', 'paid'])) {
            $jumlahBayar = $validated['jumlah_bayar'] ?? 0;
            $hargaTotal = (float) $order->harga_total;

            if ($hasJumlahBayar && in_array($effectiveStatusPembayaran, ['partial', 'paid'])) {
                if ($jumlahBayar <= 0) {
                    throw ValidationException::withMessages([
                        'jumlah_bayar' => ['Jumlah bayar harus lebih dari 0 saat status pembayaran '.$effectiveStatusPembayaran.'.'],
                    ]);
                }
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

        $jumlahBayar = $validated['jumlah_bayar'] ?? 0;
        $paymentChanged = isset($validated['status_pembayaran']) || array_key_exists('jumlah_bayar', $validated);
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
                'bukti_transfer' => $validated['bukti_transfer_path'] ?? $order->bukti_transfer,
                'catatan' => $validated['catatan'] ?? null,
            ]);

            if (Setting::get('notif_pembayaran_masuk', '1') === '1') {
                $wa = app(WhatsAppService::class);
                $pesan = "💰 *Pembayaran masuk!*\n"
                    ."Order: *{$order->kode_order}*\n"
                    ."Customer: {$order->customer->nama_lengkap}\n"
                    .'Jumlah: *Rp '.number_format($jumlahBayar, 0, ',', '.')."*\n"
                    .'Status: *'.($statusPembayaran === 'paid' ? 'Lunas' : 'DP').'*';
                $wa->kirimKeOwnerAsync($pesan);
            }
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
                    : 'tersedia',
            ]),
            default => null,
        };
    }
}
