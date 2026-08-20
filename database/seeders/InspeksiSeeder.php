<?php

namespace Database\Seeders;

use App\Models\InspeksiKendaraan;
use App\Models\Order;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class InspeksiSeeder extends Seeder
{
    private const CHECKLIST_ITEMS = ['kunci', 'stnk', 'kunci_roda', 'dongkrak', 'ban_serep', 'ac'];

    public function run(): void
    {
        $petugas = User::where('role', 'petugas')->first()
            ?? User::where('role', 'admin_utama')->first();

        if (! $petugas) {
            return;
        }

        $orders = Order::whereIn('status_order', ['confirmed', 'active', 'perlu_verifikasi', 'completed'])
            ->orderBy('id')
            ->take(6)
            ->get();

        if ($orders->isEmpty()) {
            return;
        }

        // Bersihkan placeholder lama supaya tidak menumpuk saat seeder dijalankan ulang.
        Storage::disk('public')->deleteDirectory('inspeksi/seeder');

        foreach ($orders as $i => $order) {
            $this->buatInspeksi($order, 'pickup', $petugas, $i);

            if (in_array($order->status_order, ['completed', 'perlu_verifikasi'], true)) {
                $this->buatInspeksi($order, 'return', $petugas, $i);
            }
        }
    }

    private function buatInspeksi(Order $order, string $jenis, User $petugas, int $index): void
    {
        $sampel = $jenis === 'pickup' ? $this->sampelPickup() : $this->sampelReturn();
        $data = $sampel[$index % count($sampel)];

        $createdAt = $jenis === 'return'
            ? $this->waktu($order->tanggal_pengembalian_aktual, $order->tanggal_selesai, $order->jam_selesai)
            : $this->waktu(null, $order->tanggal_mulai, $order->jam_mulai);

        $fotos = [];
        $warna = $data['ada_damagenya'] ? '#d97757' : '#7aa5d9';
        foreach ([1, 2, 3] as $n) {
            $fotos[] = $this->simpanGambar("Inspeksi {$jenis} #{$order->id} - Foto {$n}", $warna);
        }

        InspeksiKendaraan::updateOrCreate(
            ['order_id' => $order->id, 'jenis' => $jenis],
            [
                'status' => 'final',
                'odometer' => $data['odometer'],
                'fuel_level' => $data['fuel_level'],
                'kondisi_body' => $data['kondisi_body'],
                'kondisi_interior' => $data['kondisi_interior'],
                'kondisi_ban' => $data['kondisi_ban'],
                'kondisi_ac' => $data['kondisi_ac'],
                'kondisi_lampu' => $data['kondisi_lampu'],
                'ada_damagenya' => $data['ada_damagenya'],
                'deskripsi_kondisi' => $data['deskripsi_kondisi'],
                'catatan' => $data['catatan'],
                'biaya_kerusakan' => $data['biaya_kerusakan'],
                'foto' => $fotos[0],
                'fotos' => $fotos,
                'videos' => null,
                'checklist_serah_terima' => self::CHECKLIST_ITEMS,
                'ttd_customer' => $this->simpanTtd('TTD Customer'),
                'ttd_petugas' => $this->simpanTtd('TTD Petugas'),
                'inspeksi_oleh' => $petugas->name,
                'admin_id' => $petugas->id,
                'created_at' => $createdAt,
                'updated_at' => $createdAt,
            ]
        );
    }

    /**
     * Waktu inspeksi: utamakan tanggal pengembalian aktual (untuk return),
     * lalu tanggal order pada jam default 08:00 / jam yang tertera.
     */
    private function waktu(?string $tanggalAktual, ?string $tanggalOrder, ?string $jam): Carbon
    {
        $tanggal = $tanggalAktual ? Carbon::parse($tanggalAktual) : Carbon::parse($tanggalOrder);

        return $tanggal->copy()->setTimeFromTimeString($jam ?: '08:00');
    }

    /**
     * Sampel data inspeksi pickup (serah terima awal).
     */
    private function sampelPickup(): array
    {
        return [
            [
                'odometer' => 45210,
                'fuel_level' => 'full',
                'kondisi_body' => 'baik',
                'kondisi_interior' => 'baik',
                'kondisi_ban' => 'baik',
                'kondisi_ac' => 'baik',
                'kondisi_lampu' => 'baik',
                'ada_damagenya' => false,
                'deskripsi_kondisi' => null,
                'catatan' => 'Kendaraan bersih dan siap diserahkan ke customer.',
                'biaya_kerusakan' => null,
            ],
            [
                'odometer' => 78450,
                'fuel_level' => '3/4',
                'kondisi_body' => 'lecet_ringan',
                'kondisi_interior' => 'kotor_ringan',
                'kondisi_ban' => 'tipis',
                'kondisi_ac' => 'baik',
                'kondisi_lampu' => 'baik',
                'ada_damagenya' => true,
                'deskripsi_kondisi' => 'Lecet ringan di bemper depan sisi kanan, interior sedikit berdebu.',
                'catatan' => 'Lecet lama sudah difoto dan dicatat sebelum diserahkan.',
                'biaya_kerusakan' => null,
            ],
            [
                'odometer' => 120300,
                'fuel_level' => '1/2',
                'kondisi_body' => 'baik',
                'kondisi_interior' => 'baik',
                'kondisi_ban' => 'baik',
                'kondisi_ac' => 'baik',
                'kondisi_lampu' => 'tidak_baik',
                'ada_damagenya' => true,
                'deskripsi_kondisi' => 'Lampu kabin belakang mati, dijadwalkan ganti sebelum disewakan.',
                'catatan' => 'Sudah disepakati dengan customer bahwa lampu akan diganti.',
                'biaya_kerusakan' => null,
            ],
        ];
    }

    /**
     * Sampel data inspeksi return (serah terima akhir).
     */
    private function sampelReturn(): array
    {
        return [
            [
                'odometer' => 45620,
                'fuel_level' => '1/2',
                'kondisi_body' => 'baik',
                'kondisi_interior' => 'baik',
                'kondisi_ban' => 'baik',
                'kondisi_ac' => 'baik',
                'kondisi_lampu' => 'baik',
                'ada_damagenya' => false,
                'deskripsi_kondisi' => null,
                'catatan' => 'Kendaraan dikembalikan tepat waktu, kondisi sama seperti saat pickup.',
                'biaya_kerusakan' => null,
            ],
            [
                'odometer' => 78980,
                'fuel_level' => '1/4',
                'kondisi_body' => 'lecet_parah',
                'kondisi_interior' => 'kotor_banyak',
                'kondisi_ban' => 'tipis',
                'kondisi_ac' => 'baik',
                'kondisi_lampu' => 'baik',
                'ada_damagenya' => true,
                'deskripsi_kondisi' => 'Lecet parah di sisi kiri bawah pintu belakang, interior kotor banyak.',
                'catatan' => 'Kerusakan baru terjadi saat masa sewa. Estimasi biaya perbaikan dikenakan ke customer.',
                'biaya_kerusakan' => 500000,
            ],
            [
                'odometer' => 121100,
                'fuel_level' => 'kosong',
                'kondisi_body' => 'penyok',
                'kondisi_interior' => 'kotor_ringan',
                'kondisi_ban' => 'baik',
                'kondisi_ac' => 'tidak_baik',
                'kondisi_lampu' => 'baik',
                'ada_damagenya' => true,
                'deskripsi_kondisi' => 'Penyok kecil di kap mesin dengan cat mengelupas, AC tidak dingin.',
                'catatan' => 'Dikembalikan dengan BBM kosong, dikenakan biaya isi ulang + perbaikan penyok.',
                'biaya_kerusakan' => 1500000,
            ],
        ];
    }

    /**
     * Buat gambar placeholder sederhana untuk foto dokumentasi.
     */
    private function simpanGambar(string $label, string $hex = '#7aa5d9'): string
    {
        [$r, $g, $b] = $this->hexToRgb($hex);
        $img = imagecreatetruecolor(480, 360);
        $bg = imagecolorallocate($img, $r, $g, $b);
        imagefilledrectangle($img, 0, 0, 480, 360, $bg);
        $putih = imagecolorallocate($img, 255, 255, 255);
        imagestring($img, 5, 16, 16, $label, $putih);
        imagestring($img, 4, 16, 340, 'UDIN RENTCAR', $putih);

        return $this->simpanJpg($img);
    }

    /**
     * Buat gambar TTD (tanda tangan) sebagai goresan sederhana di atas kanvas putih.
     */
    private function simpanTtd(string $label): string
    {
        $img = imagecreatetruecolor(300, 120);
        $putih = imagecolorallocate($img, 255, 255, 255);
        imagefilledrectangle($img, 0, 0, 300, 120, $putih);
        $pena = imagecolorallocate($img, 26, 26, 26);

        $titik = [[40, 80], [60, 60], [75, 90], [95, 50], [110, 85], [135, 55], [155, 88], [180, 60], [205, 90], [230, 55], [250, 85], [270, 70]];
        for ($i = 1, $n = count($titik); $i < $n; $i++) {
            imageline($img, $titik[$i - 1][0], $titik[$i - 1][1], $titik[$i][0], $titik[$i][1], $pena);
        }

        imagestring($img, 3, 10, 102, $label, $pena);

        return $this->simpanJpg($img);
    }

    private function simpanJpg($img): string
    {
        $dir = 'inspeksi/seeder';
        $path = $dir.'/'.Str::random(24).'.jpg';
        $full = storage_path('app/public/'.$path);
        if (! is_dir(dirname($full))) {
            mkdir(dirname($full), 0775, true);
        }
        imagejpeg($img, $full, 85);
        imagedestroy($img);

        return $path;
    }

    private function hexToRgb(string $hex): array
    {
        $hex = ltrim($hex, '#');
        if (strlen($hex) === 6) {
            return [hexdec(substr($hex, 0, 2)), hexdec(substr($hex, 2, 2)), hexdec(substr($hex, 4, 2))];
        }

        return [200, 200, 200];
    }
}
