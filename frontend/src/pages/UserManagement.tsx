import { useState, useEffect, useCallback, type ChangeEvent, type FormEvent } from 'react';
import { isAxiosError } from 'axios';
import { userAPI, type AppUser } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import ConfirmModal from '../components/ConfirmModal';
import { Plus, Search, Pencil, Trash2, X, Users } from 'lucide-react';

const inputClass =
  'w-full rounded-lg border border-black-200 px-3 py-2 text-sm text-black-900 outline-none transition-colors focus:border-primary-500 focus:ring-1 focus:ring-primary-500';

const roleLabels: Record<string, string> = {
  admin_utama: 'Admin Utama',
  admin_operasional: 'Admin Operasional',
  petugas: 'Petugas',
};

const roleColors: Record<string, string> = {
  admin_utama: 'bg-primary-100 text-primary-700',
  admin_operasional: 'bg-accent-50 text-accent-600',
  petugas: 'bg-black-200 text-black-600',
};

interface UserForm {
  name: string;
  email: string;
  phone: string;
  role: string;
  password: string;
  password_confirmation: string;
  nyambi_supir: boolean;
  no_sim: string;
  tarif_per_hari: string;
}

const emptyForm: UserForm = {
  name: '',
  email: '',
  phone: '',
  role: 'petugas',
  password: '',
  password_confirmation: '',
  nyambi_supir: false,
  no_sim: '',
  tarif_per_hari: '',
};

export default function UserManagement() {
  const { error: toastError, success: toastSuccess } = useToast();
  const [items, setItems] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<AppUser | null>(null);
  const [form, setForm] = useState<UserForm>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AppUser | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    userAPI
      .list({ search })
      .then(({ data }) => setItems(data.data))
      .catch(() => toastError('Gagal memuat data user'))
      .finally(() => setLoading(false));
  }, [search, toastError]);

  useEffect(() => {
    load();
  }, [load]);

  const handleFormChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const openCreate = () => {
    setEditTarget(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const openEdit = (item: AppUser) => {
    setEditTarget(item);
    setForm({
      name: item.name,
      email: item.email,
      phone: item.phone ?? '',
      role: item.role,
      password: '',
      password_confirmation: '',
      nyambi_supir: !!item.supir_calo,
      no_sim: item.supir_calo?.no_sim ?? '',
      tarif_per_hari: item.supir_calo?.tarif_per_hari != null ? String(item.supir_calo.tarif_per_hari) : '',
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editTarget) {
        const payload: Record<string, string | boolean | number> = {
          name: form.name,
          email: form.email,
          phone: form.phone,
          role: form.role,
          nyambi_supir: form.nyambi_supir,
        };
        if (form.nyambi_supir) {
          payload.no_sim = form.no_sim;
          payload.tarif_per_hari = Number(form.tarif_per_hari) || 0;
        }
        if (form.password) {
          payload.password = form.password;
          payload.password_confirmation = form.password_confirmation;
        }
        await userAPI.update(editTarget.id, payload as unknown as Record<string, unknown>);
        toastSuccess('User berhasil diperbarui.');
      } else {
        const payload: Record<string, string | boolean | number> = {
          name: form.name,
          email: form.email,
          phone: form.phone,
          role: form.role,
          password: form.password,
          password_confirmation: form.password_confirmation,
          nyambi_supir: form.nyambi_supir,
        };
        if (form.nyambi_supir) {
          payload.no_sim = form.no_sim;
          payload.tarif_per_hari = Number(form.tarif_per_hari) || 0;
        }
        await userAPI.create(payload as unknown as Record<string, unknown>);
        toastSuccess('User berhasil ditambahkan.');
      }
      setShowForm(false);
      load();
    } catch (err) {
      const msg = isAxiosError(err) ? err.response?.data?.message : 'Gagal menyimpan user.';
      toastError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await userAPI.delete(deleteTarget.id);
      toastSuccess('User berhasil dihapus.');
      setDeleteTarget(null);
      load();
    } catch (err) {
      const msg = isAxiosError(err) ? err.response?.data?.message : 'Gagal menghapus user.';
      toastError(msg);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-black-900">Manajemen User</h1>
          <p className="text-sm text-black-400">Kelola akun admin & petugas</p>
        </div>
        <button onClick={openCreate} className="inline-flex items-center gap-2 rounded-lg bg-primary-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-600">
          <Plus size={16} /> Tambah User
        </button>
      </div>

      <div className="rounded-xl border border-black-200 bg-white p-4 shadow-sm">
        <div className="relative max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-black-400" />
          <input
            type="text"
            placeholder="Cari nama, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`${inputClass} pl-10`}
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-black-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-black-200 bg-canvas">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-black-400">Nama</th>
                <th className="px-4 py-3 text-left font-medium text-black-400">Email</th>
                <th className="px-4 py-3 text-left font-medium text-black-400">No. HP</th>
                <th className="px-4 py-3 text-left font-medium text-black-400">Role</th>
                <th className="px-4 py-3 text-left font-medium text-black-400">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black-200">
              {loading ? (
                <tr><td colSpan={5} className="p-12 text-center text-black-400">Memuat data...</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={5} className="p-12 text-center text-black-400">Tidak ada data user</td></tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className="hover:bg-canvas transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {item.avatar ? (
                          <img src={`/storage/${item.avatar}`} alt="" className="h-8 w-8 rounded-full object-cover" />
                        ) : (
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-black-200">
                            <Users size={14} className="text-black-400" />
                          </div>
                        )}
                        <span className="font-medium text-black-900">{item.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-black-600">{item.email}</td>
                    <td className="px-4 py-3 text-black-600">{item.phone || '-'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${roleColors[item.role] ?? 'bg-black-200 text-black-600'}`}>
                          {roleLabels[item.role] ?? item.role}
                        </span>
                        {item.supir_calo && (
                          <span className="inline-flex rounded-full bg-primary-50 px-2 py-0.5 text-xs font-medium text-primary-600" title="Nyambi sebagai supir">
                            Supir
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => openEdit(item)} className="text-black-400 hover:text-primary-500" title="Edit"><Pencil size={16} /></button>
                        <button onClick={() => setDeleteTarget(item)} className="text-black-400 hover:text-error-500" title="Hapus"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-black-900">{editTarget ? 'Edit User' : 'Tambah User'}</h2>
              <button onClick={() => setShowForm(false)} className="text-black-400 hover:text-black-600"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-black-700">Nama <span className="text-error-500">*</span></label>
                <input type="text" name="name" value={form.name} onChange={handleFormChange} required className={inputClass} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-black-700">Email <span className="text-error-500">*</span></label>
                  <input type="email" name="email" value={form.email} onChange={handleFormChange} required className={inputClass} />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-black-700">No. HP</label>
                  <input type="text" name="phone" value={form.phone} onChange={handleFormChange} className={inputClass} placeholder="08xxx" />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-black-700">Role <span className="text-error-500">*</span></label>
                <select name="role" value={form.role} onChange={handleFormChange} className={inputClass}>
                  <option value="admin_utama">Admin Utama</option>
                  <option value="admin_operasional">Admin Operasional</option>
                  <option value="petugas">Petugas</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-black-700">
                    Password {editTarget ? '(kosongkan jika tidak ubah)' : <span className="text-error-500">*</span>}
                  </label>
                  <input type="password" name="password" value={form.password} onChange={handleFormChange} required={!editTarget} className={inputClass} minLength={8} />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-black-700">Konfirmasi Password</label>
                  <input type="password" name="password_confirmation" value={form.password_confirmation} onChange={handleFormChange} className={inputClass} />
                </div>
              </div>
              <div className="rounded-xl border border-black-200 p-4">
                <label className="flex cursor-pointer items-center justify-between gap-3">
                  <span className="text-sm font-medium text-black-700">Nyambi sebagai supir</span>
                  <input
                    type="checkbox"
                    name="nyambi_supir"
                    checked={form.nyambi_supir}
                    onChange={handleFormChange}
                    className="h-5 w-5 rounded border-black-300 text-primary-600 accent-primary-600"
                  />
                </label>
                <p className="mt-1 text-xs text-black-400">
                  User ini juga bisa dipilih sebagai supir di order. Nama & No. HP mengikuti data user.
                </p>
                {form.nyambi_supir && (
                  <div className="mt-4 grid grid-cols-2 gap-4">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-black-700">No. SIM <span className="text-error-500">*</span></label>
                      <input type="text" name="no_sim" value={form.no_sim} onChange={handleFormChange} required className={inputClass} placeholder="SIM A / B I" />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-black-700">Tarif per hari <span className="text-error-500">*</span></label>
                      <input type="number" name="tarif_per_hari" value={form.tarif_per_hari} onChange={handleFormChange} required min={0} className={inputClass} placeholder="250000" />
                    </div>
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="rounded-lg border border-black-200 px-4 py-2 text-sm font-medium text-black-600 hover:bg-accent-50">Batal</button>
                <button type="submit" disabled={submitting} className="rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600 disabled:opacity-50">
                  {submitting ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteTarget && (
        <ConfirmModal
          open={!!deleteTarget}
          title="Hapus User"
          message={`Yakin ingin menghapus "${deleteTarget.name}"?`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
