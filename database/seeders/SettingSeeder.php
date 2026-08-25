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

        Setting::set('nama_usaha', 'UDIN RENCTCAR');
        Setting::set('alamat_usaha', 'Jl. Raya Banjar No. 12, Banjar, Jawa Barat');
        Setting::set('no_telp_usaha', '0265123456');
        Setting::set('email_usaha', 'info@udin-renctcar.com');
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
        Setting::set('wajib_bayar_sebelum_antar', '0');
        Setting::set('notif_task_petugas', '1');
        Setting::set('notif_supir_order_mulai', '1');
        Setting::set('notif_supir_order_selesai', '1');
        Setting::set('notif_pengingat_kembali_supir', '1');

        Setting::set('fonnte_token', '');
        Setting::set('nomor_wa_owner', '');
        Setting::set('notif_booking_baru', '1');
        Setting::set('notif_penugasan_driver', '1');
        Setting::set('notif_pembayaran_masuk', '1');
        Setting::set('notif_order_selesai', '1');
        Setting::set('notif_pengingat_bayar', '1');
        Setting::set('notif_pengingat_kembali', '1');
        Setting::set('notif_perlu_verifikasi', '1');
        Setting::set('template_penugasan_driver', 'Halo *{nama_driver}*, ada tugas baru:\nAntar {customer} — {kendaraan} ({plat_nomor})\n{tanggal} pukul {jam}\n\nBalas *SIAP* jika bisa, atau *TIDAK* jika berhalangan.');
        Setting::set('template_task_petugas', "📋 *Task Baru untuk Petugas*\n\nOrder: *{kode_order}*\nJenis: {jenis_task}\nKendaraan: {nama_kendaraan}\nCustomer: {nama_customer}\nTanggal: {tanggal}\nSupir: {opsi_supir}\n\nBuka aplikasi → tekan *AMBIL TUGAS* untuk mengerjakan inspeksi. Siapa cepat dia dapat!");
        Setting::set('template_supir_order_mulai', 'Halo *{nama_driver}*, tugas untuk order *{kode_order}* sudah mulai.\nKendaraan: {nama_kendaraan} ({plat_nomor})\nCustomer: {nama_customer}\nPeriode: {tanggal} s/d {tanggal_selesai}\n\nSelamat bekerja, hati-hati di jalan!');
        Setting::set('template_supir_order_selesai', 'Halo *{nama_driver}*, order *{kode_order}* telah *SELESAI* ✅\nKendaraan: {nama_kendaraan} ({plat_nomor})\nCustomer: {nama_customer}\nDurasi: {durasi_hari} hari\nTarif: {tarif_per_hari}/hari\nTotal pendapatan: *{total_supir}*\n\nTerima kasih atas kerja samanya!');
        Setting::set('template_pengingat_kembali_supir', 'Halo *{nama_driver}*, pengingat: kendaraan {nama_kendaraan} ({plat_nomor}) order *{kode_order}* harus dikembalikan pada *{tanggal_kembali}* pukul *{jam_kembali}*. Siapkan diri untuk proses pengembalian.');
        Setting::set('template_notifikasi_owner', '*[BOOKING]* {kendaraan} untuk {customer}\nDriver: {driver} — {tanggal}\nStatus: {status}');
        Setting::set('template_pengingat_bayar', 'Halo {nama_customer}, kami ingin mengingatkan pembayaran untuk order {kode_order} (kendaraan {nama_kendaraan}) senilai {total}. Terima kasih.');
        Setting::set('template_pengingat_kembali', 'Halo *{nama_customer}*, ini pengingat bahwa kendaraan {nama_kendaraan} (*{kode_order}*) harus dikembalikan pada *{tanggal_kembali}* pukul *{jam_kembali}*. Terima kasih.');
        Setting::set('template_perlu_verifikasi', 'Halo, order {kode_order} ({nama_customer} — {nama_kendaraan}) melewati batas waktu pengembalian dan belum dikonfirmasi. Denda difreeze: {total}. Mohon segera verifikasi di aplikasi.');

        Setting::set('pending_expire_hours', 24);
        Setting::set('confirmed_no_pickup_expire_hours', 24);
        Setting::set('driver_task_release_minutes', 120);
        Setting::set('driver_task_release_enabled', '1');
    }
}
