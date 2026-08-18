<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Invoice {{ $order->kode_order }}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Helvetica', 'Arial', sans-serif; font-size: 11px; color: #333; line-height: 1.5; }
        .invoice { width: 100%; padding: 30px; }
        .header { display: flex; justify-content: space-between; border-bottom: 2px solid #2563eb; padding-bottom: 15px; margin-bottom: 20px; }
        .company-info h1 { font-size: 20px; color: #2563eb; margin-bottom: 5px; }
        .company-info p { font-size: 10px; color: #666; }
        .invoice-title { text-align: right; }
        .invoice-title h2 { font-size: 24px; color: #2563eb; }
        .invoice-title p { font-size: 10px; color: #666; margin-top: 5px; }
        .info-grid { display: flex; gap: 30px; margin-bottom: 20px; }
        .info-box { flex: 1; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px; }
        .info-box h3 { font-size: 10px; text-transform: uppercase; color: #94a3b8; margin-bottom: 8px; letter-spacing: 0.5px; }
        .info-box p { font-size: 11px; margin-bottom: 3px; }
        .info-box .label { color: #64748b; display: inline-block; width: 100px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        thead th { background: #2563eb; color: white; padding: 8px 12px; text-align: left; font-size: 10px; text-transform: uppercase; }
        thead th:last-child { text-align: right; }
        tbody td { padding: 8px 12px; border-bottom: 1px solid #e2e8f0; font-size: 11px; }
        tbody td:last-child { text-align: right; }
        .summary { width: 300px; margin-left: auto; }
        .summary table { margin-bottom: 0; }
        .summary .label { text-align: left; }
        .summary .value { text-align: right; font-weight: bold; }
        .summary .total-row td { background: #2563eb; color: white; font-weight: bold; font-size: 13px; padding: 10px 12px; }
        .payment-status { display: inline-block; padding: 3px 10px; border-radius: 12px; font-size: 10px; font-weight: bold; }
        .status-lunas { background: #dcfce7; color: #166534; }
        .status-dp { background: #fef9c3; color: #854d0e; }
        .status-belum { background: #fee2e2; color: #991b1b; }
        .footer { margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 15px; text-align: center; font-size: 9px; color: #94a3b8; }
        .overtime-note { background: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 10px 12px; margin-bottom: 20px; font-size: 10px; color: #991b1b; }
    </style>
</head>
<body>
    <div class="invoice">
        <div class="header">
            <div class="company-info">
                <h1>{{ $company['name'] }}</h1>
                @if($company['alamat'])<p>{{ $company['alamat'] }}</p>@endif
                @if($company['phone'])<p>Telp: {{ $company['phone'] }}</p>@endif
            </div>
            <div class="invoice-title">
                <h2>INVOICE</h2>
                <p><strong>{{ $order->kode_order }}</strong></p>
                <p>{{ $order->created_at->format('d/m/Y H:i') }}</p>
            </div>
        </div>

        <div class="info-grid">
            <div class="info-box">
                <h3>Customer</h3>
                <p><span class="label">Nama</span> {{ $order->customer->nama_lengkap ?? '-' }}</p>
                <p><span class="label">No. HP</span> {{ $order->customer->no_hp ?? '-' }}</p>
                @if($order->customer->alamat)
                    <p><span class="label">Alamat</span> {{ $order->customer->alamat }}</p>
                @endif
            </div>
            <div class="info-box">
                <h3>Kendaraan</h3>
                <p><span class="label">Kendaraan</span> {{ $order->kendaraan->nama_kendaraan ?? '-' }}</p>
                <p><span class="label">Plat</span> {{ $order->kendaraan->no_polisi ?? '-' }}</p>
                <p><span class="label">Kategori</span> {{ $order->kendaraan->kategori->nama_kategori ?? '-' }}</p>
            </div>
            <div class="info-box">
                <h3>Detail Sewa</h3>
                <p><span class="label">Tanggal Mulai</span> {{ $order->tanggal_mulai->format('d/m/Y') }}</p>
                <p><span class="label">Tanggal Selesai</span> {{ $order->tanggal_selesai->format('d/m/Y') }}</p>
                <p><span class="label">Durasi</span> {{ $order->durasi_hari }} hari</p>
                @if($order->supir)
                    <p><span class="label">Supir</span> {{ $order->supir->nama }}</p>
                @endif
            </div>
        </div>

        @if($order->jam_overtime > 0)
            <div class="overtime-note">
                ⚠ Keterlambatan pengembalian {{ $order->jam_overtime }} jam — denda overtime Rp {{ number_format((float) $order->denda_overtime, 0, ',', '.') }}
            </div>
        @endif

        @if($inspeksiPickup || $inspeksiReturn)
            <div style="margin-bottom: 20px; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px; background: #f8fafc;">
                <h3 style="font-size: 10px; text-transform: uppercase; color: #2563eb; margin-bottom: 8px;">Serah Terima Kendaraan</h3>
                @if($inspeksiPickup)
                    <div style="margin-bottom: 12px;">
                        <h4 style="font-size: 10px; text-transform: uppercase; color: #94a3b8; margin-bottom: 6px;">Awal (Pickup)</h4>
                        <table style="width: 100%; border-collapse: collapse; margin-bottom: 6px;">
                            <tr>
                                <td style="padding: 3px 6px; font-size: 10px; color: #64748b; width: 110px;">Waktu</td>
                                <td style="padding: 3px 6px; font-size: 10px;">{{ $inspeksiPickup->created_at->format('d/m/Y H:i') }}</td>
                                <td style="padding: 3px 6px; font-size: 10px; color: #64748b; width: 110px;">Odometer</td>
                                <td style="padding: 3px 6px; font-size: 10px;">{{ $inspeksiPickup->odometer ? number_format((float) $inspeksiPickup->odometer, 0, ',', '.').' km' : '-' }}</td>
                            </tr>
                            <tr>
                                <td style="padding: 3px 6px; font-size: 10px; color: #64748b;">BBM</td>
                                <td style="padding: 3px 6px; font-size: 10px;">{{ $inspeksiPickup->fuel_level }}</td>
                                <td style="padding: 3px 6px; font-size: 10px; color: #64748b;">Petugas</td>
                                <td style="padding: 3px 6px; font-size: 10px;">{{ $inspeksiPickup->inspeksi_oleh ?? $inspeksiPickup->admin?->name ?? '-' }}</td>
                            </tr>
                            <tr>
                                <td style="padding: 3px 6px; font-size: 10px; color: #64748b;">Kondisi</td>
                                <td style="padding: 3px 6px; font-size: 10px;">Body: {{ $inspeksiPickup->kondisi_body }} | Interior: {{ $inspeksiPickup->kondisi_interior }} | Ban: {{ $inspeksiPickup->kondisi_ban }} | AC: {{ $inspeksiPickup->kondisi_ac }} | Lampu: {{ $inspeksiPickup->kondisi_lampu }}</td>
                                <td style="padding: 3px 6px; font-size: 10px; color: #64748b;">Kerusakan</td>
                                <td style="padding: 3px 6px; font-size: 10px;">{{ $inspeksiPickup->ada_damagenya ? 'Ya' : 'Tidak' }}</td>
                            </tr>
                            @if($inspeksiPickup->checklist_serah_terima)
                                <tr>
                                    <td style="padding: 3px 6px; font-size: 10px; color: #64748b;">Kelengkapan</td>
                                    <td colspan="3" style="padding: 3px 6px; font-size: 10px;">{{ collect($inspeksiPickup->checklist_serah_terima)->map(fn ($k) => ['kunci' => 'Kunci', 'stnk' => 'STNK', 'kunci_roda' => 'Kunci Roda', 'dongkrak' => 'Dongkrak', 'ban_serep' => 'Ban Serep', 'ac' => 'AC'][$k] ?? $k)->implode(' | ') }}</td>
                                </tr>
                            @endif
                            @if($inspeksiPickup->deskripsi_kondisi)
                                <tr>
                                    <td style="padding: 3px 6px; font-size: 10px; color: #64748b;">Deskripsi</td>
                                    <td colspan="3" style="padding: 3px 6px; font-size: 10px;">{{ $inspeksiPickup->deskripsi_kondisi }}</td>
                                </tr>
                            @endif
                        </table>
                        @php
                            $fotoPickup = $inspeksiPickup->foto && \Illuminate\Support\Facades\Storage::disk('public')->exists($inspeksiPickup->foto)
                                ? base64_encode(\Illuminate\Support\Facades\Storage::disk('public')->get($inspeksiPickup->foto)) : null;
                            $fotoMultimediaPickup = collect($inspeksiPickup->fotos ?? [])
                                ->filter(fn ($path) => $path && \Illuminate\Support\Facades\Storage::disk('public')->exists($path))
                                ->map(fn ($path) => base64_encode(\Illuminate\Support\Facades\Storage::disk('public')->get($path)));
                            $ttdPickup = $inspeksiPickup->ttd_customer && \Illuminate\Support\Facades\Storage::disk('public')->exists($inspeksiPickup->ttd_customer)
                                ? base64_encode(\Illuminate\Support\Facades\Storage::disk('public')->get($inspeksiPickup->ttd_customer)) : null;
                        @endphp
                        @foreach($fotoMultimediaPickup as $fotoMultimedia)
                            <img src="data:image/jpeg;base64,{{ $fotoMultimedia }}" style="max-width: 160px; max-height: 110px; border-radius: 4px; margin-right: 8px;" />
                        @endforeach
                        @if($fotoPickup)
                            <img src="data:image/jpeg;base64,{{ $fotoPickup }}" style="max-width: 160px; max-height: 110px; border-radius: 4px; margin-right: 8px;" />
                        @endif
                        @if($ttdPickup)
                            <img src="data:image/jpeg;base64,{{ $ttdPickup }}" style="max-width: 140px; max-height: 80px; border-radius: 4px;" />
                        @endif
                    </div>
                @endif

                @if($inspeksiReturn)
                    <div>
                        <h4 style="font-size: 10px; text-transform: uppercase; color: #94a3b8; margin-bottom: 6px;">Akhir (Return)</h4>
                        <table style="width: 100%; border-collapse: collapse; margin-bottom: 6px;">
                            <tr>
                                <td style="padding: 3px 6px; font-size: 10px; color: #64748b; width: 110px;">Waktu</td>
                                <td style="padding: 3px 6px; font-size: 10px;">{{ $inspeksiReturn->created_at->format('d/m/Y H:i') }}</td>
                                <td style="padding: 3px 6px; font-size: 10px; color: #64748b; width: 110px;">Odometer</td>
                                <td style="padding: 3px 6px; font-size: 10px;">{{ $inspeksiReturn->odometer ? number_format((float) $inspeksiReturn->odometer, 0, ',', '.').' km' : '-' }}</td>
                            </tr>
                            <tr>
                                <td style="padding: 3px 6px; font-size: 10px; color: #64748b;">BBM</td>
                                <td style="padding: 3px 6px; font-size: 10px;">{{ $inspeksiReturn->fuel_level }}</td>
                                <td style="padding: 3px 6px; font-size: 10px; color: #64748b;">Petugas</td>
                                <td style="padding: 3px 6px; font-size: 10px;">{{ $inspeksiReturn->inspeksi_oleh ?? $inspeksiReturn->admin?->name ?? '-' }}</td>
                            </tr>
                            <tr>
                                <td style="padding: 3px 6px; font-size: 10px; color: #64748b;">Kondisi</td>
                                <td style="padding: 3px 6px; font-size: 10px;">Body: {{ $inspeksiReturn->kondisi_body }} | Interior: {{ $inspeksiReturn->kondisi_interior }} | Ban: {{ $inspeksiReturn->kondisi_ban }} | AC: {{ $inspeksiReturn->kondisi_ac }} | Lampu: {{ $inspeksiReturn->kondisi_lampu }}</td>
                                <td style="padding: 3px 6px; font-size: 10px; color: #64748b;">Kerusakan</td>
                                <td style="padding: 3px 6px; font-size: 10px;">{{ $inspeksiReturn->ada_damagenya ? 'Ya' : 'Tidak' }}</td>
                            </tr>
                            @if($inspeksiReturn->checklist_serah_terima)
                                <tr>
                                    <td style="padding: 3px 6px; font-size: 10px; color: #64748b;">Kelengkapan</td>
                                    <td colspan="3" style="padding: 3px 6px; font-size: 10px;">{{ collect($inspeksiReturn->checklist_serah_terima)->map(fn ($k) => ['kunci' => 'Kunci', 'stnk' => 'STNK', 'kunci_roda' => 'Kunci Roda', 'dongkrak' => 'Dongkrak', 'ban_serep' => 'Ban Serep', 'ac' => 'AC'][$k] ?? $k)->implode(' | ') }}</td>
                                </tr>
                            @endif
                            @if($inspeksiReturn->deskripsi_kondisi)
                                <tr>
                                    <td style="padding: 3px 6px; font-size: 10px; color: #64748b;">Deskripsi</td>
                                    <td colspan="3" style="padding: 3px 6px; font-size: 10px;">{{ $inspeksiReturn->deskripsi_kondisi }}</td>
                                </tr>
                            @endif
                        </table>
                        @php
                            $fotoReturn = $inspeksiReturn->foto && \Illuminate\Support\Facades\Storage::disk('public')->exists($inspeksiReturn->foto)
                                ? base64_encode(\Illuminate\Support\Facades\Storage::disk('public')->get($inspeksiReturn->foto)) : null;
                            $fotoMultimediaReturn = collect($inspeksiReturn->fotos ?? [])
                                ->filter(fn ($path) => $path && \Illuminate\Support\Facades\Storage::disk('public')->exists($path))
                                ->map(fn ($path) => base64_encode(\Illuminate\Support\Facades\Storage::disk('public')->get($path)));
                            $ttdReturn = $inspeksiReturn->ttd_customer && \Illuminate\Support\Facades\Storage::disk('public')->exists($inspeksiReturn->ttd_customer)
                                ? base64_encode(\Illuminate\Support\Facades\Storage::disk('public')->get($inspeksiReturn->ttd_customer)) : null;
                        @endphp
                        @foreach($fotoMultimediaReturn as $fotoMultimedia)
                            <img src="data:image/jpeg;base64,{{ $fotoMultimedia }}" style="max-width: 160px; max-height: 110px; border-radius: 4px; margin-right: 8px;" />
                        @endforeach
                        @if($fotoReturn)
                            <img src="data:image/jpeg;base64,{{ $fotoReturn }}" style="max-width: 160px; max-height: 110px; border-radius: 4px; margin-right: 8px;" />
                        @endif
                        @if($ttdReturn)
                            <img src="data:image/jpeg;base64,{{ $ttdReturn }}" style="max-width: 140px; max-height: 80px; border-radius: 4px;" />
                        @endif
                    </div>
                @endif
            </div>
        @endif

        <table>
            <thead>
                <tr>
                    <th>Deskripsi</th>
                    <th>Qty</th>
                    <th>Harga</th>
                    <th>Subtotal</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>Sewa {{ $order->kendaraan->nama_kendaraan ?? '-' }}</td>
                    <td>{{ $order->durasi_hari }} hari</td>
                    <td>Rp {{ number_format((float) $order->harga_per_hari, 0, ',', '.') }}</td>
                    <td>Rp {{ number_format((float) $order->harga_per_hari * $order->durasi_hari, 0, ',', '.') }}</td>
                </tr>
                @if($order->supir)
                    <tr>
                        <td>Biaya Supir</td>
                        <td>{{ $order->durasi_hari }} hari</td>
                        <td>Rp {{ number_format((float) ($order->supir->tarif_per_hari ?? 0), 0, ',', '.') }}</td>
                        <td>Rp {{ number_format((float) ($order->supir->tarif_per_hari ?? 0) * $order->durasi_hari, 0, ',', '.') }}</td>
                    </tr>
                @endif
                @if($order->jam_overtime > 0)
                    <tr>
                        <td>Denda Keterlambatan</td>
                        <td>{{ $order->jam_overtime }} jam</td>
                        <td>Rp {{ number_format((float) Setting::get('overtime_rate_per_hour', 25000), 0, ',', '.') }}</td>
                        <td>Rp {{ number_format((float) $order->denda_overtime, 0, ',', '.') }}</td>
                    </tr>
                @endif
                @if($order->biaya_kerusakan > 0)
                    <tr>
                        <td>Biaya Kerusakan</td>
                        <td>1</td>
                        <td>Rp {{ number_format((float) $order->biaya_kerusakan, 0, ',', '.') }}</td>
                        <td>Rp {{ number_format((float) $order->biaya_kerusakan, 0, ',', '.') }}</td>
                    </tr>
                @endif
            </tbody>
        </table>

        <div class="summary">
            <table>
                <tbody>
                    <tr>
                        <td class="label">Metode Pembayaran</td>
                        <td class="value">{{ ucfirst(str_replace('_', ' ', $order->metode_pembayaran ?? '-')) }}</td>
                    </tr>
                    <tr>
                        <td class="label">Status Pembayaran</td>
                        <td class="value">
                            @if($order->status_pembayaran === 'lunas')
                                <span class="payment-status status-lunas">LUNAS</span>
                            @elseif($order->status_pembayaran === 'dp')
                                <span class="payment-status status-dp">DP</span>
                            @else
                                <span class="payment-status status-belum">BELUM BAYAR</span>
                            @endif
                        </td>
                    </tr>
                    <tr class="total-row">
                        <td class="label">TOTAL</td>
                        <td class="value">Rp {{ number_format((float) ($order->harga_total + ($order->biaya_kerusakan ?? 0)), 0, ',', '.') }}</td>
                    </tr>
                </tbody>
            </table>
        </div>

        @if($order->pembayarans->count())
            <div style="margin-top: 20px;">
                <h3 style="font-size: 10px; text-transform: uppercase; color: #94a3b8; margin-bottom: 8px;">Riwayat Pembayaran</h3>
                <table>
                    <thead>
                        <tr>
                            <th>Tanggal</th>
                            <th>Metode</th>
                            <th>Status</th>
                            <th>Jumlah</th>
                        </tr>
                    </thead>
                    <tbody>
                        @foreach($order->pembayarans as $bayar)
                            <tr>
                                <td>{{ $bayar->created_at->format('d/m/Y H:i') }}</td>
                                <td>{{ ucfirst(str_replace('_', ' ', $bayar->metode_pembayaran)) }}</td>
                                <td>{{ ucfirst($bayar->status) }}</td>
                                <td>Rp {{ number_format((float) $bayar->jumlah, 0, ',', '.') }}</td>
                            </tr>
                        @endforeach
                    </tbody>
                </table>
            </div>
        @endif

        <div class="footer">
            <p>Terima kasih atas kepercayaan Anda menggunakan layanan {{ $company['name'] }}.</p>
            <p>Invoice ini dicetak secara otomatis oleh sistem.</p>
        </div>
    </div>
</body>
</html>
