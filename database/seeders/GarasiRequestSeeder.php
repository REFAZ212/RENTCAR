<?php

namespace Database\Seeders;

use App\Models\GarasiPartner;
use App\Models\GarasiRequest;
use App\Models\Order;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class GarasiRequestSeeder extends Seeder
{
    public function run(): void
    {
        $orders = Order::all();
        $garasis = GarasiPartner::all();

        $requests = [
            // Request 1 - Pending (for active order)
            [
                'order_id' => $orders[0]->id,
                'garasi_partner_id' => $garasis->where('nama_garasi', 'Garasi Makmur Jaya')->first()->id,
                'status_permintaan' => 'pending',
                'pesan_wa_terkirim' => 'Halo, kami dari CV Pilar ingin menanyakan ketersediaan Honda HR-V untuk disewa 3 hari. Mohon konfirmasi.',
                'waktu_kirim' => Carbon::now()->subDays(2),
                'deadline' => Carbon::now()->addDay(),
            ],
            // Request 2 - Tersedia (for completed order)
            [
                'order_id' => $orders[1]->id,
                'garasi_partner_id' => $garasis->where('nama_garasi', 'Garasi Jaya Abadi')->first()->id,
                'status_permintaan' => 'tersedia',
                'pesan_wa_terkirim' => 'Mohon konfirmasi ketersediaan Toyota Avanza Veloz untuk tanggal 5-7 Juli 2026.',
                'waktu_kirim' => Carbon::now()->subDays(12),
                'waktu_respon' => Carbon::now()->subDays(12)->addHours(2),
                'catatan_garasi' => 'Kendaraan tersedia, siap disewakan.',
            ],
            // Request 3 - Pending (for pending order)
            [
                'order_id' => $orders[2]->id,
                'garasi_partner_id' => $garasis->where('nama_garasi', 'Garasi Jaya Abadi')->first()->id,
                'status_permintaan' => 'pending',
                'pesan_wa_terkirim' => 'Apakah Toyota Fortuner VRZ tersedia untuk 18-19 Juli 2026? Mohon info.',
                'waktu_kirim' => Carbon::now()->subHours(6),
                'deadline' => Carbon::now()->addDays(1),
            ],
            // Request 4 - Tersedia (for confirmed order)
            [
                'order_id' => $orders[3]->id,
                'garasi_partner_id' => $garasis->where('nama_garasi', 'Garasi Makmur Jaya')->first()->id,
                'status_permintaan' => 'tersedia',
                'pesan_wa_terkirim' => 'Selamat pagi, kami butuh Toyota Innova Reborn untuk 16-18 Juli 2026. Apakah ready?',
                'waktu_kirim' => Carbon::now()->subDay(),
                'waktu_respon' => Carbon::now()->subDay()->addHours(1),
                'catatan_garasi' => 'Innova Reborn ready, warna putih. Silakan ambil.',
                'catatan_admin' => 'Koordinasi serah terima sudah dilakukan',
            ],
            // Request 5 - Tidak Terjawab (for cancelled order)
            [
                'order_id' => $orders[4]->id,
                'garasi_partner_id' => $garasis->where('nama_garasi', 'Garasi Sentosa Abadi')->first()->id,
                'status_permintaan' => 'tidak_terjawab',
                'pesan_wa_terkirim' => 'Mohon info ketersediaan Daihatsu Xenia untuk 10-11 Juli 2026.',
                'waktu_kirim' => Carbon::now()->subDays(6),
                'deadline' => Carbon::now()->subDays(5),
            ],
            // Request 6 - Tersedia (for completed order)
            [
                'order_id' => $orders[5]->id,
                'garasi_partner_id' => $garasis->where('nama_garasi', 'Garasi Makmur Jaya')->first()->id,
                'status_permintaan' => 'tersedia',
                'pesan_wa_terkirim' => 'Halo, Toyota Vios tersedia tidak untuk 30 Juni - 2 Juli 2026?',
                'waktu_kirim' => Carbon::now()->subDays(17),
                'waktu_respon' => Carbon::now()->subDays(17)->addHours(3),
                'catatan_garasi' => 'Vios silver tersedia, kondisi bersih.',
            ],
            // Request 7 - Pending (for active order - minibus)
            [
                'order_id' => $orders[6]->id,
                'garasi_partner_id' => $garasis->where('nama_garasi', 'Garasi Sentosa Abadi')->first()->id,
                'status_permintaan' => 'pending',
                'pesan_wa_terkirim' => 'Kami butuh Mitsubishi Colt Diesel untuk acara pernikahan, 15-21 Juli 2026. Mohon konfirmasi.',
                'waktu_kirim' => Carbon::now()->subHours(3),
                'deadline' => Carbon::now()->addHours(12),
            ],
        ];

        foreach ($requests as $request) {
            if (! isset($request['token'])) {
                $request['token'] = Str::random(64);
            }
            GarasiRequest::create($request);
        }
    }
}
