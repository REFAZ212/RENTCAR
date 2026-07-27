<?php

namespace Database\Seeders;

use App\Models\Setting;
use Illuminate\Database\Seeder;

class SettingSeeder extends Seeder
{
    public function run(): void
    {
        Setting::set('overtime_rate_per_hour', 25000);
        Setting::set('grace_period_minutes', 0);

        Setting::set('nama_usaha', 'Pilar Rental Mobil');
        Setting::set('alamat_usaha', 'Jl. Raya Banjar No. 12, Banjar, Jawa Barat');
        Setting::set('no_telp_usaha', '0265123456');
        Setting::set('email_usaha', 'info@pilarrental.com');
        Setting::set('jam_operasional', json_encode([
            ['hari' => 'Senin', 'buka' => '08:00', 'tutup' => '20:00', 'libur' => false],
            ['hari' => 'Selasa', 'buka' => '08:00', 'tutup' => '20:00', 'libur' => false],
            ['hari' => 'Rabu', 'buka' => '08:00', 'tutup' => '20:00', 'libur' => false],
            ['hari' => 'Kamis', 'buka' => '08:00', 'tutup' => '20:00', 'libur' => false],
            ['hari' => 'Jumat', 'buka' => '08:00', 'tutup' => '20:00', 'libur' => false],
            ['hari' => 'Sabtu', 'buka' => '08:00', 'tutup' => '20:00', 'libur' => false],
            ['hari' => 'Minggu', 'buka' => '08:00', 'tutup' => '17:00', 'libur' => false],
        ]));

        Setting::set('biaya_antar_per_km', 5000);
        Setting::set('biaya_jemput_flat', 25000);
        Setting::set('biaya_dengan_driver_per_hari', 150000);
        Setting::set('minimal_dp_persen', 30);

        Setting::set('mata_uang', 'IDR');
        Setting::set('zona_waktu', 'Asia/Jakarta');
        Setting::set('format_tanggal', 'DD/MM/YYYY');
        Setting::set('prefix_kode_order', 'ORD');

        Setting::set('fonnte_token', '');
        Setting::set('nomor_wa_owner', '');
        Setting::set('notif_booking_baru', '1');
        Setting::set('notif_penugasan_driver', '1');
        Setting::set('notif_pembayaran_masuk', '1');
        Setting::set('notif_kendaraan_terlambat', '1');
        Setting::set('notif_pengingat_kembali', '1');
        Setting::set('template_penugasan_driver', 'Halo *{nama_driver}*, ada tugas baru:\nAntar {customer} — {kendaraan} ({plat_nomor})\n{tanggal} pukul {jam}\n\nBalas *SIAP* jika bisa, atau *TIDAK* jika berhalangan.');
        Setting::set('template_notifikasi_owner', '*[BOOKING]* {kendaraan} untuk {customer}\nDriver: {driver} — {tanggal}\nStatus: {status}');
        Setting::set('template_pengingat_kembali', 'Halo *{nama_customer}*, ini pengingat bahwa kendaraan {nama_kendaraan} (*{kode_order}*) harus dikembalikan pada *{tanggal_kembali}* pukul *{jam_kembali}*. Terima kasih.');
    }
}
