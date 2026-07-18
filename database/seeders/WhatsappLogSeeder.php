<?php

namespace Database\Seeders;

use App\Models\GarasiRequest;
use App\Models\WhatsappLog;
use Carbon\Carbon;
use Illuminate\Database\Seeder;

class WhatsappLogSeeder extends Seeder
{
    public function run(): void
    {
        $requests = GarasiRequest::all();

        $logs = [
            // Logs for Request 1 (Pending - Honda HR-V)
            [
                'garasi_request_id' => $requests[0]->id,
                'nomor_tujuan' => '081234567893',
                'pesan' => 'Halo Bp/Ibu Siti, kami dari CV Pilar ingin menanyakan ketersediaan Honda HR-V untuk disewa 3 hari mulai 15 Juli 2026. Mohon konfirmasi. Terima kasih.',
                'status_kirim' => 'terkirim',
                'response' => null,
                'created_at' => Carbon::now()->subDays(2),
            ],
            // Logs for Request 2 (Tersedia - Avanza)
            [
                'garasi_request_id' => $requests[1]->id,
                'nomor_tujuan' => '081234567892',
                'pesan' => 'Selamat pagi, mohon info ketersediaan Toyota Avanza Veloz untuk 5-7 Juli 2026.',
                'status_kirim' => 'terkirim',
                'response' => null,
                'created_at' => Carbon::now()->subDays(12),
            ],
            [
                'garasi_request_id' => $requests[1]->id,
                'nomor_tujuan' => '081234567892',
                'pesan' => 'Avanza ready, warna putih. Silakan ambil di garasi.',
                'status_kirim' => 'terkirim',
                'response' => '{"status": "sent"}',
                'created_at' => Carbon::now()->subDays(12)->addHours(2),
            ],
            // Logs for Request 3 (Pending - Fortuner)
            [
                'garasi_request_id' => $requests[2]->id,
                'nomor_tujuan' => '081234567892',
                'pesan' => 'Halo, Fortuner VRZ tersedia tidak untuk 18-19 Juli 2026? Urgent.',
                'status_kirim' => 'terkirim',
                'response' => null,
                'created_at' => Carbon::now()->subHours(6),
            ],
            // Logs for Request 4 (Tersedia - Innova)
            [
                'garasi_request_id' => $requests[3]->id,
                'nomor_tujuan' => '081234567893',
                'pesan' => 'Selamat pagi, kami butuh Toyota Innova Reborn untuk 16-18 Juli 2026. Apakah ready?',
                'status_kirim' => 'terkirim',
                'response' => null,
                'created_at' => Carbon::now()->subDay(),
            ],
            [
                'garasi_request_id' => $requests[3]->id,
                'nomor_tujuan' => '081234567893',
                'pesan' => 'Innova Reborn ready, warna putih. Bisa diambil jam 08:00.',
                'status_kirim' => 'terkirim',
                'response' => '{"status": "sent"}',
                'created_at' => Carbon::now()->subDay()->addHours(1),
            ],
            // Logs for Request 5 (Tidak Terjawab - Xenia)
            [
                'garasi_request_id' => $requests[4]->id,
                'nomor_tujuan' => '081234567894',
                'pesan' => 'Mohon info ketersediaan Daihatsu Xenia untuk 10-11 Juli 2026.',
                'status_kirim' => 'terkirim',
                'response' => null,
                'created_at' => Carbon::now()->subDays(6),
            ],
            [
                'garasi_request_id' => $requests[4]->id,
                'nomor_tujuan' => '081234567894',
                'pesan' => 'Mohon konfirmasi segera, customer sudah menunggu.',
                'status_kirim' => 'gagal',
                'response' => '{"error": "no_response"}',
                'created_at' => Carbon::now()->subDays(5),
            ],
            // Logs for Request 6 (Tersedia - Vios)
            [
                'garasi_request_id' => $requests[5]->id,
                'nomor_tujuan' => '081234567893',
                'pesan' => 'Halo, Toyota Vios tersedia tidak untuk 30 Juni - 2 Juli 2026?',
                'status_kirim' => 'terkirim',
                'response' => null,
                'created_at' => Carbon::now()->subDays(17),
            ],
            [
                'garasi_request_id' => $requests[5]->id,
                'nomor_tujuan' => '081234567893',
                'pesan' => 'Vios silver ready, kondisi bersih dan terawat.',
                'status_kirim' => 'terkirim',
                'response' => '{"status": "sent"}',
                'created_at' => Carbon::now()->subDays(17)->addHours(3),
            ],
            // Logs for Request 7 (Pending - Colt Diesel)
            [
                'garasi_request_id' => $requests[6]->id,
                'nomor_tujuan' => '081234567894',
                'pesan' => 'Kami butuh Mitsubishi Colt Diesel untuk acara pernikahan, 15-21 Juli 2026. Kapasitas 16 penumpang. Mohon konfirmasi.',
                'status_kirim' => 'terkirim',
                'response' => null,
                'created_at' => Carbon::now()->subHours(3),
            ],
        ];

        foreach ($logs as $log) {
            WhatsappLog::create($log);
        }
    }
}
