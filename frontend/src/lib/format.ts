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
 * Mendapatkan waktu sekarang dalam format YYYY-MM-DDTHH:MM
 * menggunakan timezone Asia/Jakarta (WIB, UTC+7).
 * Digunakan untuk datetime-local input default.
 */
export function nowWIB(): string {
  const parts = new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Jakarta' }).split(' ');
  return `${parts[0]}T${parts[1].slice(0, 5)}`;
}
