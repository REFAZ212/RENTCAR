<?php

namespace Tests\Feature;

use App\Models\GarasiPartner;
use App\Models\Setting;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class KatalogKontakTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        Schema::dropIfExists('settings');
        Schema::dropIfExists('garasi_partners');

        Schema::create('settings', function ($t) {
            $t->id();
            $t->string('key')->unique();
            $t->text('value');
            $t->timestamps();
        });
        Schema::create('garasi_partners', function ($t) {
            $t->id();
            $t->string('nama_garasi');
            $t->string('nama_pemilik');
            $t->text('alamat');
            $t->string('no_hp');
            $t->string('email')->nullable()->unique();
            $t->boolean('status_aktif')->default(true);
            $t->boolean('is_own')->default(false);
            $t->enum('metode_bagi_hasil', ['persentase'])->default('persentase');
            $t->decimal('persentase_bagi_hasil', 5, 2)->nullable();
            $t->text('catatan')->nullable();
            $t->timestamps();
        });
    }

    public function test_kontak_returns_default_wa_when_nothing_configured(): void
    {
        $this->getJson('/api/katalog/kontak')
            ->assertOk()
            ->assertExactJson([
                'wa' => '62895361054272',
                'hp' => '0895361054272',
                'email' => 'info@udin-renctcar.com',
                'alamat' => 'Jl. Contoh No. 123, Kota',
            ]);
    }

    public function test_kontak_uses_setting_when_no_own_garasi(): void
    {
        Setting::create(['key' => 'nomor_wa_owner', 'value' => '0811-111-2222']);

        $this->getJson('/api/katalog/kontak')
            ->assertOk()
            ->assertExactJson([
                'wa' => '628111112222',
                'hp' => '08111112222',
                'email' => 'info@udin-renctcar.com',
                'alamat' => 'Jl. Contoh No. 123, Kota',
            ]);
    }

    public function test_kontak_prefers_own_garasi_over_setting(): void
    {
        Setting::create(['key' => 'nomor_wa_owner', 'value' => '08111112222']);
        GarasiPartner::create([
            'nama_garasi' => 'Garasi Udin',
            'nama_pemilik' => 'Udin',
            'alamat' => 'Jl. Test 1',
            'no_hp' => '081234500000',
            'is_own' => true,
        ]);

        $this->getJson('/api/katalog/kontak')
            ->assertOk()
            ->assertExactJson([
                'wa' => '6281234500000',
                'hp' => '081234500000',
                'email' => 'info@udin-renctcar.com',
                'alamat' => 'Jl. Contoh No. 123, Kota',
            ]);
    }

    public function test_kontak_ignores_empty_own_garasi_and_falls_back_to_setting(): void
    {
        Setting::create(['key' => 'nomor_wa_owner', 'value' => '0857-1234-5678']);
        GarasiPartner::create([
            'nama_garasi' => 'Garasi Kosong',
            'nama_pemilik' => 'Udin',
            'alamat' => 'Jl. Test 2',
            'no_hp' => '',
            'is_own' => true,
        ]);

        $this->getJson('/api/katalog/kontak')
            ->assertOk()
            ->assertExactJson([
                'wa' => '6285712345678',
                'hp' => '085712345678',
                'email' => 'info@udin-renctcar.com',
                'alamat' => 'Jl. Contoh No. 123, Kota',
            ]);
    }

    public function test_kontak_uses_lowest_id_own_garasi_when_multiple_exist(): void
    {
        $first = GarasiPartner::create([
            'nama_garasi' => 'Garasi Lama',
            'nama_pemilik' => 'Udin',
            'alamat' => 'Jl. Lama 1',
            'no_hp' => '081299900001',
            'is_own' => true,
        ]);
        GarasiPartner::create([
            'nama_garasi' => 'Garasi Baru',
            'nama_pemilik' => 'Udin',
            'alamat' => 'Jl. Baru 1',
            'no_hp' => '081299900002',
            'is_own' => true,
        ]);

        $this->assertNotNull($first);

        $this->getJson('/api/katalog/kontak')
            ->assertOk()
            ->assertExactJson([
                'wa' => '6281299900001',
                'hp' => '081299900001',
                'email' => 'info@udin-renctcar.com',
                'alamat' => 'Jl. Contoh No. 123, Kota',
            ]);
    }

    public function test_kontak_normalizes_own_no_hp_variations(): void
    {
        GarasiPartner::create([
            'nama_garasi' => 'Garasi Udin',
            'nama_pemilik' => 'Udin',
            'alamat' => 'Jl. Test 3',
            'no_hp' => '812-9988-7766',
            'is_own' => true,
        ]);

        $this->getJson('/api/katalog/kontak')
            ->assertOk()
            ->assertExactJson([
                'wa' => '6281299887766',
                'hp' => '081299887766',
                'email' => 'info@udin-renctcar.com',
                'alamat' => 'Jl. Contoh No. 123, Kota',
            ]);
    }

    public function test_kontak_returns_identitas_usaha_email_dan_alamat(): void
    {
        Setting::create(['key' => 'email_usaha', 'value' => 'halo@udinrenctcar.com']);
        Setting::create(['key' => 'alamat_usaha', 'value' => 'Jl. Raya Sudirman No. 1, Jakarta']);

        $this->getJson('/api/katalog/kontak')
            ->assertOk()
            ->assertExactJson([
                'wa' => '62895361054272',
                'hp' => '0895361054272',
                'email' => 'halo@udinrenctcar.com',
                'alamat' => 'Jl. Raya Sudirman No. 1, Jakarta',
            ]);
    }
}
