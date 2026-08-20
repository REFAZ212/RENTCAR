<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\InspeksiKendaraan;
use App\Models\Kendaraan;
use App\Models\Notification;
use App\Models\Order;
use App\Models\Setting;
use App\Models\User;
use App\Services\OrderService;
use App\Services\WhatsAppService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class InspeksiKendaraanController extends Controller
{
    private const INSIGNIA_RULES = [
        'fuel_level' => 'required|in:kosong,1/8,1/4,3/8,1/2,5/8,3/4,7/8,full',
        'kondisi_body' => 'required|in:baik,lecet_ringan,lecet_parah,penyok,retak',
        'kondisi_interior' => 'nullable|in:baik,kotor_ringan,kotor_banyak,rusak',
        'kondisi_ban' => 'nullable|in:baik,tipis,gundul,kosong',
        'kondisi_ac' => 'nullable|in:baik,tidak_baik',
        'kondisi_lampu' => 'nullable|in:baik,tidak_baik',
    ];

    /**
     * Multi upload foto & video kendaraan â€” semuanya opsional.
     * Maks 10 file GABUNGAN (foto + video): foto maks 5 MB/file,
     * video maks 100 MB/file. Batas gabungan divalidasi manual
     * lewat validasiMediaMaksimal().
     */
    private const MULTIMEDIA_RULES = [
        'fotos' => 'nullable|array',
        'fotos.*' => 'image|mimes:jpeg,png,webp|max:5120',
        'videos' => 'nullable|array',
        'videos.*' => 'mimetypes:video/mp4,video/quicktime,video/webm|max:102400',
    ];

    private const MAKS_MEDIA = 10;

    /**
     * Kelengkapan yang diserahterimakan saat pickup & dicek ulang saat return.
     */
    private const CHECKLIST_ITEMS = ['kunci', 'stnk', 'kunci_roda', 'dongkrak', 'ban_serep', 'ac'];

    /**
     * Aturan validasi checklist serah terima — wajib semua item tercentang.
     * Rule diberikan sebagai elemen array terpisah (tanpa pipe) karena
     * Laravel tidak memecah pipe pada rule bertipe array.
     */
    private function aturanChecklist(bool $wajib = true): array
    {
        return [
            'checklist_serah_terima' => [
                $wajib ? 'required' : 'sometimes',
                'array',
                'size:'.count(self::CHECKLIST_ITEMS),
                function ($attribute, $value, $fail) {
                    if (count(array_unique($value)) !== count(self::CHECKLIST_ITEMS)) {
                        $fail('Semua kelengkapan serah terima wajib dicentang.');
                    }
                },
            ],
            'checklist_serah_terima.*' => 'in:'.implode(',', self::CHECKLIST_ITEMS),
        ];
    }

    /**
     * Tolak bila total foto+video melebihi batas gabungan.
     */
    private function validasiMediaMaksimal(Request $request): void
    {
        $jumlahFoto = count($request->file('fotos', []));
        $jumlahVideo = count($request->file('videos', []));

        if ($jumlahFoto + $jumlahVideo > self::MAKS_MEDIA) {
            throw ValidationException::withMessages([
                'fotos' => ['Maksimal '.self::MAKS_MEDIA.' file dokumentasi (foto + video) per inspeksi.'],
            ]);
        }
    }

    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', InspeksiKendaraan::class);

        $query = InspeksiKendaraan::with(['order', 'order.kendaraan', 'order.supir', 'admin']);

        if ($request->filled('order_id')) {
            $query->where('order_id', $request->input('order_id'));
        }

        if ($request->filled('jenis')) {
            $query->where('jenis', $request->input('jenis'));
        }

        $inspeksis = $query->latest()->paginate(20);

        return response()->json($inspeksis);
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorize('create', InspeksiKendaraan::class);

        $validated = $request->validate(array_merge([
            'order_id' => 'required|exists:orders,id',
            'jenis' => 'required|in:pickup,return',
            'odometer' => 'nullable|integer|min:0',
            'ada_damagenya' => 'nullable|boolean',
            'deskripsi_kondisi' => 'nullable|string',
            'catatan' => 'nullable|string',
            'foto' => 'nullable|image|max:5120',
            'ttd_customer' => ['nullable', Rule::requiredIf($request->input('jenis') === 'return'), 'image', 'max:2048'],
            'ttd_petugas' => ['nullable', Rule::requiredIf($request->input('jenis') === 'return'), 'image', 'max:2048'],
            'biaya_kerusakan' => 'nullable|numeric|min:1',
            'inspeksi_oleh' => 'nullable|string|max:255',
        ], self::INSIGNIA_RULES, self::MULTIMEDIA_RULES, $this->aturanChecklist()));

        $this->validasiMediaMaksimal($request);

        if ($validated['jenis'] === 'pickup') {
            $sudahAda = InspeksiKendaraan::where('order_id', $validated['order_id'])
                ->where('jenis', 'pickup')
                ->exists();

            if ($sudahAda) {
                throw ValidationException::withMessages([
                    'order_id' => ['Inspeksi pickup untuk order ini sudah ada — lanjutkan lewat task "Kirim Kendaraan" atau edit draft-nya.'],
                ]);
            }

            $validated['status'] = 'draft';
        }

        $validated['admin_id'] = $request->user()->id;

        $validated['foto'] = $request->hasFile('foto')
            ? $this->simpanGambar($request->file('foto'), 'inspeksi')
            : null;
        $validated['ttd_customer'] = $request->hasFile('ttd_customer')
            ? $this->simpanGambar($request->file('ttd_customer'), 'inspeksi/ttd')
            : null;
        $validated['ttd_petugas'] = $request->hasFile('ttd_petugas')
            ? $this->simpanGambar($request->file('ttd_petugas'), 'inspeksi/ttd')
            : null;
        $validated = array_merge($validated, $this->simpanMultimedia($request));

        $inspeksi = InspeksiKendaraan::create($validated);

        $inspeksi->load(['order', 'admin']);

        return response()->json($inspeksi, 201);
    }

    public function show(InspeksiKendaraan $inspeksi): JsonResponse
    {
        $this->authorize('view', $inspeksi);

        $inspeksi->load(['order.kendaraan', 'order.customer', 'admin']);

        return response()->json($inspeksi);
    }

    public function update(Request $request, InspeksiKendaraan $inspeksi): JsonResponse
    {
        $this->authorize('update', $inspeksi);

        if ($inspeksi->status !== 'draft') {
            throw ValidationException::withMessages([
                'status' => ['Inspeksi sudah final dan tidak bisa diubah — hubungi admin jika ada koreksi.'],
            ]);
        }

        $validated = $request->validate([
            'odometer' => 'nullable|integer|min:0',
            'fuel_level' => 'sometimes|in:kosong,1/8,1/4,3/8,1/2,5/8,3/4,7/8,full',
            'kondisi_body' => 'sometimes|in:baik,lecet_ringan,lecet_parah,penyok,retak',
            'kondisi_interior' => 'sometimes|in:baik,kotor_ringan,kotor_banyak,rusak',
            'kondisi_ban' => 'sometimes|in:baik,tipis,gundul,kosong',
            'kondisi_ac' => 'sometimes|in:baik,tidak_baik',
            'kondisi_lampu' => 'sometimes|in:baik,tidak_baik',
            'ada_damagenya' => 'nullable|boolean',
            'deskripsi_kondisi' => 'nullable|string',
            'catatan' => 'nullable|string',
            'foto' => 'nullable|image|max:5120',
            'ttd_customer' => 'nullable|image|max:2048',
            'ttd_petugas' => 'nullable|image|max:2048',
            'biaya_kerusakan' => 'nullable|numeric|min:1',
            'inspeksi_oleh' => 'nullable|string|max:255',
        ], self::MULTIMEDIA_RULES, $this->aturanChecklist(false));

        $this->validasiMediaMaksimal($request);

        if ($request->hasFile('foto')) {
            $validated['foto'] = $this->gantiGambar($request->file('foto'), $inspeksi->foto, 'inspeksi');
        }
        if ($request->hasFile('ttd_customer')) {
            $validated['ttd_customer'] = $this->gantiGambar($request->file('ttd_customer'), $inspeksi->ttd_customer, 'inspeksi/ttd');
        }
        if ($request->hasFile('ttd_petugas')) {
            $validated['ttd_petugas'] = $this->gantiGambar($request->file('ttd_petugas'), $inspeksi->ttd_petugas, 'inspeksi/ttd');
        }
        $validated = array_merge($validated, $this->gantiMultimedia($request, $inspeksi));

        $inspeksi->update($validated);
        $inspeksi->load(['order', 'admin']);

        return response()->json($inspeksi);
    }

    /**
     * Perbaiki tanda tangan (TTD) pada inspeksi yang sudah final — misalnya
     * inspeksi return yang tersimpan tanpa TTD sehingga order tidak bisa
     * ditutup. Khusus admin; hanya mengganti file gambar TTD, tanpa menyentuh
     * data inspeksi lainnya. Minimal satu TTD (customer atau petugas).
     */
    public function perbaikiTtd(Request $request, InspeksiKendaraan $inspeksi): JsonResponse
    {
        $this->authorize('perbaikiTtd', $inspeksi);

        $validated = $request->validate([
            'ttd_customer' => 'required_without:ttd_petugas|image|max:2048',
            'ttd_petugas' => 'required_without:ttd_customer|image|max:2048',
        ]);

        $data = [];
        if ($request->hasFile('ttd_customer')) {
            $data['ttd_customer'] = $this->gantiGambar($request->file('ttd_customer'), $inspeksi->ttd_customer, 'inspeksi/ttd');
        }
        if ($request->hasFile('ttd_petugas')) {
            $data['ttd_petugas'] = $this->gantiGambar($request->file('ttd_petugas'), $inspeksi->ttd_petugas, 'inspeksi/ttd');
        }

        $inspeksi->update($data);
        $inspeksi->load(['order', 'admin']);

        return response()->json($inspeksi);
    }

    public function destroy(InspeksiKendaraan $inspeksi): JsonResponse
    {
        $this->authorize('delete', $inspeksi);
        foreach (['foto', 'ttd_customer', 'ttd_petugas'] as $field) {
            if ($inspeksi->$field && Storage::disk('public')->exists($inspeksi->$field)) {
                Storage::disk('public')->delete($inspeksi->$field);
            }
        }

        foreach (array_merge($inspeksi->fotos ?? [], $inspeksi->videos ?? []) as $path) {
            if ($path && Storage::disk('public')->exists($path)) {
                Storage::disk('public')->delete($path);
            }
        }

        $inspeksi->delete();

        return response()->json(['message' => 'Inspeksi berhasil dihapus.']);
    }

    public function byOrder(Order $order): JsonResponse
    {
        $this->authorize('viewAny', InspeksiKendaraan::class);

        $inspeksis = InspeksiKendaraan::where('order_id', $order->id)
            ->with('admin')
            ->get();

        return response()->json($inspeksis);
    }

    /**
     * Daftar TASK yang menanti operator/petugas:
     * - Pickup fase 1 (inspeksi_pickup): order "confirmed" yang belum punya
     *   inspeksi pickup sama sekali → isi & simpan draft inspeksi.
     * - Pickup fase 2 (kirim_kendaraan): order "confirmed" yang sudah punya
     *   draft → lanjutkan serah terima (TTD) & kirim kendaraan. Task ini
     *   hanya tampil ke pembuat draft (admin melihat semua).
     * - Return: order "active"/perlu_verifikasi yang belum punya inspeksi return.
     *
     * Task yang sudah DIKLAIM petugas lain tidak ikut tampil (biar tidak rebutan).
     */
    public function tasks(Request $request): JsonResponse
    {
        $this->authorize('viewAny', InspeksiKendaraan::class);

        $ambilOrders = function () {
            return Order::whereIn('status_order', ['confirmed', 'active', 'perlu_verifikasi'])
                ->with(['customer', 'kendaraan', 'inspeksis', 'supir', 'operator'])
                ->orderBy('created_at', 'desc')
                ->get();
        };

        $isAdmin = in_array($request->user()->role, ['admin_utama', 'admin_operasional']);

        $pickupFase1 = $ambilOrders()
            ->filter(function (Order $o) use ($request) {
                if ($o->status_order !== 'confirmed') {
                    return false;
                }
                if ($o->inspeksis->where('jenis', 'pickup')->isNotEmpty()) {
                    return false;
                }
                if ($o->operator_id && $o->operator_id !== $request->user()->id) {
                    return false;
                }

                return true;
            })
            ->map(fn (Order $o) => $o->setAttribute('task_jenis', 'inspeksi_pickup'));

        $pickupFase2 = $ambilOrders()
            ->filter(function (Order $o) use ($request, $isAdmin) {
                if ($o->status_order !== 'confirmed') {
                    return false;
                }

                $draft = $o->inspeksis->where('jenis', 'pickup')->first();
                if (! $draft || $draft->status !== 'draft') {
                    return false;
                }

                // Fase 2 hanya untuk pembuat draft (admin mengikuti semua).
                if (! $isAdmin && $draft->admin_id !== $request->user()->id) {
                    return false;
                }

                if ($o->operator_id && $o->operator_id !== $request->user()->id) {
                    return false;
                }

                return true;
            })
            ->map(fn (Order $o) => $o->setAttribute('task_jenis', 'kirim_kendaraan'));

        $returns = $ambilOrders()
            ->filter(function (Order $o) use ($request) {
                if (! in_array($o->status_order, ['active', 'perlu_verifikasi'])) {
                    return false;
                }
                if ($o->inspeksis->where('jenis', 'return')->isNotEmpty()) {
                    return false;
                }
                if ($o->operator_id && $o->operator_id !== $request->user()->id) {
                    return false;
                }

                return true;
            })
            ->map(fn (Order $o) => $o->setAttribute('task_jenis', 'return'));

        $tasks = $pickupFase1
            ->concat($pickupFase2)
            ->concat($returns)
            ->sortByDesc('created_at')
            ->values();

        return response()->json($tasks);
    }

    /**
     * Operator (petugas): KIRIM kendaraan — fase 2 dari inspeksi pickup.
     * Draft inspeksi (fase 1) wajib sudah disimpan via store(). Payload
     * cukup inspeksi_id + tanda tangan (file baru boleh, atau pakai yang
     * sudah tersimpan). Transisi: order "confirmed" → "active",
     * kendaraan "disewa", inspeksi dikunci (final), WA bukti terkirim.
     */
    public function kirimKendaraan(Request $request, Order $order): JsonResponse
    {
        $this->authorize('ikutiTask', $order);

        $validated = $request->validate([
            'inspeksi_id' => 'required|integer|exists:inspeksi_kendaraans,id',
            'ttd_customer' => 'nullable|image|max:2048',
            'ttd_petugas' => 'nullable|image|max:2048',
        ]);

        $inspeksi = DB::transaction(function () use ($request, $order, $validated) {
            $order = Order::whereKey($order->id)->lockForUpdate()->first();

            if ($order->status_order !== 'confirmed') {
                throw ValidationException::withMessages([
                    'status_order' => ['Order sudah diproses petugas lain atau statusnya bukan "Dikonfirmasi".'],
                ]);
            }

            // Non-tunai harus ada pembayaran (DP/lunas) tercatat sebelum
            // kendaraan dikirim. Tunai (cash) dibayar saat serah terima.
            $metode = $order->metode_pembayaran ?? 'cash';
            if ($metode !== 'cash' && $order->status_pembayaran === 'unpaid') {
                throw ValidationException::withMessages([
                    'status_pembayaran' => ['Pembayaran (DP/lunas) wajib tercatat sebelum kendaraan dikirim untuk metode non-tunai.'],
                ]);
            }

            $draft = InspeksiKendaraan::whereKey($validated['inspeksi_id'])->first();

            if (! $draft || $draft->order_id !== $order->id || $draft->jenis !== 'pickup' || $draft->status !== 'draft') {
                throw ValidationException::withMessages([
                    'inspeksi_id' => ['Inspeksi draft untuk order ini tidak ditemukan — isi inspeksi terlebih dahulu.'],
                ]);
            }

            $pemilikDraft = $draft->admin_id === $request->user()->id;
            $isAdmin = in_array($request->user()->role, ['admin_utama', 'admin_operasional']);

            if (! $pemilikDraft && ! $isAdmin) {
                throw ValidationException::withMessages([
                    'inspeksi_id' => ['Draft inspeksi ini disimpan oleh petugas lain.'],
                ]);
            }

            if ($order->operator_id && $order->operator_id !== $request->user()->id) {
                $pengeklaim = $order->operator?->name ?? 'petugas lain';
                throw ValidationException::withMessages([
                    'order_id' => ["Task ini sedang dikerjakan oleh {$pengeklaim}."],
                ]);
            }

            $ttdCustomer = $request->hasFile('ttd_customer')
                ? $this->gantiGambar($request->file('ttd_customer'), $draft->ttd_customer, 'inspeksi/ttd')
                : $draft->ttd_customer;
            $ttdPetugas = $request->hasFile('ttd_petugas')
                ? $this->gantiGambar($request->file('ttd_petugas'), $draft->ttd_petugas, 'inspeksi/ttd')
                : $draft->ttd_petugas;

            if (! $ttdCustomer || ! $ttdPetugas) {
                throw ValidationException::withMessages([
                    'ttd_customer' => ['Tanda tangan customer & petugas wajib dilengkapi sebelum mengirim kendaraan.'],
                ]);
            }

            $draft->update([
                'status' => 'final',
                'ttd_customer' => $ttdCustomer,
                'ttd_petugas' => $ttdPetugas,
                'inspeksi_oleh' => $draft->inspeksi_oleh ?? $request->user()->name,
            ]);

            $order->update([
                'status_order' => 'active',
                'status_pengiriman' => 'dalam_penyewaan',
                'operator_id' => $request->user()->id,
                // Klaim pickup selesai dieksekusi: lepas jam klaim supaya
                // OrderCheckClaimTimeout tidak melepas operator di tengah sewa.
                'waktu_klaim' => null,
            ]);

            $kendaraan = Kendaraan::whereKey($order->kendaraan_id)->lockForUpdate()->first();
            if ($kendaraan) {
                $kendaraan->update(['status' => 'disewa']);
            }

            return $draft->fresh();
        });

        $this->notifHasilInspeksi($order->fresh(), $inspeksi, 'pickup');

        // Beri tahu supir yang ditugaskan bahwa tugasnya sudah mulai.
        app(OrderService::class)->kirimNotifSupirOrderMulai($order->fresh());

        return response()->json($inspeksi->load(['order', 'admin']), 200);
    }

    /**
     * Operator (petugas): isi inspeksi RETURN saat kendaraan dikembalikan.
     * Order tetap "active" â€” admin yang menutup (selesaikan) setelah cek pembayaran.
     */
    public function kembalikanKendaraan(Request $request, Order $order): JsonResponse
    {
        $this->authorize('ikutiTask', $order);

        $validated = $request->validate(array_merge([
            'odometer' => 'nullable|integer|min:0',
            'ada_damagenya' => 'nullable|boolean',
            'deskripsi_kondisi' => 'nullable|string',
            'catatan' => 'nullable|string',
            'biaya_kerusakan' => 'nullable|numeric|min:1',
            'foto' => 'nullable|image|max:5120',
            'ttd_customer' => 'required|image|max:2048',
            'ttd_petugas' => 'required|image|max:2048',
            'inspeksi_oleh' => 'nullable|string|max:255',
        ], self::INSIGNIA_RULES, self::MULTIMEDIA_RULES, $this->aturanChecklist()));

        $this->validasiMediaMaksimal($request);

        $inspeksi = DB::transaction(function () use ($request, $order, $validated) {
            $order = Order::whereKey($order->id)->lockForUpdate()->first();

            if (! in_array($order->status_order, ['active', 'perlu_verifikasi'])) {
                throw ValidationException::withMessages([
                    'status_order' => ['Order sudah ditutup atau belum berstatus aktif.'],
                ]);
            }

            if ($order->inspeksis()->where('jenis', 'return')->exists()) {
                throw ValidationException::withMessages([
                    'order_id' => ['Inspeksi akhir untuk order ini sudah tercatat.'],
                ]);
            }

            if ($order->operator_id && $order->operator_id !== $request->user()->id) {
                $pengeklaim = $order->operator?->name ?? 'petugas lain';
                throw ValidationException::withMessages([
                    'order_id' => ["Task ini sedang dikerjakan oleh {$pengeklaim}."],
                ]);
            }

            $data = $validated;
            $data['order_id'] = $order->id;
            $data['jenis'] = 'return';
            $data['admin_id'] = $request->user()->id;
            $data['inspeksi_oleh'] = $validated['inspeksi_oleh'] ?? $request->user()->name;
            $data['foto'] = $request->hasFile('foto')
                ? $this->simpanGambar($request->file('foto'), 'inspeksi')
                : null;
            $data['ttd_customer'] = $this->simpanGambar($request->file('ttd_customer'), 'inspeksi/ttd');
            $data['ttd_petugas'] = $this->simpanGambar($request->file('ttd_petugas'), 'inspeksi/ttd');
            $data = array_merge($data, $this->simpanMultimedia($request));

            $inspeksi = InspeksiKendaraan::create($data);

            $order->update([
                'status_pengiriman' => 'sudah_dikembalikan',
            ]);

            return $inspeksi;
        });

        $this->notifKendaraanDikembalikan($order->fresh());
        $this->notifHasilInspeksi($order->fresh(), $inspeksi, 'return');

        return response()->json($inspeksi->load(['order', 'admin']), 201);
    }

    /* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
     * HELPERS
     * â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

    /**
     * Simpan gambar dari tablet: kompres/resize (max lebar 1280px, JPEG q80)
     * supaya file ringan untuk dikirim & dimasukkan ke invoice.
     */
    private function simpanGambar(UploadedFile $file, string $dir): string
    {
        $image = @imagecreatefromstring((string) file_get_contents($file->getRealPath()));

        if ($image === false) {
            return $file->store($dir, 'public');
        }

        $w = imagesx($image);
        $h = imagesy($image);
        $maxW = 1280;

        if ($w > $maxW) {
            $nw = $maxW;
            $nh = (int) round($h * $maxW / $w);
            $resized = imagecreatetruecolor($nw, $nh);
            imagecopyresampled($resized, $image, 0, 0, 0, 0, $nw, $nh, $w, $h);
            imagedestroy($image);
            $image = $resized;
        }

        $name = $dir.'/'.Str::random(24).'.jpg';
        $path = storage_path('app/public/'.$name);
        if (! is_dir(dirname($path))) {
            mkdir(dirname($path), 0775, true);
        }
        imagejpeg($image, $path, 80);
        imagedestroy($image);

        return $name;
    }

    private function gantiGambar(UploadedFile $file, ?string $old, string $dir): string
    {
        if ($old && Storage::disk('public')->exists($old)) {
            Storage::disk('public')->delete($old);
        }

        return $this->simpanGambar($file, $dir);
    }

    /**
     * Simpan multi foto (dikompres via simpanGambar) & video (mentah) dari form.
     */
    private function simpanMultimedia(Request $request): array
    {
        $data = [];

        if ($request->hasFile('fotos')) {
            $fotos = [];
            foreach ($request->file('fotos') as $file) {
                $fotos[] = $this->simpanGambar($file, 'inspeksi');
            }
            $data['fotos'] = $fotos;
        }

        if ($request->hasFile('videos')) {
            $videos = [];
            foreach ($request->file('videos') as $file) {
                $videos[] = $file->store('inspeksi/videos', 'public');
            }
            $data['videos'] = $videos;
        }

        return $data;
    }

    /**
     * Update multi media: upload baru ditambahkan ke daftar yang sudah ada
     * (media lama tetap, tidak bisa dihapus dari sini).
     */
    private function gantiMultimedia(Request $request, InspeksiKendaraan $inspeksi): array
    {
        $data = [];

        if ($request->hasFile('fotos')) {
            $fotos = $inspeksi->fotos ?? [];
            foreach ($request->file('fotos') as $file) {
                $fotos[] = $this->simpanGambar($file, 'inspeksi');
            }
            $data['fotos'] = $fotos;
        }

        if ($request->hasFile('videos')) {
            $videos = $inspeksi->videos ?? [];
            foreach ($request->file('videos') as $file) {
                $videos[] = $file->store('inspeksi/videos', 'public');
            }
            $data['videos'] = $videos;
        }

        return $data;
    }

    /**
     * WA hasil inspeksi (pickup/return) ke customer â€” bukti serah terima.
     * Untuk return, biaya kerusakan ditulis sebagai perkiraan (final oleh admin).
     * Dihidupkan/dimatikan via setting kirim_hasil_inspeksi_ke_customer.
     */
    private function notifHasilInspeksi(Order $order, InspeksiKendaraan $inspeksi, string $jenis): void
    {
        if (Setting::get('kirim_hasil_inspeksi_ke_customer', '1') !== '1' || ! $order->customer?->no_hp) {
            return;
        }

        $wa = app(WhatsAppService::class);
        $fotoCount = count($inspeksi->fotos ?? []);
        $videoCount = count($inspeksi->videos ?? []);
        $mediaNote = "Dokumentasi: {$fotoCount} foto".($videoCount > 0 ? " & {$videoCount} video" : '');
        $kondisi = $inspeksi->ada_damagenya
            ? "Ada kerusakan: {$inspeksi->deskripsi_kondisi}"
            : 'Kondisi kendaraan baik';
        $odometer = $inspeksi->odometer !== null ? number_format($inspeksi->odometer, 0, ',', '.') : '-';

        if ($jenis === 'pickup') {
            if ($order->opsi_supir === 'dengan_supir') {
                $driverNote = ($order->supir?->nama ?? 'supir').' akan mengantar kendaraan.';
            } else {
                $driverNote = 'Kendaraan lepas kunci (tanpa supir).';
            }

            $pesan = "Halo {$order->customer->nama_lengkap},\n\n"
                ."Kendaraan *{$order->kendaraan->nama_kendaraan}* sudah diserahkan ðŸš—\n"
                ."Order: {$order->kode_order}\n"
                ."Odometer: {$odometer} km\n"
                ."BBM: {$inspeksi->fuel_level}\n"
                ."{$kondisi}\n"
                ."{$driverNote}\n"
                ."{$mediaNote}\n\n"
                .'Tanda tangan serah terima sudah tercatat. Detail & foto lengkap tersedia di invoice.';
            $wa->kirimPesanAsync($order->customer->no_hp, $pesan, 'hasil_inspeksi_pickup', $order->id);
        } else {
            $biaya = $inspeksi->biaya_kerusakan !== null && (float) $inspeksi->biaya_kerusakan > 0
                ? 'Perkiraan biaya kerusakan: Rp '.number_format((float) $inspeksi->biaya_kerusakan, 0, ',', '.')." (final ditentukan admin)\n"
                : '';

            $pesan = "Halo {$order->customer->nama_lengkap},\n\n"
                ."Kendaraan *{$order->kendaraan->nama_kendaraan}* sudah dikembalikan âœ…\n"
                ."Order: {$order->kode_order}\n"
                ."Odometer akhir: {$odometer} km\n"
                ."{$kondisi}\n"
                ."{$biaya}"
                ."{$mediaNote}\n\n"
                .'Tanda tangan pengembalian sudah tercatat. Terima kasih telah menggunakan layanan kami!';
            $wa->kirimPesanAsync($order->customer->no_hp, $pesan, 'hasil_inspeksi_return', $order->id);
        }
    }

    private function notifKendaraanDikembalikan(Order $order): void
    {
        $admins = User::whereIn('role', ['admin_utama', 'admin_operasional'])->get();

        foreach ($admins as $admin) {
            Notification::create([
                'user_id' => $admin->id,
                'type' => 'kendaraan_dikembalikan',
                'title' => 'Kendaraan Dikembalikan',
                'message' => "Order {$order->kode_order} ({$order->kendaraan->nama_kendaraan}) sudah dikembalikan â€” siap ditutup.",
                'data' => [
                    'order_id' => $order->id,
                    'link' => '/orders/'.$order->id,
                ],
            ]);
        }

        $wa = app(WhatsAppService::class);
        $wa->kirimKeOwnerAsync(
            "ðŸš— *Kendaraan Dikembalikan*\n"
            ."Order: *{$order->kode_order}*\n"
            ."Kendaraan: {$order->kendaraan->nama_kendaraan}\n"
            ."Customer: {$order->customer->nama_lengkap}\n\n"
            .'Order siap ditutup oleh admin.',
            'kendaraan_dikembalikan',
            $order->id
        );
    }
}
