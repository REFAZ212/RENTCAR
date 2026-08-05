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
            // Request 1 (Order 1, HR-V, pending)
            [
                'garasi_request_id' => $requests[0]->id,
                'nomor_tujuan' => '081234567893',
                'pesan' => 'Halo Bp/Ibu Siti, kami dari CV UDIN RENCTCAR ingin menanyakan ketersediaan Honda HR-V untuk disewa 3 hari. Mohon konfirmasi. Terima kasih.',
                'status_kirim' => 'terkirim',
                'response' => null,
                'created_at' => Carbon::now()->subDays(2),
            ],

            // Request 2 (Order 2, Avanza, tersedia)
            [
                'garasi_request_id' => $requests[1]->id,
                'nomor_tujuan' => '081234567892',
                'pesan' => 'Selamat pagi, mohon info ketersediaan Toyota Avanza Veloz untuk '.Carbon::now()->subDays(10)->format('d M').'-'.Carbon::now()->subDays(7)->format('d M Y').'.',
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

            // Request 3 (Order 3, Fortuner, pending)
            [
                'garasi_request_id' => $requests[2]->id,
                'nomor_tujuan' => '081234567892',
                'pesan' => 'Halo, Fortuner VRZ tersedia tidak untuk '.Carbon::now()->addDays(3)->format('d M').'-'.Carbon::now()->addDays(5)->format('d M Y').'? Urgent.',
                'status_kirim' => 'terkirim',
                'response' => null,
                'created_at' => Carbon::now()->subHours(6),
            ],

            // Request 4 (Order 4, Innova, tersedia)
            [
                'garasi_request_id' => $requests[3]->id,
                'nomor_tujuan' => '081234567893',
                'pesan' => 'Selamat pagi, kami butuh Toyota Innova Reborn untuk '.Carbon::now()->addDay()->format('d M').'-'.Carbon::now()->addDays(4)->format('d M Y').'. Apakah ready?',
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

            // Request 5 (Order 5, Xenia, tidak_terjawab)
            [
                'garasi_request_id' => $requests[4]->id,
                'nomor_tujuan' => '081234567894',
                'pesan' => 'Mohon info ketersediaan Daihatsu Xenia untuk '.Carbon::now()->subDays(5)->format('d M').'-'.Carbon::now()->subDays(3)->format('d M Y').'.',
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

            // Request 6 (Order 6, Vios, tersedia)
            [
                'garasi_request_id' => $requests[5]->id,
                'nomor_tujuan' => '081234567893',
                'pesan' => 'Halo, Toyota Vios tersedia tidak untuk '.Carbon::now()->subDays(15)->format('d M').'-'.Carbon::now()->subDays(12)->format('d M Y').'?',
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

            // Request 7 (Order 7, Colt Diesel, pending)
            [
                'garasi_request_id' => $requests[6]->id,
                'nomor_tujuan' => '081234567894',
                'pesan' => 'Kami butuh Mitsubishi Colt Diesel untuk acara pernikahan, '.Carbon::now()->format('d M').'-'.Carbon::now()->addDays(7)->format('d M Y').'. Kapasitas 16 penumpang. Mohon konfirmasi.',
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
