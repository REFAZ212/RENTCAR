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
  foto_ktp: string | null;
  foto_sim: string | null;
  orders_count?: number;
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
  nama: string;
  no_hp: string;
  jenis: 'supir' | 'calo';
  status: string;
  tarif_per_hari?: number;
  komisi?: number;
}

export interface Pembayaran {
  id: number;
  order_id: number;
  jumlah: number;
  metode_pembayaran: 'cash' | 'transfer' | 'qris' | 'lainnya';
  status: 'dp' | 'pelunasan';
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
  status_order: 'pending' | 'confirmed' | 'active' | 'completed' | 'cancelled';
  status_pembayaran: 'unpaid' | 'partial' | 'paid';
  status_pengiriman: 'belum_diambil' | 'sudah_diantarkan' | 'dalam_penyewaan' | 'selesai';
  supir_id: number | null;
  calo_id: number | null;
  catatan: string | null;
  bukti_transfer: string | null;
  bukti_pengiriman: string | null;
  bukti_pengembalian: string | null;
  jam_overtime: number;
  denda_overtime: number;
  jam_overtime_saat_ini: number;
  denda_overtime_saat_ini: number;
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
}

export const settingsAPI = {
  get: (): Promise<AxiosResponse<AppSettings>> => api.get('/settings'),
  update: (data: Partial<AppSettings>): Promise<AxiosResponse<{ message: string }>> => api.patch('/settings', data),
};