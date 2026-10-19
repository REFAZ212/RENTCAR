/**
 * Satu sumber kebenaran untuk label & warna badge status order.
 *
 * Sebelumnya tiap halaman (Orders, OrderDetail, Laporan, CustomerDetail,
 * Dashboard) mendefinisikan ulang daftar label ini — akibatnya label bisa
 * berbeda antar halaman (mis. Dashboard menampilkan kode mentah
 * "perlu_verifikasi" alih-alih "Perlu Verifikasi"). Semua halaman kini
 * mengimpor dari sini.
 */

export type StatusOrder = 'pending' | 'confirmed' | 'active' | 'perlu_verifikasi' | 'completed' | 'cancelled';
export type StatusPembayaran = 'unpaid' | 'partial' | 'paid';
export type StatusPengiriman = 'belum_diambil' | 'sudah_diantarkan' | 'dalam_penyewaan' | 'selesai' | 'sudah_dikembalikan';
export type MetodePembayaran = 'cash' | 'transfer' | 'qris' | 'lainnya';

export const statusOrderLabels: Record<StatusOrder, string> = {
  pending: 'Menunggu',
  confirmed: 'Dikonfirmasi',
  active: 'Sedang Disewa',
  perlu_verifikasi: 'Perlu Verifikasi',
  completed: 'Selesai',
  cancelled: 'Dibatalkan',
};

export const statusPembayaranLabels: Record<StatusPembayaran, string> = {
  unpaid: 'Belum Bayar',
  partial: 'DP / Sebagian',
  paid: 'Lunas',
};

export const statusPengirimanLabels: Record<StatusPengiriman, string> = {
  belum_diambil: 'Belum Diambil',
  sudah_diantarkan: 'Sudah Diantarkan',
  dalam_penyewaan: 'Dalam Penyewaan',
  selesai: 'Selesai',
  sudah_dikembalikan: 'Sudah Dikembalikan',
};

export const metodePembayaranLabels: Record<MetodePembayaran, string> = {
  cash: 'Tunai',
  transfer: 'Transfer',
  qris: 'QRIS',
  lainnya: 'Lainnya',
};

// Badge warna per domain status — token tema: primary (biru), accent (amber),
// success (hijau), error (merah).
export const statusOrderColors: Record<string, string> = {
  pending: 'bg-accent-50 text-accent-700',
  confirmed: 'bg-primary-50 text-primary-500',
  active: 'bg-primary-100 text-primary-600',
  perlu_verifikasi: 'bg-accent-50 text-accent-700',
  completed: 'bg-success-50 text-success-600',
  cancelled: 'bg-error-50 text-error-600',
};

export const statusPembayaranColors: Record<string, string> = {
  unpaid: 'bg-error-50 text-error-600',
  partial: 'bg-accent-50 text-accent-600',
  paid: 'bg-success-50 text-success-600',
};

export const statusPengirimanColors: Record<string, string> = {
  belum_diambil: 'bg-accent-100 text-accent-700',
  sudah_diantarkan: 'bg-primary-50 text-primary-500',
  dalam_penyewaan: 'bg-primary-100 text-primary-600',
  selesai: 'bg-success-50 text-success-600',
  sudah_dikembalikan: 'bg-success-50 text-success-600',
};

// Status turunan (hasil hitung, bukan enum) — Terlambat.
export const OVERDUE_BADGE = 'bg-error-50 text-error-600';

export const labelStatusOrder = (status: string): string =>
  statusOrderLabels[status as StatusOrder] ?? status;

export const labelStatusPembayaran = (status: string): string =>
  statusPembayaranLabels[status as StatusPembayaran] ?? status;

export const labelStatusPengiriman = (status: string): string =>
  statusPengirimanLabels[status as StatusPengiriman] ?? status;
