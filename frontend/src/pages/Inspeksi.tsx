import { useState, useEffect, useCallback, useRef, type ChangeEvent, type FormEvent } from 'react';
import { isAxiosError } from 'axios';
import { inspeksiAPI, type InspeksiKendaraan, type Order } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import ConfirmModal from '../components/ConfirmModal';
import SignaturePad from '../components/SignaturePad';
import CameraModal from '../components/CameraModal';
import { ClipboardCheck, Search, Eye, Trash2, X, Upload, AlertTriangle, PlayCircle, RotateCcw, Keyboard, Camera, Video, PenLine } from 'lucide-react';
import FuelIndicatorBar from '../components/FuelIndicatorBar';
import { compressImage } from '../lib/file';

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
 * LABELS & OPTIONS
 * â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

const jenisLabels: Record<string, string> = {
  pickup: 'Serah Terima Awal (Pickup)',
  return: 'Serah Terima Akhir (Return)',
};

const jenisShort: Record<string, string> = {
  pickup: 'Pickup',
  return: 'Return',
};

const fuelLabels: Record<string, string> = {
  kosong: 'Kosong',
  '1/8': '1/8',
  '1/4': '1/4',
  '3/8': '3/8',
  '1/2': '1/2',
  '5/8': '5/8',
  '3/4': '3/4',
  '7/8': '7/8',
  full: 'Full',
};

const kondisiBodyLabels: Record<string, string> = {
  baik: 'Baik',
  lecet_ringan: 'Lecet Ringan',
  lecet_parah: 'Lecet Parah',
  penyok: 'Penyok',
  retak: 'Retak',
};

const kondisiInteriorLabels: Record<string, string> = {
  baik: 'Baik',
  kotor_ringan: 'Kotor Ringan',
  kotor_banyak: 'Kotor Banyak',
  rusak: 'Rusak',
};

const kondisiBanLabels: Record<string, string> = {
  baik: 'Baik',
  tipis: 'Tipis',
  gundul: 'Gundul',
  kosong: 'Kosong',
};

const kondisiACLabels: Record<string, string> = {
  baik: 'Baik',
  tidak_baik: 'Tidak Baik',
};

const kondisiLampuLabels: Record<string, string> = {
  baik: 'Baik',
  tidak_baik: 'Tidak Baik',
};

const fuelColors: Record<string, string> = {
  kosong: 'bg-error-50 text-error-600',
  '1/8': 'bg-error-50 text-error-600',
  '1/4': 'bg-error-50 text-error-600',
  '3/8': 'bg-accent-100 text-accent-700',
  '1/2': 'bg-accent-100 text-accent-700',
  '5/8': 'bg-accent-50 text-accent-600',
  '3/4': 'bg-accent-50 text-accent-600',
  '7/8': 'bg-accent-50 text-accent-600',
  full: 'bg-accent-50 text-accent-600',
};

const kondisiColors: Record<string, string> = {
  baik: 'bg-accent-50 text-accent-600',
  lecet_ringan: 'bg-accent-100 text-accent-700',
  lecet_parah: 'bg-error-50 text-error-600',
  kotor_ringan: 'bg-accent-100 text-accent-700',
  kotor_banyak: 'bg-error-50 text-error-600',
  rusak: 'bg-primary-50 text-primary-600',
  tipis: 'bg-accent-100 text-accent-700',
  gundul: 'bg-error-50 text-error-600',
  kosong: 'bg-primary-50 text-primary-600',
  tidak_baik: 'bg-error-50 text-error-600',
  penyok: 'bg-error-50 text-error-600',
  retak: 'bg-primary-50 text-primary-600',
};

const inputClass =
  'w-full rounded-lg border border-black-200 px-3 py-2.5 text-sm text-black-900 outline-none transition-colors focus:border-primary-500 focus:ring-1 focus:ring-primary-500';

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
 * TYPES
 * â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

interface InspeksiForm {
  order_id: string;
  jenis: 'pickup' | 'return';
  odometer: string;
  fuel_level: 'kosong' | '1/8' | '1/4' | '3/8' | '1/2' | '5/8' | '3/4' | '7/8' | 'full';
  kondisi_body: string;
  kondisi_interior: string;
  kondisi_ban: string;
  kondisi_ac: string;
  kondisi_lampu: string;
  ada_damagenya: boolean;
  deskripsi_kondisi: string;
  catatan: string;
biaya_kerusakan: string;
  inspeksi_oleh: string;
  checklist_serah_terima: string[];
  media: MediaItem[];
  ttd_customer: Blob | null;
  ttd_petugas: Blob | null;
}

const MAX_MEDIA = 10;

const CHECKLIST_ITEMS = [
  { key: 'kunci', label: 'Kunci' },
  { key: 'stnk', label: 'STNK' },
  { key: 'kunci_roda', label: 'Kunci Roda' },
  { key: 'dongkrak', label: 'Dongkrak' },
  { key: 'ban_serep', label: 'Ban Serep' },
  { key: 'ac', label: 'AC' },
] as const;

interface MediaItem {
  key: string;
  file: File;
  preview: string;
}

const emptyForm: InspeksiForm = {
  order_id: '',
  jenis: 'pickup',
  odometer: '',
  fuel_level: 'full',
  kondisi_body: 'baik',
  kondisi_interior: 'baik',
  kondisi_ban: 'baik',
  kondisi_ac: 'baik',
  kondisi_lampu: 'baik',
  ada_damagenya: false,
  deskripsi_kondisi: '',
catatan: '',
biaya_kerusakan: '',
  inspeksi_oleh: '',
  checklist_serah_terima: [],
  media: [],
  ttd_customer: null,
  ttd_petugas: null,
};

type TaskOrder = Order & { task_jenis: 'inspeksi_pickup' | 'kirim_kendaraan' | 'return' };

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
 * BADGE COMPONENT
 * â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${color}`}>
      {label}
    </span>
  );
}

function OptionPill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
        active ? 'bg-primary-500 text-white shadow-sm' : 'border border-black-200 bg-white text-black-600 hover:border-primary-400'
      }`}
    >
      {children}
    </button>
  );
}

export default function Inspeksi() {
  const { error: toastError, success: toastSuccess } = useToast();
  const { user } = useAuth();

const [inspeksis, setInspeksis] = useState<InspeksiKendaraan[]>([]);
  const [tasks, setTasks] = useState<TaskOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showDetail, setShowDetail] = useState<InspeksiKendaraan | null>(null);
  const [form, setForm] = useState<InspeksiForm>(emptyForm);
  const [formMode, setFormMode] = useState<'simpan' | 'kirim' | 'kembali'>('simpan');
  const [draft, setDraft] = useState<InspeksiKendaraan | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<InspeksiKendaraan | null>(null);
  const [perbaikiTarget, setPerbaikiTarget] = useState<InspeksiKendaraan | null>(null);
  const [perbaikiTtdCustomer, setPerbaikiTtdCustomer] = useState<Blob | null>(null);
  const [perbaikiTtdPetugas, setPerbaikiTtdPetugas] = useState<Blob | null>(null);
  const [perbaikiSubmitting, setPerbaikiSubmitting] = useState(false);

const [filterJenis, setFilterJenis] = useState('');
  const [searchOrder, setSearchOrder] = useState('');
  const [cameraMode, setCameraMode] = useState<'photo' | 'video' | null>(null);

  const captureFotoFallbackRef = useRef<HTMLInputElement>(null);
  const captureVideoFallbackRef = useRef<HTMLInputElement>(null);

  const triggerFallbackCapture = (mode: 'photo' | 'video') => {
    if (mode === 'photo') {
      captureFotoFallbackRef.current?.click();
    } else {
      captureVideoFallbackRef.current?.click();
    }
  };

  const handleOpenCamera = (mode: 'photo' | 'video') => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      triggerFallbackCapture(mode);
      return;
    }
    setCameraMode(mode);
  };

  const fetchInspeksis = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (filterJenis) params.jenis = filterJenis;
      if (searchOrder) params.order_id = searchOrder;
      const res = await inspeksiAPI.list(params);
      setInspeksis(res.data.data);
    } catch {
      toastError('Gagal memuat data inspeksi.');
    } finally {
      setLoading(false);
    }
  }, [filterJenis, searchOrder, toastError]);

  const fetchTasks = useCallback(async () => {
    try {
      const res = await inspeksiAPI.tasks();
      setTasks(res.data);
    } catch {
      // Task opsional — abaikan bila gagal.
      setTasks([]);
    }
  }, []);

  useEffect(() => {
    fetchInspeksis();
    fetchTasks();
  }, [fetchInspeksis, fetchTasks]);

const openForm = (order?: TaskOrder, jenis?: 'pickup' | 'return', draft?: InspeksiKendaraan | null) => {
    setForm((prev) => {
      prev.media.forEach((m) => URL.revokeObjectURL(m.preview));
      const base = { ...previousForm(), order_id: order?.id != null ? String(order.id) : prev.order_id, jenis: jenis ?? prev.jenis };
      return draft ? { ...base, ...prefillDraft(draft) } : { ...base, inspeksi_oleh: localStorage.getItem('name') ?? '' };
    });
    setDraft(draft ?? null);
    setFormMode(draft ? 'kirim' : jenis === 'return' ? 'kembali' : 'simpan');
    setShowForm(true);
  };

  function previousForm() {
    return Object.assign({}, emptyForm);
  }

  function prefillDraft(draft: InspeksiKendaraan): InspeksiForm {
    return {
      ...previousForm(),
      order_id: String(draft.order_id),
      jenis: 'pickup',
      odometer: draft.odometer != null ? String(draft.odometer) : '',
      fuel_level: draft.fuel_level,
      kondisi_body: draft.kondisi_body,
      kondisi_interior: draft.kondisi_interior ?? 'baik',
      kondisi_ban: draft.kondisi_ban ?? 'baik',
      kondisi_ac: draft.kondisi_ac ?? 'baik',
      kondisi_lampu: draft.kondisi_lampu ?? 'baik',
      ada_damagenya: draft.ada_damagenya,
      deskripsi_kondisi: draft.deskripsi_kondisi ?? '',
      catatan: draft.catatan ?? '',
      biaya_kerusakan: draft.biaya_kerusakan ? String(draft.biaya_kerusakan) : '',
      inspeksi_oleh: draft.inspeksi_oleh ?? localStorage.getItem('name') ?? '',
      checklist_serah_terima: draft.checklist_serah_terima ?? [],
    };
  }

  const bukaTaskKirim = async (task: TaskOrder) => {
    try {
      const res = await inspeksiAPI.byOrder(task.id);
      const draft = res.data.find((i) => i.jenis === 'pickup' && i.status === 'draft');
      if (!draft) {
        toastError('Draft inspeksi tidak ditemukan — kerjakan task "Inspeksi Pickup" dulu.');
        return;
      }
      openForm(task, 'pickup', draft);
    } catch {
      toastError('Gagal memuat draft inspeksi.');
    }
  };

  const handleFormChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | HTMLButtonElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const addFilesToMedia = async (files: File[]) => {
    const available = MAX_MEDIA - form.media.length;
    if (available <= 0) {
      toastError(`Maksimal ${MAX_MEDIA} file dokumentasi per inspeksi.`);
      return;
    }

    const taken = files.slice(0, available);
    if (taken.length < files.length) {
      toastError(`Maksimal ${MAX_MEDIA} file dokumentasi — hanya ${taken.length} file yang ditambahkan.`);
    }

    const added = await Promise.all(
      taken.map(async (file) => {
        const finalFile = file.type.startsWith('image/') ? await compressImage(file) : file;
        return {
          key: `${file.name}-${file.size}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          file: finalFile,
          preview: URL.createObjectURL(finalFile),
        };
      }),
    );

    setForm((prev) => ({ ...prev, media: [...prev.media, ...added] }));
  };

  const handleMediaChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (files.length === 0) return;
    void addFilesToMedia(files);
  };

  const removeMedia = (key: string) => {
    setForm((prev) => {
      const target = prev.media.find((m) => m.key === key);
      if (target) URL.revokeObjectURL(target.preview);
      return { ...prev, media: prev.media.filter((m) => m.key !== key) };
    });
  };

  const selectedOrder = tasks.find((t) => String(t.id) === form.order_id);

  const isSupirOfSelectedOrder = form.jenis === 'return'
    && !!selectedOrder?.supir?.user_id
    && selectedOrder.supir.user_id === user?.id;

  const isSupirOfOrder = (item: InspeksiKendaraan) =>
    !!item.order?.supir?.user_id && item.order.supir.user_id === item.admin_id;

const handleSubmit = async (e: FormEvent, action: 'simpan' | 'kirim' | 'kembali') => {
    e.preventDefault();

    if (new Set(form.checklist_serah_terima).size !== CHECKLIST_ITEMS.length) {
      toastError('Semua item checklist serah terima wajib dicentang.');
      return;
    }

    const ttdCustomerTersimpan = !!draft?.ttd_customer;
    const ttdPetugasTersimpan = !!draft?.ttd_petugas;

    if (action === 'kirim' && !form.ttd_customer && !form.ttd_petugas && !ttdCustomerTersimpan && !ttdPetugasTersimpan) {
      toastError('Tanda tangan customer & petugas wajib dilengkapi sebelum mengirim kendaraan.');
      return;
    }

    if (action === 'kembali' && (!form.ttd_customer || !form.ttd_petugas)) {
      toastError('Tanda tangan customer & petugas wajib diisi saat pengembalian.');
      return;
    }

    setSubmitting(true);

    try {
      const fd = new FormData();
      const helper = action;
      if (helper === 'simpan') {
        fd.append('order_id', form.order_id);
        fd.append('jenis', form.jenis);
      }
      if (helper !== 'kirim') {
        if (form.odometer) fd.append('odometer', form.odometer);
        fd.append('fuel_level', form.fuel_level);
        fd.append('kondisi_body', form.kondisi_body);
        fd.append('kondisi_interior', form.kondisi_interior);
        fd.append('kondisi_ban', form.kondisi_ban);
        fd.append('kondisi_ac', form.kondisi_ac);
        fd.append('kondisi_lampu', form.kondisi_lampu);
        fd.append('ada_damagenya', form.ada_damagenya ? '1' : '0');
        if (form.deskripsi_kondisi) fd.append('deskripsi_kondisi', form.deskripsi_kondisi);
        if (form.catatan) fd.append('catatan', form.catatan);
        if (form.biaya_kerusakan) fd.append('biaya_kerusakan', form.biaya_kerusakan);
        if (form.inspeksi_oleh) fd.append('inspeksi_oleh', form.inspeksi_oleh);
        form.media.forEach((m) => {
          if (m.file.type.startsWith('image/')) {
            fd.append('fotos[]', m.file);
          } else {
            fd.append('videos[]', m.file);
          }
        });
        form.checklist_serah_terima.forEach((item) => fd.append('checklist_serah_terima[]', item));
        if (form.ttd_customer) fd.append('ttd_customer', form.ttd_customer, 'ttd-customer.png');
        if (form.ttd_petugas) fd.append('ttd_petugas', form.ttd_petugas, 'ttd-petugas.png');
      }

      if (helper === 'simpan') {
        await inspeksiAPI.create(fd);
        toastSuccess('Draft inspeksi tersimpan — lengkapi TTD lalu kirim lewat task "Kirim Kendaraan".');
      } else if (helper === 'kirim') {
        fd.append('inspeksi_id', String(draft?.id ?? ''));
        if (form.ttd_customer) fd.append('ttd_customer', form.ttd_customer, 'ttd-customer.png');
        if (form.ttd_petugas) fd.append('ttd_petugas', form.ttd_petugas, 'ttd-petugas.png');
        await inspeksiAPI.kirim(Number(form.order_id), fd);
        toastSuccess('Kendaraan berhasil dikirim.');
      } else {
        await inspeksiAPI.kembali(Number(form.order_id), fd);
        toastSuccess('Inspeksi akhir tersimpan — kendaraan dikembalikan. Admin akan menutup order.');
      }

      setShowForm(false);
      setDraft(null);
      form.media.forEach((m) => URL.revokeObjectURL(m.preview));
      setForm({ ...emptyForm });
      fetchInspeksis();
      fetchTasks();
    } catch (err) {
      const msg = isAxiosError(err)
        ? err.response?.data?.message
        : err.response?.data?.errors
          ? Object.values(err.response?.data?.errors ?? {}).flat().join(', ')
          : 'Gagal menyimpan inspeksi.';
      toastError(msg);
    } finally {
      setSubmitting(false);
    }
  };

const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await inspeksiAPI.delete(deleteTarget.id);
      toastSuccess('Inspeksi berhasil dihapus.');
      setDeleteTarget(null);
      fetchInspeksis();
      fetchTasks();
    } catch {
      toastError('Gagal menghapus inspeksi.');
    }
  };

  const handlePerbaikiTtd = async () => {
    if (!perbaikiTarget) return;
    if (!perbaikiTtdCustomer && !perbaikiTtdPetugas) {
      toastError('Isi minimal satu tanda tangan (customer atau petugas).');
      return;
    }
    setPerbaikiSubmitting(true);
    try {
      const fd = new FormData();
      if (perbaikiTtdCustomer) fd.append('ttd_customer', perbaikiTtdCustomer, 'ttd-customer.png');
      if (perbaikiTtdPetugas) fd.append('ttd_petugas', perbaikiTtdPetugas, 'ttd-petugas.png');
      await inspeksiAPI.perbaikiTtd(perbaikiTarget.id, fd);
      toastSuccess('Tanda tangan berhasil diperbaiki.');
      setPerbaikiTarget(null);
      setPerbaikiTtdCustomer(null);
      setPerbaikiTtdPetugas(null);
      fetchInspeksis();
    } catch (err) {
      const msg = isAxiosError(err) ? err.response?.data?.message : undefined;
      toastError(msg || 'Gagal memperbaiki tanda tangan.');
    } finally {
      setPerbaikiSubmitting(false);
    }
  };

const formatDate = (d: string) => {
    return new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const showBiayaKerusakan = form.jenis === 'return';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-black-900">Inspeksi Kendaraan</h1>
          <p className="text-sm text-black-500">Pencatan kondisi kendaraan saat serah terima pickup & return</p>
</div>
      </div>

      {/* Tugas Menanti (Task List) */}
      {tasks.length > 0 && (
        <div className="rounded-xl border border-primary-100 bg-primary-50/50 p-4">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-primary-700">
            <ClipboardCheck size={16} />
            Task Menunggu ({tasks.length})
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
{tasks.map((task) => {
              const isKirim = task.task_jenis === 'kirim_kendaraan';
              const isReturn = task.task_jenis === 'return';
              const taskLabel = isKirim ? 'Kirim Kendaraan' : isReturn ? 'Return' : 'Inspeksi Pickup';
              const taskColor = isReturn ? 'bg-primary-100 text-primary-600' : 'bg-accent-50 text-accent-600';
              return (
                <div key={`${task.id}-${task.task_jenis}`} className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-black-100">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="font-semibold text-black-900">{task.kode_order}</span>
                    <Badge label={taskLabel} color={taskColor} />
                  </div>
                  <p className="text-sm text-black-700">{task.kendaraan?.nama_kendaraan ?? `Kendaraan #${task.kendaraan_id}`}</p>
                  <p className="text-xs text-black-500">{task.customer?.nama_lengkap ?? '-'} · {task.customer?.no_hp ?? ''}</p>
                  <p className="mt-1 text-xs text-black-400">
                    {new Date(task.tanggal_mulai + 'T00:00:00').toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })} -{' '}
                    {new Date(task.tanggal_selesai + 'T00:00:00').toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </p>
                  <button
                    onClick={() => (isKirim ? void bukaTaskKirim(task) : openForm(task, isReturn ? 'return' : 'pickup'))}
                    className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary-500 px-3 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-600"
                  >
                    {isReturn ? <RotateCcw size={16} /> : <PlayCircle size={16} />}
                    {isKirim ? 'Lanjutkan & Kirim' : isReturn ? 'Kerjakan Return' : 'Kerjakan Inspeksi'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="flex gap-2">
          <button
            onClick={() => setFilterJenis('')}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              filterJenis === '' ? 'bg-primary-500 text-white' : 'bg-black-200 text-black-600 hover:bg-black-200'
            }`}
          >
            Semua
          </button>
          <button
            onClick={() => setFilterJenis('pickup')}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              filterJenis === 'pickup' ? 'bg-primary-500 text-white' : 'bg-black-200 text-black-600 hover:bg-black-200'
            }`}
          >
            Pickup
          </button>
          <button
            onClick={() => setFilterJenis('return')}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              filterJenis === 'return' ? 'bg-primary-500 text-white' : 'bg-black-200 text-black-600 hover:bg-black-200'
            }`}
          >
            Return
          </button>
        </div>
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-black-400" />
          <input
            type="text"
            placeholder="Cari berdasarkan Order ID..."
            value={searchOrder}
            onChange={(e) => setSearchOrder(e.target.value)}
            className={`${inputClass} pl-9`}
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-black-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-black-200 bg-accent-50">
              <tr>
                <th className="px-4 py-3 font-medium text-black-600">Tanggal</th>
                <th className="px-4 py-3 font-medium text-black-600">Order</th>
                <th className="px-4 py-3 font-medium text-black-600">Jenis</th>
                <th className="px-4 py-3 font-medium text-black-600">Odometer</th>
                <th className="px-4 py-3 font-medium text-black-600">BBM</th>
                <th className="px-4 py-3 font-medium text-black-600">Body</th>
                <th className="px-4 py-3 font-medium text-black-600">Ban</th>
                <th className="px-4 py-3 font-medium text-black-600">Damage</th>
                <th className="px-4 py-3 font-medium text-black-600">Petugas</th>
                <th className="px-4 py-3 font-medium text-black-600">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black-200">
              {loading ? (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-black-400">Memuat...</td>
                </tr>
              ) : inspeksis.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-black-400">Belum ada data inspeksi</td>
                </tr>
              ) : (
                inspeksis.map((item) => (
                  <tr key={item.id} className="hover:bg-accent-50 transition-colors">
                    <td className="whitespace-nowrap px-4 py-3 text-black-700">{formatDate(item.created_at)}</td>
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-black-900">{item.order?.kode_order ?? `#${item.order_id}`}</td>
<td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <Badge
                          label={jenisShort[item.jenis] ?? item.jenis}
                          color={item.jenis === 'pickup' ? 'bg-accent-50 text-accent-600' : 'bg-primary-100 text-primary-600'}
                        />
                        {item.status === 'draft' && <Badge label="Draft" color="bg-error-50 text-error-600" />}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-black-700">{item.odometer ? `${item.odometer.toLocaleString('id-ID')} km` : '-'}</td>
                    <td className="px-4 py-3">
                      <Badge label={fuelLabels[item.fuel_level] ?? item.fuel_level} color={fuelColors[item.fuel_level] ?? 'bg-black-200 text-black-600'} />
                    </td>
                    <td className="px-4 py-3">
                      <Badge label={kondisiBodyLabels[item.kondisi_body] ?? item.kondisi_body} color={kondisiColors[item.kondisi_body] ?? 'bg-black-200 text-black-600'} />
                    </td>
                    <td className="px-4 py-3">
                      <Badge label={kondisiBanLabels[item.kondisi_ban] ?? item.kondisi_ban} color={kondisiColors[item.kondisi_ban] ?? 'bg-black-200 text-black-600'} />
                    </td>
                    <td className="px-4 py-3">
                      {item.ada_damagenya ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-error-600">
                          <AlertTriangle size={14} /> Ya
                        </span>
                      ) : (
                        <span className="text-xs text-black-400">Tidak</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-black-600">
                      <div className="flex items-center gap-1.5">
                        <span>{item.inspeksi_oleh ?? item.admin?.name ?? '-'}</span>
                        {isSupirOfOrder(item) && (
                          <span className="inline-flex rounded-full bg-accent-100 px-2 py-0.5 text-[10px] font-medium text-accent-700" title="Petugas ini adalah supir dari order tersebut">
                            supir order
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <div className="flex items-center gap-2">
<button onClick={() => setShowDetail(item)} className="text-black-400 hover:text-primary-500 transition-colors" title="Lihat Detail">
                          <Eye size={16} />
                        </button>
                        {user?.role !== 'petugas' && (
                          <button onClick={() => { setPerbaikiTarget(item); setPerbaikiTtdCustomer(null); setPerbaikiTtdPetugas(null); }} className="text-black-400 hover:text-primary-500 transition-colors" title="Perbaiki Tanda Tangan (TTD)">
                            <PenLine size={16} />
                          </button>
                        )}
                        <button onClick={() => setDeleteTarget(item)} className="text-black-400 hover:text-error-500 transition-colors" title="Hapus">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ FORM MODAL â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-2 sm:p-4">
          <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 shadow-xl sm:p-6">
<div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-black-900">
                {formMode === 'kirim' ? 'Kirim Kendaraan — Fase 2' : formMode === 'kembali' ? 'Form Inspeksi Return' : 'Inspeksi Pickup — Fase 1 (Draft)'}
              </h2>
              <button
                onClick={() => {
                  setShowForm(false);
                  setDraft(null);
                }}
                className="text-black-400 hover:text-black-600"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={(e) => handleSubmit(e, formMode)} className="space-y-4">
              {formMode === 'kirim' && (
                <div className="flex items-start gap-3 rounded-xl border border-accent-300 bg-accent-50 p-4 text-sm">
                  <AlertTriangle size={18} className="mt-0.5 shrink-0 text-accent-600" />
                  <div>
                    <p className="font-semibold text-black-900">Data inspeksi sudah disimpan sebagai draft.</p>
                    <p className="mt-1 text-black-600">
                      Periksa ringkasan di bawah (terkunci), lengkapi tanda tangan bila perlu, lalu klik <b>Kirim Kendaraan</b> untuk mengaktifkan penyewaan.
                    </p>
                  </div>
                </div>
              )}

              {/* Order ID & Jenis */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-black-700">Order ID <span className="text-error-500">*</span></label>
                  <div className="relative">
                    <input type="number" name="order_id" value={form.order_id} onChange={handleFormChange} required className={`${inputClass} pl-9`} placeholder="Masukkan ID order" disabled />
                    <Keyboard size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-black-400" />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-black-700">Jenis Inspeksi <span className="text-error-500">*</span></label>
                  <div className="flex gap-2">
                    <OptionPill active={form.jenis === 'pickup'} onClick={() => { setForm((p) => ({ ...p, jenis: 'pickup' })); setFormMode('simpan'); }}>Pickup</OptionPill>
                    <OptionPill active={form.jenis === 'return'} onClick={() => { setForm((p) => ({ ...p, jenis: 'return' })); setFormMode('kembali'); }}>Return</OptionPill>
                  </div>
                </div>
              </div>

              <fieldset disabled={formMode === 'kirim'} className={`space-y-4 ${formMode === 'kirim' ? 'opacity-70' : ''}`}>
              {/* Ringkasan Order dari Task */}
              {selectedOrder && (
                <div className="rounded-xl bg-accent-50 p-4 text-sm">
                  <p className="font-semibold text-black-900">{selectedOrder.kode_order} — {selectedOrder.kendaraan?.nama_kendaraan}</p>
                  <p className="mt-1 text-black-600">Customer: {selectedOrder.customer?.nama_lengkap} ({selectedOrder.customer?.no_hp})</p>
                  <p className="text-black-600">
                    {new Date(selectedOrder.tanggal_mulai + 'T00:00:00').toLocaleDateString('id-ID')} - {new Date(selectedOrder.tanggal_selesai + 'T00:00:00').toLocaleDateString('id-ID')}
                    {' · '}{selectedOrder.durasi_hari} hari · {selectedOrder.jam_mulai ?? '-'}
                  </p>
                </div>
              )}

              {isSupirOfSelectedOrder && (
                <div className="flex items-start gap-3 rounded-xl border border-accent-300 bg-accent-50 p-4 text-sm">
                  <AlertTriangle size={18} className="mt-0.5 shrink-0 text-accent-600" />
                  <div>
                    <p className="font-semibold text-black-900">Anda adalah supir dari order ini.</p>
                    <p className="mt-1 text-black-600">
                      Disarankan pemeriksaan return dilakukan petugas lain / admin. Biaya kerusakan yang Anda isi bersifat estimasi — keputusan final tetap ditentukan admin saat menutup order.
                    </p>
                  </div>
                </div>
              )}

              {/* Odometer & Fuel */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-black-700">Odometer (km)</label>
                  <input type="number" name="odometer" value={form.odometer} onChange={handleFormChange} className={inputClass} placeholder="Contoh: 45000" min="0" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-black-700">Level BBM <span className="text-error-500">*</span></label>
                  <FuelIndicatorBar
                    value={form.fuel_level}
                    onChange={handleFormChange}
                    required
                    aria-label="Level BBM kendaraan"
                  />
                </div>
              </div>

              {/* Kondisi */}
              <div className="rounded-xl border border-black-200 p-4">
                <p className="mb-3 text-sm font-bold text-black-900">Kondisi Kendaraan</p>
                <div className="space-y-3">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-black-700">Body <span className="text-error-500">*</span></label>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(kondisiBodyLabels).map(([value, label]) => (
                        <OptionPill key={value} active={form.kondisi_body === value} onClick={() => setForm((p) => ({ ...p, kondisi_body: value }))}>
                          {label}
                        </OptionPill>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-black-700">Interior</label>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(kondisiInteriorLabels).map(([value, label]) => (
                        <OptionPill key={value} active={form.kondisi_interior === value} onClick={() => setForm((p) => ({ ...p, kondisi_interior: value }))}>
                          {label}
                        </OptionPill>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-black-700">Ban</label>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(kondisiBanLabels).map(([value, label]) => (
                        <OptionPill key={value} active={form.kondisi_ban === value} onClick={() => setForm((p) => ({ ...p, kondisi_ban: value }))}>
                          {label}
                        </OptionPill>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-black-700">AC</label>
                      <div className="flex gap-2">
                        {Object.entries(kondisiACLabels).map(([value, label]) => (
                          <OptionPill key={value} active={form.kondisi_ac === value} onClick={() => setForm((p) => ({ ...p, kondisi_ac: value }))}>
                            {label}
                          </OptionPill>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-black-700">Lampu</label>
                      <div className="flex gap-2">
                        {Object.entries(kondisiLampuLabels).map(([value, label]) => (
                          <OptionPill key={value} active={form.kondisi_lampu === value} onClick={() => setForm((p) => ({ ...p, kondisi_lampu: value }))}>
                            {label}
                          </OptionPill>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
</div>

              {/* Checklist Serah Terima */}
              <div className="rounded-xl border border-black-200 p-4">
                <div className="mb-3">
                  <p className="text-sm font-bold text-black-900">Checklist Serah Terima</p>
                  <p className="text-xs text-black-500">Centang semua kelengkapan yang diserahkan/dikembalikan.</p>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {CHECKLIST_ITEMS.map((item) => {
                    const checked = form.checklist_serah_terima.includes(item.key);
                    return (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() =>
                          setForm((p) => ({
                            ...p,
                            checklist_serah_terima: checked
                              ? p.checklist_serah_terima.filter((k) => k !== item.key)
                              : [...p.checklist_serah_terima, item.key],
                          }))
                        }
                        className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors ${
                          checked
                            ? 'border-primary-500 bg-primary-50 text-primary-700'
                            : 'border-black-200 bg-white text-black-700'
                        }`}
                      >
                        <span className={`flex h-5 w-5 items-center justify-center rounded border ${checked ? 'border-primary-500 bg-primary-500 text-white' : 'border-black-300 bg-white'}`}>
                          {checked && (
                            <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                            </svg>
                          )}
                        </span>
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Damage checkbox */}
              <div className="flex items-center gap-2">
                <input type="checkbox" name="ada_damagenya" checked={form.ada_damagenya} onChange={handleFormChange} className="h-5 w-5 rounded border-black-400 text-primary-500 focus:ring-primary-500" />
                <label className="text-sm font-medium text-black-700">Ada Kerusakan</label>
              </div>

              {/* Deskripsi, Biaya (return), Catatan */}
              <div>
                <label className="mb-1 block text-sm font-medium text-black-700">Deskripsi Kondisi</label>
                <textarea name="deskripsi_kondisi" value={form.deskripsi_kondisi} onChange={handleFormChange} rows={3} className={inputClass} placeholder="Deskripsikan kondisi kendaraan secara detail..." />
              </div>
              {showBiayaKerusakan && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-black-700">Biaya Kerusakan Estimasi (Rp) <span className="text-xs text-black-400">opsional — nominal final ditentukan admin</span></label>
                  <input type="number" name="biaya_kerusakan" value={form.biaya_kerusakan} onChange={handleFormChange} min="0" className={inputClass} placeholder="Contoh: 250000" />
                </div>
              )}
              <div>
                <label className="mb-1 block text-sm font-medium text-black-700">Catatan</label>
                <textarea name="catatan" value={form.catatan} onChange={handleFormChange} rows={2} className={inputClass} placeholder="Catatan tambahan..." />
              </div>

              {/* Dokumentasi — Foto & Video (maks 10) */}
              <div className="rounded-xl border border-black-200 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-bold text-black-900">Dokumentasi Kendaraan</p>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${form.media.length >= MAX_MEDIA ? 'bg-error-50 text-error-600' : 'bg-black-200 text-black-500'}`}>
                    {form.media.length}/{MAX_MEDIA}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleOpenCamera('photo')}
                    className="flex flex-1 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-primary-300 bg-primary-50/50 px-4 py-5 text-center transition-colors hover:border-primary-500 hover:bg-primary-50 hover:text-primary-600"
                  >
                    <Camera size={22} className="text-primary-500" />
                    <span className="text-sm font-semibold text-primary-600">Ambil Foto</span>
                    <span className="text-xs text-black-400">Kamera langsung, retake</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenCamera('video')}
                    className="flex flex-1 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-black-300 px-4 py-5 text-center transition-colors hover:border-primary-500 hover:text-primary-500"
                  >
                    <Video size={22} className="text-black-400" />
                    <span className="text-sm font-medium text-black-500">Rekam Video</span>
                    <span className="text-xs text-black-400">Rekam lewat kamera</span>
                  </button>
                  <label className="flex w-full cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-black-300 px-4 py-4 text-center transition-colors hover:border-primary-500 hover:text-primary-500">
                    <Upload size={20} className="text-black-400" />
                    <span className="text-sm font-medium text-black-500">Upload dari Galeri</span>
                    <span className="text-xs text-black-400">Pilih banyak file · Foto dikompres otomatis · Total maks {MAX_MEDIA} file</span>
                    <input type="file" accept="image/*,video/*" multiple onChange={handleMediaChange} className="hidden" />
                  </label>
                </div>

                {typeof navigator === 'undefined' ? null : (
                  <>
                    <input
                      ref={captureFotoFallbackRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handleMediaChange}
                      className="hidden"
                      tabIndex={-1}
                    />
                    <input
                      ref={captureVideoFallbackRef}
                      type="file"
                      accept="video/*"
                      capture="environment"
                      onChange={handleMediaChange}
                      className="hidden"
                      tabIndex={-1}
                    />
                  </>
                )}
                {form.media.length > 0 && (
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {form.media.map((item) => (
                      <div key={item.key} className="relative overflow-hidden rounded-lg border border-black-200 bg-black-50">
                        {item.file.type.startsWith('image/') ? (
                          <img src={item.preview} alt={item.file.name} className="h-20 w-full object-cover" />
                        ) : (
                          <video src={item.preview} className="h-20 w-full object-cover" muted />
                        )}
                        <button
                          type="button"
                          onClick={() => removeMedia(item.key)}
                          className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white transition-colors hover:bg-error-500"
                          aria-label="Hapus media"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

{/* Petugas & Foto */}
              <div>
                <label className="mb-1 block text-sm font-medium text-black-700">Inspeksi Oleh</label>
                <input type="text" name="inspeksi_oleh" value={form.inspeksi_oleh} onChange={handleFormChange} className={inputClass} placeholder="Nama petugas" />
              </div>
              </fieldset>

              {/* Tanda Tangan Digital */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  {draft?.ttd_customer && (
                    <p className="mb-1 text-xs font-medium text-accent-600">TTD customer sudah tersimpan di draft — isi ulang hanya jika perlu.</p>
                  )}
                  <SignaturePad
                    label="Tanda Tangan Customer"
                    onChange={(blob) => setForm((prev) => ({ ...prev, ttd_customer: blob }))}
                  />
                </div>
                <div>
                  {draft?.ttd_petugas && (
                    <p className="mb-1 text-xs font-medium text-accent-600">TTD petugas sudah tersimpan di draft — isi ulang hanya jika perlu.</p>
                  )}
                  <SignaturePad
                    label="Tanda Tangan Petugas"
                    onChange={(blob) => setForm((prev) => ({ ...prev, ttd_petugas: blob }))}
                  />
                </div>
              </div>

              {/* Submit */}
              <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setDraft(null);
                  }}
                  className="rounded-lg border border-black-200 px-4 py-2.5 text-sm font-medium text-black-600 hover:bg-accent-50"
                >
                  Batal
                </button>
                {formMode === 'simpan' && (
                  <button type="submit" disabled={submitting} className="rounded-lg bg-accent-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-700 disabled:opacity-50">
                    {submitting ? 'Menyimpan...' : 'Simpan Draft Inspeksi'}
                  </button>
                )}
                {formMode === 'kirim' && (
                  <button type="submit" disabled={submitting} className="rounded-lg bg-primary-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-600 disabled:opacity-50">
                    {submitting ? 'Mengirim...' : 'Kirim Kendaraan'}
                  </button>
                )}
                {formMode === 'kembali' && (
                  <button type="submit" disabled={submitting} className="rounded-lg bg-primary-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-600 disabled:opacity-50">
                    {submitting ? 'Memproses...' : 'Simpan & Tandai Dikembalikan'}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ DETAIL MODAL â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {showDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-black-900">Detail Inspeksi #{showDetail.id}</h2>
              <button onClick={() => setShowDetail(null)} className="text-black-400 hover:text-black-600"><X size={20} /></button>
            </div>

            <div className="space-y-4">
              {/* Info Dasar */}
              <div className="grid grid-cols-2 gap-4 rounded-lg bg-accent-50 p-4">
                <div>
                  <p className="text-xs font-medium text-black-500">Order</p>
                  <p className="text-sm font-semibold text-black-900">{showDetail.order?.kode_order ?? `#${showDetail.order_id}`}</p>
                </div>
<div>
                  <p className="text-xs font-medium text-black-500">Jenis</p>
                  <div className="flex items-center gap-1.5">
                    <Badge
                      label={jenisLabels[showDetail.jenis] ?? showDetail.jenis}
                      color={showDetail.jenis === 'pickup' ? 'bg-accent-50 text-accent-600' : 'bg-primary-100 text-primary-600'}
                    />
                    {showDetail.status === 'draft' ? (
                      <Badge label="Draft" color="bg-error-50 text-error-600" />
                    ) : (
                      <Badge label="Final" color="bg-accent-50 text-accent-600" />
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium text-black-500">Tanggal Inspeksi</p>
                  <p className="text-sm text-black-700">{formatDate(showDetail.created_at)}</p>
                </div>
<div>
                  <p className="text-xs font-medium text-black-500">Petugas</p>
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm text-black-700">{showDetail.inspeksi_oleh ?? showDetail.admin?.name ?? '-'}</p>
                    {isSupirOfOrder(showDetail) && (
                      <span className="inline-flex rounded-full bg-accent-100 px-2 py-0.5 text-[10px] font-medium text-accent-700" title="Petugas ini adalah supir dari order tersebut">
                        supir order
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Data Kendaraan */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-medium text-black-500">Odometer</p>
                  <p className="text-sm font-semibold text-black-900">{showDetail.odometer ? `${showDetail.odometer.toLocaleString('id-ID')} km` : '-'}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-black-500">Level BBM</p>
                  <Badge label={fuelLabels[showDetail.fuel_level] ?? showDetail.fuel_level} color={fuelColors[showDetail.fuel_level] ?? 'bg-black-200 text-black-600'} />
                </div>
              </div>

              {/* Kondisi Detail */}
              <div>
                <p className="mb-2 text-xs font-medium text-black-500 uppercase tracking-wider">Kondisi Kendaraan</p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Body', value: showDetail.kondisi_body, labels: kondisiBodyLabels },
                    { label: 'Interior', value: showDetail.kondisi_interior, labels: kondisiInteriorLabels },
                    { label: 'Ban', value: showDetail.kondisi_ban, labels: kondisiBanLabels },
                    { label: 'AC', value: showDetail.kondisi_ac, labels: kondisiACLabels },
                    { label: 'Lampu', value: showDetail.kondisi_lampu, labels: kondisiLampuLabels },
                    { label: 'Kerusakan', value: showDetail.ada_damagenya ? 'Ya' : 'Tidak', labels: {} },
                  ].map((item) => (
                    <div key={item.label} className="rounded-lg bg-accent-50 px-3 py-2">
                      <p className="text-xs text-black-500">{item.label}</p>
                      <Badge
                        label={item.labels[item.value] ?? item.value}
                        color={kondisiColors[item.value] ?? (item.value === 'Ya' ? 'bg-error-50 text-error-600' : 'bg-accent-50 text-accent-600')}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Checklist Serah Terima */}
              <div>
                <p className="mb-2 text-xs font-medium text-black-500 uppercase tracking-wider">Checklist Serah Terima</p>
                <div className={`grid grid-cols-2 gap-2 ${showDetail.checklist_serah_terima?.length ? '' : 'hidden'}`}>
                  {CHECKLIST_ITEMS.map((item) => (
                    <div key={item.key} className="flex items-center gap-2 rounded-lg bg-accent-50 px-3 py-2">
                      <span className={`flex h-5 w-5 items-center justify-center rounded border ${showDetail.checklist_serah_terima?.includes(item.key) ? 'border-primary-500 bg-primary-500 text-white' : 'border-black-300 bg-white'}`}>
                        {showDetail.checklist_serah_terima?.includes(item.key) && (
                          <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                          </svg>
                        )}
                      </span>
                      <span className="text-xs text-black-600">{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {showDetail.biaya_kerusakan != null && Number(showDetail.biaya_kerusakan) > 0 && (
                <div className="rounded-lg bg-error-50 px-4 py-3">
                  <p className="text-xs font-medium text-error-600">Estimasi Biaya Kerusakan</p>
                  <p className="text-lg font-bold text-error-700">
                    Rp {Number(showDetail.biaya_kerusakan).toLocaleString('id-ID')}
                  </p>
                </div>
              )}

              {/* Deskripsi & Catatan */}
              {showDetail.deskripsi_kondisi && (
                <div>
                  <p className="text-xs font-medium text-black-500">Deskripsi Kondisi</p>
                  <p className="mt-1 text-sm text-black-700 whitespace-pre-wrap">{showDetail.deskripsi_kondisi}</p>
                </div>
              )}
              {showDetail.catatan && (
                <div>
                  <p className="text-xs font-medium text-black-500">Catatan</p>
                  <p className="mt-1 text-sm text-black-700 whitespace-pre-wrap">{showDetail.catatan}</p>
                </div>
              )}

              {/* Dokumentasi — Foto & Video */}
              {(showDetail.fotos?.length || showDetail.videos?.length) && (
                <div>
                  <p className="text-xs font-medium text-black-500">Dokumentasi Kendaraan</p>
                  <div className="mt-2 grid grid-cols-2 gap-3">
                    {(showDetail.fotos ?? []).map((foto, i) => (
                      <img key={`foto-${i}`} src={`/storage/${foto}`} alt={`Foto ${i + 1}`} className="max-h-40 w-full rounded-lg object-cover" />
                    ))}
                    {(showDetail.videos ?? []).map((video, i) => (
                      <video key={`video-${i}`} src={`/storage/${video}`} controls className="max-h-40 w-full rounded-lg bg-black" />
                    ))}
                  </div>
                </div>
              )}

              {/* Foto Lama */}
              {showDetail.foto && (
                <div>
                  <p className="text-xs font-medium text-black-500">Foto Kendaraan</p>
                  <img
                    src={`/storage/${showDetail.foto}`}
                    alt={`Inspeksi #${showDetail.id}`}
                    className="mt-2 max-h-64 rounded-lg object-cover"
                  />
                </div>
              )}

              {/* Tanda Tangan */}
              {(showDetail.ttd_customer || showDetail.ttd_petugas) && (
                <div className="grid grid-cols-2 gap-4">
                  {showDetail.ttd_customer && (
                    <div>
                      <p className="text-xs font-medium text-black-500">Tanda Tangan Customer</p>
                      <img src={`/storage/${showDetail.ttd_customer}`} alt="TTD Customer" className="mt-2 h-16 rounded-lg border border-black-200 bg-white object-contain" />
                    </div>
                  )}
                  {showDetail.ttd_petugas && (
                    <div>
                      <p className="text-xs font-medium text-black-500">Tanda Tangan Petugas</p>
                      <img src={`/storage/${showDetail.ttd_petugas}`} alt="TTD Petugas" className="mt-2 h-16 rounded-lg border border-black-200 bg-white object-contain" />
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <button onClick={() => setShowDetail(null)} className="rounded-lg border border-black-200 px-4 py-2 text-sm font-medium text-black-600 hover:bg-accent-50">Tutup</button>
            </div>
          </div>
        </div>
      )}

{/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ PERBAIKI TTD â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {perbaikiTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setPerbaikiTarget(null)}>
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-black-900">Perbaiki Tanda Tangan</h2>
              <button onClick={() => setPerbaikiTarget(null)} className="rounded-lg p-1 text-black-400 hover:text-black-600" aria-label="Tutup">
                <X size={18} />
              </button>
            </div>
            <p className="mb-4 text-xs text-black-500">
              Inspeksi #{perbaikiTarget.id} ({jenisLabels[perbaikiTarget.jenis]})
              {perbaikiTarget.order?.kode_order ? ` — ${perbaikiTarget.order.kode_order}` : ''}. Hanya tanda tangan yang
              diganti; foto, video, dan data lainnya tidak berubah. Berguna bila inspeksi return tersimpan tanpa TTD sehingga
              order tidak bisa ditutup.
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <SignaturePad label="Tanda Tangan Customer" onChange={setPerbaikiTtdCustomer} />
              <SignaturePad label="Tanda Tangan Petugas" onChange={setPerbaikiTtdPetugas} />
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setPerbaikiTarget(null)} className="rounded-lg border border-black-200 px-4 py-2 text-sm font-medium text-black-600 hover:bg-accent-50">
                Batal
              </button>
              <button
                onClick={handlePerbaikiTtd}
                disabled={perbaikiSubmitting || (!perbaikiTtdCustomer && !perbaikiTtdPetugas)}
                className="rounded-lg bg-primary-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-600 disabled:opacity-50"
              >
                {perbaikiSubmitting ? 'Menyimpan...' : 'Simpan Tanda Tangan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ DELETE CONFIRM â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {deleteTarget && (
        <ConfirmModal
          open={!!deleteTarget}
          title="Hapus Inspeksi"
          message={`Yakin ingin menghapus inspeksi #${deleteTarget.id} (${jenisLabels[deleteTarget.jenis]})?`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      <CameraModal
        open={cameraMode !== null}
        mode={cameraMode ?? 'photo'}
        onClose={() => setCameraMode(null)}
        onCapture={(file) => {
          void addFilesToMedia([file]);
        }}
        onFallback={() => {
          if (cameraMode) triggerFallbackCapture(cameraMode);
        }}
      />
    </div>
  );
}




