<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Tipe;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TipeController extends Controller
{
    public function index(Request $request): JsonResponse
    {
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
        $validated = $request->validate([
            'kategori_id' => 'nullable|exists:kategoris,id',
            'nama_tipe' => 'required|string|max:255|unique:tipes,nama_tipe',
            'deskripsi' => 'nullable|string|max:500',
            'aktif' => 'boolean',
        ]);

        $tipe = Tipe::create($validated);

        return response()->json($tipe, 201);
    }

    public function show(Tipe $tipe): JsonResponse
    {
        $tipe->load('kategori');
        $tipe->loadCount('kendaraans');

        return response()->json($tipe);
    }

    public function update(Request $request, Tipe $tipe): JsonResponse
    {
        $validated = $request->validate([
            'kategori_id' => 'nullable|exists:kategoris,id',
            'nama_tipe' => 'required|string|max:255|unique:tipes,nama_tipe,'.$tipe->id,
            'deskripsi' => 'nullable|string|max:500',
            'aktif' => 'boolean',
        ]);

        $tipe->update($validated);

        return response()->json($tipe);
    }

    public function destroy(Tipe $tipe): JsonResponse
    {
        if ($tipe->kendaraans()->count() > 0) {
            return response()->json(['message' => 'Tipe masih digunakan oleh kendaraan'], 422);
        }

        $tipe->delete();

        return response()->json(['message' => 'Tipe berhasil dihapus']);
    }
}
