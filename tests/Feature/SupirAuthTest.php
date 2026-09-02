<?php

namespace Tests\Feature;

use App\Models\SupirCalo;
use App\Models\Tipe;
use App\Models\User;
use Database\Seeders\SupirCaloSeeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class SupirAuthTest extends TestCase
{
    protected User $admin;

    protected function setUp(): void
    {
        parent::setUp();

        Schema::dropIfExists('personal_access_tokens');
        Schema::dropIfExists('supir_calos');
        Schema::dropIfExists('tipes');
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
        Schema::create('supir_calos', function ($t) {
            $t->id();
            $t->foreignId('user_id')->nullable()->unique();
            $t->enum('jenis', ['supir', 'calo']);
            $t->string('nama');
            $t->string('email')->nullable()->unique();
            $t->string('password')->nullable();
            $t->boolean('must_change_password')->default(false);
            $t->string('no_hp');
            $t->text('alamat')->nullable();
            $t->enum('status', ['active', 'inactive'])->default('active');
            $t->string('no_sim')->nullable();
            $t->string('foto')->nullable();
            $t->decimal('tarif_per_hari', 12, 2)->nullable();
            $t->decimal('komisi', 12, 2)->nullable();
            $t->text('catatan')->nullable();
            $t->timestamps();
        });
        Schema::create('personal_access_tokens', function ($t) {
            $t->id();
            $t->morphs('tokenable');
            $t->string('name');
            $t->string('token', 64)->unique();
            $t->text('abilities')->nullable();
            $t->timestamp('last_used_at')->nullable();
            $t->timestamp('expires_at')->nullable();
            $t->timestamps();
        });
        Schema::create('tipes', function ($t) {
            $t->id();
            $t->string('nama_tipe');
            $t->string('slug')->unique();
            $t->timestamps();
        });

        $this->admin = User::create([
            'name' => 'Admin Utama',
            'email' => 'admin@test.test',
            'phone' => '081111',
            'role' => 'admin_utama',
            'password' => 'password',
        ]);
    }

    private function supir(array $overrides = []): SupirCalo
    {
        return SupirCalo::create(array_merge([
            'jenis' => 'supir',
            'nama' => 'Supir Test',
            'email' => 'supir@test.test',
            'password' => 'rahasia123',
            'must_change_password' => true,
            'no_hp' => '081234567890',
            'status' => 'active',
            'no_sim' => 'SIM-1234',
        ], $overrides));
    }

    public function test_login_returns_wajib_ganti_password_flag(): void
    {
        $this->supir();

        $res = $this->postJson('/api/supir/login', [
            'email' => 'supir@test.test',
            'password' => 'rahasia123',
        ]);

        $res->assertOk();
        $res->assertJsonPath('wajib_ganti_password', true);
        $this->assertNotEmpty($res->json('token'));
    }

    public function test_login_flag_false_after_password_changed(): void
    {
        $this->supir(['must_change_password' => false]);

        $res = $this->postJson('/api/supir/login', [
            'email' => 'supir@test.test',
            'password' => 'rahasia123',
        ]);

        $res->assertOk();
        $res->assertJsonPath('wajib_ganti_password', false);
    }

    public function test_ubah_password_success_deletes_other_tokens(): void
    {
        $supir = $this->supir();
        $supir->createToken('token-lama');

        $this->actingAs($supir)->postJson('/api/supir/ubah-password', [
            'password_lama' => 'rahasia123',
            'password' => 'password-baru-123',
            'password_confirmation' => 'password-baru-123',
        ])->assertOk()->assertJsonPath('message', 'Password berhasil diubah.');

        $supir->refresh();
        $this->assertFalse((bool) $supir->must_change_password);
        $this->assertTrue(Hash::check('password-baru-123', $supir->password));
        $this->assertDatabaseCount('personal_access_tokens', 0);

        $this->postJson('/api/supir/login', [
            'email' => 'supir@test.test',
            'password' => 'rahasia123',
        ])->assertUnprocessable();

        $this->postJson('/api/supir/login', [
            'email' => 'supir@test.test',
            'password' => 'password-baru-123',
        ])->assertOk();
    }

    public function test_ubah_password_wrong_old_password_rejected(): void
    {
        $supir = $this->supir();

        $this->actingAs($supir)->postJson('/api/supir/ubah-password', [
            'password_lama' => 'salah',
            'password' => 'password-baru-123',
            'password_confirmation' => 'password-baru-123',
        ])->assertUnprocessable()->assertJsonValidationErrors('password_lama');

        $supir->refresh();
        $this->assertTrue((bool) $supir->must_change_password);
    }

    public function test_ubah_password_same_as_old_rejected(): void
    {
        $supir = $this->supir();

        $this->actingAs($supir)->postJson('/api/supir/ubah-password', [
            'password_lama' => 'rahasia123',
            'password' => 'rahasia123',
            'password_confirmation' => 'rahasia123',
        ])->assertUnprocessable()->assertJsonValidationErrors('password');
    }

    public function test_ubah_password_short_rejected(): void
    {
        $supir = $this->supir();

        $this->actingAs($supir)->postJson('/api/supir/ubah-password', [
            'password_lama' => 'rahasia123',
            'password' => 'pendek',
            'password_confirmation' => 'pendek',
        ])->assertUnprocessable()->assertJsonValidationErrors('password');
    }

    public function test_me_returns_wajib_ganti_password(): void
    {
        $supir = $this->supir();

        $this->actingAs($supir)->getJson('/api/supir/me')
            ->assertOk()
            ->assertJsonPath('wajib_ganti_password', true);
    }

    public function test_seeder_menghasilkan_password_default_untuk_dev(): void
    {
        $this->seed(SupirCaloSeeder::class);

        $supirs = SupirCalo::all();
        $this->assertCount(14, $supirs);

        foreach ($supirs as $supir) {
            $this->assertFalse((bool) $supir->must_change_password, "{$supir->nama} tidak perlu wajib ganti password di seeder dev");
            $this->assertTrue(Hash::check('password', $supir->password), "{$supir->nama} memakai password default dev");
        }
    }

    public function test_admin_create_supir_with_password_sets_require_change_flag(): void
    {
        $this->actingAs($this->admin)->postJson('/api/supir-calos', [
            'jenis' => 'supir',
            'nama' => 'Supir Baru',
            'no_hp' => '081111222333',
            'no_sim' => 'SIM-4321',
            'password' => 'rahasia-baruu',
        ])->assertCreated();

        $supir = SupirCalo::where('nama', 'Supir Baru')->first();
        $this->assertNotNull($supir);
        $this->assertTrue((bool) $supir->must_change_password);
        $this->assertTrue(Hash::check('rahasia-baruu', $supir->password));
    }

    public function test_admin_reset_password_sets_require_change_flag(): void
    {
        $supir = $this->supir(['must_change_password' => false]);

        $this->actingAs($this->admin)->putJson("/api/supir-calos/{$supir->id}", [
            'password' => 'rahasia-reset',
        ])->assertOk();

        $supir->refresh();
        $this->assertTrue((bool) $supir->must_change_password);
        $this->assertTrue(Hash::check('rahasia-reset', $supir->password));
    }

    public function test_admin_update_without_password_keeps_credentials(): void
    {
        $supir = $this->supir();

        $this->actingAs($this->admin)->putJson("/api/supir-calos/{$supir->id}", [
            'nama' => 'Supir Renamed',
        ])->assertOk();

        $supir->refresh();
        $this->assertSame('Supir Renamed', $supir->nama);
        $this->assertTrue(Hash::check('rahasia123', $supir->password));
        $this->assertTrue((bool) $supir->must_change_password);
    }

    public function test_supir_token_blocked_from_staff_endpoints(): void
    {
        $supir = $this->supir();
        Tipe::create(['nama_tipe' => 'Automatic']);

        $this->actingAs($supir)->getJson('/api/dashboard')->assertForbidden();
        $this->actingAs($supir)->getJson('/api/dashboard/chart')->assertForbidden();
        $this->actingAs($supir)->getJson('/api/garasi-saya')->assertForbidden();
        $this->actingAs($supir)->getJson('/api/tipes/1/kendaraans')->assertForbidden();
        $this->actingAs($supir)->getJson('/api/notifications')->assertForbidden();
        $this->actingAs($supir)->getJson('/api/notifications/unread-count')->assertForbidden();
        $this->actingAs($supir)->patchJson('/api/notifications/read-all')->assertForbidden();
    }
}
