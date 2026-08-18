# Flowchart — Alur Order (UDIN RENCTCAR)

Diagram alur lengkap order dari pemesanan hingga penyelesaian/pembatalan,
termasuk titik-titik keputusan dan otomasi sistem.

```mermaid
flowchart TD
    S([Mulai]) --> P1["Pemesanan:<br/>Katalog publik / buat manual (admin)"]
    P1 --> D1{"Kendaraan tersedia<br/>& jadwal tidak overlap?"}
    D1 -- Tidak --> E1([Order ditolak / tunda])
    D1 -- Ya --> P2["STATUS: pending"]
    P2 --> D2{"Dikonfirmasi admin<br/>≤ 24 jam?<br/>(scheduler tiap menit)"}
    D2 -- Lewat --> E2([STATUS: cancelled<br/>kadaluarsa])
    D2 -- Ya --> P3["STATUS: confirmed"]
    P3 --> D3{"Wajib bayar<br/>sebelum antar?"}
    D3 -- Tidak --> P5
    D3 -- Ya --> P4["Pembayaran / DP<br/>unpaid => partial => paid"]
    P4 --> D4{"Lunas?"}
    D4 -- Belum --> P4b["Pengingat WA tagihan (09:00)"] --> P4
    D4 -- Ya --> P5["Penyerahan kendaraan"]
    P5 --> P6["Inspeksi penyerahan:<br/>Kirim => bukti foto kirim<br/>Pickup => serah terima"]
    P6 --> P7["STATUS: active<br/>Kendaraan: disewa"]
    P7 --> D5{"Melewati batas waktu?<br/>(tanggal_mulai + durasi<br/>+ jam_selesai)"}
    D5 -- Tidak --> P8["Pengingat H-1 WA (08:00)"]
    P8 --> P9["Pengembalian:<br/>inspeksi akhir + bukti<br/>foto + tanda tangan"]
    P9 --> P10["STATUS: sudah_dikembalikan"]
    P10 --> D6{"Inspeksi lengkap &<br/>pembayaran lunas?"}
    D6 -- Belum --> P10
    D6 -- Ya --> P11["Selesaikan order:<br/>hitung denda overtime / refund"]
    P11 --> E3([STATUS: completed<br/>Kendaraan kembali tersedia])
    D5 -- Ya (terlambat) --> D7{"> batas + 24 jam?<br/>(auto_verify_after_hours)"}
    D7 -- Belum --> P9
    D7 -- Ya --> P12["STATUS: perlu_verifikasi<br/>(denda dibekukan) + WA owner"]
    P12 --> D8{"Admin selesaikan?"}
    D8 -- Ya --> P11
    D8 -- Tidak --> P13["Auto-complete<br/>(> 72 jam)<br/>(auto_complete_after_hours)"]
    P13 --> E4([STATUS: completed<br/>otomatis])
    P3 -.-> BAT["Batalkan order<br/>(biaya 0 / 25 / 50 / 100%)"]
    P7 -.-> BAT
    BAT --> E5([STATUS: cancelled])
```

## Catatan Alur

- **Kadaluarsa pending**: scheduler `OrderExpirePending` tiap menit; pending yang
  jadwal mulainya lewat > `pending_expire_hours` (default 24 jam) → `cancelled`.
- **Freeze terlambat**: scheduler `OrderVerifyOverdue` tiap 15 menit; order `active`
  lewat batas + > `auto_verify_after_hours` (default 24 jam) → `perlu_verifikasi`
  (denda dibekukan, WA ke owner).
- **Auto-complete**: `perlu_verifikasi` menunggu > `auto_complete_after_hours`
  (default 72 jam) → `completed` otomatis.
- **Pembatalan**: biaya 0% (> 7 hari), 25% (3–7 hari), 50% (1–3 hari), 100% (hari H/aktif).
- **Batas waktu kembali**: `tanggal_mulai + durasi_hari + jam_selesai` (bukan dari
  `tanggal_selesai`).