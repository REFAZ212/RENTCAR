import type { KatalogItem } from '../services/api';

/**
 * Mengubah path foto kendaraan menjadi URL yang dapat diakses
 * dari frontend.
 *
 * Contoh:
 * kendaraan/abc.jpg
 * →
 * https://api.udinrentcar.com/storage/kendaraan/abc.jpg
 */
export const getFotoUrl = (
  foto: string | null | undefined
): string | null => {
  if (!foto) return null;

  // Jika sudah berupa URL lengkap, langsung gunakan.
  if (/^https?:\/\//i.test(foto)) {
    return foto;
  }

  // Jika masih berupa path storage Laravel,
  // arahkan ke API backend.
  return `https://api.udinrentcar.com/storage/${foto}`;
};

/**
 * Tanda visual foto untuk kendaraan yang sedang tidak bisa dipesan.
 *
 * Maintenance dan tidak tersedia dibuat sedikit redup
 * agar pengguna dapat langsung membedakannya secara visual.
 *
 * Kendaraan yang sedang disewa dibiarkan normal karena
 * informasi "Sedang Disewa" sudah ditampilkan melalui badge status.
 */
export const statusPhotoClass = (
  status?: string | null
): string => {
  if (
    status === 'tidak_tersedia' ||
    status === 'maintenance'
  ) {
    return 'grayscale opacity-50';
  }

  return '';
};

/**
 * Informasi status kendaraan yang digunakan
 * pada katalog kendaraan.
 */
export interface StatusInfo {
  label: string;
  className: string;
  color: string;
  textColor: string;
  bgColor: string;
  borderColor: string;
  disabled: boolean;
  reason:
    | 'maintenance'
    | 'disewa'
    | 'tidak_tersedia'
    | 'booked'
    | null;
  estimatedReturn?: string | null;
}

/**
 * Menghasilkan informasi status kendaraan.
 *
 * Urutan pengecekan:
 * 1. Maintenance
 * 2. Sedang disewa
 * 3. Tidak tersedia
 * 4. Tidak tersedia berdasarkan tanggal booking
 * 5. Tersedia
 */
export function getStatusInfo(
  item: KatalogItem,
  availableForDates?: boolean
): StatusInfo {
  // ==========================================
  // MAINTENANCE
  // ==========================================
  if (item.status === 'maintenance') {
    return {
      label: 'Sedang Servis',
      color: 'bg-accent-500',
      textColor: 'text-accent-600',
      bgColor: 'bg-accent-50',
      borderColor: 'border-accent-200',
      className: 'bg-accent-50 text-accent-600',
      disabled: true,
      reason: 'maintenance',
    };
  }

  // ==========================================
  // SEDANG DISEWA
  // ==========================================
  if (item.status === 'disewa') {
    return {
      label: 'Sedang Disewa',
      color: 'bg-error-500',
      textColor: 'text-error-600',
      bgColor: 'bg-error-50',
      borderColor: 'border-error-200',
      className: 'bg-error-50 text-error-600',
      disabled: true,
      reason: 'disewa',
      estimatedReturn: item.estimated_return_date,
    };
  }

  // ==========================================
  // TIDAK TERSEDIA
  // ==========================================
  if (item.status === 'tidak_tersedia') {
    return {
      label: 'Tidak Tersedia',
      color: 'bg-accent-500',
      textColor: 'text-accent-600',
      bgColor: 'bg-accent-50',
      borderColor: 'border-accent-200',
      className: 'bg-accent-50 text-accent-600',
      disabled: true,
      reason: 'tidak_tersedia',
    };
  }

  // ==========================================
  // TIDAK TERSEDIA BERDASARKAN TANGGAL
  // ==========================================
  if (availableForDates === false) {
    return {
      label: 'Tidak Tersedia',
      color: 'bg-accent-500',
      textColor: 'text-accent-600',
      bgColor: 'bg-accent-50',
      borderColor: 'border-accent-200',
      className: 'bg-accent-50 text-accent-600',
      disabled: true,
      reason: 'booked',
    };
  }

  // ==========================================
  // TERSEDIA
  // ==========================================
  return {
    label: 'Tersedia',
    color: 'bg-success-500',
    textColor: 'text-success-600',
    bgColor: 'bg-success-50',
    borderColor: 'border-success-200',
    className: 'bg-success-50 text-success-600',
    disabled: false,
    reason: null,
  };
}