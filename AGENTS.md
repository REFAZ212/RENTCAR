# AGENTS.md

## Project Overview

**CVPILAR** — a garage/vehicle management system (Indonesian domain). Laravel 13.8 API backend + separate React 19 SPA frontend.

## Architecture

Two independent frontends share the same Laravel API:

- **Root (`/`)**: Laravel Blade app with Vite for asset bundling. The root route redirects to `http://localhost:5173` (the Vite dev server). Routes in `routes/web.php`.
- **`frontend/`**: React 19 SPA (Vite + React Router DOM v7). This is the main UI. Has its own `package.json`, `vite.config.ts`, and `node_modules/`.

**API**: `routes/api.php` — all routes under `/api`. Sanctum token auth (24h expiration, set in `config/sanctum.php`). Controllers in `app/Http/Controllers/Api/`. Domain models in `app/Models/`:
`Customer`, `GarasiPartner`, `GarasiRequest`, `Kategori`, `Kendaraan`, `Order`, `SupirCalo`, `Tipe`, `WhatsappLog`, `User`.

Public (unauthenticated) API routes: `POST /api/login` (throttled 10/min), `GET /api/katalog/*`.

Public Blade routes (`routes/web.php`): `GET/POST /garasi/{token}` — token-based garage response form via `GarasiResponseController`.

**Database**: `.env.example` defaults to MySQL (`DB_CONNECTION=mysql`, database `cvpilar`). Migrations in `database/migrations/`.

**Frontend API layer** (`frontend/src/services/api.ts`): axios with Bearer token from `localStorage`. Auto-redirects to `/login` on 401. File uploads use `FormData` (Content-Type header is stripped automatically). File updates use method spoofing: POST with `_method=PUT` (Laravel can't handle PUT + multipart).

**Export deps**: `phpoffice/phpspreadsheet` + `openspout/openspout` for Excel/CSV export in Laporan.

**Business logic**: `app/Services/OvertimeCalculator.php` — calculates late-return penalties (second-precision, ceil to full hour blocks). Rate and grace period are **database-configurable** via `settings` table (`overtime_rate_per_hour`, `grace_period_minutes`); defaults are 25000 and 0. `Order` model has computed accessors `jam_overtime_saat_ini` and `denda_overtime_saat_ini` that recalculate on every response for active orders. Final values stored in `jam_overtime`/`denda_overtime` columns when order is completed via `Order::selesaikanSewa()`.

Rental duration (`durasi_hari`) is a **billing value**: `ceil(rental hours / 24)` where rental hours = `tanggal_selesai @ jam_selesai − tanggal_mulai @ jam_mulai` (jam defaults 08:00/17:00 when omitted). Same formula on both frontend preview (`Orders.tsx` `durasiHari`/`editDurasi`) and backend (`OrderService` create & update). Return deadline (`batasWaktuKembali()`) is `tanggal_selesai` @ `jam_selesai` (fallback 23:59) — NOT `tanggal_mulai + durasi_hari`, since `durasi_hari` is rounded-up billing days, not a calendar-day delta.

**Order completion lock**: An order can only be set to `completed` (`OrderService` update; 422 otherwise) when the **latest** `jenis=return` inspeksi exists AND has both `ttd_customer` and `ttd_petugas` set. Return inspeksi is created with both TTDs required via `kembalikanKendaraan` (task Return), and `store()` also requires both TTDs for `jenis=return` (pickup drafts stay TTD-less until phase 2). Frontend mirrors the lock: `Orders.tsx` `cekInspeksiReturn()` fetches `inspeksiAPI.byOrder()` and checks the latest return inspeksi; the row-level "Selesai/Selesaikan" buttons are visually locked (lock icon + tooltip) until `status_pengiriman === 'sudah_dikembalikan'` (proxy; the modal check is authoritative). Admin fix path for a final inspeksi with missing/wrong TTD: `POST /inspeksi-kendaraans/{inspeksi}/perbaiki-ttd` (`InspeksiKendaraanController::perbaikiTtd`, policy `perbaikiTtd` = admin roles only) — replaces only TTD images, never touches other inspeksi data; exposed in `Inspeksi.tsx` as the "Perbaiki Tanda Tangan" row action (admin only). `bukti_pengembalian` on the order is **legacy/optional**: its upload was removed from the Selesaikan Order modal (duplicate of return-inspeksi photos/video), the server still accepts/stores it (nullable validation) and the detail modals still display historical values — do not re-require it client-side.

**Timezone**: `Asia/Jakarta` (set in `config/app.php`) — all overtime calculations are server-side.

## Commands

### Full setup (from scratch)

```bash
composer setup
```
Installs deps, creates `.env` (from `.env.example`), generates app key, runs migrations, installs npm, builds frontend.

### Development servers

```bash
composer dev
```
Runs 3 processes concurrently via `npx concurrently`: `php artisan serve` (HTTP on `:8000`), `queue:listen`, and `npm run dev` in `frontend/`. No `pail` — logs go to stderr/console. **Windows-specific**: the `cmd /c` wrapper in the composer script only works on Windows.

For the React SPA only:
```bash
cd frontend && npm run dev
```
Vite dev server on port 5173, proxies `/api` and `/storage` to `http://127.0.0.1:8000`.

### Testing

```bash
composer test
```
Clears config cache, then runs `php artisan test`. PHPUnit with in-memory SQLite (`phpunit.xml` sets `DB_DATABASE=:memory:`) — ignores whatever `.env` says. Test suites: `tests/Unit/`, `tests/Feature/`.

To run a single test:
```bash
php artisan test --filter=ExampleTest
```

### Linting & Formatting

**PHP**: `laravel/pint` (dev dependency). Run via:
```bash
./vendor/bin/pint
```

**React/JS**: `oxlint` (not ESLint). Config in `frontend/.oxlintrc.json`. Run via:
```bash
cd frontend && npm run lint
```

**TypeScript**: `frontend/tsconfig.json` exists (`strict: false`, `noEmit: true`). Type-check via:
```bash
cd frontend && npx tsc --noEmit
```
Vite processes TS via esbuild for builds — TypeScript errors won't block the dev server or build, only `tsc --noEmit`.

### Build

```bash
npm run build              # Root Laravel Vite build
cd frontend && npm run build  # React SPA build
```

## Key Conventions

- **PHP 8.3+** required
- **Tailwind CSS v4** used in both root and frontend (via `@tailwindcss/vite` plugin) — CSS-first config, no `tailwind.config.js`
- **Sanctum** for API auth (Bearer tokens stored in `localStorage`)
- **Indonesian domain terminology** in models/routes: `garasi` (garage), `kendaraan` (vehicle)
- **PHPUnit** always uses `:memory:` SQLite regardless of `.env` — no external DB needed for tests
- **Root Vite config** ignores `storage/framework/views/` from file watching
- **4-space indentation**, LF line endings enforced (`.editorconfig`, `.gitattributes`)
- **Controller update validation** uses `sometimes|required` — partial updates are allowed (e.g. status-only changes don't need all fields)

## Gotchas

- The root `npm run dev` and `frontend/npm run dev` are **different** apps. The root serves Blade assets; `frontend/` is the React SPA.
- `composer dev` starts the Laravel server on `:8000`. The React SPA proxies to that port.
- Migrations use timestamped filenames — check `database/migrations/` for the actual schema.
- No CI workflows, no pre-commit hooks, no Docker config in the repo.
- `.npmrc` sets `ignore-scripts=true` — postinstall hooks (e.g. native builds) are skipped during `npm install`.
- `.gitattributes` enforces LF line endings (`* text=auto eol=lf`).
- `composer test` clears config cache before running tests — if you run `php artisan test` directly without clearing, cached config may cause unexpected behavior.
- `inertiajs/inertia-laravel` is in `composer.json` require but **unused** — the project uses a standalone React SPA with Sanctum token auth, not Inertia.
- The `README.md` is stock Laravel boilerplate and does not describe this project. Real docs are in `CARA_MENJALANKAN.md` (Indonesian).
- Seeders create 3 users (Admin Utama, Petugas 1, Petugas 2) — all with password `password`.
- Scheduled command `garasi:check-timeout` runs every minute, marking expired garage requests as `tidak_terjawab`.
- Several API controllers return raw arrays (not wrapped in `{ data: [...] }`). Frontend casts directly: `data as unknown as T[]` instead of `data.data`.
- Frontend has no `typecheck` npm script — run `npx tsc --noEmit` manually if you need type verification.
