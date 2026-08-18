import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Search,
  Navigation,
  Gauge,
  Clock,
  Fuel,
  Radio,
  MapPin,
  User,
  PauseCircle,
  WifiOff,
  Settings,
  Copy,
  ExternalLink,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { gpsAPI, kendaraanAPI, type GpsVehicleLive, type GpsHistoryPoint, type GpsDevice, type Kendaraan } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';

// Perbaikan default marker Leaflet yang sering rusak di bundler Vite
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const POLL_INTERVAL_MS = 15000;

type GpsStatus = 'bergerak' | 'diam' | 'offline';

const statusLabels: Record<GpsStatus, string> = {
  bergerak: 'Bergerak',
  diam: 'Diam',
  offline: 'Offline',
};

const statusStyles: Record<GpsStatus, string> = {
  bergerak: 'bg-accent-50 text-accent-500',
  diam: 'bg-primary-50 text-primary-600',
  offline: 'bg-accent-100 text-black-400',
};

const statusDot: Record<GpsStatus, string> = {
  bergerak: 'bg-accent-500',
  diam: 'bg-primary-500',
  offline: 'bg-black-400',
};

const statusFilters: Array<'Semua' | GpsStatus> = ['Semua', 'bergerak', 'diam', 'offline'];

function markerIcon(status: GpsStatus) {
  const color = status === 'bergerak' ? '#FFC20F' : status === 'diam' ? '#15459A' : '#999999';
  return L.divIcon({
    className: '',
    html: `<div style="width:16px;height:16px;border-radius:9999px;background:${color};border:3px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.4);"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
}

function FitBounds({ vehicles }: { vehicles: GpsVehicleLive[] }) {
  const map = useMap();
  useEffect(() => {
    if (vehicles.length === 0) return;
    const bounds = L.latLngBounds(vehicles.map((v) => [v.lat, v.lng] as [number, number]));
    map.fitBounds(bounds, { padding: [60, 60], maxZoom: 15 });
  }, [vehicles, map]);
  return null;
}

function formatRelative(iso: string): string {
  const d = new Date(iso);
  const diffMin = Math.floor((Date.now() - d.getTime()) / 60000);
  if (diffMin < 1) return 'Baru saja';
  if (diffMin < 60) return `${diffMin}m lalu`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}j lalu`;
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

const emptyDeviceForm = {
  kendaraan_id: '',
  nama_perangkat: '',
  device_identifier: '',
  catatan: '',
};

export default function GpsPage() {
  const { user } = useAuth();
  const toast = useToast();
  const [vehicles, setVehicles] = useState<GpsVehicleLive[]>([]);
  const [devices, setDevices] = useState<GpsDevice[]>([]);
  const [kendaraans, setKendaraans] = useState<Kendaraan[]>([]);
  const [history, setHistory] = useState<GpsHistoryPoint[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'Semua' | GpsStatus>('Semua');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [showDevicesModal, setShowDevicesModal] = useState(false);
  const [deviceForm, setDeviceForm] = useState(emptyDeviceForm);
  const [submitting, setSubmitting] = useState(false);

  const fetchVehicles = useCallback(async () => {
    try {
      const res = await gpsAPI.latest();
      const items = res.data.data ?? [];
      setVehicles(items);
      setSelectedId((prev) => (prev !== null && items.some((v) => v.kendaraan_id === prev) ? prev : null));
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchDevices = useCallback(async () => {
    try {
      const res = await gpsAPI.devices();
      setDevices(res.data.data ?? []);
    } catch {
      // silent
    }
  }, []);

  const fetchKendaraans = useCallback(async () => {
    try {
      const res = await kendaraanAPI.list({ per_page: 200 });
      const items = (res.data as unknown as { data: Kendaraan[] }).data ?? [];
      setKendaraans(items);
    } catch {
      // silent
    }
  }, []);

  const fetchHistory = useCallback(async (kendaraanId: number) => {
    setHistoryLoading(true);
    try {
      const res = await gpsAPI.history(kendaraanId, { limit: 500 });
      setHistory(res.data.data ?? []);
    } catch {
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVehicles();
    const interval = setInterval(() => {
      if (!document.hidden) fetchVehicles();
    }, POLL_INTERVAL_MS);
    const onFocus = () => fetchVehicles();
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, [fetchVehicles]);

  useEffect(() => {
    if (selectedId !== null) fetchHistory(selectedId);
  }, [selectedId, fetchHistory]);

  useEffect(() => {
    if (showDevicesModal) {
      fetchDevices();
      fetchKendaraans();
    }
  }, [showDevicesModal, fetchDevices, fetchKendaraans]);

  const filtered = useMemo(() => {
    return vehicles.filter((v) => {
      const matchesStatus = statusFilter === 'Semua' || v.status === statusFilter;
      const q = search.toLowerCase();
      const matchesSearch =
        v.plat_nomor.toLowerCase().includes(q) ||
        v.nama_kendaraan.toLowerCase().includes(q) ||
        (v.driver ?? '').toLowerCase().includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [vehicles, search, statusFilter]);

  const counts = useMemo(
    () => ({
      total: devices.length,
      bergerak: vehicles.filter((v) => v.status === 'bergerak').length,
      diam: vehicles.filter((v) => v.status === 'diam').length,
      offline: vehicles.filter((v) => v.status === 'offline').length,
    }),
    [devices.length, vehicles]
  );

  const selected = vehicles.find((v) => v.kendaraan_id === selectedId) ?? null;
  const historyPositions = useMemo(() => history.map((p) => [p.lat, p.lng] as [number, number]), [history]);
  const kendaraanTanpaDevice = useMemo(() => {
    const usedIds = new Set(devices.map((d) => d.kendaraan_id));
    return kendaraans.filter((k) => !usedIds.has(k.id));
  }, [kendaraans, devices]);

  const openDevicesModal = () => {
    setDeviceForm(emptyDeviceForm);
    setShowDevicesModal(true);
  };

  const copyApiKey = async (key: string) => {
    try {
      await navigator.clipboard.writeText(key);
      toast.success('API key disalin.');
    } catch {
      toast.error('Gagal menyalin API key.');
    }
  };

  const handleAddDevice = async (e: FormEvent) => {
    e.preventDefault();
    if (!deviceForm.kendaraan_id) {
      toast.error('Pilih kendaraan terlebih dahulu.');
      return;
    }
    setSubmitting(true);
    try {
      await gpsAPI.createDevice({
        kendaraan_id: Number(deviceForm.kendaraan_id),
        nama_perangkat: deviceForm.nama_perangkat || undefined,
        device_identifier: deviceForm.device_identifier || undefined,
        catatan: deviceForm.catatan || undefined,
      });
      toast.success('Perangkat GPS didaftarkan.');
      setDeviceForm(emptyDeviceForm);
      await fetchDevices();
      await fetchVehicles();
    } catch {
      toast.error('Gagal mendaftarkan perangkat.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleDevice = async (device: GpsDevice) => {
    try {
      await gpsAPI.updateDevice(device.id, { status_aktif: !device.status_aktif });
      await fetchDevices();
      await fetchVehicles();
    } catch {
      toast.error('Gagal mengubah status perangkat.');
    }
  };

  const handleDeleteDevice = async (device: GpsDevice) => {
    if (!window.confirm(`Hapus perangkat GPS untuk ${device.kendaraan?.nama_kendaraan ?? 'kendaraan'} beserta seluruh riwayat lokasinya?`)) return;
    try {
      await gpsAPI.deleteDevice(device.id);
      toast.success('Perangkat GPS dihapus.');
      await fetchDevices();
      await fetchVehicles();
    } catch {
      toast.error('Gagal menghapus perangkat.');
    }
  };

  const isAdminUtama = user?.role === 'admin_utama';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-black-900">Pelacakan GPS</h1>
          <p className="mt-1 text-sm text-black-400">
            {devices.length === 0
              ? 'Belum ada perangkat GPS terdaftar. Buka Kelola Perangkat untuk mendaftarkan kendaraan.'
              : 'Pantau lokasi armada secara langsung · diperbarui otomatis tiap 15 detik'}
          </p>
        </div>
        <button
          onClick={openDevicesModal}
          className="flex items-center gap-2 rounded-lg bg-black-900 px-4 py-2 text-sm font-medium text-white hover:bg-black-800"
        >
          <Settings size={16} />
          Kelola Perangkat
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white rounded-2xl shadow-sm border border-accent-100 p-5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-lg bg-black-900/5 flex items-center justify-center shrink-0">
              <Radio size={20} className="text-black-900" />
            </div>
            <div>
              <p className="text-xs text-black-400 font-medium">Total Terpantau</p>
              <p className="text-xl font-bold text-black-900">{counts.total}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-accent-100 p-5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-lg bg-accent-50 flex items-center justify-center shrink-0">
              <Navigation size={20} className="text-accent-500" />
            </div>
            <div>
              <p className="text-xs text-black-400 font-medium">Bergerak</p>
              <p className="text-xl font-bold text-black-900">{counts.bergerak}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-accent-100 p-5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-lg bg-primary-50 flex items-center justify-center shrink-0">
              <PauseCircle size={20} className="text-primary-600" />
            </div>
            <div>
              <p className="text-xs text-black-400 font-medium">Diam</p>
              <p className="text-xl font-bold text-black-900">{counts.diam}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-accent-100 p-5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-lg bg-accent-100 flex items-center justify-center shrink-0">
              <WifiOff size={20} className="text-black-400" />
            </div>
            <div>
              <p className="text-xs text-black-400 font-medium">Offline</p>
              <p className="text-xl font-bold text-black-900">{counts.offline}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 bg-white rounded-2xl shadow-sm border border-accent-100 flex flex-col max-h-[640px]">
          <div className="p-4 border-b border-accent-100 space-y-3 shrink-0">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-black-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari plat, unit, atau driver..."
                className="w-full rounded-lg border border-black-200 bg-canvas py-2 pl-9 pr-3 text-sm text-black-400 placeholder:text-black-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-100"
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {statusFilters.map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                    statusFilter === s ? 'bg-black-900 text-white' : 'bg-accent-100 text-black-400 hover:bg-black-200'
                  }`}
                >
                  {s === 'Semua' ? 'Semua' : statusLabels[s]}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-accent-50">
            {loading && vehicles.length === 0 ? (
              <div className="p-8 text-center text-sm text-black-400">Memuat...</div>
            ) : filtered.length === 0 ? (
              <div className="p-8 text-center text-sm text-black-400">
                {devices.length === 0 ? 'Belum ada perangkat terdaftar.' : 'Tidak ada kendaraan yang cocok.'}
              </div>
            ) : (
              filtered.map((v) => (
                <button
                  key={v.kendaraan_id}
                  onClick={() => setSelectedId(v.kendaraan_id)}
                  className={`w-full text-left p-4 hover:bg-canvas transition-colors ${
                    selectedId === v.kendaraan_id ? 'bg-primary-50/60' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${statusDot[v.status]}`} />
                        <span className="font-mono text-xs font-semibold text-black-400">{v.plat_nomor}</span>
                      </div>
                      <p className="mt-1 text-sm font-semibold text-black-900 truncate">{v.nama_kendaraan}</p>
                      <p className="text-xs text-black-400 truncate">{v.driver ?? '-'}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${statusStyles[v.status]}`}>
                        {statusLabels[v.status]}
                      </span>
                      <p className="mt-1 text-[11px] text-black-400">{formatRelative(v.last_update)}</p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-accent-100 overflow-hidden relative">
          <div className="h-[420px] lg:h-[520px] w-full">
            <MapContainer center={[-6.6, 107.1]} zoom={9} scrollWheelZoom className="h-full w-full">
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              {selected && historyPositions.length > 1 && (
                <Polyline
                  positions={historyPositions}
                  pathOptions={{ color: '#15459A', weight: 3, opacity: 0.7 }}
                />
              )}

              {vehicles.map((v) => (
                <Marker key={v.kendaraan_id} position={[v.lat, v.lng]} icon={markerIcon(v.status)} eventHandlers={{ click: () => setSelectedId(v.kendaraan_id) }}>
                  <Popup>
                    <div className="text-sm">
                      <p className="font-semibold">{v.plat_nomor}</p>
                      <p className="text-black-400">{v.nama_kendaraan} · {v.driver ?? '-'}</p>
                      <p className="text-black-400">{statusLabels[v.status]} · {v.speed_kmh} km/jam</p>
                    </div>
                  </Popup>
                </Marker>
              ))}

              {vehicles.length > 0 && <FitBounds vehicles={vehicles} />}
            </MapContainer>
          </div>
          {selected && historyLoading && (
            <div className="absolute top-2 right-2 z-[1000] rounded-lg bg-black-900/80 px-3 py-1.5 text-xs text-white">
              Memuat riwayat jalur...
            </div>
          )}
        </div>
      </div>

      {selected && (
        <div className="bg-white rounded-2xl shadow-sm border border-accent-100 p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-md border-2 border-black-800 bg-black-900 px-2.5 py-1 font-mono text-xs font-semibold tracking-wider text-white">
                  {selected.plat_nomor}
                </span>
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyles[selected.status]}`}>
                  {statusLabels[selected.status]}
                </span>
              </div>
              <p className="mt-2 font-display text-lg font-semibold text-black-900">{selected.nama_kendaraan}</p>
              {historyPositions.length > 0 && (
                <p className="mt-1 text-xs text-primary-500">Jalur {historyPositions.length} titik · 24 jam terakhir</p>
              )}
              <a
                href={`https://www.google.com/maps?q=${selected.lat},${selected.lng}`}
                target="_blank"
                rel="noreferrer"
                className="mt-1 flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-700"
              >
                <MapPin size={14} />
                {selected.lat.toFixed(5)}, {selected.lng.toFixed(5)}
                <ExternalLink size={12} />
              </a>
            </div>

            <button onClick={() => setSelectedId(null)} className="text-sm font-medium text-black-400 hover:text-black-700">
              Tutup detail
            </button>
          </div>

          <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="rounded-xl bg-canvas p-3">
              <p className="flex items-center gap-1.5 text-xs text-black-400"><User size={13} /> Driver</p>
              <p className="mt-1 text-sm font-semibold text-black-900">{selected.driver ?? '-'}</p>
            </div>
            <div className="rounded-xl bg-canvas p-3">
              <p className="flex items-center gap-1.5 text-xs text-black-400"><Gauge size={13} /> Kecepatan</p>
              <p className="mt-1 text-sm font-semibold text-black-900">{selected.speed_kmh} km/jam</p>
            </div>
            <div className="rounded-xl bg-canvas p-3">
              <p className="flex items-center gap-1.5 text-xs text-black-400"><Fuel size={13} /> Bahan Bakar</p>
              <p className="mt-1 text-sm font-semibold text-black-900">{selected.fuel_percent !== null ? `${selected.fuel_percent}%` : '-'}</p>
            </div>
            <div className="rounded-xl bg-canvas p-3">
              <p className="flex items-center gap-1.5 text-xs text-black-400"><Clock size={13} /> Update Terakhir</p>
              <p className="mt-1 text-sm font-semibold text-black-900">{formatRelative(selected.last_update)}</p>
            </div>
          </div>
        </div>
      )}

      {showDevicesModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold text-black-900">Kelola Perangkat GPS</h2>
              <button onClick={() => setShowDevicesModal(false)} className="rounded-lg p-2 text-black-400 hover:bg-canvas">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddDevice} className="mt-5 rounded-xl border border-accent-100 bg-canvas p-4">
              <p className="text-sm font-semibold text-black-800">Daftarkan Perangkat Baru</p>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-black-500">Kendaraan</label>
                  <select
                    value={deviceForm.kendaraan_id}
                    onChange={(e) => setDeviceForm((p) => ({ ...p, kendaraan_id: e.target.value }))}
                    required
                    className="w-full rounded-lg border border-black-200 bg-white px-3 py-2 text-sm focus:border-primary-400 focus:outline-none"
                  >
                    <option value="">Pilih kendaraan...</option>
                    {kendaraanTanpaDevice.map((k) => (
                      <option key={k.id} value={k.id}>
                        {k.nama_kendaraan} · {k.plat_nomor}
                      </option>
                    ))}
                    {kendaraanTanpaDevice.length === 0 && <option disabled>Semua kendaraan sudah punya perangkat</option>}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-black-500">Nama Perangkat (opsional)</label>
                  <input
                    type="text"
                    value={deviceForm.nama_perangkat}
                    onChange={(e) => setDeviceForm((p) => ({ ...p, nama_perangkat: e.target.value }))}
                    placeholder="cth. Tracker Avanza"
                    className="w-full rounded-lg border border-black-200 bg-white px-3 py-2 text-sm focus:border-primary-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-black-500">ID Perangkat Vendor (opsional)</label>
                  <input
                    type="text"
                    value={deviceForm.device_identifier}
                    onChange={(e) => setDeviceForm((p) => ({ ...p, device_identifier: e.target.value }))}
                    placeholder="cth. IMEI / serial perangkat"
                    className="w-full rounded-lg border border-black-200 bg-white px-3 py-2 text-sm focus:border-primary-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-black-500">Catatan (opsional)</label>
                  <input
                    type="text"
                    value={deviceForm.catatan}
                    onChange={(e) => setDeviceForm((p) => ({ ...p, catatan: e.target.value }))}
                    className="w-full rounded-lg border border-black-200 bg-white px-3 py-2 text-sm focus:border-primary-400 focus:outline-none"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="mt-3 flex items-center gap-1.5 rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600 disabled:opacity-50"
              >
                <Plus size={15} />
                Daftarkan
              </button>
              <p className="mt-3 text-xs text-black-400">
                Setelah mendaftar, arahkan perangkat/vendor ke endpoint push:
                <code className="mx-1 rounded bg-black-100 px-1.5 py-0.5 font-mono">POST /api/gps/push</code>
                dengan membawa <code className="mx-1 rounded bg-black-100 px-1.5 py-0.5 font-mono">api_key</code> di bawah ini.
              </p>
            </form>

            <div className="mt-5 space-y-3">
              {devices.length === 0 && (
                <p className="py-6 text-center text-sm text-black-400">Belum ada perangkat terdaftar.</p>
              )}
              {devices.map((d) => (
                <div key={d.id} className="rounded-xl border border-accent-100 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-black-900">
                        {d.kendaraan?.nama_kendaraan ?? `Kendaraan #${d.kendaraan_id}`}
                        <span className="ml-2 font-mono text-xs font-medium text-black-400">{d.kendaraan?.plat_nomor}</span>
                      </p>
                      <p className="mt-0.5 text-xs text-black-400">
                        {d.nama_perangkat || 'Perangkat GPS'} · {d.device_identifier || 'ID vendor belum diisi'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleDevice(d)}
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          d.status_aktif ? 'bg-accent-100 text-accent-700' : 'bg-black-100 text-black-400'
                        }`}
                      >
                        {d.status_aktif ? 'Aktif' : 'Nonaktif'}
                      </button>
                      {isAdminUtama && (
                        <button onClick={() => handleDeleteDevice(d)} className="rounded-lg p-1.5 text-black-400 hover:bg-error-50 hover:text-error-500">
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-2 rounded-lg bg-black-900/5 px-3 py-2">
                    <code className="flex-1 truncate font-mono text-xs text-black-600">{d.api_key}</code>
                    <button onClick={() => copyApiKey(d.api_key)} className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-primary-600 hover:bg-primary-50">
                      <Copy size={13} />
                      Salin
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}