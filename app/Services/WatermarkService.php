<?php

namespace App\Services;

use App\Models\Setting;
use Illuminate\Http\UploadedFile;
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
