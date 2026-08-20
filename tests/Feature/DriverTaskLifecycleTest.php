<?php

namespace Tests\Feature;

use App\Models\DriverTask;
use App\Models\Kendaraan;
use App\Models\Notification;
use App\Models\SupirCalo;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class DriverTaskLifecycleTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        Schema::dropIfExists('personal_access_tokens');
        Schema::dropIfExists('notifications');
        Schema::dropIfExists('driver_tasks');
        Schema::dropIfExists('inspeksi_kendaraans');
        Schema::dropIfExists('kendaraans');
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
            $t->enum('jenis', ['supir', 'calo']);
            $t->string('nama');
            $t->string('email')->nullable();
            $t->string('password')->nullable();
            $t->string('no_hp');
            $t->text('alamat')->nullable();
            $t->enum('status', ['active', 'inactive'])->default('active');
            $t->enum('driver_status', ['available', 'busy', 'offline'])->default('offline');
            $t->string('fcm_token')->nullable();
            $t->string('no_sim')->nullable();
            $t->string('foto')->nullable();
            $t->decimal('tarif_per_hari', 12, 2)->nullable();
            $t->decimal('komisi', 12, 2)->nullable();
            $t->text('catatan')->nullable();
            $t->timestamps();
        });
        Schema::create('kendaraans', function ($t) {
            $t->id();
            $t->foreignId('garasi_partner_id')->nullable();
            $t->string('nama_kendaraan');
            $t->string('plat_nomor')->unique();
            $t->string('warna');
            $t->decimal('harga_sewa_per_hari', 12, 2);
            $t->string('status')->default('tersedia');
            $t->string('foto')->nullable();
            $t->text('catatan')->nullable();
            $t->timestamps();
        });
        Schema::create('inspeksi_kendaraans', function ($t) {
            $t->id();
            $t->foreignId('order_id')->nullable();
            $t->foreignId('driver_task_id')->nullable();
            $t->string('jenis');
            $t->string('status')->default('final');
            $t->integer('odometer')->nullable();
            $t->string('fuel_level')->nullable();
            $t->string('kondisi_body')->nullable();
            $t->string('kondisi_interior')->nullable();
            $t->string('kondisi_ban')->nullable();
            $t->string('kondisi_ac')->nullable();
            $t->string('kondisi_lampu')->nullable();
            $t->boolean('ada_damagenya')->default(false);
            $t->text('deskripsi_kondisi')->nullable();
            $t->text('catatan')->nullable();
            $t->string('foto')->nullable();
            $t->json('fotos')->nullable();
            $t->json('videos')->nullable();
            $t->string('ttd_customer')->nullable();
            $t->string('ttd_petugas')->nullable();
            $t->json('checklist_serah_terima')->nullable();
            $t->decimal('biaya_kerusakan', 14, 2)->nullable();
            $t->string('inspeksi_oleh')->nullable();
            $t->foreignId('admin_id')->nullable();
            $t->timestamps();
        });
        Schema::create('driver_tasks', function ($t) {
            $t->id();
            $t->string('kode_task', 30)->unique();
            $t->foreignId('order_id')->nullable();
            $t->foreignId('kendaraan_id')->nullable();
            $t->string('judul')->nullable();
            $t->text('deskripsi')->nullable();
            $t->string('pickup_location')->nullable();
            $t->decimal('pickup_lat', 10, 7)->nullable();
            $t->decimal('pickup_lng', 10, 7)->nullable();
            $t->string('destination_location')->nullable();
            $t->decimal('destination_lat', 10, 7)->nullable();
            $t->decimal('destination_lng', 10, 7)->nullable();
            $t->enum('status', [
                'pending', 'available', 'accepted', 'inspection_before',
                'on_delivery', 'arrived', 'inspection_after', 'completed', 'cancelled',
            ])->default('pending');
            $t->foreignId('assigned_driver_id')->nullable();
            $t->timestamp('accepted_at')->nullable();
            $t->foreignId('inspection_before_id')->nullable();
            $t->foreignId('inspection_after_id')->nullable();
            $t->timestamp('started_delivery_at')->nullable();
            $t->decimal('start_lat', 10, 7)->nullable();
            $t->decimal('start_lng', 10, 7)->nullable();
            $t->decimal('start_accuracy', 8, 2)->nullable();
            $t->timestamp('arrived_at')->nullable();
            $t->decimal('arrive_lat', 10, 7)->nullable();
            $t->decimal('arrive_lng', 10, 7)->nullable();
            $t->decimal('arrive_accuracy', 8, 2)->nullable();
            $t->timestamp('completed_at')->nullable();
            $t->timestamp('cancelled_at')->nullable();
            $t->string('cancel_reason')->nullable();
            $t->foreignId('created_by')->nullable();
            $t->timestamps();
        });
        Schema::create('notifications', function ($t) {
            $t->id();
            $t->foreignId('user_id')->nullable();
            $t->foreignId('supir_id')->nullable();
            $t->string('type')->nullable();
            $t->string('title')->nullable();
            $t->text('message')->nullable();
            $t->text('data')->nullable();
            $t->timestamp('read_at')->nullable();
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

        $this->admin = User::create([
            'name' => 'Admin Utama',
            'email' => 'admin@test.com',
            'password' => 'password',
            'role' => 'admin_utama',
        ]);

        $this->supirA = SupirCalo::create([
            'jenis' => 'supir',
            'nama' => 'Supir A',
            'no_hp' => '628111',
            'status' => 'active',
            'driver_status' => 'available',
        ]);

        $this->supirB = SupirCalo::create([
            'jenis' => 'supir',
            'nama' => 'Supir B',
            'no_hp' => '628222',
            'status' => 'active',
            'driver_status' => 'available',
        ]);

        $this->kendaraan = Kendaraan::create([
            'nama_kendaraan' => 'Toyota Avanza',
            'plat_nomor' => 'B 1234 ABC',
            'warna' => 'Putih',
            'harga_sewa_per_hari' => 500000,
            'status' => 'tersedia',
        ]);
    }

    private User $admin;

    private SupirCalo $supirA;

    private SupirCalo $supirB;

    private Kendaraan $kendaraan;

    private function createTask(array $overrides = []): DriverTask
    {
        return DriverTask::create(array_merge([
            'kendaraan_id' => $this->kendaraan->id,
            'judul' => 'Antar Avanza ke Bandung',
            'pickup_location' => 'Garasi Udin, Jakarta',
            'destination_location' => 'Hotel Padma, Bandung',
            'destination_lat' => -6.9214,
            'destination_lng' => 107.6064,
            'status' => DriverTask::STATUS_AVAILABLE,
            'created_by' => $this->admin->id,
        ], $overrides));
    }

    private function authAs(SupirCalo $supir)
    {
        app('auth')->forgetGuards();

        return $this->withToken($supir->createToken('test')->plainTextToken);
    }

    private function payloadInspeksi(array $overrides = []): array
    {
        return array_merge([
            'odometer' => 45000,
            'fuel_level' => 'full',
            'kondisi_body' => 'baik',
            'kondisi_interior' => 'baik',
            'kondisi_ban' => 'baik',
            'kondisi_ac' => 'baik',
            'kondisi_lampu' => 'baik',
            'deskripsi_kondisi' => 'Kendaraan bersih.',
        ], $overrides);
    }

    public function test_available_menampilkan_tugas_untuk_supir_idle(): void
    {
        $task = $this->createTask();

        $response = $this->authAs($this->supirA)->getJson('/api/mobile/tasks/available');

        $response->assertOk();
        $response->assertJsonCount(1, 'tasks');
        $response->assertJsonPath('tasks.0.id', $task->id);
        $response->assertJsonPath('tasks.0.status', 'available');
    }

    public function test_supir_busy_tidak_melihat_tugas_baru(): void
    {
        $this->createTask();
        $this->supirB->update(['driver_status' => 'busy']);

        $response = $this->authAs($this->supirB)->getJson('/api/mobile/tasks/available');

        $response->assertOk();
        $response->assertJsonCount(0, 'tasks');
        $response->assertJsonPath('message', 'Anda sedang memiliki tugas aktif.');
    }

    public function test_accept_mengunci_tugas_pertama(): void
    {
        $task = $this->createTask();

        $response = $this->authAs($this->supirA)->postJson("/api/mobile/tasks/{$task->id}/accept");

        $response->assertOk();
        $response->assertJsonPath('task.status', 'accepted');
        $response->assertJsonPath('task.assigned_driver.id', $this->supirA->id);
        $response->assertJsonPath('driver_status', 'busy');

        $this->assertDatabaseHas('driver_tasks', [
            'id' => $task->id,
            'status' => 'accepted',
            'assigned_driver_id' => $this->supirA->id,
        ]);
        $this->assertDatabaseHas('supir_calos', [
            'id' => $this->supirA->id,
            'driver_status' => 'busy',
        ]);
    }

    public function test_task_yang_sudah_diambil_ditolak_untuk_supir_lain(): void
    {
        $task = $this->createTask();
        $this->authAs($this->supirA)->postJson("/api/mobile/tasks/{$task->id}/accept");

        $response = $this->authAs($this->supirB)->postJson("/api/mobile/tasks/{$task->id}/accept");

        $response->assertStatus(409);
        $this->assertDatabaseHas('driver_tasks', [
            'id' => $task->id,
            'assigned_driver_id' => $this->supirA->id,
        ]);
    }

    public function test_supir_yang_sudah_busy_tidak_bisa_ambil_tugas_lain(): void
    {
        $taskA = $this->createTask();
        $taskB = $this->createTask(['judul' => 'Tugas Kedua']);
        $this->authAs($this->supirA)->postJson("/api/mobile/tasks/{$taskA->id}/accept");

        $response = $this->authAs($this->supirA)->postJson("/api/mobile/tasks/{$taskB->id}/accept");

        $response->assertStatus(409);
        $this->assertStringContainsString('Anda masih memiliki tugas aktif', $response->json('message'));
        $this->assertDatabaseHas('driver_tasks', [
            'id' => $taskB->id,
            'status' => 'available',
            'assigned_driver_id' => null,
        ]);
    }

    public function test_siklus_lengkap_sampai_selesai(): void
    {
        Storage::fake('public');

        $task = $this->createTask();

        // accept
        $this->authAs($this->supirA)->postJson("/api/mobile/tasks/{$task->id}/accept")->assertOk();

        // start inspeksi awal
        $this->authAs($this->supirA)->postJson("/api/mobile/tasks/{$task->id}/start")
            ->assertOk()
            ->assertJsonPath('task.status', 'inspection_before');

        // simpan inspeksi awal
        $this->authAs($this->supirA)->post("/api/mobile/tasks/{$task->id}/inspection/before", array_merge(
            $this->payloadInspeksi(),
            ['fotos' => [UploadedFile::fake()->image('foto-depan.jpg')], 'latitude' => -6.2, 'longitude' => 106.8]
        ))->assertStatus(201)
            ->assertJsonPath('task.status', 'on_delivery');

        $this->assertDatabaseHas('inspeksi_kendaraans', [
            'driver_task_id' => $task->id,
            'jenis' => 'pickup',
            'status' => 'final',
            'inspeksi_oleh' => 'Supir A',
        ]);

        // start delivery
        $this->authAs($this->supirA)->postJson("/api/mobile/tasks/{$task->id}/start-delivery", [
            'latitude' => -6.3,
            'longitude' => 106.9,
        ])->assertOk()
            ->assertJsonPath('task.status', 'on_delivery');

        // arrive
        $this->authAs($this->supirA)->postJson("/api/mobile/tasks/{$task->id}/arrive", [
            'latitude' => -6.92,
            'longitude' => 107.6,
        ])->assertOk()
            ->assertJsonPath('task.status', 'arrived');

        // inspeksi akhir
        $this->authAs($this->supirA)->post("/api/mobile/tasks/{$task->id}/inspection/after", array_merge(
            $this->payloadInspeksi(['odometer' => 45100, 'fuel_level' => '3/4']),
            ['fotos' => [UploadedFile::fake()->image('foto-belakang.jpg')]]
        ))->assertStatus(201)
            ->assertJsonPath('task.status', 'inspection_after');

        $this->assertDatabaseHas('inspeksi_kendaraans', [
            'driver_task_id' => $task->id,
            'jenis' => 'return',
            'status' => 'final',
            'odometer' => 45100,
        ]);

        // complete → supir kembali available
        $this->authAs($this->supirA)->postJson("/api/mobile/tasks/{$task->id}/complete")
            ->assertOk()
            ->assertJsonPath('task.status', 'completed')
            ->assertJsonPath('driver_status', 'available');

        $this->assertDatabaseHas('supir_calos', [
            'id' => $this->supirA->id,
            'driver_status' => 'available',
        ]);
    }

    public function test_inspeksi_awal_tidak_bisa_sebelum_accept(): void
    {
        $task = $this->createTask();

        $response = $this->authAs($this->supirA)->postJson("/api/mobile/tasks/{$task->id}/start");

        $response->assertStatus(403);
    }

    public function test_inspeksi_akhir_tidak_bisa_sebelum_arrive(): void
    {
        $task = $this->createTask();
        $this->authAs($this->supirA)->postJson("/api/mobile/tasks/{$task->id}/accept")->assertOk();
        $this->authAs($this->supirA)->postJson("/api/mobile/tasks/{$task->id}/start")->assertOk();
        $this->authAs($this->supirA)->post("/api/mobile/tasks/{$task->id}/inspection/before", $this->payloadInspeksi())->assertStatus(201);

        $response = $this->authAs($this->supirA)->post("/api/mobile/tasks/{$task->id}/inspection/after", $this->payloadInspeksi());

        $response->assertStatus(409);
    }

    public function test_tugas_orang_lain_tidak_bisa_diubah(): void
    {
        Storage::fake('public');

        $task = $this->createTask();
        $this->authAs($this->supirA)->postJson("/api/mobile/tasks/{$task->id}/accept")->assertOk();

        $response = $this->authAs($this->supirB)->postJson("/api/mobile/tasks/{$task->id}/start");

        $response->assertStatus(403);
    }

    public function test_admin_membuat_tugas_dan_notifikasi_broadcast(): void
    {
        $response = $this->actingAs($this->admin)->postJson('/api/driver-tasks', [
            'kendaraan_id' => $this->kendaraan->id,
            'pickup_location' => 'Garasi Udin',
            'destination_location' => 'Bandung',
        ]);

        $response->assertStatus(201);
        $response->assertJsonPath('status', 'available');

        $this->assertDatabaseHas('driver_tasks', [
            'kode_task' => $response->json('kode_task'),
            'status' => 'available',
        ]);
        $this->assertSame(2, Notification::whereIn('supir_id', [$this->supirA->id, $this->supirB->id])->count());
    }

    public function test_petugas_tidak_bisa_buat_tugas(): void
    {
        $petugas = User::create([
            'name' => 'Petugas',
            'email' => 'petugas@test.com',
            'password' => 'password',
            'role' => 'petugas',
        ]);

        $response = $this->actingAs($petugas)->postJson('/api/driver-tasks', [
            'pickup_location' => 'Garasi Udin',
            'destination_location' => 'Bandung',
        ]);

        $response->assertStatus(403);
    }

    public function test_update_fcm_token(): void
    {
        $response = $this->authAs($this->supirA)->postJson('/api/supir/fcm-token', [
            'fcm_token' => 'fcm-device-token-abc123',
        ]);

        $response->assertOk();
        $this->assertDatabaseHas('supir_calos', [
            'id' => $this->supirA->id,
            'fcm_token' => 'fcm-device-token-abc123',
        ]);
    }

    public function test_driver_notifications_endpoint(): void
    {
        $task = $this->createTask();
        Notification::create([
            'supir_id' => $this->supirA->id,
            'type' => 'tugas',
            'title' => 'Tugas Baru',
            'message' => 'Ada tugas baru',
            'data' => ['task_id' => $task->id],
        ]);

        $response = $this->authAs($this->supirA)->getJson('/api/mobile/notifications');

        $response->assertOk();
        $response->assertJsonCount(1, 'data');
        $response->assertJsonPath('data.0.type', 'tugas');
    }
}
