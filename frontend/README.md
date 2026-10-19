# UDIN RENCTCAR — Frontend (React SPA)

Antarmuka web utama sistem UDIN RENCTCAR. React 19 + Vite + React Router DOM v7.

## Menjalankan

```bash
npm install
npm run dev     # Vite dev server di http://localhost:5173
```

Dev server mem-proxy `/api` dan `/storage` ke backend Laravel di
`http://127.0.0.1:8000` (jalankan `php artisan serve` di root repo).

## Perintah lain

```bash
npm run build   # build produksi (output: dist/)
npm run lint    # oxlint
npx tsc --noEmit  # type-check TypeScript
```

Dokumentasi proyek lengkap ada di [`../CARA_MENJALANKAN.md`](../CARA_MENJALANKAN.md)
dan [`../AGENTS.md`](../AGENTS.md).
