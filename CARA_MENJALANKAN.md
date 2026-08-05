# UDIN RENCTCAR - Panduan Menjalankan Sistem

## Ikhtisar

**UDIN RENCTCAR** adalah sistem manajemen garasi/kendaraan rental mobil. Terdiri dari dua bagian utama:

- **Backend**: Laravel 13.8 API (PHP 8.3+)
- **Frontend**: React 19 SPA (Vite + React Router DOM v7)

---

## Persyaratan Sistem

| Komponen | Versi Minimum |
|----------|---------------|
| PHP | 8.3+ |
| Node.js | 18+ |
| Composer | 2.x |
| Database | MySQL 8.x atau SQLite |

---

## Setup Awal (Dari Nol)

### 1. Clone Repository

```bash
git clone <url-repo>
cd RENTCAR
```

### 2. Install Semua Dependency (Otomatic)

Perintah ini akan menginstall semua dependency PHP & Node.js, membuat file `.env`, generate app key, menjalankan migrasi database, dan build frontend:

```bash
composer setup
```

### 3. Setup Manual (Alternatif)

Jika `composer setup` tidak bisa dijalankan, lakukan langkah-langkah berikut secara terpisah:

```bash
# Install dependency PHP
composer install

# Buat file .env dari template
copy .env.example .env

# Generate application key
php artisan key:generate

# Buat file SQLite (opsional, jika pakai SQLite)
type nul > database\database.sqlite

# Jalankan migrasi database
php artisan migrate

# Install dependency Node.js (frontend)
cd frontend
npm install
cd ..

# Build frontend untuk production
npm run build
```

---

## Konfigurasi Database

### Menggunakan MySQL (Default)

Edit file `.env` dan pastikan konfigurasi berikut:

```env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=udin-renctcar
DB_USERNAME=root
DB_PASSWORD=
```

Buat database `udin-renctcar` di MySQL terlebih dahulu:

```sql
CREATE DATABASE udin-renctcar;
```

### Menggunakan SQLite

Edit file `.env`:

```env
DB_CONNECTION=sqlite
```

Buat file SQLite:

```bash
type nul > database\database.sqlite
```

---

## Menjalankan Sistem

### Mode Development (Semua Sekaligus)

Jalankan backend, queue worker, dan frontend secara bersamaan:

```bash
composer dev
```

Ini akan menjalankan 3 proses sekaligus:
- **Server Laravel** → `http://localhost:8000`
- **Queue Worker** → memproses background jobs
- **Vite Dev Server** → `http://localhost:5173` (frontend React)

### Menjalankan Terpisah

Jika ingin menjalankan masing-masing secara manual:

**Terminal 1 - Backend API:**
```bash
php artisan serve
```
Server berjalan di `http://localhost:8000`

**Terminal 2 - Queue Worker:**
```bash
php artisan queue:listen --tries=1 --timeout=0
```

**Terminal 3 - Frontend React:**
```bash
cd frontend
npm run dev
```
Frontend berjalan di `http://localhost:5173` dengan proxy ke backend di `:8000`

---

## Build untuk Production

### Backend (Laravel)

```bash
npm run build
```

### Frontend (React SPA)

```bash
cd frontend
npm run build
```

Output build tersimpan di `frontend/dist/`.

---

## Struktur Aplikasi

### Frontend Pages (React)

| Halaman | Deskripsi |
|---------|-----------|
| `Dashboard` | Ringkasan data utama |
| `Katalog` | Katalog kendaraan (publik) |
| `Kendaraan` | Manajemen kendaraan |
| `KendaraanDetail` | Detail kendaraan |
| `Customers` | Manajemen customer |
| `CustomersOrders` | Riwayat order customer |
| `Orders` | Manajemen order |
| `KategoriTipe` | Kategori & tipe kendaraan |
| `GarasiPartner` | Mitra garasi |
| `GarasiSaya` | Garasi milik user |
| `SupirCalo` | Supir & calo |
| `Laporan` | Laporan & export |
| `Login` | Halaman login |
| `GarasiPage` | Halaman publik garasi |

### API Routes

| Endpoint | Method | Keterangan |
|----------|--------|------------|
| `/api/login` | POST | Login (throttle 10/menit) |
| `/api/logout` | POST | Logout |
| `/api/me` | GET | Profil user login |
| `/api/dashboard` | GET | Data dashboard |
| `/api/katalog` | GET | Katalog publik |
| `/api/katalog/{id}` | GET | Detail kendaraan |
| `/api/kendaraans` | GET/POST | CRUD kendaraan |
| `/api/customers` | GET/POST | CRUD customer |
| `/api/orders` | GET/POST | CRUD order |
| `/api/garasi-partners` | GET/POST | CRUD garasi partner |
| `/api/garasi-requests` | GET/POST | CRUD garasi request |
| `/api/kategoris` | GET/POST | CRUD kategori |
| `/api/tipes` | GET/POST | CRUD tipe |
| `/api/supir-calos` | GET/POST | CRUD supir/calo |
| `/api/laporan/ringkasan` | GET | Laporan ringkasan |
| `/api/laporan/pendapatan` | GET | Laporan pendapatan |
| `/api/laporan/kendaraan` | GET | Laporan kendaraan |
| `/api/laporan/customer` | GET | Laporan customer |
| `/api/laporan/order` | GET | Laporan order |
| `/api/laporan/export/{type}/{format}` | GET | Export laporan |

---

## Testing

### Jalankan Semua Test

```bash
composer test
```

> Perintah ini otomatis membersihkan config cache sebelum menjalankan test untuk menghindari konflik.

### Jalankan Satu Test

```bash
php artisan test --filter=NamaTest
```

> Testing menggunakan in-memory SQLite (`:memory:`) — tidak mempengaruhi database `.env`.

---

## Linting & Formatting

### PHP (Laravel Pint)

```bash
./vendor/bin/pint
```

### JavaScript/React (oxlint)

```bash
cd frontend
npm run lint
```

---

## URL Penting

| URL | Keterangan |
|-----|------------|
| `http://localhost:5173` | Frontend React (development) |
| `http://localhost:8000` | Backend API (development) |
| `http://localhost:8000/api` | API endpoint |

---

## Troubleshooting

| Masalah | Solusi |
|---------|--------|
| `Class not found` | Jalankan `composer dump-autoload` |
| Database tidak ditemukan | Pastikan MySQL running dan database `udin-renctcar` sudah dibuat |
| Port 8000 sudah dipakai | Jalankan `php artisan serve --port=8001` |
| Port 5173 sudah dipakai | Vite akan otomatis menggunakan port berikutnya |
| Frontend tidak bisa koneksi ke API | Pastikan backend berjalan di port 8000 (proxy setting) |
| Migrasi gagal | Jalankan `php artisan migrate:fresh` untuk reset database |
| `.env` belum ada | Jalankan `copy .env.example .env` lalu `php artisan key:generate` |
| Node modules error | Jalankan `cd frontend && npm install` |
