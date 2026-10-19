# UDIN RENCTCAR

Sistem manajemen garasi & rental kendaraan. Backend Laravel sebagai API,
dengan dua antarmuka: SPA React (UI utama) dan aplikasi mobile Flutter untuk
supir.

## Komponen

| Komponen | Teknologi | Lokasi |
|---|---|---|
| API backend | Laravel 13.8 (PHP 8.3+), Sanctum token auth | root |
| UI web (SPA) | React 19 + Vite + React Router v7 | `frontend/` |
| Aplikasi supir | Flutter | `mobile/` |
| Database | MySQL 8.x (default) atau SQLite | `database/` |

## Menjalankan

Ringkasan singkat:

```bash
composer setup   # install dependency, siapkan .env, migrasi, build frontend
composer dev      # jalankan server, queue, scheduler, dan Vite sekaligus
```

Panduan lengkap (persyaratan, setup manual, konfigurasi database, testing,
dan troubleshooting) ada di **[`CARA_MENJALANKAN.md`](./CARA_MENJALANKAN.md)**.

- UI web (dev): `http://localhost:5173`
- API (dev): `http://localhost:8000`

## Dokumentasi

| Dokumen | Isi |
|---|---|
| [`CARA_MENJALANKAN.md`](./CARA_MENJALANKAN.md) | Cara menjalankan & setup sistem. |
| [`AGENTS.md`](./AGENTS.md) | Arsitektur, konvensi, dan catatan penting untuk kontributor/AI agent. |
| [`LAPORAN_IMPLEMENTASI_BACKEND.md`](./LAPORAN_IMPLEMENTASI_BACKEND.md) | Rincian implementasi backend per modul. |
| [`CHANGES.md`](./CHANGES.md) | Riwayat bug fix, perbaikan UX, dan pengamanan data. |
| [`docs/SRS.md`](./docs/SRS.md) | Software Requirements Specification (FR/BR formal). |
| [`docs/flowchart-order.md`](./docs/flowchart-order.md) | Diagram alur order. |
| [`docs/use-case-order.md`](./docs/use-case-order.md) | Use case & otomasi scheduler alur order. |

## Testing & Kualitas Kode

```bash
composer test                          # PHPUnit (in-memory SQLite)
./vendor/bin/pint                      # format PHP
cd frontend && npm run lint            # oxlint
cd frontend && npx tsc --noEmit        # type-check TypeScript
```
