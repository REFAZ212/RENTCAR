import type { KatalogItem } from '../services/api';

export const getFotoUrl = (foto: string | null | undefined): string | null => {
  if (!foto) return null;
  if (foto.startsWith('http')) return foto;
  return `/storage/${foto}`;
};

// Tanda visual foto untuk kendaraan yang sedang tidak bisa dipesan.
// Tingkat redup sengaja disamakan untuk kedua status, supaya tidak terlihat
// "belum konsisten" — bedanya tetap dibaca dari badge status.
// Disewa dibiarkan normal (badge sudah cukup), supaya tidak terkesan rusak.
export const statusPhotoClass = (status?: string | null): string => {
  if (status === 'tidak_tersedia' || status === 'maintenance') return 'grayscale opacity-50';
  return '';
};

export interface StatusInfo {
  label: string;
  className: string;
  color: string;
  textColor: string;
  bgColor: string;
  borderColor: string;
  disabled: boolean;
  reason: 'maintenance' | 'disewa' | 'tidak_tersedia' | 'booked' | null;
  estimatedReturn?: string | null;
}

export function getStatusInfo(item: KatalogItem, availableForDates?: boolean): StatusInfo {
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
  if (item.status === 'disewa') {
    return {
      label: 'Sedang Disewa',
      color: 'bg-error-500',
      textColor: 'text-error-600',
      bgColor: 'bg-error-50',
      borderColor: 'border-error-50',
      className: 'bg-error-50 text-error-600',
      disabled: true,
      reason: 'disewa',
      estimatedReturn: item.estimated_return_date,
    };
  }
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
