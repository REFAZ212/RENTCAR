<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Kategori;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class KategoriController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Kategori::withCount('kendaraans')
            ->with(['tipes' => function ($q) {
                $q->withCount('kendaraans')->orderBy('nama_tipe');
            }]);

        if ($request->has('aktif') && $request->aktif !== null) {
            $query->where('aktif', $request->boolean('aktif'));
        }

        $kategoris = $query->orderBy('nama_kategori')->get();

        return response()->json($kategoris);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'nama_kategori' => 'required|string|max:255|unique:kategoris,nama_kategori',
            'deskripsi' => 'nullable|string|max:500',
            'aktif' => 'boolean',
        ]);

        $kategori = Kategori::create($validated);

        return response()->json($kategori, 201);
    }

    public function show(Kategori $kategori): JsonResponse
    {
        $kategori->loadCount('kendaraans');

        return response()->json($kategori);
    }

    public function update(Request $request, Kategori $kategori): JsonResponse
    {
        $validated = $request->validate([
            'nama_kategori' => 'required|string|max:255|unique:kategoris,nama_kategori,'.$kategori->id,
            'deskripsi' => 'nullable|string|max:500',
            'aktif' => 'boolean',
        ]);

        $kategori->update($validated);

        return response()->json($kategori);
    }

    public function destroy(Kategori $kategori): JsonResponse
    {
        if ($kategori->kendaraans()->count() > 0) {
            return response()->json(['message' => 'Kategori masih digunakan oleh kendaraan'], 422);
        }

        $kategori->delete();

        return response()->json(['message' => 'Kategori berhasil dihapus']);
    }
}
