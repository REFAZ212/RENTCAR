import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { orderAPI, customerAPI, kendaraanAPI } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import ConfirmModal from '../components/ConfirmModal';

const statusOrderOptions = ['pending', 'confirmed', 'active', 'completed', 'cancelled'];
const statusPembayaranOptions = ['unpaid', 'partial', 'paid'];
const statusPengirimanOptions = ['belum_diambil', 'sudah_diantarkan', 'dalam_penyewaan', 'selesai'];

// Status pengiriman yang mewajibkan bukti foto kendaraan diunggah.
const statusPengirimanButuhBukti = ['sudah_diantarkan', 'dalam_penyewaan'];

// Tarif denda keterlambatan per jam. Harus selalu sama dengan
// App\Models\Order::OVERTIME_RATE_PER_HOUR di backend.
const OVERTIME_RATE_PER_HOUR = 25000;

const statusOrderLabels = {
  pending: 'Menunggu',
  confirmed: 'Dikonfirmasi',
  active: 'Aktif',
  completed: 'Selesai',
  cancelled: 'Dibatalkan',
};

const statusPembayaranLabels = {
  unpaid: 'Belum Bayar',
  partial: 'DP / Sebagian',
  paid: 'Lunas',
};

const statusPengirimanLabels = {
  belum_diambil: 'Belum Diambil',
  sudah_diantarkan: 'Sudah Diantarkan',
  dalam_penyewaan: 'Dalam Penyewaan',
  selesai: 'Selesai',
};

const metodePembayaranLabels = {
  cash: 'Tunai',
  transfer: 'Transfer',
  qris: 'QRIS',
  lainnya: 'Lainnya',
};

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-blue-100 text-blue-800',
  active: 'bg-green-100 text-green-800',
  completed: 'bg-gray-100 text-gray-600',
  cancelled: 'bg-red-100 text-red-800',
  unpaid: 'bg-red-100 text-red-800',
  partial: 'bg-yellow-100 text-yellow-800',
  paid: 'bg-green-100 text-green-800',
  belum_diambil: 'bg-orange-100 text-orange-800',
  sudah_diantarkan: 'bg-blue-100 text-blue-800',
  dalam_penyewaan: 'bg-purple-100 text-purple-800',
  selesai: 'bg-gray-100 text-gray-600',
};

const emptyForm = {
  customer_id: '',
  kendaraan_id: '',
  tanggal_mulai: '',
  tanggal_selesai: '',
  jam_mulai: '08:00',
  jam_selesai: '17:00',
  harga_per_hari: '',
  metode_pembayaran: 'cash',
  status_order: 'confirmed',
  status_pembayaran: 'unpaid',
  status_pengiriman: 'belum_diambil',
  catatan: '',
};

const formatRupiah = (n) => `Rp ${Number(n || 0).toLocaleString('id-ID')}`;

const fmtDate = (d) => {
  if (!d) return '-';
  const s = typeof d === 'string' ? d.split('T')[0] : d;
  return s || '-';
};

const fmtTime = (t) => {
  if (!t) return '';
  return t.length > 5 ? t.substring(0, 5) : t;
};

const PencilIcon = () => (
  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
);

const EyeIcon = () => (
  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
);

const TrashIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
);

const CloseIcon = ({ className = 'w-5 h-5' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
);

const UploadBox = ({ label, hint, fileName, onFile, icon }) => (
  <label className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-colors">
    {icon}
    <div className="text-center">
      <p className="text-sm text-gray-600">{fileName || label}</p>
      <p className="text-xs text-gray-400">{hint}</p>
    </div>
    <input type="file" accept="image/*" className="hidden" onChange={(e) => onFile(e.target.files[0])} />
  </label>
);

const ImagePreview = ({ src, onRemove }) => (
  <div className="mb-2 relative inline-block">
    <img src={src} alt="Preview" className="w-32 h-32 object-cover rounded-xl border border-gray-200" />
    {onRemove && (
      <button type="button" onClick={onRemove}
        className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors">
        <CloseIcon className="w-3 h-3" />
      </button>
    )}
  </div>
);

const StatChip = ({ label, value, iconBg, icon }) => (
  <div className="flex items-center gap-3 bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 px-4 py-3">
    <div className={`w-9 h-9 rounded-lg ${iconBg} flex items-center justify-center shrink-0`}>
      <svg className="w-4.5 h-4.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon} />
      </svg>
              </div>
    <div>
      <p className="text-lg font-bold text-gray-900 leading-tight">{value}</p>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  </div>
);

export default function Orders() {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [kendaraans, setKendaraans] = useState([]);
  const [allKendaraans, setAllKendaraans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPengiriman, setFilterPengiriman] = useState('');
  const [filterPembayaran, setFilterPembayaran] = useState('');
  const [search, setSearch] = useState('');
  const debounceRef = useRef(null);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [kendaraanSearch, setKendaraanSearch] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);
  const [confirmComplete, setConfirmComplete] = useState(null);
  const [completeFile, setCompleteFile] = useState(null);
  const [completeFilePreview, setCompleteFilePreview] = useState(null);
  const [completePaymentFile, setCompletePaymentFile] = useState(null);
  const [completePaymentPreview, setCompletePaymentPreview] = useState(null);
  const [detailOrder, setDetailOrder] = useState(null);
  const [invoiceOrder, setInvoiceOrder] = useState(null);
  const [buktiBaruFile, setBuktiBaruFile] = useState(null);
  const [buktiBaruPreview, setBuktiBaruPreview] = useState(null);
  const [showEditForm, setShowEditForm] = useState(false);
  const [isSewakan, setIsSewakan] = useState(false);
  const [editKendaraanSearch, setEditKendaraanSearch] = useState('');
  const [editingOrder, setEditingOrder] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [editBuktiFile, setEditBuktiFile] = useState(null);
  const [editBuktiPreview, setEditBuktiPreview] = useState(null);
  const [editBuktiNewPreview, setEditBuktiNewPreview] = useState(null);
  const [editBuktiPengirimanFile, setEditBuktiPengirimanFile] = useState(null);
  const [editBuktiPengirimanPreview, setEditBuktiPengirimanPreview] = useState(null);
  const [editBuktiPengirimanNewPreview, setEditBuktiPengirimanNewPreview] = useState(null);

  // Revoke semua blob preview URL saat komponen di-unmount, biar tidak numpuk di memori.
  useEffect(() => {
    return () => {
      if (buktiBaruPreview) URL.revokeObjectURL(buktiBaruPreview);
      if (editBuktiNewPreview) URL.revokeObjectURL(editBuktiNewPreview);
      if (editBuktiPengirimanNewPreview) URL.revokeObjectURL(editBuktiPengirimanNewPreview);
      if (completeFilePreview) URL.revokeObjectURL(completeFilePreview);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(debounceRef.current);
  }, [search]);

  const load = useCallback(() => {
    setLoading(true);
    const params = { search: debouncedSearch };
    if (filterStatus) params.status_order = filterStatus;
    if (filterPembayaran) params.status_pembayaran = filterPembayaran;
    if (filterPengiriman) params.status_pengiriman = filterPengiriman;
    orderAPI.list(params)
      .then(({ data }) => setItems(data.data))
      .catch(() => toast.error('Gagal memuat data order'))
      .finally(() => setLoading(false));
  }, [debouncedSearch, filterStatus, filterPembayaran, filterPengiriman, toast]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    customerAPI.list().then(({ data }) => setCustomers(data.data)).catch(() => {});
    kendaraanAPI.list({ status: 'tersedia' }).then(({ data }) => setKendaraans(data.data)).catch(() => {});
    kendaraanAPI.list().then(({ data }) => setAllKendaraans(data.data)).catch(() => {});
  }, []);

  // Ringkasan cepat dari data yang sedang ditampilkan (mengikuti filter aktif).
  const stats = useMemo(() => ({
    total: items.length,
    aktif: items.filter((i) => i.status_order === 'active').length,
    menunggu: items.filter((i) => i.status_order === 'pending').length,
    terlambat: items.filter((i) => i.status_order === 'active' && i.jam_overtime_saat_ini > 0).length,
  }), [items]);

  // Order yang sedang aktif TAPI sudah lewat batas waktu pengembalian.
  const overdueItems = useMemo(
    () => items.filter((i) => i.status_order === 'active' && i.jam_overtime_saat_ini > 0),
    [items]
  );
  const [alertDismissed, setAlertDismissed] = useState(false);
  // Munculkan lagi alert-nya tiap kali data baru dimuat ulang (mis. ada order baru yang telat).
  useEffect(() => { setAlertDismissed(false); }, [items]);

  const closeCreateModal = () => {
    setShowForm(false);
    setKendaraanSearch('');
    if (buktiBaruPreview) URL.revokeObjectURL(buktiBaruPreview);
    setBuktiBaruFile(null);
    setBuktiBaruPreview(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (buktiBaruFile) {
        const fd = new FormData();
        Object.entries(form).forEach(([k, v]) => { if (v !== '' && v !== null && v !== undefined) fd.append(k, v); });
        fd.append('bukti_transfer', buktiBaruFile);
        await orderAPI.create(fd);
      } else {
        await orderAPI.create(form);
      }
      toast.success('Order berhasil ditambahkan');
      setForm(emptyForm);
      closeCreateModal();
      load();
    } catch (err) {
      const msg = err.response?.data?.message || Object.values(err.response?.data?.errors || {})[0]?.[0] || 'Gagal membuat order';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleInlineUpdate = async (id, field, value) => {
    try {
      const { data } = await orderAPI.update(id, { [field]: value });
      setItems((prev) => prev.map((item) => item.id === id ? { ...item, ...data } : item));
      toast.success('Order berhasil diperbarui');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal memperbarui order');
      load();
    }
  };

  const handleDelete = async () => {
    try {
      await orderAPI.delete(confirmDelete.id);
      toast.success('Order berhasil dihapus');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal menghapus order');
    }
    setConfirmDelete(null);
  };

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleKendaraanSelect = (id) => {
    const k = [...kendaraans, ...allKendaraans].find((x) => x.id == id);
    setForm((prev) => ({ ...prev, kendaraan_id: id, harga_per_hari: k?.harga_sewa_per_hari || '' }));
  };

  const durasiHari = (() => {
    if (form.tanggal_mulai && form.tanggal_selesai) {
      const mulai = new Date(`${form.tanggal_mulai}T${form.jam_mulai || '00:00'}`);
      const selesai = new Date(`${form.tanggal_selesai}T${form.jam_selesai || '23:59'}`);
      const diffMs = selesai - mulai;
      const diff = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      return Math.max(diff, 1);
    }
    return 0;
  })();

  const hargaTotal = durasiHari * (Number(form.harga_per_hari) || 0);

  /**
   * Buka modal edit. Dipakai baik untuk edit biasa (pensil) maupun aksi cepat
   * "Sewakan" (dulu 2 blok kode terpisah yang isinya nyaris identik).
   */
  const openEditModal = (item, { sewakan = false } = {}) => {
    setIsSewakan(sewakan);
    setEditingOrder(item);
    setEditForm({
      customer_id: item.customer_id,
      kendaraan_id: item.kendaraan_id,
      tanggal_mulai: fmtDate(item.tanggal_mulai),
      tanggal_selesai: fmtDate(item.tanggal_selesai),
      jam_mulai: fmtTime(item.jam_mulai) || '08:00',
      jam_selesai: fmtTime(item.jam_selesai) || '17:00',
      status_order: sewakan ? 'active' : item.status_order,
      status_pembayaran: item.status_pembayaran,
      metode_pembayaran: item.metode_pembayaran || 'cash',
      status_pengiriman: sewakan ? 'dalam_penyewaan' : item.status_pengiriman,
      catatan: item.catatan || '',
    });
    setEditBuktiFile(null);
    setEditBuktiPreview(item.bukti_transfer ? `/storage/${item.bukti_transfer}` : null);
    setEditBuktiNewPreview(null);
    setEditBuktiPengirimanFile(null);
    setEditBuktiPengirimanPreview(item.bukti_pengiriman ? `/storage/${item.bukti_pengiriman}` : null);
    setEditBuktiPengirimanNewPreview(null);
    setShowEditForm(true);
  };

  const closeEditModal = () => {
    setShowEditForm(false);
    setEditingOrder(null);
    setEditForm({});
    setEditKendaraanSearch('');
    if (editBuktiNewPreview) URL.revokeObjectURL(editBuktiNewPreview);
    setEditBuktiFile(null);
    setEditBuktiPreview(null);
    setEditBuktiNewPreview(null);
    if (editBuktiPengirimanNewPreview) URL.revokeObjectURL(editBuktiPengirimanNewPreview);
    setEditBuktiPengirimanFile(null);
    setEditBuktiPengirimanPreview(null);
    setEditBuktiPengirimanNewPreview(null);
  };

  const setEditField = (key, value) => setEditForm((prev) => ({ ...prev, [key]: value }));

  const editHargaPerHari = (() => {
    if (!editForm.kendaraan_id) return 0;
    const k = allKendaraans.find((x) => x.id == editForm.kendaraan_id);
    return k ? Number(k.harga_sewa_per_hari) : 0;
  })();

  const editDurasi = (() => {
    if (editForm.tanggal_mulai && editForm.tanggal_selesai) {
      const mulai = new Date(`${editForm.tanggal_mulai}T${editForm.jam_mulai || '00:00'}`);
      const selesai = new Date(`${editForm.tanggal_selesai}T${editForm.jam_selesai || '23:59'}`);
      const diffMs = selesai - mulai;
      const diff = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      return Math.max(diff, 1);
    }
    return 0;
  })();

  const editTotal = editDurasi * editHargaPerHari;

  const handleEditKendaraanSelect = (id) => {
    setEditForm((prev) => ({ ...prev, kendaraan_id: id }));
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();

    // Validasi: kalau status pengiriman menandakan kendaraan sudah keluar,
    // wajib ada bukti foto — baik yang lama (masih tersimpan) atau file baru.
    const butuhBuktiPengiriman = statusPengirimanButuhBukti.includes(editForm.status_pengiriman);
    const sudahAdaBuktiPengiriman = editBuktiPengirimanFile || editBuktiPengirimanPreview;
    if (butuhBuktiPengiriman && !sudahAdaBuktiPengiriman) {
      toast.error('Bukti foto pengiriman wajib diunggah untuk status pengiriman ini');
      return;
    }

    setSubmitting(true);
    try {
      let res;
      const hasFile = editBuktiFile || editBuktiPengirimanFile;
      if (hasFile) {
        const fd = new FormData();
        fd.append('_method', 'PUT');
        Object.entries(editForm).forEach(([k, v]) => { if (v !== '' && v !== null && v !== undefined) fd.append(k, v); });
        if (editBuktiFile) fd.append('bukti_transfer', editBuktiFile);
        if (editBuktiPengirimanFile) fd.append('bukti_pengiriman', editBuktiPengirimanFile);
        res = await orderAPI.updateWithFile(editingOrder.id, fd);
      } else {
        res = await orderAPI.update(editingOrder.id, editForm);
      }
      setItems((prev) => prev.map((item) => item.id === editingOrder.id ? { ...item, ...res.data } : item));
      toast.success('Order berhasil diperbarui');
      closeEditModal();
      load();
      kendaraanAPI.list({ status: 'tersedia' }).then(({ data }) => setKendaraans(data.data)).catch(() => {});
    } catch (err) {
      const msg = err.response?.data?.message || Object.values(err.response?.data?.errors || {})[0]?.[0] || 'Gagal memperbarui order';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCompleteOrder = async () => {
    if (!completeFile) { toast.error('Foto pengembalian wajib diunggah'); return; }
    const needsPaymentProof = confirmComplete?.status_pembayaran !== 'paid' || (confirmComplete?.jam_overtime_saat_ini > 0 && !confirmComplete?.jam_overtime);
    if (needsPaymentProof && !completePaymentFile) { toast.error('Bukti pembayaran wajib diunggah'); return; }
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('status_order', 'completed');
      fd.append('status_pengiriman', 'selesai');
      fd.append('status_pembayaran', 'paid');
      fd.append('bukti_pengembalian', completeFile);
      if (completePaymentFile) {
        fd.append('bukti_transfer', completePaymentFile);
      }
      fd.append('_method', 'PUT');
      await orderAPI.updateWithFile(confirmComplete.id, fd);
      toast.success('Order berhasil diselesaikan');
      closeCompleteModal();
      load();
      kendaraanAPI.list({ status: 'tersedia' }).then(({ data }) => setKendaraans(data.data)).catch(() => {});
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal menyelesaikan order');
    } finally {
      setSubmitting(false);
    }
  };

  const closeCompleteModal = () => {
    setConfirmComplete(null);
    if (completeFilePreview) URL.revokeObjectURL(completeFilePreview);
    setCompleteFile(null);
    setCompleteFilePreview(null);
    if (completePaymentPreview) URL.revokeObjectURL(completePaymentPreview);
    setCompletePaymentFile(null);
    setCompletePaymentPreview(null);
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 p-6 sm:p-7 text-white shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5">
          <div>
            <h1 className="text-2xl font-bold">Orders</h1>
            <p className="text-blue-100 text-sm mt-1">Kelola pemesanan, pembayaran, dan status pengiriman kendaraan.</p>
          </div>
          <button onClick={() => { setForm(emptyForm); setShowForm(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-white text-blue-700 text-sm font-semibold rounded-lg hover:bg-blue-50 transition-colors shadow-sm">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Buat Order Baru
          </button>
        </div>
      </div>

      {overdueItems.length > 0 && !alertDismissed && (
        <div className="rounded-2xl bg-red-50 border border-red-200 p-4 sm:p-5 animate-fade-in">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-red-500 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M4.93 19h14.14a1 1 0 00.87-1.5L12.87 4.5a1 1 0 00-1.74 0L4.06 17.5A1 1 0 004.93 19z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-red-800">
                  {overdueItems.length} order terlambat dikembalikan
                </h3>
                <button onClick={() => setAlertDismissed(true)}
                  className="p-1 text-red-400 hover:text-red-600 hover:bg-red-100 rounded-lg transition-colors shrink-0" title="Tutup">
                  <CloseIcon className="w-4 h-4" />
                </button>
              </div>
              <div className="mt-2.5 space-y-1.5">
                {overdueItems.slice(0, 5).map((item) => (
                  <div key={item.id} className="flex items-center justify-between gap-3 text-xs bg-white/70 rounded-lg px-3 py-2">
                    <div className="min-w-0 truncate">
                      <span className="font-mono font-semibold text-red-900">{item.kode_order}</span>
                      <span className="text-red-700"> — {item.customer?.nama_lengkap} · {item.kendaraan?.nama_kendaraan}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-medium text-red-700 whitespace-nowrap">
                        {item.jam_overtime_saat_ini} jam · {formatRupiah(item.denda_overtime_saat_ini)}
                      </span>
                      <button onClick={() => setConfirmComplete(item)}
                        className="px-2.5 py-1 bg-red-600 text-white text-xs font-medium rounded-md hover:bg-red-700 transition-colors whitespace-nowrap">
                        Selesaikan
                      </button>
                    </div>
                  </div>
                ))}
                {overdueItems.length > 5 && (
                  <p className="text-xs text-red-600 pl-1">+{overdueItems.length - 5} order lainnya juga terlambat</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatChip label="Total Order" value={stats.total} iconBg="bg-blue-500"
          icon="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        <StatChip label="Sedang Aktif" value={stats.aktif} iconBg="bg-green-500"
          icon="M13 10V3L4 14h7v7l9-11h-7z" />
        <StatChip label="Menunggu" value={stats.menunggu} iconBg="bg-yellow-500"
          icon="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        <StatChip label="Terlambat" value={stats.terlambat} iconBg="bg-red-500"
          icon="M12 9v2m0 4h.01M4.93 19h14.14a1 1 0 00.87-1.5L12.87 4.5a1 1 0 00-1.74 0L4.06 17.5A1 1 0 004.93 19z" />
      </div>

      <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <input type="text" placeholder="Cari kode, nama, plat..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm transition" />
        </div>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm">
          <option value="">Semua Status</option>
          {statusOrderOptions.map((s) => <option key={s} value={s}>{statusOrderLabels[s]}</option>)}
        </select>
        <select value={filterPengiriman} onChange={(e) => setFilterPengiriman(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm">
          <option value="">Semua Pengiriman</option>
          {statusPengirimanOptions.map((s) => <option key={s} value={s}>{statusPengirimanLabels[s]}</option>)}
        </select>
        <select value={filterPembayaran} onChange={(e) => setFilterPembayaran(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm">
          <option value="">Semua Pembayaran</option>
          {statusPembayaranOptions.map((s) => <option key={s} value={s}>{statusPembayaranLabels[s]}</option>)}
        </select>
      </div>

      {/* Create Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in" onClick={closeCreateModal}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <h2 className="text-lg font-semibold text-gray-900">Buat Order Baru</h2>
              <button onClick={closeCreateModal} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
                <CloseIcon />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Customer *</label>
                  <select value={form.customer_id} onChange={(e) => setField('customer_id', e.target.value)} required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm">
                    <option value="">Pilih Customer</option>
                    {customers.map((c) => <option key={c.id} value={c.id}>{c.nama_lengkap} — {c.no_hp}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kendaraan *</label>
                {kendaraans.length === 0 ? (
                  <p className="text-sm text-gray-400 italic">Tidak ada kendaraan tersedia</p>
                ) : (
                  <>
                    <div className="relative mb-2">
                      <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                      <input type="text" value={kendaraanSearch} onChange={(e) => setKendaraanSearch(e.target.value)}
                        placeholder="Cari nama, plat, atau warna..."
                        className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm" />
                      {kendaraanSearch && (
                        <button type="button" onClick={() => setKendaraanSearch('')}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      )}
                    </div>
                    {(() => {
                      const filtered = kendaraans.filter((k) => {
                        if (!kendaraanSearch) return true;
                        const q = kendaraanSearch.toLowerCase();
                        return k.nama_kendaraan.toLowerCase().includes(q)
                          || k.plat_nomor.toLowerCase().includes(q)
                          || (k.warna && k.warna.toLowerCase().includes(q));
                      });
                      if (filtered.length === 0) {
                        return <p className="text-sm text-gray-400 italic py-4 text-center">Tidak ada kendaraan yang cocok</p>;
                      }
                      return (
                        <div className="relative group">
                          <div className="flex gap-3 overflow-x-auto pb-2 scroll-smooth snap-x snap-mandatory" style={{ scrollbarWidth: 'none' }}>
                            {filtered.map((k) => {
                              const selected = form.kendaraan_id == k.id;
                              return (
                                <div key={k.id} onClick={() => handleKendaraanSelect(k.id)}
                                  className={`snap-start cursor-pointer shrink-0 w-44 rounded-xl border-2 transition-all ${selected ? 'border-blue-500 ring-2 ring-blue-200 bg-blue-50/50' : 'border-gray-200 hover:border-blue-300 hover:shadow-sm'}`}>
                                  <div className="aspect-[4/3] bg-gray-100 rounded-t-[10px] overflow-hidden flex items-center justify-center">
                                    {k.foto ? (
                                      <img src={k.foto.startsWith('http') ? k.foto : `/storage/${k.foto}`}
                                        alt={k.nama_kendaraan} className="w-full h-full object-cover" />
                                    ) : (
                                      <svg className="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 17h.01M16 17h.01M3 11l1.5-5A2 2 0 016.4 4h11.2a2 2 0 011.9 1.4L21 11M3 11h18M3 11v6a1 1 0 001 1h1a1 1 0 001-1v-1h12v1a1 1 0 001 1h1a1 1 0 001-1v-6" /></svg>
                                    )}
                                  </div>
                                  <div className="p-3 space-y-1">
                                    <p className="text-sm font-semibold text-gray-900 leading-tight truncate">{k.nama_kendaraan}</p>
                                    <p className="text-xs font-mono text-gray-500">{k.plat_nomor}</p>
                                    <div className="flex items-center gap-1.5">
                                      <span className="w-2.5 h-2.5 rounded-full border border-gray-200 shrink-0" style={{ backgroundColor: k.warna }} />
                                      <span className="text-xs text-gray-400 truncate">{k.warna}</span>
                                    </div>
                                    <p className="text-xs font-bold text-blue-600">{formatRupiah(k.harga_sewa_per_hari)}/hari</p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })()}
                  </>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Mulai *</label>
                  <input type="date" value={form.tanggal_mulai} onChange={(e) => setField('tanggal_mulai', e.target.value)} required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Jam Mulai</label>
                  <input type="time" value={form.jam_mulai} onChange={(e) => setField('jam_mulai', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Selesai *</label>
                  <input type="date" value={form.tanggal_selesai} onChange={(e) => setField('tanggal_selesai', e.target.value)} required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Jam Selesai</label>
                  <input type="time" value={form.jam_selesai} onChange={(e) => setField('jam_selesai', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Harga/Hari (Rp)</label>
                  <input type="number" value={form.harga_per_hari} readOnly
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-500 text-sm cursor-not-allowed" />
                  <p className="text-xs text-gray-400 mt-0.5">Otomatis dari harga kendaraan</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Metode Bayar</label>
                  <select value={form.metode_pembayaran} onChange={(e) => setField('metode_pembayaran', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm">
                    <option value="cash">Tunai</option>
                    <option value="transfer">Transfer</option>
                    <option value="qris">QRIS</option>
                    <option value="lainnya">Lainnya</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status Bayar</label>
                  <select value={form.status_pembayaran} onChange={(e) => setField('status_pembayaran', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm">
                    {statusPembayaranOptions.map((s) => <option key={s} value={s}>{statusPembayaranLabels[s]}</option>)}
                  </select>
                </div>
              </div>
              {form.tanggal_mulai && form.tanggal_selesai && form.harga_per_hari ? (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                  <div className="flex items-center justify-between text-sm text-blue-700 mb-2">
                    <span>{durasiHari} hari x {formatRupiah(form.harga_per_hari)}/hari</span>
                    <span className="text-xs text-blue-500">{form.tanggal_mulai} s/d {form.tanggal_selesai}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-blue-700">Total</span>
                    <span className="text-xl font-bold text-blue-800">{formatRupiah(hargaTotal)}</span>
                  </div>
                </div>
              ) : null}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Catatan</label>
                <textarea value={form.catatan} onChange={(e) => setField('catatan', e.target.value)} rows="2"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm resize-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bukti Pembayaran</label>
                <UploadBox
                  label="Klik atau seret bukti pembayaran ke sini"
                  hint="JPG, PNG, maks 2MB (opsional)"
                  fileName={buktiBaruFile?.name}
                  icon={<svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
                  onFile={(f) => {
                    if (!f) return;
                    if (buktiBaruPreview) URL.revokeObjectURL(buktiBaruPreview);
                    setBuktiBaruFile(f);
                    setBuktiBaruPreview(URL.createObjectURL(f));
                  }}
                />
                {buktiBaruPreview && (
                  <ImagePreview src={buktiBaruPreview} onRemove={() => {
                    URL.revokeObjectURL(buktiBaruPreview);
                    setBuktiBaruFile(null);
                    setBuktiBaruPreview(null);
                  }} />
                )}
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button type="button" onClick={closeCreateModal} className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">Batal</button>
                <button type="submit" disabled={submitting}
                  className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-2">
                  {submitting && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  Buat Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Form Modal */}
      {showEditForm && editingOrder && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in" onClick={closeEditModal}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{isSewakan ? 'Form Penyewaan' : 'Edit Order'}</h2>
                <p className="text-sm text-gray-500 font-mono">{editingOrder.kode_order}</p>
              </div>
              <button onClick={closeEditModal} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
                <CloseIcon />
              </button>
            </div>
            <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Customer</label>
                  <select value={editForm.customer_id} onChange={(e) => setEditField('customer_id', e.target.value)} required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm">
                    <option value="">Pilih Customer</option>
                    {customers.map((c) => <option key={c.id} value={c.id}>{c.nama_lengkap} — {c.no_hp}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kendaraan</label>
                <div className="relative mb-2">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                  <input type="text" value={editKendaraanSearch} onChange={(e) => setEditKendaraanSearch(e.target.value)}
                    placeholder="Cari nama, plat, atau warna..."
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm" />
                  {editKendaraanSearch && (
                    <button type="button" onClick={() => setEditKendaraanSearch('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  )}
                </div>
                {(() => {
                  const filtered = allKendaraans.filter((k) => {
                    if (k.status !== 'tersedia' && k.id != editingOrder.kendaraan_id) return false;
                    if (!editKendaraanSearch) return true;
                    const q = editKendaraanSearch.toLowerCase();
                    return k.nama_kendaraan.toLowerCase().includes(q)
                      || k.plat_nomor.toLowerCase().includes(q)
                      || (k.warna && k.warna.toLowerCase().includes(q));
                  });
                  if (filtered.length === 0) {
                    return <p className="text-sm text-gray-400 italic py-4 text-center">Tidak ada kendaraan yang cocok</p>;
                  }
                  return (
                    <div className="relative group">
                      <div className="flex gap-3 overflow-x-auto pb-2 scroll-smooth snap-x snap-mandatory" style={{ scrollbarWidth: 'none' }}>
                        {filtered.map((k) => {
                          const selected = editForm.kendaraan_id == k.id;
                          return (
                            <div key={k.id} onClick={() => handleEditKendaraanSelect(k.id)}
                              className={`snap-start cursor-pointer shrink-0 w-44 rounded-xl border-2 transition-all ${selected ? 'border-blue-500 ring-2 ring-blue-200 bg-blue-50/50' : 'border-gray-200 hover:border-blue-300 hover:shadow-sm'}`}>
                              <div className="aspect-[4/3] bg-gray-100 rounded-t-[10px] overflow-hidden flex items-center justify-center">
                                {k.foto ? (
                                  <img src={k.foto.startsWith('http') ? k.foto : `/storage/${k.foto}`}
                                    alt={k.nama_kendaraan} className="w-full h-full object-cover" />
                                ) : (
                                  <svg className="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 17h.01M16 17h.01M3 11l1.5-5A2 2 0 016.4 4h11.2a2 2 0 011.9 1.4L21 11M3 11h18M3 11v6a1 1 0 001 1h1a1 1 0 001-1v-1h12v1a1 1 0 001 1h1a1 1 0 001-1v-6" /></svg>
                                )}
                              </div>
                              <div className="p-3 space-y-1">
                                <p className="text-sm font-semibold text-gray-900 leading-tight truncate">{k.nama_kendaraan}</p>
                                <p className="text-xs font-mono text-gray-500">{k.plat_nomor}</p>
                                <div className="flex items-center gap-1.5">
                                  <span className="w-2.5 h-2.5 rounded-full border border-gray-200 shrink-0" style={{ backgroundColor: k.warna }} />
                                  <span className="text-xs text-gray-400 truncate">{k.warna}</span>
                                </div>
                                <p className="text-xs font-bold text-blue-600">{formatRupiah(k.harga_sewa_per_hari)}/hari</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Mulai</label>
                  <input type="date" value={editForm.tanggal_mulai} onChange={(e) => setEditField('tanggal_mulai', e.target.value)} required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Jam Mulai</label>
                  <input type="time" value={editForm.jam_mulai || '08:00'} onChange={(e) => setEditField('jam_mulai', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Selesai</label>
                  <input type="date" value={editForm.tanggal_selesai} onChange={(e) => setEditField('tanggal_selesai', e.target.value)} required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Jam Selesai</label>
                  <input type="time" value={editForm.jam_selesai || '17:00'} onChange={(e) => setEditField('jam_selesai', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Harga/Hari (Rp)</label>
                  <input type="number" value={editHargaPerHari} readOnly
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-500 text-sm cursor-not-allowed" />
                  <p className="text-xs text-gray-400 mt-0.5">Otomatis dari harga kendaraan</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status Pembayaran</label>
                  <select value={editForm.status_pembayaran} onChange={(e) => setEditField('status_pembayaran', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm">
                    {statusPembayaranOptions.map((s) => <option key={s} value={s}>{statusPembayaranLabels[s]}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Metode Bayar</label>
                  <select value={editForm.metode_pembayaran || 'cash'} onChange={(e) => setEditField('metode_pembayaran', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm">
                    <option value="cash">Tunai</option>
                    <option value="transfer">Transfer</option>
                    <option value="qris">QRIS</option>
                    <option value="lainnya">Lainnya</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status Order</label>
                  <select value={editForm.status_order || ''} onChange={(e) => setEditField('status_order', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm">
                    {statusOrderOptions.map((s) => <option key={s} value={s}>{statusOrderLabels[s]}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status Pengiriman</label>
                  <select value={editForm.status_pengiriman || ''} onChange={(e) => setEditField('status_pengiriman', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm">
                    {statusPengirimanOptions.map((s) => <option key={s} value={s}>{statusPengirimanLabels[s]}</option>)}
                  </select>
                  {statusPengirimanButuhBukti.includes(editForm.status_pengiriman) && (
                    <p className="text-xs text-amber-600 mt-1">Status ini wajib disertai bukti foto pengiriman di bawah.</p>
                  )}
                </div>
              </div>
              {editForm.tanggal_mulai && editForm.tanggal_selesai && editHargaPerHari > 0 ? (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                  <div className="flex items-center justify-between text-sm text-blue-700 mb-2">
                    <span>{editDurasi} hari x {formatRupiah(editHargaPerHari)}/hari</span>
                    <span className="text-xs text-blue-500">{editForm.tanggal_mulai} s/d {editForm.tanggal_selesai}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-blue-700">Total</span>
                    <span className="text-xl font-bold text-blue-800">{formatRupiah(editTotal)}</span>
                  </div>
                </div>
              ) : null}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Catatan</label>
                <textarea value={editForm.catatan} onChange={(e) => setEditField('catatan', e.target.value)} rows="2"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm resize-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bukti Pembayaran</label>
                {editBuktiPreview && !editBuktiFile && (
                  <ImagePreview src={editBuktiPreview} onRemove={() => { setEditBuktiFile(null); setEditBuktiPreview(null); }} />
                )}
                {editBuktiFile && (
                  <ImagePreview src={editBuktiNewPreview} onRemove={() => {
                    URL.revokeObjectURL(editBuktiNewPreview);
                    setEditBuktiFile(null);
                    setEditBuktiPreview(editingOrder.bukti_transfer ? `/storage/${editingOrder.bukti_transfer}` : null);
                    setEditBuktiNewPreview(null);
                  }} />
                )}
                <UploadBox
                  label="Ganti bukti pembayaran"
                  hint="JPG, PNG, maks 2MB"
                  fileName={editBuktiFile?.name}
                  icon={<svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
                  onFile={(f) => {
                    if (!f) return;
                    if (editBuktiNewPreview) URL.revokeObjectURL(editBuktiNewPreview);
                    setEditBuktiFile(f);
                    setEditBuktiNewPreview(URL.createObjectURL(f));
                  }}
                />
              </div>
              {statusPengirimanButuhBukti.includes(editForm.status_pengiriman) && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bukti Foto Pengiriman <span className="text-red-500">*</span>
                  </label>
                  {editBuktiPengirimanPreview && !editBuktiPengirimanFile && (
                    <ImagePreview src={editBuktiPengirimanPreview} onRemove={() => { setEditBuktiPengirimanFile(null); setEditBuktiPengirimanPreview(null); }} />
                  )}
                  {editBuktiPengirimanFile && (
                    <ImagePreview src={editBuktiPengirimanNewPreview} onRemove={() => {
                      URL.revokeObjectURL(editBuktiPengirimanNewPreview);
                      setEditBuktiPengirimanFile(null);
                      setEditBuktiPengirimanPreview(editingOrder.bukti_pengiriman ? `/storage/${editingOrder.bukti_pengiriman}` : null);
                      setEditBuktiPengirimanNewPreview(null);
                    }} />
                  )}
                  <UploadBox
                    label="Upload foto pengiriman"
                    hint="Foto kendaraan saat diambil/diantarkan, JPG/PNG, maks 2MB"
                    fileName={editBuktiPengirimanFile?.name}
                    icon={<svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
                    onFile={(f) => {
                      if (!f) return;
                      if (editBuktiPengirimanNewPreview) URL.revokeObjectURL(editBuktiPengirimanNewPreview);
                      setEditBuktiPengirimanFile(f);
                      setEditBuktiPengirimanNewPreview(URL.createObjectURL(f));
                    }}
                  />
                </div>
              )}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button type="button" onClick={closeEditModal} className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">Batal</button>
                <button type="submit" disabled={submitting}
                  className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-2">
                  {submitting && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  {isSewakan ? 'Sewakan' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {detailOrder && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in" onClick={() => setDetailOrder(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Detail Order</h2>
                <p className="text-sm text-gray-500 font-mono">{detailOrder.kode_order}</p>
              </div>
              <button onClick={() => setDetailOrder(null)} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
                <CloseIcon />
              </button>
            </div>
            <div className="p-6 space-y-5">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`px-3 py-1 text-sm font-semibold rounded-full ${statusColors[detailOrder.status_order]}`}>
                  {statusOrderLabels[detailOrder.status_order]}
                </span>
                <span className={`px-3 py-1 text-sm font-semibold rounded-full ${statusColors[detailOrder.status_pembayaran]}`}>
                  {statusPembayaranLabels[detailOrder.status_pembayaran]}
                </span>
                <span className={`px-3 py-1 text-sm font-semibold rounded-full ${statusColors[detailOrder.status_pengiriman]}`}>
                  {statusPengirimanLabels[detailOrder.status_pengiriman]}
                </span>
              </div>

              <div className="bg-gray-50 rounded-xl p-4 space-y-1">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Customer</h3>
                <div className="flex justify-between text-sm"><span className="text-gray-500">Nama</span><span className="font-medium text-gray-900">{detailOrder.customer?.nama_lengkap}</span></div>
                <div className="flex justify-between text-sm"><span className="text-gray-500">No. HP</span><span className="text-gray-900">{detailOrder.customer?.no_hp}</span></div>
                {detailOrder.customer?.email && <div className="flex justify-between text-sm"><span className="text-gray-500">Email</span><span className="text-gray-900">{detailOrder.customer.email}</span></div>}
                {detailOrder.customer?.alamat && <div className="flex justify-between text-sm"><span className="text-gray-500">Alamat</span><span className="text-gray-900 text-right max-w-[60%]">{detailOrder.customer.alamat}</span></div>}
                {detailOrder.customer?.no_ktp && <div className="flex justify-between text-sm"><span className="text-gray-500">No. KTP</span><span className="text-gray-900">{detailOrder.customer.no_ktp}</span></div>}
                {detailOrder.customer?.no_sim && <div className="flex justify-between text-sm"><span className="text-gray-500">No. SIM</span><span className="text-gray-900">{detailOrder.customer.no_sim}</span></div>}
              </div>

              <div className="bg-gray-50 rounded-xl p-4 space-y-1">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Kendaraan</h3>
                <div className="flex justify-between text-sm"><span className="text-gray-500">Nama</span><span className="font-medium text-gray-900">{detailOrder.kendaraan?.nama_kendaraan}</span></div>
                <div className="flex justify-between text-sm"><span className="text-gray-500">Plat Nomor</span><span className="font-mono text-gray-900">{detailOrder.kendaraan?.plat_nomor}</span></div>
                {detailOrder.kendaraan?.merek && <div className="flex justify-between text-sm"><span className="text-gray-500">Merek / Model</span><span className="text-gray-900">{detailOrder.kendaraan.merek} {detailOrder.kendaraan.model}</span></div>}
                {detailOrder.kendaraan?.tahun && <div className="flex justify-between text-sm"><span className="text-gray-500">Tahun</span><span className="text-gray-900">{detailOrder.kendaraan.tahun}</span></div>}
                {detailOrder.kendaraan?.warna && <div className="flex justify-between text-sm"><span className="text-gray-500">Warna</span><span className="text-gray-900">{detailOrder.kendaraan.warna}</span></div>}
                {detailOrder.kendaraan?.kapasitas_penumpang && <div className="flex justify-between text-sm"><span className="text-gray-500">Kapasitas</span><span className="text-gray-900">{detailOrder.kendaraan.kapasitas_penumpang} penumpang</span></div>}
                {detailOrder.kendaraan?.garasiPartner && <div className="flex justify-between text-sm"><span className="text-gray-500">Garasi</span><span className="text-gray-900">{detailOrder.kendaraan.garasiPartner.nama_partner}</span></div>}
              </div>

              <div className="bg-blue-50 rounded-xl p-4 space-y-2">
                <h3 className="text-xs font-semibold text-blue-400 uppercase tracking-wider mb-2">Periode Sewa</h3>
                <div className="flex justify-between text-sm"><span className="text-blue-600">Tanggal Mulai</span><span className="text-blue-900">{fmtDate(detailOrder.tanggal_mulai)}{detailOrder.jam_mulai ? `, ${fmtTime(detailOrder.jam_mulai)} WIB` : ''}</span></div>
                <div className="flex justify-between text-sm"><span className="text-blue-600">Tanggal Selesai</span><span className="text-blue-900">{fmtDate(detailOrder.tanggal_selesai)}{detailOrder.jam_selesai ? `, ${fmtTime(detailOrder.jam_selesai)} WIB` : ''}</span></div>
                <div className="flex justify-between text-sm"><span className="text-blue-600">Durasi</span><span className="text-blue-900">{detailOrder.durasi_hari} hari</span></div>
                <div className="flex justify-between text-sm"><span className="text-blue-600">Harga / Hari</span><span className="text-blue-900">{formatRupiah(detailOrder.harga_per_hari)}</span></div>
                {detailOrder.jam_overtime > 0 && (
                  <div className="flex justify-between text-sm"><span className="text-red-600">Denda Overtime ({detailOrder.jam_overtime} jam × {formatRupiah(OVERTIME_RATE_PER_HOUR)})</span><span className="text-red-700 font-medium">{formatRupiah(detailOrder.denda_overtime)}</span></div>
                )}
                {detailOrder.status_order === 'active' && detailOrder.jam_overtime_saat_ini > 0 && !detailOrder.jam_overtime && (
                  <div className="flex justify-between text-sm"><span className="text-red-600">Overtime saat ini ({detailOrder.jam_overtime_saat_ini} jam × {formatRupiah(OVERTIME_RATE_PER_HOUR)})</span><span className="text-red-700 font-medium">{formatRupiah(detailOrder.denda_overtime_saat_ini)}</span></div>
                )}
                <div className="flex justify-between items-center pt-2 border-t border-blue-200">
                  <span className="text-blue-600 font-medium">Total</span>
                  <span className="text-xl font-bold text-blue-800">{formatRupiah(
                    Number(detailOrder.harga_total) +
                    (detailOrder.status_order === 'active' && detailOrder.jam_overtime_saat_ini > 0 && !detailOrder.jam_overtime
                      ? Number(detailOrder.denda_overtime_saat_ini)
                      : 0)
                  )}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-xl p-4 space-y-1">
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Pembayaran</h3>
                  <div className="flex justify-between text-sm"><span className="text-gray-500">Metode</span><span className="text-gray-900 capitalize">{detailOrder.metode_pembayaran || '-'}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-gray-500">Status</span>
                    <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${statusColors[detailOrder.status_pembayaran]}`}>{statusPembayaranLabels[detailOrder.status_pembayaran]}</span>
                  </div>
                </div>
                <div className="bg-gray-50 rounded-xl p-4 space-y-1">
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Pengiriman</h3>
                  <div className="flex justify-between text-sm"><span className="text-gray-500">Status</span>
                    <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${statusColors[detailOrder.status_pengiriman]}`}>{statusPengirimanLabels[detailOrder.status_pengiriman]}</span>
                  </div>
                </div>
              </div>

              {detailOrder.catatan && (
                <div className="bg-gray-50 rounded-xl p-4">
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Catatan</h3>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{detailOrder.catatan}</p>
                </div>
              )}

              {(detailOrder.bukti_transfer || detailOrder.bukti_pengiriman || detailOrder.bukti_pengembalian) && (
                <div className="space-y-3">
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Bukti Foto</h3>
                  <div className="grid grid-cols-3 gap-3">
                    {detailOrder.bukti_transfer && (
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Bukti Pembayaran</p>
                        <a href={`/storage/${detailOrder.bukti_transfer}`} target="_blank" rel="noopener noreferrer">
                          <img src={`/storage/${detailOrder.bukti_transfer}`} alt="Bukti Transfer" className="w-full h-32 object-cover rounded-xl border border-gray-200 hover:ring-2 hover:ring-blue-400 transition-all cursor-pointer" />
                        </a>
                      </div>
                    )}
                    {detailOrder.bukti_pengiriman && (
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Bukti Pengiriman</p>
                        <a href={`/storage/${detailOrder.bukti_pengiriman}`} target="_blank" rel="noopener noreferrer">
                          <img src={`/storage/${detailOrder.bukti_pengiriman}`} alt="Bukti Pengiriman" className="w-full h-32 object-cover rounded-xl border border-gray-200 hover:ring-2 hover:ring-blue-400 transition-all cursor-pointer" />
                        </a>
                      </div>
                    )}
                    {detailOrder.bukti_pengembalian && (
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Bukti Pengembalian</p>
                        <a href={`/storage/${detailOrder.bukti_pengembalian}`} target="_blank" rel="noopener noreferrer">
                          <img src={`/storage/${detailOrder.bukti_pengembalian}`} alt="Bukti Pengembalian" className="w-full h-32 object-cover rounded-xl border border-gray-200 hover:ring-2 hover:ring-blue-400 transition-all cursor-pointer" />
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="text-xs text-gray-400 space-y-1 pt-2 border-t border-gray-100">
                <div className="flex justify-between"><span>Dibuat</span><span>{detailOrder.created_at ? new Date(detailOrder.created_at).toLocaleString('id-ID') : '-'}</span></div>
                <div className="flex justify-between"><span>Diperbarui</span><span>{detailOrder.updated_at ? new Date(detailOrder.updated_at).toLocaleString('id-ID') : '-'}</span></div>
                {detailOrder.admin?.name && <div className="flex justify-between"><span>Admin</span><span>{detailOrder.admin.name}</span></div>}
              </div>

              {(detailOrder.status_order === 'completed') && (
                <button onClick={() => { setDetailOrder(null); setInvoiceOrder(detailOrder); }}
                  className="w-full px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                  Lihat Invoice
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Invoice Modal */}
      {invoiceOrder && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in" onClick={() => setInvoiceOrder(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-100 flex items-center justify-between print:hidden">
              <h2 className="text-lg font-semibold text-gray-900">Invoice Sewa Kendaraan</h2>
              <div className="flex items-center gap-2">
                <button onClick={() => window.print()} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Cetak Invoice">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                </button>
                <button onClick={() => setInvoiceOrder(null)} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
                  <CloseIcon />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-5" id="invoice-content">
              <div className="text-center border-b border-gray-200 pb-4">
                <h1 className="text-xl font-bold text-gray-900">CVPILAR</h1>
                <p className="text-xs text-gray-500 mt-1">Sistem Manajemen Rental Kendaraan</p>
                <p className="text-xs text-gray-400 mt-0.5">Jl. Contoh Alamat No. 123, Bandung</p>
              </div>

              <div className="flex justify-between text-sm">
                <div>
                  <p className="text-gray-400 text-xs">Invoice</p>
                  <p className="font-mono font-bold text-gray-900">{invoiceOrder.kode_order}</p>
                </div>
                <div className="text-right">
                  <p className="text-gray-400 text-xs">Tanggal</p>
                  <p className="text-gray-900">{new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl p-3 text-sm">
                <p className="text-xs text-gray-400 mb-1">Disewa oleh</p>
                <p className="font-medium text-gray-900">{invoiceOrder.customer?.nama_lengkap}</p>
                <p className="text-gray-600 text-xs">{invoiceOrder.customer?.no_hp}</p>
                {invoiceOrder.customer?.alamat && <p className="text-gray-500 text-xs">{invoiceOrder.customer.alamat}</p>}
              </div>

              <div className="bg-gray-50 rounded-xl p-3 text-sm">
                <p className="text-xs text-gray-400 mb-1">Kendaraan</p>
                <p className="font-medium text-gray-900">{invoiceOrder.kendaraan?.nama_kendaraan}</p>
                <p className="text-gray-600 text-xs font-mono">{invoiceOrder.kendaraan?.plat_nomor}</p>
              </div>

              <div className="text-sm">
                <p className="text-xs text-gray-400 mb-2">Periode Sewa</p>
                <div className="space-y-1">
                  <div className="flex justify-between"><span className="text-gray-600">Mulai</span><span className="text-gray-900">{fmtDate(invoiceOrder.tanggal_mulai)}{invoiceOrder.jam_mulai ? `, ${fmtTime(invoiceOrder.jam_mulai)} WIB` : ''}</span></div>
                  <div className="flex justify-between"><span className="text-gray-600">Selesai</span><span className="text-gray-900">{fmtDate(invoiceOrder.tanggal_selesai)}{invoiceOrder.jam_selesai ? `, ${fmtTime(invoiceOrder.jam_selesai)} WIB` : ''}</span></div>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-4 space-y-2 text-sm">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Rincian Biaya</p>
                <div className="flex justify-between">
                  <span className="text-gray-600">Sewa {invoiceOrder.durasi_hari} hari × {formatRupiah(invoiceOrder.harga_per_hari)}/hari</span>
                  <span className="text-gray-900">{formatRupiah(invoiceOrder.durasi_hari * invoiceOrder.harga_per_hari)}</span>
                </div>
                {invoiceOrder.jam_overtime > 0 && (
                  <div className="flex justify-between">
                    <span className="text-red-600">Denda keterlambatan {invoiceOrder.jam_overtime} jam × {formatRupiah(OVERTIME_RATE_PER_HOUR)}</span>
                    <span className="text-red-700 font-medium">{formatRupiah(invoiceOrder.denda_overtime)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                  <span className="font-semibold text-gray-900">Total</span>
                  <span className="text-xl font-bold text-gray-900">{formatRupiah(invoiceOrder.harga_total)}</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-gray-400 pt-2 border-t border-gray-100">
                <div className="flex items-center gap-3">
                  <span>Status: <span className={`font-semibold ${statusColors[invoiceOrder.status_pembayaran]}`}>{statusPembayaranLabels[invoiceOrder.status_pembayaran]}</span></span>
                  <span>Bayar: <span className="font-semibold text-gray-600">{metodePembayaranLabels[invoiceOrder.metode_pembayaran] || invoiceOrder.metode_pembayaran || '-'}</span></span>
                </div>
                <span>{invoiceOrder.admin?.name ? `Dikelola oleh ${invoiceOrder.admin.name}` : ''}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={!!confirmDelete}
        title="Hapus Order"
        message={`Yakin ingin menghapus order "${confirmDelete?.kode_order}"? Tindakan ini tidak dapat dibatalkan.`}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
      />

      <ConfirmModal
        open={!!confirmAction}
        title={confirmAction?.title || 'Konfirmasi'}
        message={confirmAction?.message || ''}
        danger={confirmAction?.danger ?? true}
        onConfirm={async () => {
          if (confirmAction?.onConfirm) await confirmAction.onConfirm();
          setConfirmAction(null);
        }}
        onCancel={() => setConfirmAction(null)}
      />

      {confirmComplete && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in" onClick={closeCompleteModal}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Selesaikan Order</h2>
              <button onClick={closeCompleteModal} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
                <CloseIcon />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center p-2.5 bg-gray-50 rounded-lg">
                  <span className="text-gray-500">Kode</span>
                  <span className="font-mono font-semibold text-gray-900">{confirmComplete?.kode_order}</span>
                </div>
                <div className="flex justify-between items-center p-2.5 bg-gray-50 rounded-lg">
                  <span className="text-gray-500">Customer</span>
                  <span className="font-medium text-gray-900">{confirmComplete?.customer?.nama_lengkap}</span>
                </div>
                <div className="flex justify-between items-center p-2.5 bg-gray-50 rounded-lg">
                  <span className="text-gray-500">Kendaraan</span>
                  <span className="font-medium text-gray-900">{confirmComplete?.kendaraan?.nama_kendaraan} ({confirmComplete?.kendaraan?.plat_nomor})</span>
                </div>
                <div className="flex justify-between items-center p-2.5 bg-blue-50 rounded-lg">
                  <span className="text-blue-600 font-medium">Total</span>
                  <span className="text-lg font-bold text-blue-700">{formatRupiah(
                    Number(confirmComplete?.harga_total || 0) +
                    (confirmComplete?.jam_overtime_saat_ini > 0 && !confirmComplete?.jam_overtime
                      ? Number(confirmComplete?.denda_overtime_saat_ini || 0)
                      : 0)
                  )}</span>
                </div>
                {confirmComplete && confirmComplete.jam_overtime_saat_ini > 0 && (
                  <div className="flex items-center gap-2 p-2.5 bg-red-50 border border-red-200 rounded-lg">
                    <svg className="w-4 h-4 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
                    <span className="text-xs text-red-700">Melewati batas waktu <strong>{confirmComplete.jam_overtime_saat_ini} jam</strong> → denda <strong>{formatRupiah(confirmComplete.denda_overtime_saat_ini)}</strong> akan ditambahkan ke total</span>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Foto Pengembalian Kendaraan <span className="text-red-500">*</span>
                </label>
                {completeFile && (
                  <ImagePreview src={completeFilePreview} onRemove={() => {
                    URL.revokeObjectURL(completeFilePreview);
                    setCompleteFile(null);
                    setCompleteFilePreview(null);
                  }} />
                )}
                <UploadBox
                  label="Upload foto kendaraan dikembalikan"
                  hint="Foto kondisi kendaraan saat dikembalikan, JPG/PNG, maks 2MB"
                  fileName={completeFile?.name}
                  icon={<svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
                  onFile={(f) => {
                    if (!f) return;
                    if (completeFilePreview) URL.revokeObjectURL(completeFilePreview);
                    setCompleteFile(f);
                    setCompleteFilePreview(URL.createObjectURL(f));
                  }}
                />
              </div>
              {confirmComplete && (confirmComplete.status_pembayaran !== 'paid' || (confirmComplete.jam_overtime_saat_ini > 0 && !confirmComplete.jam_overtime)) && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bukti Pembayaran <span className="text-red-500">*</span>
                  </label>
                  {completePaymentFile && (
                    <ImagePreview src={completePaymentPreview} onRemove={() => {
                      URL.revokeObjectURL(completePaymentPreview);
                      setCompletePaymentFile(null);
                      setCompletePaymentPreview(null);
                    }} />
                  )}
                  <UploadBox
                    label="Upload bukti pembayaran"
                    hint="Bukti transfer / pembayaran, JPG/PNG, maks 2MB"
                    fileName={completePaymentFile?.name}
                    icon={<svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
                    onFile={(f) => {
                      if (!f) return;
                      if (completePaymentPreview) URL.revokeObjectURL(completePaymentPreview);
                      setCompletePaymentFile(f);
                      setCompletePaymentPreview(URL.createObjectURL(f));
                    }}
                  />
                </div>
              )}
            </div>
            <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={closeCompleteModal}
                className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">Batal</button>
              <button onClick={handleCompleteOrder} disabled={submitting}
                className="px-4 py-2 text-sm font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center gap-2">
                {submitting && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                Ya, Selesaikan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Order List */}
      <div className="space-y-3">
        {loading ? (
          <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 p-12 text-center">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-sm text-gray-500">Memuat data...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 p-12 text-center">
            <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
            <p className="text-gray-500 font-medium">Tidak ada data order</p>
            <p className="text-sm text-gray-400 mt-1">Mulai dengan membuat order baru</p>
          </div>
        ) : items.map((item) => {
          const isOpen = item.status_order === 'pending' || item.status_order === 'confirmed';
          const isActive = item.status_order === 'active';
          const isTerlambat = isActive && item.jam_overtime_saat_ini > 0;

          return (
            <div key={item.id} className={`bg-white rounded-2xl shadow-sm ring-1 transition-all hover:shadow-md ${isActive ? 'ring-green-200' : isOpen ? 'ring-yellow-200' : 'ring-gray-100'}`}>
              <div className="flex items-stretch">
                <div className={`w-1.5 rounded-l-2xl flex-shrink-0 ${
                  item.status_order === 'pending' ? 'bg-yellow-400' :
                  item.status_order === 'confirmed' ? 'bg-blue-400' :
                  item.status_order === 'active' ? 'bg-green-500' :
                  item.status_order === 'completed' ? 'bg-gray-400' :
                  'bg-red-400'
                }`} />

                <div className="flex-1 p-4">
                  <div className="flex items-center justify-between mb-3 flex-wrap gap-y-2">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="font-mono text-sm font-bold text-gray-900">{item.kode_order}</span>
                      <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${statusColors[item.status_order]}`}>
                        {statusOrderLabels[item.status_order]}
                      </span>
                      {isActive && (
                        <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                          <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                          Aktif
                        </span>
                      )}
                      {isTerlambat && (
                        <span className="flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full bg-red-100 text-red-700">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
                          Overtime {item.jam_overtime_saat_ini} jam ({formatRupiah(item.denda_overtime_saat_ini)})
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => setDetailOrder(item)}
                        className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors" title="Lihat detail">
                        <EyeIcon />
                      </button>
                      <button onClick={() => openEditModal(item)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Edit order">
                        <PencilIcon />
                      </button>
                      {item.status_order === 'pending' && (
                        <>
                          <button onClick={() => setConfirmAction({ title: 'Konfirmasi Order', message: `Konfirmasi order "${item.kode_order}" dari ${item.customer?.nama_lengkap}?`, danger: false, onConfirm: () => handleInlineUpdate(item.id, 'status_order', 'confirmed') })}
                            className="px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                            Konfirmasi
                          </button>
                          <button onClick={() => setConfirmAction({ title: 'Batalkan Order', message: `Batalkan order "${item.kode_order}" dari ${item.customer?.nama_lengkap}?`, danger: true, onConfirm: () => handleInlineUpdate(item.id, 'status_order', 'cancelled') })}
                            className="px-3 py-1.5 text-xs font-medium bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors">
                            Batal
                          </button>
                        </>
                      )}
                      {item.status_order === 'confirmed' && (
                        <>
                          <button onClick={() => openEditModal(item, { sewakan: true })}
                            className="px-3 py-1.5 text-xs font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-1">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                            Sewakan
                          </button>
                          <button onClick={() => setConfirmAction({ title: 'Batalkan Order', message: `Batalkan order "${item.kode_order}" dari ${item.customer?.nama_lengkap}?`, danger: true, onConfirm: () => handleInlineUpdate(item.id, 'status_order', 'cancelled') })}
                            className="px-3 py-1.5 text-xs font-medium bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors">
                            Batal
                          </button>
                        </>
                      )}
                      {isActive && (
                        <button onClick={() => setConfirmComplete(item)}
                          className="px-3 py-1.5 text-xs font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-1">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                          Selesai
                        </button>
                      )}
                      {isOpen && (
                        <button onClick={() => setConfirmDelete(item)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Hapus">
                          <TrashIcon />
                        </button>
                      )}
                    </div>
                  </div>

                  {isTerlambat && (
                    <div className="mb-3 flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
                      <svg className="w-4 h-4 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      <span className="text-xs text-red-700 font-medium">Kendaraan terlambat dikembalikan <strong>{item.jam_overtime_saat_ini} jam</strong> — denda <strong>{formatRupiah(item.denda_overtime_saat_ini)}</strong></span>
                    </div>
                  )}

                  {item.status_order === 'completed' && item.jam_overtime > 0 && (
                    <div className="mb-3 flex items-center gap-2 px-3 py-2 bg-orange-50 border border-orange-200 rounded-lg">
                      <svg className="w-4 h-4 text-orange-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      <span className="text-xs text-orange-700 font-medium">Terlambat {item.jam_overtime} jam — denda {formatRupiah(item.denda_overtime)}</span>
                      <button onClick={() => setInvoiceOrder(item)} className="ml-auto text-xs font-medium text-orange-700 underline hover:text-orange-900">Lihat Invoice</button>
                    </div>
                  )}

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div className="space-y-0.5">
                      <span className="text-xs text-gray-400 uppercase tracking-wider">Customer</span>
                      <div className="px-2 py-1">
                        <span className="font-medium text-gray-900 block truncate">{item.customer?.nama_lengkap}</span>
                        <p className="text-xs text-gray-400 truncate">{item.customer?.no_hp}</p>
                      </div>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-xs text-gray-400 uppercase tracking-wider">Kendaraan</span>
                      <div className="px-2 py-1">
                        <span className="font-medium text-gray-900 block truncate">{item.kendaraan?.nama_kendaraan}</span>
                        <p className="text-xs text-gray-400 truncate">{item.kendaraan?.plat_nomor}</p>
                      </div>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-xs text-gray-400 uppercase tracking-wider">Periode</span>
                      <div className="px-2 py-1">
                        <span className="text-gray-900 block">{fmtDate(item.tanggal_mulai)} - {fmtDate(item.tanggal_selesai)}</span>
                        <p className="text-xs text-gray-400">{item.durasi_hari} hari</p>
                      </div>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-xs text-gray-400 uppercase tracking-wider">Total</span>
                      <div className="px-2 py-1">
                        <span className="font-bold text-gray-900">{formatRupiah(
                          Number(item.harga_total) +
                          (item.status_order === 'active' && item.jam_overtime_saat_ini > 0 && !item.jam_overtime
                            ? Number(item.denda_overtime_saat_ini)
                            : 0)
                        )}</span>
                        <p className="text-xs text-gray-400">{formatRupiah(item.harga_per_hari)}/hari</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-100 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-gray-400">Bayar:</span>
                      <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${statusColors[item.status_pembayaran]}`}>
                        {statusPembayaranLabels[item.status_pembayaran]}
                      </span>
                      {item.bukti_transfer && (
                        <span className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center" title="Bukti transfer terlampir">
                          <svg className="w-3 h-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                        </span>
                      )}
                      {item.bukti_pengiriman && (
                        <span className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center" title="Bukti pengiriman terlampir">
                          <svg className="w-3 h-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-gray-400">Pengiriman:</span>
                      <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${statusColors[item.status_pengiriman]}`}>
                        {statusPengirimanLabels[item.status_pengiriman]}
                      </span>
                    </div>

                    <div className="ml-auto text-xs text-gray-400">
                      {item.admin?.name && `oleh ${item.admin.name}`}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
