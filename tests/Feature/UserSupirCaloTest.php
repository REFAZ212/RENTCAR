<?php

namespace Tests\Feature;

use App\Models\SupirCalo;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class UserSupirCaloTest extends TestCase
{
    protected User $admin;

    protected function setUp(): void
    {
        parent::setUp();

        Schema::dropIfExists('orders');
        Schema::dropIfExists('supir_calos');
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
        Schema::create('orders', function ($t) {
            $t->id();
            $t->foreignId('supir_id')->nullable();
            $t->string('status_order')->default('pending');
            $t->timestamps();
            $t->softDeletes();
        });

        $this->admin = User::create([
            'name' => 'Admin Utama',
            'email' => 'admin@test.test',
            'phone' => '081111',
            'role' => 'admin_utama',
            'password' => 'password',
        ]);
    }

    public function test_create_user_with_nyambi_supir_creates_linked_record(): void
    {
        $res = $this->actingAs($this->admin)->postJson('/api/users', [
            'name' => 'Petugas A',
            'email' => 'petugas-a@test.test',
            'phone' => '081234567890',
            'role' => 'petugas',
            'password' => 'password',
            'password_confirmation' => 'password',
            'nyambi_supir' => true,
            'no_sim' => 'SIM-1234',
            'tarif_per_hari' => 250000,
        ]);

        $res->assertCreated();

        $userId = $res->json('id');
        $this->assertDatabaseHas('supir_calos', [
            'user_id' => $userId,
            'jenis' => 'supir',
            'nama' => 'Petugas A',
            'no_hp' => '081234567890',
            'no_sim' => 'SIM-1234',
            'status' => 'active',
        ]);
        $this->assertEquals(250000, (float) SupirCalo::where('user_id', $userId)->first()->tarif_per_hari);
    }

    public function test_create_user_nyambi_without_no_sim_is_rejected(): void
    {
        $res = $this->actingAs($this->admin)->postJson('/api/users', [
            'name' => 'Petugas B',
            'email' => 'petugas-b@test.test',
            'role' => 'petugas',
            'password' => 'password',
            'password_confirmation' => 'password',
            'nyambi_supir' => true,
        ]);

        $res->assertUnprocessable();
        $this->assertDatabaseMissing('supir_calos', ['nama' => 'Petugas B']);
    }

    public function test_update_user_syncs_name_to_linked_supir(): void
    {
        $petugas = User::create([
            'name' => 'Petugas Lama',
            'email' => 'petugas-c@test.test',
            'phone' => '081111222333',
            'role' => 'petugas',
            'password' => 'password',
        ]);
        SupirCalo::create([
            'user_id' => $petugas->id,
            'jenis' => 'supir',
            'nama' => 'Petugas Lama',
            'no_hp' => '081111222333',
            'status' => 'active',
            'no_sim' => 'SIM-999',
        ]);

        $this->actingAs($this->admin)->putJson("/api/users/{$petugas->id}", [
            'name' => 'Petugas Baru',
            'phone' => '081555666777',
        ])->assertOk();

        $this->assertDatabaseHas('supir_calos', [
            'user_id' => $petugas->id,
            'nama' => 'Petugas Baru',
            'no_hp' => '081555666777',
        ]);
    }

    public function test_disable_nyambi_supir_deletes_linked_record(): void
    {
        $petugas = User::create([
            'name' => 'Petugas D',
            'email' => 'petugas-d@test.test',
            'phone' => '081123456789',
            'role' => 'petugas',
            'password' => 'password',
        ]);
        SupirCalo::create([
            'user_id' => $petugas->id,
            'jenis' => 'supir',
            'nama' => 'Petugas D',
            'no_hp' => '081123456789',
            'status' => 'active',
            'no_sim' => 'SIM-777',
        ]);

        $this->actingAs($this->admin)->putJson("/api/users/{$petugas->id}", [
            'nyambi_supir' => false,
        ])->assertOk();

        $this->assertDatabaseMissing('supir_calos', ['user_id' => $petugas->id]);
    }

    public function test_disable_with_active_order_only_unlinks_record(): void
    {
        $petugas = User::create([
            'name' => 'Petugas E',
            'email' => 'petugas-e@test.test',
            'phone' => '081987654321',
            'role' => 'petugas',
            'password' => 'password',
        ]);
        $supir = SupirCalo::create([
            'user_id' => $petugas->id,
            'jenis' => 'supir',
            'nama' => 'Petugas E',
            'no_hp' => '081987654321',
            'status' => 'active',
            'no_sim' => 'SIM-555',
        ]);
        DB::table('orders')->insert([
            'supir_id' => $supir->id,
            'status_order' => 'active',
        ]);

        $this->actingAs($this->admin)->putJson("/api/users/{$petugas->id}", [
            'nyambi_supir' => false,
        ])->assertOk();

        $this->assertDatabaseHas('supir_calos', ['id' => $supir->id, 'user_id' => null]);
    }
}
