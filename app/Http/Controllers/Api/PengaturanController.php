<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use App\Services\WhatsAppService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
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
            'avatar' => 'nullable|image|max:2048',
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
        ]);

        Setting::set('wajib_bayar_sebelum_antar', ! empty($validated['wajib_bayar_sebelum_antar']) ? '1' : '0');
        Setting::set('auto_verify_enabled', ! empty($validated['auto_verify_enabled']) ? '1' : '0');
        Setting::set('auto_complete_enabled', ! empty($validated['auto_complete_enabled']) ? '1' : '0');
        if (! empty($validated['auto_verify_after_hours'])) {
            Setting::set('auto_verify_after_hours', $validated['auto_verify_after_hours']);
        }
        if (! empty($validated['auto_complete_after_hours'])) {
            Setting::set('auto_complete_after_hours', $validated['auto_complete_after_hours']);
        }

        foreach ($validated as $key => $value) {
            if (in_array($key, ['wajib_bayar_sebelum_antar', 'auto_verify_enabled', 'auto_complete_enabled', 'auto_verify_after_hours', 'auto_complete_after_hours'])) {
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
            'notif_pembayaran_masuk' => Setting::get('notif_pembayaran_masuk', '1') === '1',
            'notif_pengingat_bayar' => Setting::get('notif_pengingat_bayar', '1') === '1',
            'notif_perlu_verifikasi' => Setting::get('notif_perlu_verifikasi', '1') === '1',
            'notif_order_selesai' => Setting::get('notif_order_selesai', '1') === '1',
            'notif_pengingat_kembali' => Setting::get('notif_pengingat_kembali', '1') === '1',
            'kirim_hasil_inspeksi_ke_customer' => Setting::get('kirim_hasil_inspeksi_ke_customer', '1') === '1',
            'template_penugasan_driver' => Setting::get('template_penugasan_driver', ''),
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
            'notif_pembayaran_masuk' => 'boolean',
            'notif_pengingat_bayar' => 'boolean',
            'notif_perlu_verifikasi' => 'boolean',
            'notif_order_selesai' => 'boolean',
            'notif_pengingat_kembali' => 'boolean',
            'kirim_hasil_inspeksi_ke_customer' => 'boolean',
            'template_penugasan_driver' => 'nullable|string',
            'template_notifikasi_owner' => 'nullable|string',
            'template_pengingat_bayar' => 'nullable|string',
            'template_pengingat_kembali' => 'nullable|string',
            'template_perlu_verifikasi' => 'nullable|string',
        ]);

        $booleanFields = ['notif_booking_baru', 'notif_penugasan_driver', 'notif_task_petugas', 'notif_pembayaran_masuk', 'notif_pengingat_bayar', 'notif_perlu_verifikasi', 'notif_order_selesai', 'notif_pengingat_kembali', 'kirim_hasil_inspeksi_ke_customer'];
        foreach ($booleanFields as $field) {
            if (isset($validated[$field])) {
                Setting::set($field, $validated[$field] ? '1' : '0');
            }
        }

        $stringFields = ['fonnte_token', 'nomor_wa_owner', 'template_penugasan_driver', 'template_notifikasi_owner', 'template_pengingat_bayar', 'template_pengingat_kembali', 'template_perlu_verifikasi'];
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
        $pesan = "✅ *Test Notifikasi CVPILAR*\n\n"
            ."Pesan ini dikirim untuk memverifikasi koneksi WhatsApp gateway.\n"
            .'Waktu: *'.now()->format('d/m/Y H:i').' WIB*';

        $success = $wa->kirimPesan($validated['nomor'], $pesan);

        if ($success) {
            return response()->json(['message' => 'Pesan test berhasil dikirim.']);
        }

        return response()->json(['message' => 'Gagal mengirim pesan test. Cek token gateway.'], 422);
    }

    public function getSistem(): JsonResponse
    {
        return response()->json([
            'mata_uang' => Setting::get('mata_uang', 'IDR'),
            'zona_waktu' => Setting::get('zona_waktu', 'Asia/Jakarta'),
            'format_tanggal' => Setting::get('format_tanggal', 'DD/MM/YYYY'),
            'prefix_kode_order' => Setting::get('prefix_kode_order', 'ORD'),
            'durasi_klaim_menit' => (int) Setting::get('durasi_klaim_menit', 30),
        ]);
    }

    public function updateSistem(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'mata_uang' => 'required|in:IDR,USD',
            'zona_waktu' => 'required|in:Asia/Jakarta,Asia/Makassar,Asia/Jayapura',
            'format_tanggal' => 'required|in:DD/MM/YYYY,DD-MM-YYYY,YYYY-MM-DD',
            'prefix_kode_order' => 'required|string|max:5',
            'durasi_klaim_menit' => 'nullable|integer|min:1|max:1440',
        ]);

        foreach ($validated as $key => $value) {
            Setting::set($key, $value);
        }

        return response()->json(['message' => 'Preferensi sistem berhasil disimpan.']);
    }

    public function backup(): BinaryFileResponse
    {
        $timestamp = now()->format('Y-m-d_His');
        $filename = "backup-cvpilar-{$timestamp}.sql";

        $tables = [
            'users', 'orders', 'customers', 'kendaraans', 'garasi_partners',
            'garasi_requests', 'pembayarans', 'whatsapp_logs', 'notifications',
            'settings', 'kategoris', 'tipes', 'supir_calos',
        ];

        $sensitiveColumns = [
            'users' => ['password'],
            'settings' => [],
        ];

        $dump = "-- Backup CVPILAR {$timestamp}\n-- =============================\n\n";

        foreach ($tables as $table) {
            $driver = DB::getDriverName();
            if (in_array($driver, ['mysql', 'mariadb'])) {
                $createTable = DB::select("SHOW CREATE TABLE `{$table}`");
                if (! empty($createTable)) {
                    $dump .= "DROP TABLE IF EXISTS `{$table}`;\n";
                    $dump .= $createTable[0]->{'Create Table'}.";\n\n";
                }
            }

            $rows = DB::table($table)->get();
            if ($rows->isEmpty()) {
                continue;
            }

            $columns = array_keys((array) $rows->first());
            $excludeCols = $sensitiveColumns[$table] ?? [];
            $columns = array_values(array_diff($columns, $excludeCols));
            $columnList = '`'.implode('`, `', $columns).'`';

            foreach ($rows as $row) {
                $rowData = (array) $row;
                $rowData = array_intersect_key($rowData, array_flip($columns));

                if ($table === 'settings' && ($rowData['key'] ?? '') === 'fonnte_token') {
                    $rowData['value'] = '';
                }

                $values = array_map(fn ($v) => $v === null ? 'NULL' : "'".addslashes((string) $v)."'", $rowData);
                $dump .= "INSERT INTO `{$table}` ({$columnList}) VALUES (".implode(', ', $values).");\n";
            }
            $dump .= "\n";
        }

        $tempPath = storage_path("app/{$filename}");
        file_put_contents($tempPath, $dump);

        return response()->download($tempPath, $filename, [
            'Content-Type' => 'text/plain',
        ])->deleteFileAfterSend(true);
    }
}
