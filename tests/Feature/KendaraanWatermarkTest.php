<?php

namespace Tests\Feature;

use App\Models\GarasiPartner;
use App\Models\Kendaraan;
use App\Models\Setting;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class KendaraanWatermarkTest extends TestCase
{
    protected User $admin;

    protected function setUp(): void
    {
        parent::setUp();

        Schema::dropIfExists('kendaraans');
        Schema::dropIfExists('garasi_partners');
        Schema::dropIfExists('settings');
        Schema::dropIfExists('users');

        Schema::create('users', function ($t) {
            $t->id();
            $t->string('name');
            $t->string('email')->unique();
            $t->string('phone')->nullable();
            $t->string('role')->default('petugas');
            $t->string('avatar')->nullable();
            $t->timestamp('email_verified_at')->nullable();
            $t->string('password');
            $t->rememberToken();
            $t->timestamps();
        });
        Schema::create('settings', function ($t) {
            $t->id();
            $t->string('key')->unique();
            $t->text('value')->nullable();
            $t->timestamps();
        });
        Schema::create('garasi_partners', function ($t) {
            $t->id();
            $t->string('nama_garasi');
            $t->string('nama_pemilik')->nullable();
            $t->text('alamat')->nullable();
            $t->string('no_hp')->nullable();
            $t->boolean('status_aktif')->default(true);
            $t->boolean('is_own')->default(false);
            $t->timestamps();
        });
        Schema::create('kendaraans', function ($t) {
            $t->id();
            $t->foreignId('garasi_partner_id')->nullable();
            $t->foreignId('kategori_id')->nullable();
            $t->foreignId('tipe_id')->nullable();
            $t->string('nama_kendaraan');
            $t->string('plat_nomor')->unique();
            $t->string('merek')->nullable();
            $t->string('model')->nullable();
            $t->integer('tahun')->nullable();
            $t->string('warna')->nullable();
            $t->integer('kapasitas_penumpang')->nullable();
            $t->decimal('harga_sewa_per_hari', 12, 2)->default(0);
            $t->string('status')->default('tersedia');
            $t->string('foto')->nullable();
            $t->text('catatan')->nullable();
            $t->timestamps();
        });

        Setting::set('nama_usaha', 'UDIN RENCTCAR TEST');

        $this->admin = User::create([
            'name' => 'Admin Utama',
            'email' => 'admin@test.dev',
            'password' => bcrypt('password'),
            'role' => 'admin_utama',
        ]);
    }

    private function buatGarasi(): GarasiPartner
    {
        return GarasiPartner::create([
            'nama_garasi' => 'Garasi Mitra Test',
            'nama_pemilik' => 'Budi',
            'alamat' => 'Jl. Test 1',
            'no_hp' => '6281234567890',
            'status_aktif' => true,
            'is_own' => false,
        ]);
    }

    private function payload(GarasiPartner $garasi, array $overrides = []): array
    {
        return array_merge([
            'garasi_partner_id' => $garasi->id,
            'nama_kendaraan' => 'Avanza',
            'plat_nomor' => 'B 1234 CD',
            'merek' => 'Toyota',
            'model' => 'Avanza',
            'tahun' => 2021,
            'warna' => 'Putih',
            'kapasitas_penumpang' => 7,
            'harga_sewa_per_hari' => 350000,
        ], $overrides);
    }

    /**
     * Buat PNG padat (satu warna) yang deterministik — hasil byte-nya bisa
     * dibandingkan sebelum vs sesudah watermark.
     */
    private function buatGambarPng(): string
    {
        $tmp = tempnam(sys_get_temp_dir(), 'kendaraan').'.png';
        $im = imagecreatetruecolor(200, 150);
        imagefilledrectangle($im, 0, 0, 200, 150, imagecolorallocate($im, 20, 30, 40));
        imagepng($im, $tmp);
        imagedestroy($im);

        return $tmp;
    }

    public function test_upload_foto_kendaraan_beri_watermark_nama_usaha(): void
    {
        $garasi = $this->buatGarasi();
        $tmp = $this->buatGambarPng();
        $asli = file_get_contents($tmp);
        $foto = new UploadedFile($tmp, 'foto.png', 'image/png', null, true);

        $response = $this->actingAs($this->admin)
            ->post('/api/kendaraans', $this->payload($garasi, ['foto' => $foto]));

        $response->assertStatus(201);
        $path = $response->json('foto');
        $this->assertNotNull($path);
        Storage::disk('public')->assertExists($path);

        $tersimpan = Storage::disk('public')->get($path);
        $this->assertNotSame($asli, $tersimpan, 'Foto kendaraan harus di-overwrite oleh watermark.');
        [$w, $h] = getimagesizefromstring((string) $tersimpan);
        $this->assertSame([200, 150], [$w, $h]);
    }

    public function test_ganti_foto_kendaraan_beri_watermark_nama_usaha(): void
    {
        $garasi = $this->buatGarasi();
        $kendaraan = Kendaraan::create($this->payload($garasi));
        Storage::disk('public')->put('kendaraan/foto-lama.jpg', 'dummy');

        $tmp = $this->buatGambarPng();
        $asli = file_get_contents($tmp);
        $foto = new UploadedFile($tmp, 'foto-baru.png', 'image/png', null, true);

        $response = $this->actingAs($this->admin)
            ->patch('/api/kendaraans/'.$kendaraan->id, ['foto' => $foto]);

        $response->assertOk();
        $path = $response->json('foto');
        $this->assertNotNull($path);
        Storage::disk('public')->assertExists($path);
        $this->assertNotSame($asli, Storage::disk('public')->get($path));
    }
}
