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
 * Mendapatkan tanggal hari ini dalam format YYYY-MM-DD
 * menggunakan timezone Asia/Jakarta (WIB, UTC+7).
 * `new Date().toISOString()` mengembalikan UTC — antara 00:00-07:00 WIB
 * tanggalnya masih "kemarin". Fungsi ini menghindari bug tersebut.
 */
export function todayJakarta(): string {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Jakarta' });
}
