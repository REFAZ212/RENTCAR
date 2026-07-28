import { useState, useEffect, useCallback, type ChangeEvent, type FormEvent } from 'react';
import { isAxiosError } from 'axios';
import { userAPI, type AppUser } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import ConfirmModal from '../components/ConfirmModal';
import { Plus, Search, Pencil, Trash2, X, Users } from 'lucide-react';

const inputClass =
  'w-full rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-900 outline-none transition-colors focus:border-brand-500 focus:ring-1 focus:ring-brand-500';

const roleLabels: Record<string, string> = {
  admin_utama: 'Admin Utama',
  admin_operasional: 'Admin Operasional',
  petugas: 'Petugas',
};

const roleColors: Record<string, string> = {
  admin_utama: 'bg-brand-100 text-brand-700',
  admin_operasional: 'bg-avail-50 text-avail-600',
  petugas: 'bg-ink-100 text-ink-600',
};

interface UserForm {
  name: string;
  email: string;
  phone: string;
  role: string;
  password: string;
  password_confirmation: string;
}

const emptyForm: UserForm = {
  name: '',
  email: '',
  phone: '',
  role: 'petugas',
  password: '',
  password_confirmation: '',
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
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editTarget) {
        const payload: Record<string, string> = {
          name: form.name,
          email: form.email,
          phone: form.phone,
          role: form.role,
        };
        if (form.password) {
          payload.password = form.password;
          payload.password_confirmation = form.password_confirmation;
        }
        await userAPI.update(editTarget.id, payload as unknown as Record<string, unknown>);
        toastSuccess('User berhasil diperbarui.');
      } else {
        await userAPI.create(form as unknown as Record<string, unknown>);
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
          <h1 className="font-display text-2xl font-bold text-ink-900">Manajemen User</h1>
          <p className="text-sm text-ink-400">Kelola akun admin & petugas</p>
        </div>
        <button onClick={openCreate} className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600">
          <Plus size={16} /> Tambah User
        </button>
      </div>

      <div className="rounded-xl border border-ink-200 bg-white p-4 shadow-sm">
        <div className="relative max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <input
            type="text"
            placeholder="Cari nama, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`${inputClass} pl-10`}
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-ink-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-ink-200 bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-ink-400">Nama</th>
                <th className="px-4 py-3 text-left font-medium text-ink-400">Email</th>
                <th className="px-4 py-3 text-left font-medium text-ink-400">No. HP</th>
                <th className="px-4 py-3 text-left font-medium text-ink-400">Role</th>
                <th className="px-4 py-3 text-left font-medium text-ink-400">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-200">
              {loading ? (
                <tr><td colSpan={5} className="p-12 text-center text-ink-400">Memuat data...</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={5} className="p-12 text-center text-ink-400">Tidak ada data user</td></tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {item.avatar ? (
                          <img src={`/storage/${item.avatar}`} alt="" className="h-8 w-8 rounded-full object-cover" />
                        ) : (
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-ink-100">
                            <Users size={14} className="text-ink-400" />
                          </div>
                        )}
                        <span className="font-medium text-ink-900">{item.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-ink-600">{item.email}</td>
                    <td className="px-4 py-3 text-ink-600">{item.phone || '-'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${roleColors[item.role] ?? 'bg-ink-100 text-ink-600'}`}>
                        {roleLabels[item.role] ?? item.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => openEdit(item)} className="text-ink-400 hover:text-brand-500" title="Edit"><Pencil size={16} /></button>
                        <button onClick={() => setDeleteTarget(item)} className="text-ink-400 hover:text-red-500" title="Hapus"><Trash2 size={16} /></button>
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
              <h2 className="text-lg font-bold text-ink-900">{editTarget ? 'Edit User' : 'Tambah User'}</h2>
              <button onClick={() => setShowForm(false)} className="text-ink-400 hover:text-ink-600"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-ink-700">Nama <span className="text-red-500">*</span></label>
                <input type="text" name="name" value={form.name} onChange={handleFormChange} required className={inputClass} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-ink-700">Email <span className="text-red-500">*</span></label>
                  <input type="email" name="email" value={form.email} onChange={handleFormChange} required className={inputClass} />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-ink-700">No. HP</label>
                  <input type="text" name="phone" value={form.phone} onChange={handleFormChange} className={inputClass} placeholder="08xxx" />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-ink-700">Role <span className="text-red-500">*</span></label>
                <select name="role" value={form.role} onChange={handleFormChange} className={inputClass}>
                  <option value="admin_utama">Admin Utama</option>
                  <option value="admin_operasional">Admin Operasional</option>
                  <option value="petugas">Petugas</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-ink-700">
                    Password {editTarget ? '(kosongkan jika tidak ubah)' : <span className="text-red-500">*</span>}
                  </label>
                  <input type="password" name="password" value={form.password} onChange={handleFormChange} required={!editTarget} className={inputClass} minLength={8} />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-ink-700">Konfirmasi Password</label>
                  <input type="password" name="password_confirmation" value={form.password_confirmation} onChange={handleFormChange} className={inputClass} />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="rounded-lg border border-ink-200 px-4 py-2 text-sm font-medium text-ink-600 hover:bg-ink-50">Batal</button>
                <button type="submit" disabled={submitting} className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50">
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
