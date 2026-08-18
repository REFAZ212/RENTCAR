<?php

namespace App\Services;

use App\Jobs\SendWhatsAppMessage;
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

    /**
     * Kirim pesan secara sinkron (langsung) dan catat satu baris log
     * dengan status ASLI dari gateway.
     */
    public function kirimPesan(string $nomorTujuan, string $pesan, string $type = 'notifikasi_customer', ?int $orderId = null): bool
    {
        [$status, $response] = $this->kirimGateway($nomorTujuan, $pesan);

        WhatsappLog::create([
            'nomor_tujuan' => $nomorTujuan,
            'pesan' => $pesan,
            'status_kirim' => $status ? 'terkirim' : 'gagal',
            'response' => json_encode($response),
            'type' => $type,
            'order_id' => $orderId,
        ]);

        return $status;
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

    /**
     * Kirim pesan secara ANTRIAN (async). Satu baris log dicatat SEKARANG
     * dengan status 'diantri', lalu job (SendWhatsAppMessage) yang meng-update
     * baris yang sama ke 'terkirim'/'gagal' setelah gateway dihubungi.
     * Dengan begini riwayat selalu jujur & tidak dobel-catat.
     */
    public function kirimPesanAsync(string $nomorTujuan, string $pesan, string $type = 'notifikasi_customer', ?int $orderId = null): void
    {
        $log = WhatsappLog::create([
            'nomor_tujuan' => $nomorTujuan,
            'pesan' => $pesan,
            'status_kirim' => 'diantri',
            'type' => $type,
            'order_id' => $orderId,
        ]);

        SendWhatsAppMessage::dispatch($log->id);
    }

    public function kirimKeOwnerAsync(string $pesan, string $type = 'notifikasi_owner', ?int $orderId = null): void
    {
        $this->kirimPesanAsync($this->targetNumber, $pesan, $type, $orderId);
    }

    /**
     * Dipanggil oleh job SendWhatsAppMessage untuk mengirim pesan yang sudah
     * tercatat (log id) dan memperbarui statusnya menjadi terkirim/gagal.
     */
    public function kirimLogDiantri(WhatsappLog $log): void
    {
        [$status, $response] = $this->kirimGateway($log->nomor_tujuan, $log->pesan);

        $log->update([
            'status_kirim' => $status ? 'terkirim' : 'gagal',
            'response' => json_encode($response),
        ]);
    }

    /**
     * Inti pengiriman ke gateway Fonnte. Mengembalikan [status, response].
     */
    private function kirimGateway(string $nomorTujuan, string $pesan): array
    {
        if (empty($this->token)) {
            Log::warning('WhatsApp token not configured');

            return [false, ['error' => 'Token gateway belum dikonfigurasi.']];
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

            return [(bool) ($result['status'] ?? false), $result ?? []];
        } catch (\Exception $e) {
            Log::error('WhatsApp send failed: '.$e->getMessage());

            return [false, ['error' => $e->getMessage()]];
        }
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
