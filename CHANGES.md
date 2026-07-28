# Changelog — RENTCAR

Ringkasan semua perubahan bug fix, UX improvement, dan keamanan data
yang dilakukan pada codebase.

---

## 1. CRITICAL: `bukti_pengembalian` hyphen vs underscore

**File:** `app/Http/Controllers/Api/OrderController.php`

Frontend mengirim field bernama `bukti_pengembalian` (underscore), tetapi
backend request mengharapkan `bukti-pengembalian` (hyphen). Akibatnya
bukti pengembalian tidak pernah tersimpan ke storage.

**Fix:** `$request->file('bukti-pengembalian')` → `$request->file('bukti_pengembalian')`
di `store()` dan `update()`.

---

## 2. CRITICAL: Race condition pada overlap check

**File:** `app/Http/Controllers/Api/OrderController.php`

Overlap check (cek apakah kendaraan sudah disewa pada tanggal yang sama)
dilakukan di luar `DB::transaction()`. Dua request bisa lolos overlap
check secara bersamaan → double booking.

**Fix:** Overlap check dipindahkan ke dalam `DB::transaction()` dengan
`lockForUpdate()` di kedua `store()` dan `update()`. Menggunakan
`ValidationException::withMessages()` untuk return 422.

---

## 3. CRITICAL: customer_id tidak ditulis saat update dengan customer baru

**File:** `app/Http/Controllers/Api/OrderController.php`

Saat admin mengedit order dan memilih customer baru (belum ada di DB),
customer baru dibuat tapi `customer_id` tidak ditulis ke `$updateData`.
Order tetap menunjuk customer lama.

**Fix:** Tambahkan `$updateData['customer_id'] = $customer->id;` di dalam
transaksi setelah customer baru dibuat.

---

## 4. CRITICAL: Stale kendaraan reference setelah update

**File:** `app/Http/Controllers/Api/OrderController.php`

Setelah `$order->update($updateData)`, relasi `kendaraan` masih menunjuk
kendaraan lama. Jika admin mengganti kendaraan, status kendaraan lama
tidak dikembalikan ke `tersedia` dan kendaraan baru tidak di-set ke
`disewa`.

**Fix:** Tambahkan `$order->load('kendaraan');` setelah `$order->update()`
supaya relasi kendaraan selalu fresh.

---

## 5. CRITICAL: kendaraan_id nullable pada update

**File:** `app/Http/Controllers/Api/OrderController.php`

Validasi `kendaraan_id` pada update adalah `nullable|exists:kendaraans,id`.
Admin bisa mengirim update tanpa `kendaraan_id` dan order akan kehilangan
kendaraannya.

**Fix:** Diubah ke `sometimes|required|exists:kendaraans,id`.

---

## 6. HIGH: harga_total ter-overwrite saat edit non-harga

**File:** `app/Http/Controllers/Api/OrderController.php`

`harga_total` dihitung ulang di setiap update, termasuk saat admin hanya
mengubah status atau catatan. Jika admin mengedit order setelah jam
berubah, harga bisa berubah tanpa disadari.

**Fix:** Harga hanya dihitung ulang saat field yang mempengaruhi harga
berubah: `kendaraan_id`, `tanggal_mulai`, `tanggal_selesai`, `supir_id`.

---

## 7. HIGH: Overlap check tidak ada di KatalogOrderRequestController

**File:** `app/Http/Controllers/Api/KatalogOrderRequestController.php`

Order dari katalog publik tidak memiliki overlap check — customer bisa
memesan kendaraan yang sudah disewa.

**Fix:** Tambahkan overlap check dengan `lockForUpdate()` di dalam
`DB::transaction()` yang membungkus `Order::create()`.

---

## 8. Frontend: Validasi tanggal pada form order

**File:** `frontend/src/pages/Orders.tsx`

Tidak ada validasi frontend bahwa tanggal_mulai harus ≥ hari ini dan
tanggal_selesai harus ≥ tanggal_mulai.

**Fix:**
- `validateStep3`: tanggal_mulai ≥ hari ini, tanggal_selesai ≥ tanggal_mulai
- `handleSubmit`: validasi yang sama
- `handleEditSubmit`: tanggal_selesai ≥ tanggal_mulai
- Input `min` attribute pada date inputs di form create

---

## 9. Kendaraan: Tombol status disabled saat `disewa`

**File:** `frontend/src/pages/Kendaraan.tsx`

Tombol "Tersedia" dan "Servis" bisa diklik saat kendaraan sedang disewa.
Mengubah status manual menyebabkan inkonsistensi data.

**Fix:**
- Komponen `QuickStatusButton` mendapat prop `disabled`
- Tombol "Tersedia" dan "Servis" disabled saat `status === 'disewa'`
- Tooltip: "Status dikendalikan oleh order aktif"
- Dropdown status di form edit juga disabled saat `disewa`

---

## 10. Order: Field terkunci untuk order aktif

### Frontend (`Orders.tsx`)

**Flag:** `isLockedOrder` — aktif saat `status_order === 'active'`
(dan juga `completed`/`cancelled`, lihat poin 11).

Saat order aktif:
- **Read-only summary cards** ditampilkan untuk: Data Customer,
  Kendaraan, Jadwal & Lokasi (tanggal, jam, alamat jemput, tujuan,
  supir/calo)
- **Editable fields:** status_pembayaran, metode_bayar,
  bukti_pembayaran, catatan
- **Hidden:** status_order dropdown, bukti_pengiriman upload,
  alamat_jemput/tujuan inputs
- **Banner peringatan** amber: "Order aktif — data inti tidak bisa diubah..."
- Validasi customer/kendaraan/tanggal di-skip di `handleEditSubmit`

### Backend (`OrderController.php`)

Saat `status_order === 'active'`, field-field berikut dikunci:
`customer_id`, `customer_name`, `customer_no_hp`, `customer_email`,
`customer_alamat`, `customer_no_sim`, `customer_no_ktp`,
`customer_foto_ktp`, `customer_foto_sim`, `kendaraan_id`,
`tanggal_mulai`, `tanggal_selesai`, `jam_mulai`, `jam_selesai`,
`alamat_jemput`, `tujuan`, `supir_id`, `calo_id`, `status_order`.

Juga memblokir upload `bukti_pengiriman` dan `customer_foto_ktp`/`sim`.

---

## 11. Order: Status `completed` & `cancelled` fully read-only

**File:** `frontend/src/pages/Orders.tsx`, `app/Http/Controllers/Api/OrderController.php`

Status `completed` dan `cancelled` adalah terminal state — semua data
harus bersifat read-only, tidak ada field yang bisa diubah.

### Frontend — Dua level locking:

| Status | Behavior | Field yang bisa diedit |
|---|---|---|
| `pending` / `confirmed` | Fully editable | Semua |
| `active` | Partially locked | status_pembayaran, metode_bayar, bukti_pembayaran, catatan |
| `completed` / `cancelled` | **Fully read-only** | Tidak ada — view only |

**Flag `isFullyLocked`** = true saat `completed` atau `cancelled`.

Saat fully locked:
- Read-only summary cards (sama dengan active)
- Status pembayaran & metode bayar: **teks read-only** (bukan dropdown)
- Catatan: **teks read-only** (bukan textarea)
- Bukti pembayaran: **gambar preview** (bukan upload)
- Tombol submit **disembunyikan** — hanya tombol "Tutup"
- Banner netral: "Order sudah final. Semua data bersifat read-only."

### Backend:

Guard dikembangkan dari hanya `active` menjadi
`in_array($order->status_order, ['active', 'completed', 'cancelled'])`.

---

## 12. Order: Overlap check pada update

**File:** `app/Http/Controllers/Api/OrderController.php`

Saat admin mengganti kendaraan atau tanggal pada order yang sudah ada,
tidak ada pengecekan apakah kendaraan baru sudah disewa pada tanggal
tersebut.

**Fix:** Overlap check ditambahkan di `update()` dengan pola yang sama
seperti `store()` — di dalam `DB::transaction()` dengan `lockForUpdate()`.

---

## 13. Overtime rate berbasis database

### Backend

- **Migration:** `settings` table dengan key-value pairs
- **Model:** `app/Models/Setting.php` — `get()`, `set()`,
  `getOvertimeSettings()` dengan cache
- **Service:** `app/Services/OvertimeCalculator.php` — parameterized:
  `hitung($batas, $aktual, $rate, $grace)`
- **Controller:** `app/Http/Controllers/Api/SettingController.php` —
  `GET /api/settings/overtime`, `PUT /api/settings/overtime`

### Frontend (`Pengaturan.tsx`)

- Tab "Lembur" terhubung ke API real
- Input: tarif per jam (Rp), grace period (menit)
- Tombol "Reset ke Default"

### Tests

3 test baru di `tests/Unit/OvertimeCalculatorTest.php`.

---

## 14. Backend: SupirCalo — komisi wajib

**File:** `app/Http/Controllers/Api/OrderController.php`,
`app/Models/SupirCalo.php`

`komisi` tidak ada di `$fillable` model, tidak di-validasi di controller.
Juga: `SupirCalo::destroy()` hanya mengecek `supir_id`, tidak `calo_id`.

**Fix:**
- Tambah `komisi` ke `$fillable` dan `$casts`
- Tambah validasi komisi di controller (conditional: required when jenis)
- `destroy()` menggunakan explicit query untuk cek both `supir_id` dan
  `calo_id`

---

## 15. Backend: Filter empty string fix

**File:** `app/Http/Controllers/Api/OrderController.php`,
`app/Http/Controllers/Api/KendaraanController.php`

`$request->has()` mengembalikan `true` untuk empty string `''`, yang
meng-overwrite nilai database.

**Fix:** Semua `$request->has()` diganti ke `$request->filled()` (8 lokasi).

---

## 16. HP normalization — no leading 0

**Files:** Backend (5 lokasi), migration, frontend (6 pages)

Nomor HP yang diawali `0` tidak dinormalisasi, menyebabkan inkonsistensi
format (08xxx vs 628xxx).

**Fix:**
- Backend: `elseif (str_starts_with($normalizedHp, '8'))` di 5 lokasi
- Migration: `renormalize_customer_no_hp.php` untuk data existing
- Frontend: `formatHpDisplay()` dan `formatHpWa()` di `frontend/src/lib/format.ts`
- Diterapkan di 6 halaman

---

## 17. Customer validation consistency

**File:** `app/Http/Controllers/Api/CustomerController.php`

`alamat` dan `no_sim` tidak wajib diisi saat create/update customer.

**Fix:** `required` di `store()`, `sometimes|required` di `update()`.

---

## 18. Customer data di-update saat store order

**File:** `app/Http/Controllers/Api/OrderController.php`

Saat admin membuat order baru dengan customer yang sudah ada, data
customer (HP, email, alamat, dll) tidak di-update.

**Fix:** `$customer->update(...)` di dalam transaksi, customer_id ditulis
ke `$updateData`.

---

## 19. DB::transaction untuk store() dan update()

**File:** `app/Http/Controllers/Api/OrderController.php`

Kedua `store()` dan `update()` sekarang dibungkus `DB::transaction()`.

Penting: validasi dipindahkan **sebelum** customer handling supaya kalau
gagal, customer belum termodifikasi. File storage dilakukan **di luar**
transaction (filesystem bukan DB, rollback tidak menghapus file).

---

## 20. Type definitions deduplication

**File:** `frontend/src/pages/Orders.tsx`, `frontend/src/services/api.ts`

Type `SupirCalo` dan `Kendaraan` didefinisikan ulang di Orders.tsx
(padahal sudah ada di api.ts). Juga: `komisi` dan `active_orders_count`
belum ada di type canonical.

**Fix:** Orders.tsx menghapus duplikat, import dari api.ts.
`komisi` ditambah ke `SupirCalo`, `active_orders_count` ke `Kendaraan`.

---

## 21. Memory leak fix

**File:** `frontend/src/pages/Orders.tsx`

3 blob URLs tidak di-revoke saat unmount → memory leak.

**Fix:** Ditambahkan ke useEffect cleanup.

---

## 22. Seeder refresh

**File:** `database/seeders/` (12 seeders)

Semua seeders di-refresh untuk test data yang komprehensif.

---

## 23. Order: `jam_overtime` / `denda_overtime` removed from $fillable

**File:** `app/Models/Order.php`

Field computed ini ada di `$fillable`, memungkinkan injection melalui API.

**Fix:** Dihapus dari `$fillable`.

---

## 24. Status order hanya bisa diubah melalui tombol aksi khusus

**File:** `frontend/src/pages/Orders.tsx`

Dropdown `status_order` di form edit memungkinkan admin mengubah status
ke nilai yang tidak valid (mis. `completed` langsung dari `confirmed` tanpa
kirim kendaraan).

**Fix:**
- Dropdown `status_order` **dihapus sepenuhnya** dari form edit
- `status_order` **tidak ikut dikirim** dalam payload edit (kecuali
  sewakan/konfirmasi yang memang flow transisi khusus)
- Semua transisi status hanya melalui tombol aksi dedicated:
  - "Konfirmasi" → `pending → confirmed`
  - "Kirim Kendaraan" → `confirmed → active`
  - "Selesai" → `active → completed`
  - "Batal" → `pending/confirmed → cancelled`

| Status | Data field | status_order |
|---|---|---|
| `pending` / `confirmed` | Editable | Read-only (tombol aksi) |
| `active` | Read-only (sebagian) | Read-only (tombol aksi) |
| `completed` / `cancelled` | Read-only (semua) | Read-only (tombol aksi) |
