<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Konfirmasi Ketersediaan — {{ $garasiRequest->garasiPartner->nama_garasi }}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
        .fade-in { animation: fadeIn 0.3s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
    </style>
</head>
<body class="bg-gray-50 min-h-screen">
    <div class="max-w-lg mx-auto px-4 py-8">

        {{-- Header --}}
        <div class="text-center mb-6">
            <div class="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <svg class="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
            </div>
            <h1 class="text-xl font-bold text-gray-900">Konfirmasi Ketersediaan</h1>
            <p class="text-sm text-gray-500 mt-1">{{ $garasiRequest->garasiPartner->nama_garasi }}</p>
        </div>

        {{-- Already Answered --}}
        @if (!empty($alreadyAnswered))
            <div class="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 fade-in text-center">
                <div class="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg class="w-7 h-7 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                </div>
                <h2 class="text-lg font-semibold text-gray-700 mb-2">Sudah Dijawab</h2>
                <p class="text-sm text-gray-500">
                    Permintaan ini sudah dijawab sebelumnya dengan status:
                    <span class="font-semibold {{ $garasiRequest->status_permintaan === 'tersedia' ? 'text-green-600' : 'text-red-500' }}">
                        {{ $garasiRequest->status_permintaan === 'tersedia' ? 'Tersedia' : 'Tidak Tersedia' }}
                    </span>
                </p>
            </div>

        {{-- Expired --}}
        @elseif (!empty($expired))
            <div class="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 fade-in text-center">
                <div class="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg class="w-7 h-7 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                </div>
                <h2 class="text-lg font-semibold text-gray-700 mb-2">Sudah Lewat Waktu</h2>
                <p class="text-sm text-gray-500">Batas waktu untuk merespermintaan ini sudah berakhir.</p>
            </div>

        {{-- Submitted Successfully --}}
        @elseif (!empty($submitted))
            <div class="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 fade-in text-center">
                <div class="w-14 h-14 {{ $garasiRequest->status_permintaan === 'tersedia' ? 'bg-green-100' : 'bg-red-100' }} rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg class="w-7 h-7 {{ $garasiRequest->status_permintaan === 'tersedia' ? 'text-green-600' : 'text-red-500' }}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                    </svg>
                </div>
                <h2 class="text-lg font-semibold text-gray-700 mb-2">
                    {{ $garasiRequest->status_permintaan === 'tersedia' ? 'Kendaraan Tersedia' : 'Kendaraan Tidak Tersedia' }}
                </h2>
                <p class="text-sm text-gray-500">Terima kasih telah merespons. Admin akan segera memproses.</p>
            </div>

        {{-- Form --}}
        @else
            <form method="POST" action="{{ route('garasi-response.submit', $token) }}" class="space-y-4 fade-in">
                @csrf

                {{-- Order Info --}}
                <div class="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
                    <h2 class="text-sm font-semibold text-gray-900 mb-3">Detail Pesanan</h2>
                    <div class="space-y-2.5">
                        <div class="flex justify-between text-sm">
                            <span class="text-gray-500">Kendaraan</span>
                            <span class="font-medium text-gray-900">{{ $garasiRequest->order->kendaraan->merek ?? '-' }} {{ $garasiRequest->order->kendaraan->model_kendaraan ?? '' }}</span>
                        </div>
                        <div class="flex justify-between text-sm">
                            <span class="text-gray-500">Plat Nomor</span>
                            <span class="font-medium text-gray-900">{{ $garasiRequest->order->kendaraan->plat_nomor ?? '-' }}</span>
                        </div>
                        <div class="flex justify-between text-sm">
                            <span class="text-gray-500">Tanggal Mulai</span>
                            <span class="font-medium text-gray-900">{{ $garasiRequest->order->tanggal_mulai ? \Carbon\Carbon::parse($garasiRequest->order->tanggal_mulai)->translatedFormat('d M Y') : '-' }}</span>
                        </div>
                        <div class="flex justify-between text-sm">
                            <span class="text-gray-500">Tanggal Selesai</span>
                            <span class="font-medium text-gray-900">{{ $garasiRequest->order->tanggal_selesai ? \Carbon\Carbon::parse($garasiRequest->order->tanggal_selesai)->translatedFormat('d M Y') : '-' }}</span>
                        </div>
                        <div class="flex justify-between text-sm">
                            <span class="text-gray-500">Durasi</span>
                            <span class="font-medium text-gray-900">{{ $garasiRequest->order->durasi_hari ?? '-' }} hari</span>
                        </div>
                    </div>
                </div>

                {{-- Radio Buttons --}}
                <div class="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
                    <h2 class="text-sm font-semibold text-gray-900 mb-3">Ketersediaan Kendaraan</h2>
                    <div class="space-y-3">
                        <label class="flex items-center gap-3 p-3.5 border-2 rounded-xl cursor-pointer transition-all has-[:checked]:border-green-500 has-[:checked]:bg-green-50 border-gray-200 hover:border-gray-300">
                            <input type="radio" name="status" value="tersedia" required
                                class="w-5 h-5 text-green-600 border-gray-300 focus:ring-green-500">
                            <div>
                                <div class="text-sm font-semibold text-gray-900">Tersedia</div>
                                <div class="text-xs text-gray-500">Kendaraan bisa dipenuhi</div>
                            </div>
                        </label>
                        <label class="flex items-center gap-3 p-3.5 border-2 rounded-xl cursor-pointer transition-all has-[:checked]:border-red-500 has-[:checked]:bg-red-50 border-gray-200 hover:border-gray-300">
                            <input type="radio" name="status" value="tidak_terjawab" required
                                class="w-5 h-5 text-red-600 border-gray-300 focus:ring-red-500">
                            <div>
                                <div class="text-sm font-semibold text-gray-900">Tidak Tersedia</div>
                                <div class="text-xs text-gray-500">Kendaraan tidak bisa dipenuhi</div>
                            </div>
                        </label>
                    </div>
                </div>

                {{-- Catatan --}}
                <div class="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
                    <label for="catatan_garasi" class="text-sm font-semibold text-gray-900 block mb-2">Catatan <span class="text-gray-400 font-normal">(opsional)</span></label>
                    <textarea name="catatan_garasi" id="catatan_garasi" rows="3" maxlength="500"
                        placeholder="Contoh: kendaraan sedang servis, estimasi available tanggal..."
                        class="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none placeholder:text-gray-400"></textarea>
                </div>

                {{-- Submit --}}
                <button type="submit"
                    class="w-full py-3.5 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 active:scale-[0.98] transition-all shadow-sm">
                    Kirim Respons
                </button>

                <p class="text-xs text-gray-400 text-center">
                    Batas waktu: {{ $garasiRequest->deadline ? $garasiRequest->deadline->translatedFormat('d M Y, H:i') : 'Tidak terbatas' }} WIB
                </p>
            </form>
        @endif
    </div>
</body>
</html>
