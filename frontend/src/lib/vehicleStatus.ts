export type StatusKendaraan = 'tersedia' | 'disewa' | 'maintenance' | 'tidak_tersedia';

export const VEHICLE_STATUSES: StatusKendaraan[] = ['tersedia', 'disewa', 'maintenance', 'tidak_tersedia'];

// Badge status kendaraan — satu sumber kebenaran untuk seluruh halaman admin.
export const vehicleStatusStyles: Record<StatusKendaraan, string> = {
  tersedia: 'bg-success-50 text-success-600',
  disewa: 'bg-primary-50 text-primary-500',
  maintenance: 'bg-accent-100 text-accent-700',
  tidak_tersedia: 'bg-error-50 text-error-600',
};

export const vehicleStatusLabels: Record<StatusKendaraan, string> = {
  tersedia: 'Tersedia',
  disewa: 'Disewa',
  maintenance: 'Servis',
  tidak_tersedia: 'Tidak Tersedia',
};