<?php

namespace App\Services;

use App\Models\Setting;
use App\Models\WhatsappLog;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class WhatsAppService
{
    private string $token;

    private string $targetNumber;

    public function __construct()
    {
        $this->token = Setting::get('fonnte_token', '');
        $this->targetNumber = Setting::get('nomor_wa_owner', '');
    }

    public function kirimPesan(string $nomorTujuan, string $pesan, string $type = 'notifikasi_customer'): bool
    {
        if (empty($this->token)) {
            Log::warning('WhatsApp token not configured');

            return false;
        }

        $normalizedNomor = $this->normalizePhone($nomorTujuan);

        try {
            $response = Http::withToken($this->token)
                ->timeout(10)
                ->post('https://api.fonnte.com/send', [
                    'target' => $normalizedNomor,
                    'message' => $pesan,
                ]);

            $result = $response->json();
            $status = $result['status'] ?? false;

            WhatsappLog::create([
                'nomor_tujuan' => $normalizedNomor,
                'pesan' => $pesan,
                'status_kirim' => $status ? 'terkirim' : 'gagal',
                'response' => $result,
            ]);

            return $status;
        } catch (\Exception $e) {
            Log::error('WhatsApp send failed: '.$e->getMessage());

            WhatsappLog::create([
                'nomor_tujuan' => $normalizedNomor,
                'pesan' => $pesan,
                'status_kirim' => 'gagal',
                'response' => ['error' => $e->getMessage()],
            ]);

            return false;
        }
    }

    public function kirimKeOwner(string $pesan): bool
    {
        return $this->kirimPesan($this->targetNumber, $pesan, 'notifikasi_owner');
    }

    public function renderTemplate(string $template, array $vars): string
    {
        foreach ($vars as $key => $value) {
            $template = str_replace("{{$key}}", $value ?? '', $template);
        }

        return $template;
    }

    private function normalizePhone(string $phone): string
    {
        $normalized = preg_replace('/[^0-9]/', '', $phone);
        if (str_starts_with($normalized, '0')) {
            $normalized = '62'.substr($normalized, 1);
        } elseif (str_starts_with($normalized, '8')) {
            $normalized = '62'.$normalized;
        }

        return $normalized;
    }
}
