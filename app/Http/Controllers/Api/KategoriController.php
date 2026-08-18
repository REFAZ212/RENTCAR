<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Kategori;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class KategoriController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Kategori::class);

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
        $this->authorize('create', Kategori::class);

        $request->merge([
            'nama_kategori' => (string) preg_replace('/\s+/', ' ', trim((string) $request->input('nama_kategori'))),
        ]);

        $validated = $request->validate([
            'nama_kategori' => 'required|string|max:255|unique:kategoris,nama_kategori',
            'deskripsi' => 'nullable|string|max:500',
            'aktif' => 'boolean',
            'tipes' => 'nullable|array',
            'tipes.*' => 'required|string|max:255',
        ]);

        $tipes = array_values(array_unique(array_filter(array_map(
            fn ($nama) => (string) preg_replace('/\s+/', ' ', trim((string) $nama)),
            $validated['tipes'] ?? [],
        ), fn ($nama) => $nama !== '')));

        unset($validated['tipes']);

        $kategori = DB::transaction(function () use ($validated, $tipes) {
            $kategori = Kategori::create($validated);

            foreach ($tipes as $nama) {
                $kategori->tipes()->create([
                    'nama_tipe' => $nama,
                    'aktif' => true,
                ]);
            }

            return $kategori;
        });

        return response()->json($kategori->load('tipes'), 201);
    }

    public function show(Kategori $kategori): JsonResponse
    {
        $this->authorize('view', $kategori);

        $kategori->loadCount('kendaraans');

        return response()->json($kategori);
    }

    public function update(Request $request, Kategori $kategori): JsonResponse
    {
        $this->authorize('update', $kategori);

        if ($request->has('nama_kategori')) {
            $request->merge([
                'nama_kategori' => (string) preg_replace('/\s+/', ' ', trim((string) $request->input('nama_kategori'))),
            ]);
        }

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
        $this->authorize('delete', $kategori);

        if ($kategori->kendaraans()->count() > 0) {
            return response()->json(['message' => 'Kategori masih digunakan oleh kendaraan'], 422);
        }

        if ($kategori->tipes()->count() > 0) {
            return response()->json(['message' => 'Kategori masih memiliki tipe. Hapus atau pindahkan tipe terlebih dahulu.'], 422);
        }

        $kategori->delete();

        return response()->json(['message' => 'Kategori berhasil dihapus']);
    }
}
