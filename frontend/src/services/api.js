import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
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
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;

export const authAPI = {
  login: (data) => api.post('/login', data),
  logout: () => api.post('/logout'),
  me: () => api.get('/me'),
};

export const dashboardAPI = {
  get: () => api.get('/dashboard'),
};

export const kendaraanAPI = {
  list: (params) => api.get('/kendaraans', { params }),
  get: (id) => api.get(`/kendaraans/${id}`),
  create: (data) => api.post('/kendaraans', data),
  update: (id, data) => api.put(`/kendaraans/${id}`, data),
  delete: (id) => api.delete(`/kendaraans/${id}`),
};

export const customerAPI = {
  list: (params) => api.get('/customers', { params }),
  get: (id) => api.get(`/customers/${id}`),
  create: (data) => api.post('/customers', data),
  update: (id, data) => api.put(`/customers/${id}`, data),
  delete: (id) => api.delete(`/customers/${id}`),
};

export const orderAPI = {
  list: (params) => api.get('/orders', { params }),
  get: (id) => api.get(`/orders/${id}`),
  create: (data) => api.post('/orders', data),
  update: (id, data) => api.put(`/orders/${id}`, data),
  updateWithFile: (id, data) => api.post(`/orders/${id}`, data),
  delete: (id) => api.delete(`/orders/${id}`),
};

export const garasiPartnerAPI = {
  list: (params) => api.get('/garasi-partners', { params }),
  get: (id) => api.get(`/garasi-partners/${id}`),
  create: (data) => api.post('/garasi-partners', data),
  update: (id, data) => api.put(`/garasi-partners/${id}`, data),
  delete: (id) => api.delete(`/garasi-partners/${id}`),
  garasiSaya: () => api.get('/garasi-saya'),
};

export const garasiRequestAPI = {
  list: (params) => api.get('/garasi-requests', { params }),
  get: (id) => api.get(`/garasi-requests/${id}`),
  create: (data) => api.post('/garasi-requests', data),
  update: (id, data) => api.put(`/garasi-requests/${id}`, data),
  delete: (id) => api.delete(`/garasi-requests/${id}`),
};

export const katalogAPI = {
  list: (params) => api.get('/katalog', { params }),
  kategoris: () => api.get('/katalog/kategoris'),
  tipes: (params) => api.get('/katalog/tipes', { params }),
  get: (id) => api.get(`/katalog/${id}`),
};

export const kategoriAPI = {
  list: (params) => api.get('/kategoris', { params }),
  get: (id) => api.get(`/kategoris/${id}`),
  create: (data) => api.post('/kategoris', data),
  update: (id, data) => api.put(`/kategoris/${id}`, data),
  delete: (id) => api.delete(`/kategoris/${id}`),
};

export const tipeAPI = {
  list: (params) => api.get('/tipes', { params }),
  get: (id) => api.get(`/tipes/${id}`),
  kendaraans: (id) => api.get(`/tipes/${id}/kendaraans`),
  create: (data) => api.post('/tipes', data),
  update: (id, data) => api.put(`/tipes/${id}`, data),
  delete: (id) => api.delete(`/tipes/${id}`),
};

export const supirCaloAPI = {
  list: (params) => api.get('/supir-calos', { params }),
  get: (id) => api.get(`/supir-calos/${id}`),
  create: (data) => api.post('/supir-calos', data),
  update: (id, data) => api.put(`/supir-calos/${id}`, data),
  delete: (id) => api.delete(`/supir-calos/${id}`),
};

export const laporanAPI = {
  ringkasan: (params) => api.get('/laporan/ringkasan', { params }),
  pendapatan: (params) => api.get('/laporan/pendapatan', { params }),
  kendaraan: (params) => api.get('/laporan/kendaraan', { params }),
  customer: (params) => api.get('/laporan/customer', { params }),
  order: (params) => api.get('/laporan/order', { params }),
  export: (type, format, params) => api.get(`/laporan/export/${type}/${format}`, { params, responseType: 'blob' }),
};
