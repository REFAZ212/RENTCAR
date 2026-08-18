<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\GpsDevice;
use App\Models\GpsLocation;
use App\Models\Kendaraan;
use App\Services\GpsService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class GpsController extends Controller
{
    public function __construct(private readonly GpsService $service) {}

    /**
     * Titik masuk data dari perangkat GPS (public, auth via api_key).
     */
    public function push(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'api_key' => 'required|string',
            'lat' => 'required|numeric|between:-90,90',
            'lng' => 'required|numeric|between:-180,180',
            'speed_kmh' => 'nullable|numeric|min:0|max:400',
            'heading' => 'nullable|numeric|min:0|max:360',
            'fuel_percent' => 'nullable|numeric|min:0|max:100',
            'recorded_at' => 'nullable|date',
        ]);

        $location = $this->service->ingest($validated['api_key'], $validated);

        if (! $location) {
            return response()->json(['message' => 'API key GPS tidak dikenal atau perangkat nonaktif.'], 401);
        }

        return response()->json($location, 201);
    }

    /**
     * Posisi terbaru per kendaraan untuk peta.
     */
    public function latest(Request $request): JsonResponse
    {
        $this->authorize('viewAny', GpsDevice::class);

        return response()->json(['data' => $this->service->latest()]);
    }

    /**
     * Riwayat titik untuk polyline jalur kendaraan.
     */
    public function history(Request $request, Kendaraan $kendaraan): JsonResponse
    {
        $this->authorize('viewAny', GpsDevice::class);

        $from = $request->filled('from') ? Carbon::parse($request->input('from')) : null;
        $to = $request->filled('to') ? Carbon::parse($request->input('to')) : null;
        $limit = min((int) ($request->input('limit') ?? 500), 2000);

        $points = $this->service->history($kendaraan, $from, $to, $limit)
            ->map(fn (GpsLocation $l) => [
                'lat' => (float) $l->lat,
                'lng' => (float) $l->lng,
                'speed_kmh' => (int) $l->speed_kmh,
                'fuel_percent' => $l->fuel_percent !== null ? (int) $l->fuel_percent : null,
                'recorded_at' => $l->recorded_at?->toIso8601String(),
            ]);

        return response()->json(['data' => $points]);
    }

    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', GpsDevice::class);

        $devices = GpsDevice::with('kendaraan:id,nama_kendaraan,plat_nomor')
            ->latest()
            ->limit(200)
            ->get();

        return response()->json(['data' => $devices]);
    }

    public function show(GpsDevice $gpsDevice): JsonResponse
    {
        $this->authorize('view', $gpsDevice);

        $gpsDevice->load('kendaraan:id,nama_kendaraan,plat_nomor');

        return response()->json($gpsDevice);
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorize('create', GpsDevice::class);

        $validated = $request->validate([
            'kendaraan_id' => 'required|exists:kendaraans,id',
            'device_identifier' => 'nullable|string|max:255',
            'nama_perangkat' => 'nullable|string|max:255',
            'status_aktif' => 'nullable|boolean',
            'catatan' => 'nullable|string',
        ]);

        $validated['api_key'] = GpsDevice::generateApiKey();
        $validated['status_aktif'] = $request->boolean('status_aktif', true);

        $device = GpsDevice::create($validated);
        $device->load('kendaraan:id,nama_kendaraan,plat_nomor');

        return response()->json($device, 201);
    }

    public function update(Request $request, GpsDevice $gpsDevice): JsonResponse
    {
        $this->authorize('update', $gpsDevice);

        $validated = $request->validate([
            'kendaraan_id' => 'sometimes|required|exists:kendaraans,id',
            'device_identifier' => 'nullable|string|max:255',
            'nama_perangkat' => 'nullable|string|max:255',
            'status_aktif' => 'nullable|boolean',
            'catatan' => 'nullable|string',
        ]);

        if (array_key_exists('status_aktif', $validated)) {
            $validated['status_aktif'] = $request->boolean('status_aktif');
        }

        $gpsDevice->update($validated);
        $gpsDevice->load('kendaraan:id,nama_kendaraan,plat_nomor');

        return response()->json($gpsDevice);
    }

    public function destroy(GpsDevice $gpsDevice): JsonResponse
    {
        $this->authorize('delete', $gpsDevice);

        $gpsDevice->locations()->delete();
        $gpsDevice->delete();

        return response()->json(['message' => 'Perangkat GPS berhasil dihapus']);
    }
}
