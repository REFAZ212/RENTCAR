# UDIN RENCTCAR — Aplikasi Supir (Flutter)

Aplikasi mobile untuk supir: menerima tugas, inspeksi sebelum/sesudah
pengiriman, unggah media, dan notifikasi. Berkomunikasi dengan API backend
Laravel UDIN RENCTCAR (endpoint `/api/mobile/*`, autentikasi Sanctum).

Logika backend pada alur inspeksi pickup/return sudah memajukan status order
secara otomatis (lihat `DriverTaskService`), sehingga aplikasi ini tidak perlu
diubah saat alur order di backend disesuaikan.

## Menjalankan

```bash
flutter pub get
flutter run
```

Dokumentasi proyek lengkap ada di [`../CARA_MENJALANKAN.md`](../CARA_MENJALANKAN.md).
