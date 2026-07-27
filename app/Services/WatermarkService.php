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

        $image = $this->manager->read($absolutePath);
        $width = $image->width();
        $height = $image->height();

        $namaUsaha = $label ?? Setting::get('nama_usaha', 'CVPILAR');
        $timestamp = now()->timezone('Asia/Jakarta')->format('d M Y H:i');
        $text = "{$namaUsaha} • {$timestamp}";

        $fontSize = max(14, (int) ($width / 30));

        $image->text($text, function (FontFactory $font) use ($fontSize) {
            $font->filename(resource_path('fonts/Roboto-Regular.ttf'));
            $font->size($fontSize);
            $font->color('rgba(255,255,255,0.35)');
            $font->align('center');
            $font->valign('middle');
            $font->angle(-30);
        }, [
            (int) ($width / 2),
            (int) ($height / 2),
        ]);

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

        $image = $this->manager->read($absolutePath);
        $width = $image->width();
        $height = $image->height();

        $namaUsaha = $label ?? Setting::get('nama_usaha', 'CVPILAR');
        $timestamp = now()->timezone('Asia/Jakarta')->format('d M Y H:i');
        $text = "{$namaUsaha} • {$timestamp}";

        $fontSize = max(14, (int) ($width / 30));

        $image->text($text, function (FontFactory $font) use ($fontSize) {
            $font->filename(resource_path('fonts/Roboto-Regular.ttf'));
            $font->size($fontSize);
            $font->color('rgba(255,255,255,0.35)');
            $font->align('center');
            $font->valign('middle');
            $font->angle(-30);
        }, [
            (int) ($width / 2),
            (int) ($height / 2),
        ]);

        $image->save($absolutePath);
    }
}
