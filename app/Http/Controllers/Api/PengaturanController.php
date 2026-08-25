<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use App\Services\BackupService;
use App\Services\WhatsAppService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class PengaturanController extends Controller
{
    public function getProfil(Request $request): JsonResponse
    {
        $user = $request->user();

        return response()->json([
            'nama' => $user->name,
            'email' => $user->email,
            'no_hp' => $user->phone ?? '',
            'avatar_url' => $user->avatar ? Storage::disk('public')->url($user->avatar) : null,
        ]);
    }

    public function updateProfil(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'nama' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email,'.$request->user()->id,
            'no_hp' => 'nullable|string|max:20',
            'avatar' => 'nullable|image|max:2048|dimensions:max_width=10000,max_height=10000',
        ]);

        $user = $request->user();
        $updateData = [
            'name' => $validated['nama'],
            'email' => $validated['email'],
            'phone' => $validated['no_hp'] ?? null,
        ];

        if ($request->hasFile('avatar')) {
            if ($user->avatar) {
                Storage::disk('public')->delete($user->avatar);
            }
            $updateData['avatar'] = $request->file('avatar')->store('avatars', 'public');
        }

        $user->update($updateData);

        return response()->json(['message' => 'Profil berhasil diperbarui.']);
    }

    public function updatePassword(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'password_lama' => 'required',
            'password_baru' => 'required|string|min:8',
            'konfirmasi_password' => 'required|same:password_baru',
        ]);

        $user = $request->user();

        if (! Hash::check($validated['password_lama'], $user->password)) {
            throw ValidationException::withMessages([
                'password_lama' => ['Password lama tidak sesuai.'],
            ]);
        }

        $user->update(['password' => $validated['password_baru']]);
        $user->tokens()->delete();

        return response()->json(['message' => 'Password berhasil diubah. Semua sesi aktif telah logout.']);
    }

    public function getBisnis(): JsonResponse
    {
        $jamOperasional = json_decode(Setting::get('jam_operasional', '[]'), true);

        return response()->json([
            'nama_usaha' => Setting::get('nama_usaha', ''),
            'alamat' => Setting::get('alamat_usaha', ''),
            'no_telp' => Setting::get('no_telp_usaha', ''),
            'email_usaha' => Setting::get('email_usaha', ''),
            'logo_url' => Setting::get('logo_usaha', '') ? Storage::disk('public')->url(Setting::get('logo_usaha')) : null,
            'jam_operasional' => $jamOperasional,
        ]);
    }

    public function updateBisnis(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'nama_usaha' => 'required|string|max:255',
            'alamat' => 'required|string',
            'no_telp' => 'nullable|string|max:20',
            'email_usaha' => 'nullable|email',
            'jam_operasional' => 'nullable|json',
            'logo' => 'nullable|image|max:2048',
        ]);

        Setting::set('nama_usaha', $validated['nama_usaha']);
        Setting::set('alamat_usaha', $validated['alamat']);
        Setting::set('no_telp_usaha', $validated['no_telp'] ?? '');
        Setting::set('email_usaha', $validated['email_usaha'] ?? '');

        if (isset($validated['jam_operasional'])) {
            Setting::set('jam_operasional', $validated['jam_operasional']);
        }

        if ($request->hasFile('logo')) {
            $oldLogo = Setting::get('logo_usaha');
            if ($oldLogo && Storage::disk('public')->exists($oldLogo)) {
                Storage::disk('public')->delete($oldLogo);
            }
            Setting::set('logo_usaha', $request->file('logo')->store('logos', 'public'));
        }

        return response()->json(['message' => 'Informasi bisnis berhasil disimpan.']);
    }

    public function getHarga(): JsonResponse
    {
        return response()->json([
            'biaya_antar_per_km' => (float) Setting::get('biaya_antar_per_km', 5000),
            'biaya_jemput_flat' => (float) Setting::get('biaya_jemput_flat', 25000),
            'biaya_dengan_driver_per_hari' => (float) Setting::get('biaya_dengan_driver_per_hari', 150000),
            'minimal_dp_persen' => (int) Setting::get('minimal_dp_persen', 30),
            'wajib_bayar_sebelum_antar' => Setting::get('wajib_bayar_sebelum_antar', '0') === '1',
            'auto_verify_enabled' => Setting::get('auto_verify_enabled', '1') === '1',
            'auto_verify_after_hours' => (int) Setting::get('auto_verify_after_hours', 24),
            'auto_complete_enabled' => Setting::get('auto_complete_enabled', '1') === '1',
            'auto_complete_after_hours' => (int) Setting::get('auto_complete_after_hours', 72),
            'pending_expire_hours' => (int) Setting::get('pending_expire_hours', 24),
            'confirmed_no_pickup_expire_hours' => (int) Setting::get('confirmed_no_pickup_expire_hours', 24),
            'driver_task_release_enabled' => Setting::get('driver_task_release_enabled', '1') === '1',
            'driver_task_release_minutes' => (int) Setting::get('driver_task_release_minutes', 120),
        ]);
    }

    public function updateHarga(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'biaya_antar_per_km' => 'required|numeric|min:0',
            'biaya_jemput_flat' => 'required|numeric|min:0',
            'biaya_dengan_driver_per_hari' => 'required|numeric|min:0',
            'minimal_dp_persen' => 'required|integer|min:0|max:100',
            'wajib_bayar_sebelum_antar' => 'boolean',
            'auto_verify_enabled' => 'boolean',
            'auto_verify_after_hours' => 'nullable|integer|min:1',
            'auto_complete_enabled' => 'boolean',
            'auto_complete_after_hours' => 'nullable|integer|min:1',
            'pending_expire_hours' => 'nullable|integer|min:1',
            'confirmed_no_pickup_expire_hours' => 'nullable|integer|min:1',
            'driver_task_release_enabled' => 'boolean',
            'driver_task_release_minutes' => 'nullable|integer|min:5|max:10080',
        ]);

        $skipFields = [
            'wajib_bayar_sebelum_antar', 'auto_verify_enabled', 'auto_complete_enabled',
            'auto_verify_after_hours', 'auto_complete_after_hours',
            'pending_expire_hours', 'confirmed_no_pickup_expire_hours',
            'driver_task_release_enabled', 'driver_task_release_minutes',
        ];

        Setting::set('wajib_bayar_sebelum_antar', ! empty($validated['wajib_bayar_sebelum_antar']) ? '1' : '0');
        Setting::set('auto_verify_enabled', ! empty($validated['auto_verify_enabled']) ? '1' : '0');
        Setting::set('auto_complete_enabled', ! empty($validated['auto_complete_enabled']) ? '1' : '0');
        Setting::set('driver_task_release_enabled', ! empty($validated['driver_task_release_enabled']) ? '1' : '0');
        foreach (['auto_verify_after_hours', 'auto_complete_after_hours', 'pending_expire_hours', 'confirmed_no_pickup_expire_hours', 'driver_task_release_minutes'] as $hoursKey) {
            if (! empty($validated[$hoursKey])) {
                Setting::set($hoursKey, $validated[$hoursKey]);
            }
        }

        foreach ($validated as $key => $value) {
            if (in_array($key, $skipFields)) {
                continue;
            }
            Setting::set($key, $value);
        }

        return response()->json(['message' => 'Kebijakan harga berhasil disimpan.']);
    }

    public function getNotifikasi(): JsonResponse
    {
        $fonnteToken = Setting::get('fonnte_token', '');
        $maskedToken = ! empty($fonnteToken)
            ? str_repeat('*', max(0, strlen($fonnteToken) - 4)).substr($fonnteToken, -4)
            : '';

        return response()->json([
            'fonnte_token' => $maskedToken,
            'fonnte_token_configured' => ! empty($fonnteToken),
            'nomor_wa_owner' => Setting::get('nomor_wa_owner', ''),
            'notif_booking_baru' => Setting::get('notif_booking_baru', '1') === '1',
            'notif_penugasan_driver' => Setting::get('notif_penugasan_driver', '1') === '1',
            'notif_task_petugas' => Setting::get('notif_task_petugas', '1') === '1',
            'notif_supir_order_mulai' => Setting::get('notif_supir_order_mulai', '1') === '1',
            'notif_supir_order_selesai' => Setting::get('notif_supir_order_selesai', '1') === '1',
            'notif_pengingat_kembali_supir' => Setting::get('notif_pengingat_kembali_supir', '1') === '1',
            'notif_pembayaran_masuk' => Setting::get('notif_pembayaran_masuk', '1') === '1',
            'notif_pengingat_bayar' => Setting::get('notif_pengingat_bayar', '1') === '1',
            'notif_perlu_verifikasi' => Setting::get('notif_perlu_verifikasi', '1') === '1',
            'notif_order_selesai' => Setting::get('notif_order_selesai', '1') === '1',
            'notif_pengingat_kembali' => Setting::get('notif_pengingat_kembali', '1') === '1',
            'kirim_hasil_inspeksi_ke_customer' => Setting::get('kirim_hasil_inspeksi_ke_customer', '1') === '1',
            'notif_admin_kendaraan_dikirim' => Setting::get('notif_admin_kendaraan_dikirim', '1') === '1',
            'template_penugasan_driver' => Setting::get('template_penugasan_driver', ''),
            'template_task_petugas' => Setting::get('template_task_petugas', ''),
            'template_supir_order_mulai' => Setting::get('template_supir_order_mulai', ''),
            'template_supir_order_selesai' => Setting::get('template_supir_order_selesai', ''),
            'template_pengingat_kembali_supir' => Setting::get('template_pengingat_kembali_supir', ''),
            'template_notifikasi_owner' => Setting::get('template_notifikasi_owner', ''),
            'template_pengingat_bayar' => Setting::get('template_pengingat_bayar', ''),
            'template_pengingat_kembali' => Setting::get('template_pengingat_kembali', ''),
            'template_perlu_verifikasi' => Setting::get('template_perlu_verifikasi', ''),
        ]);
    }

    public function updateNotifikasi(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'fonnte_token' => 'nullable|string',
            'nomor_wa_owner' => 'nullable|string',
            'notif_booking_baru' => 'boolean',
            'notif_penugasan_driver' => 'boolean',
            'notif_task_petugas' => 'boolean',
            'notif_supir_order_mulai' => 'boolean',
            'notif_supir_order_selesai' => 'boolean',
            'notif_pengingat_kembali_supir' => 'boolean',
            'notif_pembayaran_masuk' => 'boolean',
            'notif_pengingat_bayar' => 'boolean',
            'notif_perlu_verifikasi' => 'boolean',
            'notif_order_selesai' => 'boolean',
            'notif_pengingat_kembali' => 'boolean',
            'kirim_hasil_inspeksi_ke_customer' => 'boolean',
            'template_penugasan_driver' => 'nullable|string',
            'template_task_petugas' => 'nullable|string',
            'template_supir_order_mulai' => 'nullable|string',
            'template_supir_order_selesai' => 'nullable|string',
            'template_pengingat_kembali_supir' => 'nullable|string',
            'template_notifikasi_owner' => 'nullable|string',
            'template_pengingat_bayar' => 'nullable|string',
            'template_pengingat_kembali' => 'nullable|string',
            'template_perlu_verifikasi' => 'nullable|string',
        ]);

        $booleanFields = ['notif_booking_baru', 'notif_penugasan_driver', 'notif_task_petugas', 'notif_supir_order_mulai', 'notif_supir_order_selesai', 'notif_pengingat_kembali_supir', 'notif_pembayaran_masuk', 'notif_pengingat_bayar', 'notif_perlu_verifikasi', 'notif_order_selesai', 'notif_pengingat_kembali', 'kirim_hasil_inspeksi_ke_customer', 'notif_admin_kendaraan_dikirim'];
        foreach ($booleanFields as $field) {
            if (isset($validated[$field])) {
                Setting::set($field, $validated[$field] ? '1' : '0');
            }
        }

        $stringFields = ['fonnte_token', 'nomor_wa_owner', 'template_penugasan_driver', 'template_task_petugas', 'template_supir_order_mulai', 'template_supir_order_selesai', 'template_pengingat_kembali_supir', 'template_notifikasi_owner', 'template_pengingat_bayar', 'template_pengingat_kembali', 'template_perlu_verifikasi'];
        foreach ($stringFields as $field) {
            if (! array_key_exists($field, $validated)) {
                continue;
            }

            // Token gateway dikirim dari frontend dalam keadaan ter-mask (****abcd)
            // supaya rahasia tidak terbaca. Kalau masih ter-mask berarti bukan token
            // baru dari admin, jadi JANGAN ditimpa — biarkan token asli tetap aman.
            if ($field === 'fonnte_token' && str_contains((string) $validated[$field], '*')) {
                continue;
            }

            Setting::set($field, $validated[$field] ?? '');
        }

        return response()->json(['message' => 'Pengaturan notifikasi berhasil disimpan.']);
    }

    public function testNotifikasi(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'nomor' => 'required|string',
        ]);

        $token = Setting::get('fonnte_token', '');
        if (empty($token)) {
            throw ValidationException::withMessages([
                'fonnte_token' => ['Token gateway belum dikonfigurasi.'],
            ]);
        }

        $wa = app(WhatsAppService::class);
        $pesan = "✅ *Test Notifikasi UDIN RENCTCAR*\n\n"
            ."Pesan ini dikirim untuk memverifikasi koneksi WhatsApp gateway.\n"
            .'Waktu: *'.now()->format('d/m/Y H:i').' WIB*';

        [$success, $response] = $wa->kirimPesanDetail($validated['nomor'], $pesan, 'test_gateway');

        if ($success) {
            return response()->json(['message' => 'Pesan test berhasil dikirim.']);
        }

        $alasan = $response['error']
            ?? $response['reason']
            ?? $response['detail']
            ?? (is_string($response) ? $response : json_encode($response));

        return response()->json([
            'message' => 'Gagal mengirim pesan test: '.mb_substr((string) $alasan, 0, 200),
        ], 422);
    }

    public function getSistem(): JsonResponse
    {
        return response()->json([
            'mata_uang' => Setting::get('mata_uang', 'IDR'),
            'zona_waktu' => Setting::get('zona_waktu', 'Asia/Jakarta'),
            'format_tanggal' => Setting::get('format_tanggal', 'DD/MM/YYYY'),
            'prefix_kode_order' => Setting::get('prefix_kode_order', 'ORD'),
        ]);
    }

    public function updateSistem(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'mata_uang' => 'required|in:IDR,USD',
            'zona_waktu' => 'required|in:Asia/Jakarta,Asia/Makassar,Asia/Jayapura',
            'format_tanggal' => 'required|in:DD/MM/YYYY,DD-MM-YYYY,YYYY-MM-DD',
            'prefix_kode_order' => 'required|string|max:5',
        ]);

        foreach ($validated as $key => $value) {
            Setting::set($key, $value);
        }

        return response()->json(['message' => 'Preferensi sistem berhasil disimpan.']);
    }

    /**
     * Download backup sanitasi: SEMUA tabel (termasuk inspeksi, TTD, log
     * aktivitas, GPS) dengan hash password & token gateway dikosongkan.
     * Backup lengkap otomatis tersedia via perintah terjadwal `backup:database`.
     */
    public function backup(): BinaryFileResponse
    {
        $service = app(BackupService::class);
        $path = $service->createSanitizedDump();

        return response()->download($path, basename($path), [
            'Content-Type' => 'text/plain',
        ])->deleteFileAfterSend(true);
    }
}
