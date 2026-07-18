# AGENTS.md

## Project Overview

**CVPILAR** — a garage/vehicle management system (Indonesian domain). Laravel 13.8 API backend + separate React 19 SPA frontend.

## Architecture

Two independent frontends share the same Laravel API:

- **Root (`/`)**: Laravel Blade app with Vite for asset bundling. The root route redirects to `http://localhost:5173` (the Vite dev server). Routes in `routes/web.php`.
- **`frontend/`**: React 19 SPA (Vite + React Router DOM v7). This is the main UI. Has its own `package.json`, `vite.config.js`, and `node_modules/`.

**API**: `routes/api.php` — all routes under `/api`. Sanctum token auth (24h expiration, set in `config/sanctum.php`). Controllers in `app/Http/Controllers/Api/`. Domain models in `app/Models/`:
`Customer`, `GarasiPartner`, `GarasiRequest`, `Kategori`, `Kendaraan`, `Order`, `Tipe`, `WhatsappLog`, `User`.

Public (unauthenticated) API routes: `POST /api/login` (throttled 10/min), `GET /api/katalog/*`.

Public Blade routes (`routes/web.php`): `GET/POST /garasi/{token}` — token-based garage response form via `GarasiResponseController`.

**Database**: `.env.example` defaults to SQLite, but the running `.env` may use MySQL (currently: MySQL `cvpilar`). Migrations in `database/migrations/`. A `database/database.sqlite` file exists but may not be the active DB.

**Frontend API layer** (`frontend/src/services/api.js`): axios with Bearer token from `localStorage`. Auto-redirects to `/login` on 401. File uploads use `FormData` (Content-Type header is stripped automatically).

**Business logic service**: `app/Services/OvertimeCalculator.php` — calculates late-return penalties for vehicle orders (Rp 25,000/hour, second-precision).

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
Vite dev server proxies `/api` and `/storage` requests to `http://localhost:8000`.

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

**No TypeScript** — the frontend uses plain JSX.

### Build

```bash
npm run build              # Root Laravel Vite build
cd frontend && npm run build  # React SPA build
```

## Key Conventions

- **PHP 8.3+** required
- **Tailwind CSS v4** used in both root and frontend (via `@tailwindcss/vite` plugin)
- **Sanctum** for API auth (Bearer tokens stored in `localStorage`)
- **Indonesian domain terminology** in models/routes: `garasi` (garage), `kendaraan` (vehicle)
- **PHPUnit** always uses `:memory:` SQLite regardless of `.env` — no external DB needed for tests
- **Root Vite config** ignores `storage/framework/views/` from file watching
- **4-space indentation**, LF line endings enforced (`.editorconfig`, `.gitattributes`)

## Gotchas

- The root `npm run dev` and `frontend/npm run dev` are **different** apps. The root serves Blade assets; `frontend/` is the React SPA.
- `composer dev` starts the Laravel server on `:8000`. The React SPA proxies to that port.
- Migrations use timestamped filenames — check `database/migrations/` for the actual schema.
- No CI workflows, no pre-commit hooks, no Docker config in the repo.
- `.npmrc` sets `ignore-scripts=true` — postinstall hooks (e.g. native builds) are skipped during `npm install`.
- `.gitattributes` enforces LF line endings (`* text=auto eol=lf`).
- `composer test` clears config cache before running tests — if you run `php artisan test` directly without clearing, cached config may cause unexpected behavior.
- The `.env` DB settings may differ from `.env.example` — check the actual `.env` if database issues arise.
