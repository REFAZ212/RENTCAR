<?php

namespace App\Services;

use App\Models\GpsDevice;
use App\Models\GpsLocation;
use App\Models\Kendaraan;
use App\Models\Order;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Collection;

class GpsService
{
    /**
     * Batas umur data terakhir sebelum kendaraan dianggap "offline" (menit).
     */
    public const OFFLINE_THRESHOLD_MINUTES = 10;

    /**
     * Simpan lokasi dari push perangkat.
     *
     * @return GpsLocation|null null kalau api_key tidak dikenal / perangkat nonaktif.
     */
    public function ingest(string $apiKey, array $data): ?GpsLocation
    {
        $device = GpsDevice::where('api_key', $apiKey)->where('status_aktif', true)->first();
        if (! $device) {
            return null;
        }

        return GpsLocation::create([
            'gps_device_id' => $device->id,
            'lat' => $data['lat'],
            'lng' => $data['lng'],
            'speed_kmh' => $data['speed_kmh'] ?? null,
            'heading' => $data['heading'] ?? null,
            'fuel_percent' => $data['fuel_percent'] ?? null,
            'recorded_at' => ! empty($data['recorded_at'])
                ? Carbon::parse($data['recorded_at'])
                : now(),
        ]);
    }

    /**
     * Posisi terbaru per kendaraan yang punya perangkat aktif.
     * Kendaraan tanpa riwayat lokasi tidak ikut (belum ada data).
     *
     * @return array<int, array<string, mixed>>
     */
    public function latest(): array
    {
        $result = [];
        $cutoff = now()->subMinutes(self::OFFLINE_THRESHOLD_MINUTES);

        $devices = GpsDevice::with('kendaraan')
            ->where('status_aktif', true)
            ->get();

        foreach ($devices as $device) {
            $latest = $device->locations()->latest('recorded_at')->first();
            if (! $latest || ! $device->kendaraan) {
                continue;
            }

            $fresh = $latest->recorded_at && $latest->recorded_at->greaterThan($cutoff);
            $moving = (int) $latest->speed_kmh > 0;

            $result[] = [
                'kendaraan_id' => $device->kendaraan->id,
                'plat_nomor' => $device->kendaraan->plat_nomor,
                'nama_kendaraan' => $device->kendaraan->nama_kendaraan,
                'status_sewa' => $device->kendaraan->status,
                'driver' => $this->driverAktif($device->kendaraan),
                'device_id' => $device->id,
                'status' => $fresh ? ($moving ? 'bergerak' : 'diam') : 'offline',
                'speed_kmh' => (int) $latest->speed_kmh,
                'fuel_percent' => $latest->fuel_percent !== null ? (int) $latest->fuel_percent : null,
                'last_update' => $latest->recorded_at?->toIso8601String(),
                'lat' => (float) $latest->lat,
                'lng' => (float) $latest->lng,
            ];
        }

        usort($result, fn ($a, $b) => ($b['last_update'] ?? '') <=> ($a['last_update'] ?? ''));

        return $result;
    }

    /**
     * Nama supir dari order aktif/perlu_verifikasi paling baru, kalau ada.
     */
    public function driverAktif(Kendaraan $kendaraan): ?string
    {
        $order = Order::where('kendaraan_id', $kendaraan->id)
            ->whereIn('status_order', ['active', 'perlu_verifikasi'])
            ->latest('created_at')
            ->first();

        return $order?->supir?->nama;
    }

    /**
     * Riwayat titik lokasi dalam rentang waktu (ascending).
     *
     * @return Collection<int, GpsLocation>
     */
    public function history(Kendaraan $kendaraan, ?Carbon $from = null, ?Carbon $to = null, int $limit = 500): Collection
    {
        $query = GpsLocation::whereHas('device', fn ($q) => $q->where('kendaraan_id', $kendaraan->id));

        if ($from) {
            $query->where('recorded_at', '>=', $from);
        }
        if ($to) {
            $query->where('recorded_at', '<=', $to);
        }

        return $query->orderBy('recorded_at')
            ->limit($limit)
            ->get();
    }

    /**
     * Bersihkan riwayat yang lebih tua dari $days hari. Dipanggil scheduler.
     */
    public function cleanup(int $days = 30): int
    {
        return GpsLocation::where('recorded_at', '<', now()->subDays($days))->delete();
    }
}
