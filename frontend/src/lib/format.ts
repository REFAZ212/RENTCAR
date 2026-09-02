/**
 * Format nomor HP untuk display lokal Indonesia (08xxx).
 * Input bisa format apapun: 628xxx, +628xxx, 08xxx, 8xxx.
 */
export function formatHpDisplay(hp: string | null | undefined): string {
  if (!hp) return '';
  const digits = String(hp).replace(/[^0-9]/g, '');
  if (digits.startsWith('62') && digits.length > 2) {
    return '0' + digits.slice(2);
  }
  if (digits.startsWith('0')) {
    return digits;
  }
  if (digits.startsWith('8')) {
    return '0' + digits;
  }
  return digits;
}

/**
 * Format nomor HP untuk link WhatsApp (628xxx).
 * Input bisa format apapun: 628xxx, +628xxx, 08xxx, 8xxx.
 */
export function formatHpWa(hp: string | null | undefined): string {
  if (!hp) return '';
  let digits = String(hp).replace(/[^0-9]/g, '');
  if (digits.startsWith('0')) {
    digits = '62' + digits.slice(1);
  } else if (digits.startsWith('8')) {
    digits = '62' + digits;
  } else if (!digits.startsWith('62')) {
    digits = '62' + digits;
  }
  return digits;
}

/**
 * Format angka ke Rupiah (Rp 1.234.500).
 * Menerima number, string, null, undefined.
 */
export function formatRupiah(n: number | string | null | undefined): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(Number(n || 0));
}

/**
 * Format Rupiah ringkas untuk chart axis (1Jt, 500Rb, 100).
 */
export function formatRupiahShort(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}Jt`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}Rb`;
  return String(n);
}

/** Nomor WhatsApp admin (format internasional tanpa +). */
export const ADMIN_WA = '62895361054272';

/** Tampilan nomor HP untuk user Indonesia. */
export const ADMIN_HP_DISPLAY = '0895-3610-54272';

/**
 * Mendapatkan tanggal hari ini dalam format YYYY-MM-DD
 * menggunakan timezone Asia/Jakarta (WIB, UTC+7).
 * `new Date().toISOString()` mengembalikan UTC — antara 00:00-07:00 WIB
 * tanggalnya masih "kemarin". Fungsi ini menghindari bug tersebut.
 */
export function todayJakarta(): string {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Jakarta' });
}

/**
 * Parser tanggal YYYY-MM-DD menjadi objek Date lokal (Asia/Jakarta).
 * Menghindari pergeseran zona waktu karena parsing langsung `new Date("YYYY-MM-DD")`
 * memperlakukan string sebagai UTC.
 */
function parseYmd(ymd: string): Date {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

/**
 * Format tanggal YYYY-MM-DD menjadi tampilan Indonesia
 * (mis. "29 Agu 2026") dengan timezone lokal yang konsisten.
 */
export function formatTanggal(ymd: string | null | undefined): string {
  if (!ymd) return '-';
  const d = parseYmd(ymd);
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

/**
 * Kurangi / tambah hari dari string tanggal YYYY-MM-DD (murni aritmatika kalender,
 * tanpa dependensi timezone). Mengembalikan YYYY-MM-DD.
 */
export function addDaysYmd(ymd: string, days: number): string {
  const d = parseYmd(ymd);
  d.setDate(d.getDate() + days);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

/**
 * Rentang bulan berjalan (tanggal 1 s/d hari terakhir bulan) untuk tanggal YYYY-MM-DD.
 */
export function monthRangeYmd(ymd: string): { start: string; end: string } {
  const [y, m] = ymd.split('-').map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  return {
    start: `${y}-${String(m).padStart(2, '0')}-01`,
    end: `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`,
  };
}

/** Selisih hari antara dua tanggal YYYY-MM-DD (negatif bila end sebelum start). */
export function diffDaysYmd(start: string, end: string): number {
  return Math.round((parseYmd(end).getTime() - parseYmd(start).getTime()) / 86400000);
}

/** Cari label period preset yang cocok untuk sepasang tanggal kustom. */
export function periodPresetLabel(start: string, end: string): string | null {
  if (start === end) return 'Hari Ini';
  if (end === todayJakarta() && start === addDaysYmd(end, -6)) return '7 Hari Terakhir';
  const cur = todayJakarta();
  if (start === monthRangeYmd(cur).start && end === cur) return 'Bulan Ini';
  return 'Kustom';
}

/**
 * Mendapatkan waktu sekarang dalam format YYYY-MM-DDTHH:MM
 * menggunakan timezone Asia/Jakarta (WIB, UTC+7).
 * Digunakan untuk datetime-local input default.
 */
export function nowWIB(): string {
  const parts = new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Jakarta' }).split(' ');
  return `${parts[0]}T${parts[1].slice(0, 5)}`;
}

/**
 * Mendapatkan waktu sekarang dalam format HH:MM (Asia/Jakarta).
 * Dipakai sebagai batas minimal input jam (mis. jam mulai order
 * hari ini tidak boleh sudah lewat).
 */
export function nowWIBTime(): string {
  return new Date().toLocaleTimeString('sv-SE', { timeZone: 'Asia/Jakarta' }).slice(0, 5);
}

/**
 * Kamus nama warna kendaraan (Indonesia/umum) → kode hex.
 * Warna kendaraan di database disimpan sebagai teks bebas ("Putih",
 * "Hitam", dst.) yang tidak bisa langsung dipakai sebagai nilai CSS,
 * jadi perlu diterjemahkan dulu untuk menampilkan lingkaran warna.
 */
const WARNA_KENDARAAN_HEX: Record<string, string> = {
  putih: '#F5F5F5',
  hitam: '#1F2937',
  abu: '#9CA3AF',
  'abu-abu': '#9CA3AF',
  grey: '#9CA3AF',
  gray: '#9CA3AF',
  silver: '#C0C4CC',
  perak: '#C0C4CC',
  merah: '#DC2626',
  'merah marun': '#9F1239',
  maroon: '#9F1239',
  marun: '#9F1239',
  biru: '#2563EB',
  'biru tua': '#1D4ED8',
  'biru muda': '#60A5FA',
  navy: '#1E3A8A',
  hijau: '#16A34A',
  'hijau tua': '#15803D',
  'hijau muda': '#4ADE80',
  kuning: '#EAB308',
  orange: '#F97316',
  oranye: '#F97316',
  coklat: '#92400E',
  cokelat: '#92400E',
  ungu: '#7C3AED',
  pink: '#EC4899',
  emas: '#D4AF37',
  gold: '#D4AF37',
  krem: '#F5F5DC',
  cream: '#F5F5DC',
  beige: '#D6C9A9',
};

/**
 * Terjemahkan nama warna kendaraan menjadi kode hex untuk dijadikan
 * background lingkaran warna. Mengembalikan null kalau warna kosong
 * atau tidak dikenal (caller bebas memilih fallback/abu-abu).
 */
export function warnaKendaraanHex(warna: string | null | undefined): string | null {
  if (!warna) return null;
  const normalized = warna.trim();
  if (normalized.startsWith('#')) return normalized;
  return WARNA_KENDARAAN_HEX[normalized.toLowerCase()] ?? null;
}
