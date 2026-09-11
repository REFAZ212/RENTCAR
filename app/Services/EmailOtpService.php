<?php

namespace App\Services;

use App\Mail\EmailOtpMail;
use App\Models\EmailOtp;
use App\Models\User;
use Illuminate\Support\Facades\Mail;

class EmailOtpService
{
    public const OTP_MINUTES = 5;

    public const MAX_ATTEMPTS = 5;

    /**
     * Generate OTP 6 digit, simpan hash-nya, lalu kirim ke email user.
     * Kode lama yang belum dipakai untuk email yang sama dinonaktifkan.
     */
    public function send(User $user): EmailOtp
    {
        $email = mb_strtolower($user->email);

        EmailOtp::where('email', $email)->whereNull('used_at')->delete();

        $otp = (string) random_int(100000, 999999);

        $record = EmailOtp::create([
            'email' => $email,
            'token_hash' => hash('sha256', $otp),
            'purpose' => 'verify_email',
            'expires_at' => now()->addMinutes(self::OTP_MINUTES),
        ]);

        Mail::to($user->email, $user->name)->send(new EmailOtpMail($otp, $user->email, $record->expires_at));

        return $record;
    }

    /**
     * Verifikasi kode OTP. Sukses menandai kode terpakai dan mengisi
     * email_verified_at di user. Salah berulang menonaktifkan kode.
     */
    public function verify(string $email, string $otp): array
    {
        $email = mb_strtolower($email);

        $record = EmailOtp::where('email', $email)
            ->where('purpose', 'verify_email')
            ->whereNull('used_at')
            ->where('expires_at', '>', now())
            ->latest('id')
            ->first();

        if (! $record) {
            return ['ok' => false, 'reason' => 'invalid', 'message' => 'Kode OTP tidak valid atau sudah kedaluwarsa.'];
        }

        if (hash_equals($record->token_hash, hash('sha256', $otp))) {
            $record->update(['used_at' => now()]);

            $user = User::where('email', $email)->first();
            if ($user) {
                $user->forceFill(['email_verified_at' => now()])->save();
            }

            return ['ok' => true, 'reason' => 'valid', 'message' => 'Email berhasil terverifikasi.'];
        }

        $record->increment('attempts');

        if ($record->attempts >= self::MAX_ATTEMPTS) {
            $record->update(['used_at' => now()]);

            return ['ok' => false, 'reason' => 'exhausted', 'message' => 'Terlalu banyak percobaan. Kirim ulang kode OTP.'];
        }

        return ['ok' => false, 'reason' => 'wrong', 'message' => 'Kode OTP salah.'];
    }
}
