<?php

namespace Tests\Feature;

use App\Mail\EmailOtpMail;
use App\Models\EmailOtp;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class EmailVerificationTest extends TestCase
{
    private const OTP = '123456';

    protected User $admin;

    protected function setUp(): void
    {
        parent::setUp();

        Mail::fake();

        Schema::dropIfExists('personal_access_tokens');
        Schema::dropIfExists('orders');
        Schema::dropIfExists('supir_calos');
        Schema::dropIfExists('email_otps');
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
        Schema::create('email_otps', function ($t) {
            $t->id();
            $t->string('email')->index();
            $t->string('token_hash');
            $t->string('purpose')->default('verify_email');
            $t->timestamp('expires_at');
            $t->timestamp('used_at')->nullable();
            $t->unsignedTinyInteger('attempts')->default(0);
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
            'email' => 'admin@gmail.com',
            'phone' => '081111',
            'role' => 'admin_utama',
            'password' => 'password',
        ]);
    }

    private function createUnverifiedUser(string $email = 'petugas@gmail.com'): User
    {
        return User::create([
            'name' => 'Petugas Baru',
            'email' => $email,
            'phone' => '081234567890',
            'role' => 'petugas',
            'password' => Hash::make('password'),
        ]);
    }

    private function createOtp(User $user, string $otp = self::OTP, int $minutes = 5): EmailOtp
    {
        return EmailOtp::create([
            'email' => $user->email,
            'token_hash' => hash('sha256', $otp),
            'purpose' => 'verify_email',
            'expires_at' => now()->addMinutes($minutes),
        ]);
    }

    public function test_store_creates_user_sends_otp_and_returns_email_verified_false(): void
    {
        $res = $this->actingAs($this->admin)->postJson('/api/users', [
            'name' => 'Petugas Gmail',
            'email' => 'petugas-baru@gmail.com',
            'phone' => '081234567890',
            'role' => 'petugas',
            'password' => 'password',
            'password_confirmation' => 'password',
        ]);

        $res->assertCreated();
        $res->assertJsonPath('email_verified', false);
        $res->assertJsonPath('email_verified_at', null);

        Mail::assertQueued(EmailOtpMail::class, 1);
        $this->assertDatabaseHas('email_otps', [
            'email' => 'petugas-baru@gmail.com',
            'used_at' => null,
        ]);
    }

    public function test_store_rejects_non_gmail_email(): void
    {
        $res = $this->actingAs($this->admin)->postJson('/api/users', [
            'name' => 'Petugas',
            'email' => 'petugas@outlook.com',
            'phone' => '081234567890',
            'role' => 'petugas',
            'password' => 'password',
            'password_confirmation' => 'password',
        ]);

        $res->assertUnprocessable();
        $res->assertJsonValidationErrors('email');
        $this->assertStringContainsString('@gmail.com', $res->json('message'));
        $this->assertDatabaseMissing('users', ['email' => 'petugas@outlook.com']);
        Mail::assertNothingQueued();
    }

    public function test_update_can_change_email_but_still_must_be_gmail(): void
    {
        $petugas = $this->createUnverifiedUser('petugas-lama@gmail.com');

        $res = $this->actingAs($this->admin)->putJson("/api/users/{$petugas->id}", [
            'email' => 'petugas-baru@gmail.com',
        ]);

        $res->assertOk();
        $this->assertDatabaseHas('users', ['id' => $petugas->id, 'email' => 'petugas-baru@gmail.com']);

        $res = $this->actingAs($this->admin)->putJson("/api/users/{$petugas->id}", [
            'email' => 'petugas@yahoo.co.id',
        ]);

        $res->assertUnprocessable();
        $this->assertDatabaseMissing('users', ['email' => 'petugas@yahoo.co.id']);
    }

    public function test_login_is_blocked_until_email_verified(): void
    {
        $this->createUnverifiedUser();

        $res = $this->postJson('/api/login', [
            'email' => 'petugas@gmail.com',
            'password' => 'password',
        ]);

        $res->assertStatus(422);
        $res->assertJsonPath('unverified', true);
        $this->assertStringContainsString('belum diverifikasi', $res->json('message'));
    }

    public function test_login_succeeds_after_email_verified(): void
    {
        $user = $this->createUnverifiedUser();
        $user->forceFill(['email_verified_at' => now()])->save();

        $this->postJson('/api/login', [
            'email' => 'petugas@gmail.com',
            'password' => 'password',
        ])->assertOk();
    }

    public function test_verify_with_correct_otp_marks_user_verified_then_login_works(): void
    {
        $user = $this->createUnverifiedUser();
        $this->createOtp($user);

        $res = $this->postJson('/api/otp/verify', [
            'email' => 'petugas@gmail.com',
            'otp' => self::OTP,
        ]);

        $res->assertOk();
        $res->assertJsonPath('verified', true);

        $this->assertNotNull($user->fresh()->email_verified_at);
        $this->assertDatabaseHas('email_otps', [
            'email' => 'petugas@gmail.com',
            'used_at' => now()->startOfSecond(),
        ]);

        $this->postJson('/api/login', [
            'email' => 'petugas@gmail.com',
            'password' => 'password',
        ])->assertOk();
    }

    public function test_verify_with_wrong_otp_is_rejected(): void
    {
        $user = $this->createUnverifiedUser();
        $this->createOtp($user);

        $res = $this->postJson('/api/otp/verify', [
            'email' => 'petugas@gmail.com',
            'otp' => '000000',
        ]);

        $res->assertStatus(422);
        $res->assertJsonPath('verified', null);
        $this->assertNull($user->fresh()->email_verified_at);
        $this->assertDatabaseHas('email_otps', [
            'email' => 'petugas@gmail.com',
            'attempts' => 1,
            'used_at' => null,
        ]);
    }

    public function test_verify_exhausts_otp_after_five_wrong_attempts(): void
    {
        $user = $this->createUnverifiedUser();
        $this->createOtp($user);

        foreach (range(1, 5) as $index) {
            $res = $this->postJson('/api/otp/verify', [
                'email' => 'petugas@gmail.com',
                'otp' => '000000',
            ]);
            $res->assertStatus(422);
            $this->assertDatabaseHas('email_otps', [
                'email' => 'petugas@gmail.com',
                'attempts' => $index,
            ]);
        }

        $this->assertStringContainsString('Terlalu banyak percobaan', $res->json('message'));
        $this->assertDatabaseHas('email_otps', [
            'email' => 'petugas@gmail.com',
            'attempts' => 5,
            'used_at' => now()->startOfSecond(),
        ]);

        $this->postJson('/api/otp/verify', [
            'email' => 'petugas@gmail.com',
            'otp' => '000000',
        ])->assertStatus(422);
    }

    public function test_verify_rejects_expired_otp(): void
    {
        $user = $this->createUnverifiedUser();
        $this->createOtp($user, self::OTP, -1);

        $res = $this->postJson('/api/otp/verify', [
            'email' => 'petugas@gmail.com',
            'otp' => self::OTP,
        ]);

        $res->assertStatus(422);
        $this->assertStringContainsString('tidak valid atau sudah kedaluwarsa', $res->json('message'));
        $this->assertNull($user->fresh()->email_verified_at);
    }

    public function test_verify_returns_already_verified_for_verified_user(): void
    {
        $user = $this->createUnverifiedUser();
        $user->forceFill(['email_verified_at' => now()])->save();

        $res = $this->postJson('/api/otp/verify', [
            'email' => 'petugas@gmail.com',
            'otp' => self::OTP,
        ]);

        $res->assertOk();
        $res->assertJsonPath('verified', true);
        $this->assertDatabaseCount('email_otps', 0);
    }

    public function test_resend_sends_new_otp_for_unverified_user(): void
    {
        $user = $this->createUnverifiedUser();
        $this->createOtp($user);

        $oldHash = EmailOtp::where('email', $user->email)->value('token_hash');

        $res = $this->postJson('/api/otp/resend', [
            'email' => 'petugas@gmail.com',
        ]);

        $res->assertOk();
        Mail::assertQueued(EmailOtpMail::class, 1);

        $record = EmailOtp::where('email', $user->email)->first();
        $this->assertNotEquals($oldHash, $record->token_hash);
        $this->assertNull($record->used_at);
        $this->assertEquals(0, $record->attempts);
    }

    public function test_resend_rejected_for_verified_email(): void
    {
        $user = $this->createUnverifiedUser();
        $user->forceFill(['email_verified_at' => now()])->save();

        $res = $this->postJson('/api/otp/resend', [
            'email' => 'petugas@gmail.com',
        ]);

        $res->assertStatus(422);
        Mail::assertNothingQueued();
    }
}
