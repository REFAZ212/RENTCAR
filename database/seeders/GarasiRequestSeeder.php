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

        $makmur = $garasis->where('nama_garasi', 'Garasi Makmur Jaya')->first();
        $jaya = $garasis->where('nama_garasi', 'Garasi Jaya Abadi')->first();
        $sentosa = $garasis->where('nama_garasi', 'Garasi Sentosa Abadi')->first();

        $requests = [
            // Order 1 (Honda HR-V, active) — pending, menunggu konfirmasi garasi
            [
                'order_id' => $orders[0]->id,
                'garasi_partner_id' => $makmur->id,
                'status_permintaan' => 'pending',
                'pesan_wa_terkirim' => 'Halo, kami dari CV UDIN RENCTCAR ingin menanyakan ketersediaan Honda HR-V untuk disewa 3 hari. Mohon konfirmasi.',
                'waktu_kirim' => Carbon::now()->subDays(2),
                'deadline' => Carbon::now()->addDay(),
            ],
            // Order 2 (Avanza, completed) — tersedia, sudah direspons
            [
                'order_id' => $orders[1]->id,
                'garasi_partner_id' => $jaya->id,
                'status_permintaan' => 'tersedia',
                'pesan_wa_terkirim' => 'Mohon konfirmasi ketersediaan Toyota Avanza Veloz untuk tanggal '.Carbon::now()->subDays(10)->format('d M').'-'.Carbon::now()->subDays(7)->format('d M Y').'.',
                'waktu_kirim' => Carbon::now()->subDays(12),
                'waktu_respon' => Carbon::now()->subDays(12)->addHours(2),
                'catatan_garasi' => 'Kendaraan tersedia, siap disewakan.',
            ],
            // Order 3 (Fortuner, pending) — pending, menunggu konfirmasi
            [
                'order_id' => $orders[2]->id,
                'garasi_partner_id' => $jaya->id,
                'status_permintaan' => 'pending',
                'pesan_wa_terkirim' => 'Apakah Toyota Fortuner VRZ tersedia untuk '.Carbon::now()->addDays(3)->format('d M').'-'.Carbon::now()->addDays(5)->format('d M Y').'? Mohon info.',
                'waktu_kirim' => Carbon::now()->subHours(6),
                'deadline' => Carbon::now()->addDays(1),
            ],
            // Order 4 (Innova, confirmed) — tersedia, sudah direspons
            [
                'order_id' => $orders[3]->id,
                'garasi_partner_id' => $makmur->id,
                'status_permintaan' => 'tersedia',
                'pesan_wa_terkirim' => 'Selamat pagi, kami butuh Toyota Innova Reborn untuk '.Carbon::now()->addDay()->format('d M').'-'.Carbon::now()->addDays(4)->format('d M Y').'. Apakah ready?',
                'waktu_kirim' => Carbon::now()->subDay(),
                'waktu_respon' => Carbon::now()->subDay()->addHours(1),
                'catatan_garasi' => 'Innova Reborn ready, warna putih. Silakan ambil.',
                'catatan_admin' => 'Koordinasi serah terima sudah dilakukan',
            ],
            // Order 5 (Xenia, cancelled) — tidak_terjawab, garasi tidak merespons
            [
                'order_id' => $orders[4]->id,
                'garasi_partner_id' => $sentosa->id,
                'status_permintaan' => 'tidak_terjawab',
                'pesan_wa_terkirim' => 'Mohon info ketersediaan Daihatsu Xenia untuk '.Carbon::now()->subDays(5)->format('d M').'-'.Carbon::now()->subDays(3)->format('d M Y').'.',
                'waktu_kirim' => Carbon::now()->subDays(6),
                'deadline' => Carbon::now()->subDays(5),
            ],
            // Order 6 (Vios, completed+overtime) — tersedia
            [
                'order_id' => $orders[5]->id,
                'garasi_partner_id' => $makmur->id,
                'status_permintaan' => 'tersedia',
                'pesan_wa_terkirim' => 'Halo, Toyota Vios tersedia tidak untuk '.Carbon::now()->subDays(15)->format('d M').'-'.Carbon::now()->subDays(12)->format('d M Y').'?',
                'waktu_kirim' => Carbon::now()->subDays(17),
                'waktu_respon' => Carbon::now()->subDays(17)->addHours(3),
                'catatan_garasi' => 'Vios silver tersedia, kondisi bersih.',
            ],
            // Order 7 (Colt Diesel, active) — pending, menunggu konfirmasi
            [
                'order_id' => $orders[6]->id,
                'garasi_partner_id' => $sentosa->id,
                'status_permintaan' => 'pending',
                'pesan_wa_terkirim' => 'Kami butuh Mitsubishi Colt Diesel untuk acara pernikahan, '.Carbon::now()->format('d M').'-'.Carbon::now()->addDays(7)->format('d M Y').'. Mohon konfirmasi.',
                'waktu_kirim' => Carbon::now()->subHours(3),
                'deadline' => Carbon::now()->addHours(12),
            ],
        ];

        foreach ($requests as $request) {
            $request['token'] = Str::random(64);
            GarasiRequest::create($request);
        }
    }
}
