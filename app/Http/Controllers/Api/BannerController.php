<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Banner;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class BannerController extends Controller
{
    public function indexPublic(): JsonResponse
    {
        $banners = Banner::where('aktif', true)
            ->orderBy('urutan')
            ->orderBy('id')
            ->get();

        return response()->json($banners);
    }

    public function index(): JsonResponse
    {
        $banners = Banner::orderBy('urutan')->orderBy('id')->get();

        return response()->json($banners);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'judul' => 'nullable|string|max:255',
            'subjudul' => 'nullable|string|max:255',
            'gambar' => 'required|image|max:5120',
            'tautan' => 'nullable|string|max:500',
            'tombol_label' => 'nullable|string|max:100',
            'urutan' => 'nullable|integer|min:0',
            'aktif' => 'nullable|boolean',
        ]);

        $validated['gambar'] = $request->file('gambar')->store('banners', 'public');
        $validated['urutan'] = $validated['urutan'] ?? Banner::max('urutan') + 1;
        $validated['aktif'] = $validated['aktif'] ?? true;

        $banner = Banner::create($validated);

        return response()->json($banner, 201);
    }

    public function update(Request $request, Banner $banner): JsonResponse
    {
        $validated = $request->validate([
            'judul' => 'sometimes|nullable|string|max:255',
            'subjudul' => 'sometimes|nullable|string|max:255',
            'gambar' => 'nullable|image|max:5120',
            'hapus_gambar' => 'nullable|boolean',
            'tautan' => 'sometimes|nullable|string|max:500',
            'tombol_label' => 'sometimes|nullable|string|max:100',
            'urutan' => 'sometimes|integer|min:0',
            'aktif' => 'sometimes|boolean',
        ]);

        if ($request->hasFile('gambar')) {
            if ($banner->gambar) {
                Storage::disk('public')->delete($banner->gambar);
            }
            $validated['gambar'] = $request->file('gambar')->store('banners', 'public');
        } elseif (! empty($validated['hapus_gambar']) && $banner->gambar) {
            Storage::disk('public')->delete($banner->gambar);
            $validated['gambar'] = null;
        }

        unset($validated['hapus_gambar']);

        $banner->update($validated);

        return response()->json($banner);
    }

    public function destroy(Banner $banner): JsonResponse
    {
        if ($banner->gambar) {
            Storage::disk('public')->delete($banner->gambar);
        }

        $banner->delete();

        return response()->json(['message' => 'Banner berhasil dihapus']);
    }

    public function toggle(Banner $banner): JsonResponse
    {
        $banner->update(['aktif' => ! $banner->aktif]);

        return response()->json($banner);
    }
}
