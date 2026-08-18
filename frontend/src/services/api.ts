import axios, { type AxiosResponse } from 'axios';

/* ─────────────────────────────────────────────────────────────
 * TYPES — ENTITAS UTAMA
 * ─────────────────────────────────────────────────────────────
 * Catatan: interface ini idealnya dipindah ke satu file bersama
 * (mis. resources/js/types/index.ts atau frontend/src/types/index.ts)
 * lalu di-import di sini dan di tiap halaman (Orders.tsx, Customers.tsx,
 * dll) — supaya tidak ada duplikasi definisi Order/Customer/Kendaraan
 * di banyak file. Untuk sekarang didefinisikan di sini dulu.
 * ───────────────────────────────────────────────────────────── */

export interface AuthUser {
  id: number;
  name: string;
  email: string;
}

export interface Customer {
  id: number;
  nama_lengkap: string;
  no_hp: string;
  email: string | null;
  alamat: string | null;
  no_ktp: string | null;
  no_sim: string | null;
  catatan: string | null;
  deleted_at?: string | null;
  foto_ktp: string | null;
  foto_sim: string | null;
  orders_count?: number;
  orders?: Order[];
  latestOrder?: {
    id: number;
    kode_order: string;
    source: string;
    status_order: string;
    harga_total: number;
    tanggal_mulai: string;
    kendaraan?: { nama_kendaraan: string };
  } | null;
}

export interface Kendaraan {
  id: number;
  nama_kendaraan: string;
  plat_nomor: string;
  warna: string;
  foto: string | null;
  harga_sewa_per_hari: number;
  harga_partner_per_hari: number | null;
  margin_per_hari?: number | null;
  margin_persen?: number | null;
  status: string;
  merek?: string;
  model?: string;
  tahun?: number;
  kapasitas_penumpang?: number;
  kategori_id?: number;
  tipe_id?: number;
  garasiPartner?: { nama_partner: string };
  active_orders_count?: number;
  catatan?: string | null;
  garasi_partner_id?: number;
  kategori?: KategoriKendaraan;
  tipe?: TipeKendaraan;
  garasi_partner?: GarasiPartner;
}

export interface SupirCalo {
  id: number;
  user_id?: number | null;
  nama: string;
  no_hp: string;
  jenis: 'supir' | 'calo';
  status: string;
  no_sim?: string | null;
  tarif_per_hari?: number;
  komisi?: number;
}

export interface Pembayaran {
  id: number;
  order_id: number;
  jumlah: number;
  metode_pembayaran: 'cash' | 'transfer' | 'qris' | 'lainnya';
  status: 'dp' | 'pelunasan' | 'refund';
  bukti_transfer: string | null;
  catatan: string | null;
  created_at: string;
}

export interface Order {
  id: number;
  kode_order: string;
  source: string;
  customer_id: number;
  kendaraan_id: number;
  alamat_jemput: string | null;
  tujuan: string | null;
  tanggal_mulai: string;
  tanggal_selesai: string;
  jam_mulai: string | null;
  jam_selesai: string | null;
  harga_per_hari: number;
  harga_total: number;
  durasi_hari: number;
  metode_pembayaran: 'cash' | 'transfer' | 'qris' | 'lainnya' | null;
  status_order: 'pending' | 'confirmed' | 'active' | 'perlu_verifikasi' | 'completed' | 'cancelled';
  status_pembayaran: 'unpaid' | 'partial' | 'paid';
  status_pengiriman: 'belum_diambil' | 'sudah_diantarkan' | 'dalam_penyewaan' | 'sudah_dikembalikan' | 'selesai';
  metode_penyerahan?: 'ambil' | 'antar' | null;
  opsi_supir?: 'dengan_supir' | 'lepas_kunci' | null;
  supir_id: number | null;
  calo_id: number | null;
  operator_id: number | null;
  waktu_klaim: string | null;
  catatan: string | null;
  alasan_pembatalan: string | null;
  bukti_transfer: string | null;
  bukti_pengiriman: string | null;
  bukti_pengembalian: string | null;
  jam_overtime: number;
  denda_overtime: number;
  jam_overtime_saat_ini: number;
  denda_overtime_saat_ini: number;
  tanggal_jatuh_tempo: string | null;
  biaya_pembatalan: number | null;
  total_refund: number | null;
  biaya_kerusakan: number | null;
  operator?: { id: number; name: string; phone: string | null };
  customer?: Customer;
  kendaraan?: Kendaraan;
  supir?: SupirCalo;
  calo?: SupirCalo;
  admin?: { name: string };
  pembayarans?: Pembayaran[];
  created_at?: string;
  updated_at?: string;
}

export interface GarasiPartner {
  id: number;
  nama_partner: string;
  nama_garasi: string;
  no_hp?: string;
  alamat?: string;
  status?: string;
  status_aktif?: boolean;
}

export interface GarasiRequest {
  id: number;
  garasi_partner_id: number;
  kendaraan_id?: number;
  status: string;
  catatan?: string | null;
}

export interface KategoriKendaraan {
  id: number;
  nama_kategori: string;
  slug?: string;
  deskripsi?: string | null;
  aktif?: boolean;
}

export interface TipeKendaraan {
  id: number;
  nama_tipe: string;
  kategori_id: number;
  aktif?: boolean;
}

export interface KatalogItem extends Kendaraan {
  kategori?: KategoriKendaraan;
  tipe?: TipeKendaraan;
  available_for_dates?: boolean;
  active_orders_count?: number;
  estimated_return_date?: string | null;
  rented_from?: string | null;
  rented_until?: string | null;
  rented_from_time?: string | null;
  rented_until_time?: string | null;
}

export interface DashboardSummary {
  total_kendaraan: number;
  kendaraan_tersedia: number;
  order_aktif: number;
  order_pending: number;
  pendapatan_hari_ini: number;
}

/* ─────────────────────────────────────────────────────────────
 * TYPES — WRAPPER RESPONSE
 * ───────────────────────────────────────────────────────────── */
export interface ListResponse<T> {
  data: T[];
  meta?: {
    current_page: number;
    last_page: number;
    total: number;
    per_page: number;
  };
}

export interface SingleResponse<T> {
  data: T;
}

// Payload yang dikirim ke server: object biasa atau FormData (untuk upload file)
type Payload = Record<string, unknown> | FormData;
type QueryParams = Record<string, string | number | boolean | undefined>;

/* ─────────────────────────────────────────────────────────────
 * AXIOS INSTANCE
 * ───────────────────────────────────────────────────────────── */
const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  // Saat kirim FormData (upload file), biarkan browser yang set
  // Content-Type multipart/form-data lengkap dengan boundary-nya sendiri.
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/admin/login';
    }
    return Promise.reject(error);
  }
);

export default api;

/* ─────────────────────────────────────────────────────────────
 * AUTH
 * ───────────────────────────────────────────────────────────── */
export interface LoginPayload {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: AuthUser;
}

export const authAPI = {
  login: (data: LoginPayload): Promise<AxiosResponse<LoginResponse>> => api.post('/login', data),
  logout: (): Promise<AxiosResponse<void>> => api.post('/logout'),
  me: (): Promise<AxiosResponse<SingleResponse<AuthUser>>> => api.get('/me'),
};

/* ─────────────────────────────────────────────────────────────
 * DASHBOARD
 * ───────────────────────────────────────────────────────────── */
export interface ChartPendapatanPoint {
  bulan: string;
  pendapatan: number;
  jumlah_sewa: number;
}

export const dashboardAPI = {
  get: (): Promise<AxiosResponse<SingleResponse<DashboardSummary>>> => api.get('/dashboard'),
  chart: (periode?: string): Promise<AxiosResponse<ChartPendapatanPoint[]>> =>
    api.get('/dashboard/chart', { params: { periode } }),
};

/* ─────────────────────────────────────────────────────────────
 * KENDARAAN
 * ───────────────────────────────────────────────────────────── */
export const kendaraanAPI = {
  list: (params?: QueryParams): Promise<AxiosResponse<ListResponse<Kendaraan>>> => api.get('/kendaraans', { params }),
  get: (id: number): Promise<AxiosResponse<SingleResponse<Kendaraan>>> => api.get(`/kendaraans/${id}`),
  create: (data: Payload): Promise<AxiosResponse<SingleResponse<Kendaraan>>> => api.post('/kendaraans', data),
  update: (id: number, data: Payload): Promise<AxiosResponse<SingleResponse<Kendaraan>>> => api.put(`/kendaraans/${id}`, data),
  // Laravel tidak bisa terima PUT + multipart/form-data langsung dari browser,
  // makanya pakai POST dengan field _method=PUT (method spoofing) saat ada file.
  updateWithFile: (id: number, data: FormData): Promise<AxiosResponse<SingleResponse<Kendaraan>>> => {
    data.append('_method', 'PUT');
    return api.post(`/kendaraans/${id}`, data);
  },
  delete: (id: number): Promise<AxiosResponse<void>> => api.delete(`/kendaraans/${id}`),
};

/* ─────────────────────────────────────────────────────────────
 * CUSTOMER
 * ───────────────────────────────────────────────────────────── */
export const customerAPI = {
  list: (params?: QueryParams): Promise<AxiosResponse<ListResponse<Customer>>> => api.get('/customers', { params }),
  get: (id: number): Promise<AxiosResponse<SingleResponse<Customer>>> => api.get(`/customers/${id}`),
  create: (data: Payload): Promise<AxiosResponse<SingleResponse<Customer>>> => api.post('/customers', data),
  update: (id: number, data: Payload): Promise<AxiosResponse<SingleResponse<Customer>>> => api.put(`/customers/${id}`, data),
  delete: (id: number): Promise<AxiosResponse<void>> => api.delete(`/customers/${id}`),
  restore: (id: number): Promise<AxiosResponse<void>> => api.post(`/customers/${id}/restore`),
};

/* ─────────────────────────────────────────────────────────────
 * SUPIR & CALO  (belum ada sebelumnya — ditambahkan karena
 * sudah dipakai di Orders.tsx: supirCaloAPI.list({ jenis: 'supir' }))
 * ───────────────────────────────────────────────────────────── */
export const supirCaloAPI = {
  list: (params?: QueryParams & { jenis?: 'supir' | 'calo' }): Promise<AxiosResponse<ListResponse<SupirCalo>>> =>
    api.get('/supir-calos', { params }),
  get: (id: number): Promise<AxiosResponse<SingleResponse<SupirCalo>>> => api.get(`/supir-calos/${id}`),
  create: (data: Payload): Promise<AxiosResponse<SingleResponse<SupirCalo>>> => api.post('/supir-calos', data),
  update: (id: number, data: Payload): Promise<AxiosResponse<SingleResponse<SupirCalo>>> => api.put(`/supir-calos/${id}`, data),
  // Laravel tidak bisa terima PUT + multipart/form-data langsung dari browser,
  // makanya pakai POST dengan field _method=PUT (method spoofing) saat ada file.
  updateWithFile: (id: number, data: FormData): Promise<AxiosResponse<SingleResponse<SupirCalo>>> => {
    data.append('_method', 'PUT');
    return api.post(`/supir-calos/${id}`, data);
  },
  delete: (id: number): Promise<AxiosResponse<void>> => api.delete(`/supir-calos/${id}`),
};

/* ─────────────────────────────────────────────────────────────
 * ORDER
 * ───────────────────────────────────────────────────────────── */
export const orderAPI = {
  list: (params?: QueryParams): Promise<AxiosResponse<ListResponse<Order>>> => api.get('/orders', { params }),
  get: (id: number): Promise<AxiosResponse<Order>> => api.get(`/orders/${id}`),
  create: (data: Payload): Promise<AxiosResponse<Order>> => api.post('/orders', data),
  update: (id: number, data: Payload): Promise<AxiosResponse<Order>> => api.put(`/orders/${id}`, data),
  // Laravel tidak bisa terima PUT + multipart/form-data langsung dari browser,
  // makanya pakai POST dengan field _method=PUT (method spoofing) saat ada file.
  updateWithFile: (id: number, data: FormData): Promise<AxiosResponse<Order>> => api.post(`/orders/${id}`, data),
  delete: (id: number): Promise<AxiosResponse<void>> => api.delete(`/orders/${id}`),
  claim: (id: number): Promise<AxiosResponse<{ message: string; order: Order }>> => api.post(`/orders/${id}/claim`),
  release: (id: number): Promise<AxiosResponse<{ message: string; order: Order }>> => api.post(`/orders/${id}/release`),
};

/* ─────────────────────────────────────────────────────────────
 * GARASI PARTNER & REQUEST  (multi-garasi)
 * ───────────────────────────────────────────────────────────── */
export const garasiPartnerAPI = {
  list: (params?: QueryParams): Promise<AxiosResponse<ListResponse<GarasiPartner>>> => api.get('/garasi-partners', { params }),
  get: (id: number): Promise<AxiosResponse<SingleResponse<GarasiPartner>>> => api.get(`/garasi-partners/${id}`),
  create: (data: Payload): Promise<AxiosResponse<SingleResponse<GarasiPartner>>> => api.post('/garasi-partners', data),
  update: (id: number, data: Payload): Promise<AxiosResponse<SingleResponse<GarasiPartner>>> => api.put(`/garasi-partners/${id}`, data),
  delete: (id: number): Promise<AxiosResponse<void>> => api.delete(`/garasi-partners/${id}`),
  garasiSaya: (): Promise<AxiosResponse<SingleResponse<GarasiPartner>>> => api.get('/garasi-saya'),
};

export const garasiRequestAPI = {
  list: (params?: QueryParams): Promise<AxiosResponse<ListResponse<GarasiRequest>>> => api.get('/garasi-requests', { params }),
  get: (id: number): Promise<AxiosResponse<SingleResponse<GarasiRequest>>> => api.get(`/garasi-requests/${id}`),
  create: (data: Payload): Promise<AxiosResponse<SingleResponse<GarasiRequest>>> => api.post('/garasi-requests', data),
  update: (id: number, data: Payload): Promise<AxiosResponse<SingleResponse<GarasiRequest>>> => api.put(`/garasi-requests/${id}`, data),
  delete: (id: number): Promise<AxiosResponse<void>> => api.delete(`/garasi-requests/${id}`),
};

/* ─────────────────────────────────────────────────────────────
 * KATALOG PUBLIK (tanpa login — landing page / halaman katalog)
 * ───────────────────────────────────────────────────────────── */
export interface OrderRequestPayload {
  nama_lengkap: string;
  no_hp: string;
  kendaraan_id: number;
  tanggal_mulai: string;
  tanggal_selesai: string;
  jam_mulai?: string;
  jam_selesai?: string;
  opsi_supir?: 'dengan_supir' | 'lepas_kunci';
  catatan?: string;
}

export interface OrderRequestResponse {
  order: Order;
  wa_link: string;
}

export const katalogAPI = {
  list: (params?: QueryParams): Promise<AxiosResponse<ListResponse<KatalogItem>>> => api.get('/katalog', { params }),
  kategoris: (): Promise<AxiosResponse<ListResponse<KategoriKendaraan>>> => api.get('/katalog/kategoris'),
  tipes: (params?: QueryParams): Promise<AxiosResponse<ListResponse<TipeKendaraan>>> => api.get('/katalog/tipes', { params }),
  get: (id: number, params?: QueryParams): Promise<AxiosResponse<SingleResponse<KatalogItem>>> => api.get(`/katalog/${id}`, { params }),
  orderRequest: (data: OrderRequestPayload): Promise<AxiosResponse<OrderRequestResponse>> => api.post('/katalog/order-request', data),
};

/* ─────────────────────────────────────────────────────────────
 * KATEGORI & TIPE (admin — kelola master data)
 * ───────────────────────────────────────────────────────────── */
export const kategoriAPI = {
  list: (params?: QueryParams): Promise<AxiosResponse<KategoriKendaraan[]>> => api.get('/kategoris', { params }),
  get: (id: number): Promise<AxiosResponse<SingleResponse<KategoriKendaraan>>> => api.get(`/kategoris/${id}`),
  create: (data: Payload): Promise<AxiosResponse<SingleResponse<KategoriKendaraan>>> => api.post('/kategoris', data),
  update: (id: number, data: Payload): Promise<AxiosResponse<SingleResponse<KategoriKendaraan>>> => api.put(`/kategoris/${id}`, data),
  delete: (id: number): Promise<AxiosResponse<void>> => api.delete(`/kategoris/${id}`),
};

export const tipeAPI = {
  list: (params?: QueryParams): Promise<AxiosResponse<TipeKendaraan[]>> => api.get('/tipes', { params }),
  get: (id: number): Promise<AxiosResponse<SingleResponse<TipeKendaraan>>> => api.get(`/tipes/${id}`),
  create: (data: Payload): Promise<AxiosResponse<SingleResponse<TipeKendaraan>>> => api.post('/tipes', data),
  update: (id: number, data: Payload): Promise<AxiosResponse<SingleResponse<TipeKendaraan>>> => api.put(`/tipes/${id}`, data),
  delete: (id: number): Promise<AxiosResponse<void>> => api.delete(`/tipes/${id}`),
};

/* ─────────────────────────────────────────────────────────────
 * LAPORAN
 * ───────────────────────────────────────────────────────────── */
export interface LaporanParams {
  start_date: string;
  end_date: string;
}

export const laporanAPI = {
  ringkasan: (params: LaporanParams): Promise<AxiosResponse<unknown>> => api.get('/laporan/ringkasan', { params }),
  pendapatan: (params: LaporanParams): Promise<AxiosResponse<unknown>> => api.get('/laporan/pendapatan', { params }),
  kendaraan: (params: LaporanParams): Promise<AxiosResponse<unknown>> => api.get('/laporan/kendaraan', { params }),
  customer: (params: LaporanParams): Promise<AxiosResponse<unknown>> => api.get('/laporan/customer', { params }),
  order: (params: LaporanParams): Promise<AxiosResponse<unknown>> => api.get('/laporan/order', { params }),
  bagiHasil: (params: LaporanParams): Promise<AxiosResponse<unknown>> => api.get('/laporan/bagi-hasil', { params }),
  komisiCalo: (params: LaporanParams): Promise<AxiosResponse<unknown>> => api.get('/laporan/komisi-calo', { params }),
  export: (type: string, format: 'csv' | 'xlsx', params: LaporanParams): Promise<AxiosResponse<Blob>> =>
    api.get(`/laporan/export/${type}/${format}`, { params, responseType: 'blob' }),
};

/* ─────────────────────────────────────────────────────────────
 * NOTIFICATIONS (admin — lonceng notifikasi)
 * ───────────────────────────────────────────────────────────── */
export interface AppNotification {
  id: number;
  type: string;
  title: string;
  message: string;
  data?: {
    order_id?: number;
    kode_order?: string;
    customer_name?: string;
    kendaraan_name?: string;
    durasi_hari?: number;
    harga_total?: number;
    [key: string]: unknown;
  };
  read_at: string | null;
  created_at: string;
  updated_at: string;
}

export const notificationAPI = {
  list: (params?: QueryParams): Promise<AxiosResponse<ListResponse<AppNotification>>> =>
    api.get('/notifications', { params }),
  unreadCount: (): Promise<AxiosResponse<{ count: number }>> =>
    api.get('/notifications/unread-count'),
  markAsRead: (id: number): Promise<AxiosResponse<{ message: string }>> =>
    api.patch(`/notifications/${id}/read`),
  markAllAsRead: (): Promise<AxiosResponse<{ message: string }>> =>
    api.patch('/notifications/read-all'),
};

/* ─────────────────────────────────────────────────────────────
 * SETTINGS (konfigurasi bisnis dari backend — single source of truth)
 * ───────────────────────────────────────────────────────────── */
export interface AppSettings {
  overtime_rate_per_hour: number;
  grace_period_minutes: number;
  biaya_dengan_driver_per_hari?: number;
}

export const settingsAPI = {
  get: (): Promise<AxiosResponse<AppSettings>> => api.get('/settings'),
  update: (data: Partial<AppSettings>): Promise<AxiosResponse<{ message: string }>> => api.patch('/settings', data),
};

/* ─────────────────────────────────────────────────────────────
 * ACTIVITY LOG (audit trail)
 * ───────────────────────────────────────────────────────────── */
export interface ActivityLog {
  id: number;
  log_name: string | null;
  description: string;
  subject_type: string | null;
  subject_id: number | null;
  event: string | null;
  causer_type: string | null;
  causer_id: number | null;
  causer?: { id: number; name: string };
  properties: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export const activityLogAPI = {
  list: (params?: QueryParams): Promise<AxiosResponse<ListResponse<ActivityLog>>> =>
    api.get('/activity-log', { params }),
};

/* ─────────────────────────────────────────────────────────────
 * WHATSAPP LOG (riwayat pesan yang diantri / gagal)
 * ───────────────────────────────────────────────────────────── */
export interface WhatsappLog {
  id: number;
  type: string;
  order_id: number | null;
  nomor_tujuan: string;
  pesan: string;
  status_kirim: 'diantri' | 'terkirim' | 'gagal' | 'pending';
  response: string | null;
  created_at: string;
  order?: {
    id: number;
    kode_order: string;
    customer?: { id: number; nama_lengkap: string };
    kendaraan?: { id: number; nama_kendaraan: string };
  } | null;
}

export const whatsappLogAPI = {
  list: (params?: QueryParams): Promise<AxiosResponse<ListResponse<WhatsappLog>>> =>
    api.get('/whatsapp-logs', { params }),
  retry: (id: number): Promise<AxiosResponse<{ message: string }>> =>
    api.post(`/whatsapp-logs/${id}/retry`),
};

/* ─────────────────────────────────────────────────────────────
 * USERS (admin manajemen user)
 * ───────────────────────────────────────────────────────────── */
export interface AppUser {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  role: 'admin_utama' | 'admin_operasional' | 'petugas';
  avatar: string | null;
  supir_calo?: { id: number; no_sim: string | null; tarif_per_hari: string | number | null } | null;
  created_at: string;
}

export const userAPI = {
  list: (params?: QueryParams): Promise<AxiosResponse<ListResponse<AppUser>>> => api.get('/users', { params }),
  get: (id: number): Promise<AxiosResponse<SingleResponse<AppUser>>> => api.get(`/users/${id}`),
  create: (data: Payload): Promise<AxiosResponse<SingleResponse<AppUser>>> => api.post('/users', data),
  update: (id: number, data: Payload): Promise<AxiosResponse<SingleResponse<AppUser>>> => api.put(`/users/${id}`, data),
  delete: (id: number): Promise<AxiosResponse<void>> => api.delete(`/users/${id}`),
};

/* ─────────────────────────────────────────────────────────────
 * INSPEKSI KENDARAAN (pickup / return)
 * ───────────────────────────────────────────────────────────── */
export interface InspeksiKendaraan {
  id: number;
  order_id: number;
  jenis: 'pickup' | 'return';
  status?: 'draft' | 'final';
  odometer: number | null;
  fuel_level: 'kosong' | '1/8' | '1/4' | '3/8' | '1/2' | '5/8' | '3/4' | '7/8' | 'full';
  kondisi_body: 'baik' | 'lecet_ringan' | 'lecet_parah' | 'penyok' | 'retak';
  kondisi_interior: 'baik' | 'kotor_ringan' | 'kotor_banyak' | 'rusak' | null;
  kondisi_ban: 'baik' | 'tipis' | 'gundul' | 'kosong' | null;
  kondisi_ac: 'baik' | 'tidak_baik' | null;
  kondisi_lampu: 'baik' | 'tidak_baik' | null;
  ada_damagenya: boolean;
  deskripsi_kondisi: string | null;
  catatan: string | null;
  foto: string | null;
  fotos: string[] | null;
  videos: string[] | null;
  checklist_serah_terima: string[] | null;
  ttd_customer: string | null;
  ttd_petugas: string | null;
  biaya_kerusakan: string | number | null;
  inspeksi_oleh: string | null;
  admin_id: number | null;
  admin?: { id: number; name: string };
  order?: Order;
  created_at: string;
  updated_at: string;
}

export const inspeksiAPI = {
  list: (params?: QueryParams): Promise<AxiosResponse<ListResponse<InspeksiKendaraan>>> => api.get('/inspeksi-kendaraans', { params }),
  get: (id: number): Promise<AxiosResponse<InspeksiKendaraan>> => api.get(`/inspeksi-kendaraans/${id}`),
  create: (data: FormData): Promise<AxiosResponse<InspeksiKendaraan>> => api.post('/inspeksi-kendaraans', data),
  update: (id: number, data: FormData): Promise<AxiosResponse<InspeksiKendaraan>> => {
    data.append('_method', 'PUT');
    return api.post(`/inspeksi-kendaraans/${id}`, data);
  },
  delete: (id: number): Promise<AxiosResponse<void>> => api.delete(`/inspeksi-kendaraans/${id}`),
  byOrder: (orderId: number): Promise<AxiosResponse<InspeksiKendaraan[]>> => api.get(`/orders/${orderId}/inspeksi`),
  tasks: (): Promise<AxiosResponse<(Order & { task_jenis: 'inspeksi_pickup' | 'kirim_kendaraan' | 'return' })[]>> => api.get('/inspeksi-tasks'),
  kirim: (orderId: number, data: FormData): Promise<AxiosResponse<InspeksiKendaraan>> => api.post(`/orders/${orderId}/kirim`, data),
  kembali: (orderId: number, data: FormData): Promise<AxiosResponse<InspeksiKendaraan>> => api.post(`/orders/${orderId}/kembali`, data),
  perbaikiTtd: (id: number, data: FormData): Promise<AxiosResponse<InspeksiKendaraan>> => api.post(`/inspeksi-kendaraans/${id}/perbaiki-ttd`, data),
};

/* ─────────────────────────────────────────────────────────────
 * GPS (pelacakan kendaraan via perangkat tracker)
 * ───────────────────────────────────────────────────────────── */
export interface GpsVehicleLive {
  kendaraan_id: number;
  plat_nomor: string;
  nama_kendaraan: string;
  status_sewa: string;
  driver: string | null;
  device_id: number;
  status: 'bergerak' | 'diam' | 'offline';
  speed_kmh: number;
  fuel_percent: number | null;
  last_update: string;
  lat: number;
  lng: number;
}

export interface GpsHistoryPoint {
  lat: number;
  lng: number;
  speed_kmh: number;
  fuel_percent: number | null;
  recorded_at: string;
}

export interface GpsDevice {
  id: number;
  kendaraan_id: number;
  api_key: string;
  device_identifier: string | null;
  nama_perangkat: string | null;
  status_aktif: boolean;
  catatan: string | null;
  kendaraan?: { id: number; nama_kendaraan: string; plat_nomor: string };
  created_at: string;
}

export const gpsAPI = {
  latest: (): Promise<AxiosResponse<{ data: GpsVehicleLive[] }>> => api.get('/gps/latest'),
  history: (kendaraanId: number, params?: { from?: string; to?: string; limit?: number }): Promise<AxiosResponse<{ data: GpsHistoryPoint[] }>> =>
    api.get(`/gps/kendaraans/${kendaraanId}/history`, { params }),
  devices: (): Promise<AxiosResponse<{ data: GpsDevice[] }>> => api.get('/gps-devices'),
  createDevice: (data: Payload): Promise<AxiosResponse<GpsDevice>> => api.post('/gps-devices', data),
  updateDevice: (id: number, data: Payload): Promise<AxiosResponse<GpsDevice>> => api.put(`/gps-devices/${id}`, data),
  deleteDevice: (id: number): Promise<AxiosResponse<{ message: string }>> => api.delete(`/gps-devices/${id}`),
  push: (data: {
    api_key: string;
    lat: number;
    lng: number;
    speed_kmh?: number;
    fuel_percent?: number;
    recorded_at?: string;
  }): Promise<AxiosResponse<unknown>> => api.post('/gps/push', data),
};