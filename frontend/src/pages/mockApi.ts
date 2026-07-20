/**
 * ─────────────────────────────────────────────────────────────
 * MOCK API — pengganti sementara services/api.ts
 * ─────────────────────────────────────────────────────────────
 * Dipakai selama backend Pengaturan (/pengaturan/*) belum jadi.
 * Meniru bentuk axios instance (get/post/put) supaya komponen
 * Pengaturan.tsx TIDAK PERLU diubah sama sekali.
 *
 * Cara pakai:
 *   import api from './mockApi';   // bukan './services/api'
 *
 * Nanti kalau backend sudah siap, tinggal balikin import ke
 * '../services/api' lagi — tidak ada perubahan lain yang dibutuhkan,
 * asal kontrak request/response backend sama persis dengan bentuk
 * di bawah ini (lihat komentar tiap endpoint).
 * ─────────────────────────────────────────────────────────────
 */

type AxiosLikeResponse<T> = { data: T };

function delay<T>(data: T, ms = 500): Promise<AxiosLikeResponse<T>> {
  return new Promise((resolve) => {
    setTimeout(() => resolve({ data }), ms);
  });
}

function fail(message: string, status = 400, ms = 400): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => {
      const err: any = new Error(message);
      err.isAxiosError = true;
      err.response = { status, data: { message } };
      reject(err);
    }, ms);
  });
}

/* ─────────────────────────────────────────────────────────────
 * "DATABASE" IN-MEMORY — bertahan selama sesi browser terbuka
 * (hilang kalau refresh, karena memang cuma mock)
 * ───────────────────────────────────────────────────────────── */

const db = {
  profil: {
    nama: 'Budi Santoso',
    email: 'budi@pilarrental.com',
    no_hp: '081234567890',
    avatar_url: null as string | null,
  },

  // password asli yang dianggap "benar" untuk simulasi validasi
  passwordLama: 'password123',

  bisnis: {
    nama_usaha: 'Pilar Rental Mobil',
    alamat: 'Jl. Raya Banjar No. 12, Banjar, Jawa Barat',
    no_telp: '0265123456',
    email_usaha: 'info@pilarrental.com',
    logo_url: null as string | null,
    jam_operasional: [
      { hari: 'Senin', buka: '08:00', tutup: '20:00', libur: false },
      { hari: 'Selasa', buka: '08:00', tutup: '20:00', libur: false },
      { hari: 'Rabu', buka: '08:00', tutup: '20:00', libur: false },
      { hari: 'Kamis', buka: '08:00', tutup: '20:00', libur: false },
      { hari: 'Jumat', buka: '08:00', tutup: '20:00', libur: false },
      { hari: 'Sabtu', buka: '08:00', tutup: '20:00', libur: false },
      { hari: 'Minggu', buka: '08:00', tutup: '17:00', libur: false },
    ],
  },

  harga: {
    biaya_antar_per_km: 5000,
    biaya_jemput_flat: 25000,
    biaya_dengan_driver_per_hari: 150000,
    minimal_dp_persen: 30,
    denda_keterlambatan_per_jam: 20000,
    toleransi_keterlambatan_menit: 30,
  },

  notifikasi: {
    fonnte_token: '',
    nomor_wa_owner: '',
    notif_booking_baru: true,
    notif_penugasan_driver: true,
    notif_pembayaran_masuk: true,
    notif_kendaraan_terlambat: true,
    template_penugasan_driver:
      'Halo {nama_driver}, ada tugas baru:\nAntar {customer} — {kendaraan} ({plat_nomor})\n{tanggal} pukul {jam}\n\nBalas SIAP jika bisa, atau TIDAK jika berhalangan.',
    template_notifikasi_owner: '[BOOKING] {kendaraan} untuk {customer}\nDriver: {driver} — {tanggal}\nStatus: {status}',
  },

  sistem: {
    mata_uang: 'IDR',
    zona_waktu: 'Asia/Jakarta',
    format_tanggal: 'DD/MM/YYYY',
    prefix_kode_order: 'RNT',
  },
};

/* ─────────────────────────────────────────────────────────────
 * ROUTER MOCK — mapping path ke perilaku
 * ───────────────────────────────────────────────────────────── */

function readAvatarAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.readAsDataURL(file);
  });
}

async function get<T = any>(path: string, p0: any): Promise<AxiosLikeResponse<T>> {
  switch (path) {
    case '/pengaturan/profil':
      return delay(db.profil) as any;
    case '/pengaturan/bisnis':
      return delay(db.bisnis) as any;
    case '/pengaturan/harga':
      return delay(db.harga) as any;
    case '/pengaturan/notifikasi':
      return delay(db.notifikasi) as any;
    case '/pengaturan/sistem':
      return delay(db.sistem) as any;
    default:
      return fail(`Mock GET belum didefinisikan untuk ${path}`, 404) as any;
  }
}

async function post(path: string, body: any, config?: { responseType?: string }): Promise<AxiosLikeResponse<any>> {
  // ── Upload profil (FormData) ──
  if (path === '/pengaturan/profil') {
    const nama = body.get('nama');
    const email = body.get('email');
    const no_hp = body.get('no_hp');
    const avatar = body.get('avatar') as File | null;

    db.profil.nama = nama;
    db.profil.email = email;
    db.profil.no_hp = no_hp;
    if (avatar) db.profil.avatar_url = await readAvatarAsDataUrl(avatar);

    return delay({ ...db.profil }, 700);
  }

  // ── Upload bisnis (FormData) ──
  if (path === '/pengaturan/bisnis') {
    db.bisnis.nama_usaha = body.get('nama_usaha');
    db.bisnis.alamat = body.get('alamat');
    db.bisnis.no_telp = body.get('no_telp');
    db.bisnis.email_usaha = body.get('email_usaha');
    db.bisnis.jam_operasional = JSON.parse(body.get('jam_operasional'));
    const logo = body.get('logo') as File | null;
    if (logo) db.bisnis.logo_url = await readAvatarAsDataUrl(logo);

    return delay({ ...db.bisnis }, 700);
  }

  // ── Test kirim WhatsApp ──
  if (path === '/pengaturan/notifikasi/test') {
    if (!db.notifikasi.fonnte_token) {
      return fail('Token gateway belum diisi', 422, 600);
    }
    return delay({ success: true, nomor: body.nomor }, 900);
  }

  return fail(`Mock POST belum didefinisikan untuk ${path}`, 404);
}

async function put(path: string, body: any): Promise<AxiosLikeResponse<any>> {
  if (path === '/pengaturan/password') {
    if (body.password_lama !== db.passwordLama) {
      return fail('Password lama tidak sesuai', 422, 500);
    }
    db.passwordLama = body.password_baru;
    return delay({ success: true }, 600);
  }

  if (path === '/pengaturan/harga') {
    db.harga = { ...body };
    return delay({ ...db.harga });
  }

  if (path === '/pengaturan/notifikasi') {
    db.notifikasi = { ...body };
    return delay({ ...db.notifikasi });
  }

  if (path === '/pengaturan/sistem') {
    db.sistem = { ...body };
    return delay({ ...db.sistem });
  }

  return fail(`Mock PUT belum didefinisikan untuk ${path}`, 404);
}

/* ─────────────────────────────────────────────────────────────
 * Endpoint khusus: backup (GET dengan responseType: 'blob')
 * Dipanggil dari SistemTab lewat api.get(url, { responseType: 'blob' })
 * ───────────────────────────────────────────────────────────── */
const originalGet = get;
async function getWithConfig(path: string, config?: { responseType?: string }): Promise<AxiosLikeResponse<any>> {
  if (path === '/pengaturan/backup' && config?.responseType === 'blob') {
    const isi = JSON.stringify(
      { profil: db.profil, bisnis: db.bisnis, harga: db.harga, sistem: db.sistem, catatan: 'Ini backup dummy dari mock API' },
      null,
      2
    );
    const blob = new Blob([isi], { type: 'application/json' });
    await new Promise((r) => setTimeout(r, 900));
    return { data: blob };
  }
  return originalGet(path, config as any);
}

const api = {
  get: getWithConfig,
  post,
  put,
};

export default api;

/**
 * Helper pengganti `isAxiosError` dari axios, supaya komponen yang
 * mengecek `isAxiosError(err) && err.response?.status === 422`
 * tetap jalan tanpa dependency axios.
 */
export function isAxiosError(err: unknown): err is { response?: { status?: number; data?: any } } {
  return typeof err === 'object' && err !== null && (err as any).isAxiosError === true;
}