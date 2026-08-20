<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SupirCalo;
use App\Models\Tipe;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class TipeController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Tipe::class);

        $query = Tipe::with('kategori')->withCount('kendaraans');

        if ($request->has('kategori_id') && $request->kategori_id) {
            $query->where('kategori_id', $request->kategori_id);
        }

        if ($request->has('aktif') && $request->aktif !== null) {
            $query->where('aktif', $request->boolean('aktif'));
        }

        $tipes = $query->orderBy('nama_tipe')->get();

        return response()->json($tipes);
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorize('create', Tipe::class);

        $request->merge([
            'nama_tipe' => (string) preg_replace('/\s+/', ' ', trim((string) $request->input('nama_tipe'))),
        ]);

        $validated = $request->validate([
            'kategori_id' => 'required|exists:kategoris,id',
            'nama_tipe' => [
                'required',
                'string',
                'max:255',
                Rule::unique('tipes', 'nama_tipe')->where('kategori_id', $request->input('kategori_id')),
            ],
            'deskripsi' => 'nullable|string|max:500',
            'aktif' => 'boolean',
        ]);

        $tipe = Tipe::create($validated);

        return response()->json($tipe, 201);
    }

    public function show(Tipe $tipe): JsonResponse
    {
        $this->authorize('view', $tipe);

        $tipe->load('kategori');
        $tipe->loadCount('kendaraans');

        return response()->json($tipe);
    }

    public function update(Request $request, Tipe $tipe): JsonResponse
    {
        $this->authorize('update', $tipe);

        if ($request->has('nama_tipe')) {
            $request->merge([
                'nama_tipe' => (string) preg_replace('/\s+/', ' ', trim((string) $request->input('nama_tipe'))),
            ]);
        }

        $kategoriId = $request->filled('kategori_id') ? $request->input('kategori_id') : $tipe->kategori_id;

        $validated = $request->validate([
            'kategori_id' => 'sometimes|required|exists:kategoris,id',
            'nama_tipe' => [
                'required',
                'string',
                'max:255',
                Rule::unique('tipes', 'nama_tipe')->ignore($tipe->id)->where('kategori_id', $kategoriId),
            ],
            'deskripsi' => 'nullable|string|max:500',
            'aktif' => 'boolean',
        ]);

        $tipe->update($validated);

        return response()->json($tipe);
    }

    public function destroy(Tipe $tipe): JsonResponse
    {
        $this->authorize('delete', $tipe);

        if ($tipe->kendaraans()->count() > 0) {
            return response()->json(['message' => 'Tipe masih digunakan oleh kendaraan'], 422);
        }

        $tipe->delete();

        return response()->json(['message' => 'Tipe berhasil dihapus']);
    }

    public function kendaraans(Request $request, Tipe $tipe): JsonResponse
    {
        abort_if($request->user() instanceof SupirCalo, 403, 'Akses ditolak. Anda tidak memiliki izin yang cukup.');

        $kendaraans = $tipe->kendaraans()
            ->with(['kategori', 'garasiPartner'])
            ->orderBy('nama_kendaraan')
            ->get();

        return response()->json($kendaraans);
    }
}
