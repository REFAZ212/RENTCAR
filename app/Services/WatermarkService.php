<?php

namespace App\Services;

use App\Models\Setting;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Carbon;
use Intervention\Image\Drivers\Gd\Driver;
use Intervention\Image\ImageManager;
use Intervention\Image\Typography\FontFactory;

class WatermarkService
{
    protected ImageManager $manager;

    public function __construct()
    {
        $this->manager = new ImageManager(new Driver);
    }

    /**
     * Terapkan watermark teks diagonal ke file yang sudah di-upload.
     * Mengembalikan path yang sama (overwrite).
     */
    public function applyToUploadedFile(UploadedFile $file, ?string $label = null): void
    {
        $absolutePath = $file->getRealPath();

        if (! $absolutePath || ! is_readable($absolutePath)) {
            return;
        }

        if ($this->isOversizedForWatermark($absolutePath)) {
            return;
        }

        $image = $this->manager->decodePath($absolutePath);
        $width = $image->width();
        $height = $image->height();

        $namaUsaha = $label ?? Setting::get('nama_usaha', 'UDIN RENCTCAR');
        $timestamp = now()->timezone('Asia/Jakarta')->format('d M Y H:i');
        $text = "{$namaUsaha} • {$timestamp}";

        $fontSize = max(14, (int) ($width / 30));

        $image->text($text, (int) ($width / 2), (int) ($height / 2), function (FontFactory $font) use ($fontSize) {
            $font->filename(resource_path('fonts/Roboto-Regular.ttf'));
            $font->size($fontSize);
            $font->color('rgba(255,255,255,0.35)');
            $font->align('center', 'center');
            $font->angle(-30);
        });

        $image->save($absolutePath);
    }

    /**
     * Terapkan watermark ke path file di storage disk 'public'.
     * $storagePath relatif terhadap storage/app/public/ (contoh: "bukti-transfer/abc.jpg").
     */
    public function applyToStoragePath(string $storagePath, ?string $label = null): void
    {
        $absolutePath = storage_path("app/public/{$storagePath}");

        if (! is_file($absolutePath) || ! is_readable($absolutePath)) {
            return;
        }

        if ($this->isOversizedForWatermark($absolutePath)) {
            return;
        }

        $image = $this->manager->decodePath($absolutePath);
        $width = $image->width();
        $height = $image->height();

        $namaUsaha = $label ?? Setting::get('nama_usaha', 'UDIN RENCTCAR');
        $timestamp = now()->timezone('Asia/Jakarta')->format('d M Y H:i');
        $text = "{$namaUsaha} • {$timestamp}";

        $fontSize = max(14, (int) ($width / 30));

        $image->text($text, (int) ($width / 2), (int) ($height / 2), function (FontFactory $font) use ($fontSize) {
            $font->filename(resource_path('fonts/Roboto-Regular.ttf'));
            $font->size($fontSize);
            $font->color('rgba(255,255,255,0.35)');
            $font->align('center', 'center');
            $font->angle(-30);
        });

        $image->save($absolutePath);
    }

    /**
     * Watermark khusus foto inspeksi supir (aplikasi mobile): identitas
     * pengemudi, lokasi/GPS, waktu ambil, dan kode task — gaya dokumentasi
     * bukti pengantaran. Menulis hasil ke file BARU berakhiran "-wm" dan
     * mengembalikan path storage-nya; file asli tidak diubah.
     *
     * Mengembalikan null bila gagal (file hilang/tak terbaca/terlalu besar)
     * — pemanggil yang memutuskan fallback-nya.
     *
     * @param  array<string, mixed>  $meta  driver_name, location, latitude, longitude, accuracy, captured_at, task_code
     */
    public function applyDriverWatermark(string $storagePath, array $meta = []): ?string
    {
        $absolutePath = storage_path("app/public/{$storagePath}");

        if (! is_file($absolutePath) || ! is_readable($absolutePath)) {
            return null;
        }

        if ($this->isOversizedForWatermark($absolutePath)) {
            return null;
        }

        $info = pathinfo($absolutePath);
        $targetPath = sprintf(
            '%s%s%s-wm.%s',
            $info['dirname'],
            DIRECTORY_SEPARATOR,
            $info['filename'],
            $info['extension'] ?? 'jpg'
        );

        try {
            $image = $this->manager->decodePath($absolutePath);
        } catch (\Throwable) {
            return null;
        }

        $width = $image->width();
        $height = $image->height();
        $fontSize = max(12, (int) ($width / 40));
        $lineHeight = (int) ($fontSize * 1.5);
        $marginX = (int) ($width * 0.04);
        $marginY = (int) ($height * 0.03);

        $waktu = ($meta['captured_at'] ?? null)
            ? Carbon::parse($meta['captured_at'])->timezone('Asia/Jakarta')->format('d M Y H:i')
            : now()->timezone('Asia/Jakarta')->format('d M Y H:i');

        $namaUsaha = Setting::get('nama_usaha', 'UDIN RENCTCAR');
        $lines = array_values(array_filter([
            "{$namaUsaha} • {$waktu}",
            isset($meta['driver_name']) ? "Supir: {$meta['driver_name']}" : null,
            isset($meta['task_code']) ? "Task: {$meta['task_code']}" : null,
            isset($meta['location']) ? "Lokasi: {$meta['location']}" : null,
            isset($meta['latitude'], $meta['longitude']) ? sprintf(
                'GPS: %.6f, %.6f'.(isset($meta['accuracy']) ? ' (±%dm)' : ''),
                (float) $meta['latitude'],
                (float) $meta['longitude'],
                isset($meta['accuracy']) ? (int) round((float) $meta['accuracy']) : null
            ) : null,
        ]));

        try {
            foreach ($lines as $i => $line) {
                $y = $height - $marginY - ((count($lines) - 1 - $i) * $lineHeight);

                // Bayangan gelap agar teks tetap terbaca di foto terang.
                $image->text($line, $marginX + 2, $y + 2, function (FontFactory $font) use ($fontSize) {
                    $font->filename(resource_path('fonts/Roboto-Regular.ttf'));
                    $font->size($fontSize);
                    $font->color('rgba(0,0,0,0.55)');
                    $font->align('left', 'bottom');
                });

                $image->text($line, $marginX, $y, function (FontFactory $font) use ($fontSize) {
                    $font->filename(resource_path('fonts/Roboto-Regular.ttf'));
                    $font->size($fontSize);
                    $font->color('rgba(255,255,255,0.85)');
                    $font->align('left', 'bottom');
                });
            }

            $image->save($targetPath);
        } catch (\Throwable) {
            return null;
        }

        $relative = str_replace(
            [storage_path('app/public'), DIRECTORY_SEPARATOR],
            ['', '/'],
            $targetPath
        );

        return ltrim($relative, '/');
    }

    /**
     * Gambar raksasa (mis. scan resolusi tinggi) butuh ratusan MB untuk
     * di-decode GD dan bisa meledakkan memory_limit. Kalau dimensinya melebihi
     * ambang, watermark dilewati — file tetap tersimpan apa adanya.
     *
     * @return array{0: int, 1: int}|null dimensi [w, h] kalau terlalu besar
     */
    private function isOversizedForWatermark(string $absolutePath): ?array
    {
        $info = @getimagesize($absolutePath);
        if ($info === false) {
            return null;
        }

        [$width, $height] = $info;

        if ($width > 6000 || $height > 6000 || $width * $height > 20000000) {
            report(new \RuntimeException('Watermark dilewati: dimensi gambar terlalu besar ('.$width.'x'.$height.' px): '.$absolutePath));

            return [$width, $height];
        }

        return null;
    }
}
