import { useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
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
} from 'lucide-react';

// Perbaikan default marker Leaflet yang sering rusak di bundler Vite
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

type GpsStatus = 'Bergerak' | 'Diam' | 'Offline';

interface GpsVehicle {
  id: string;
  plate: string;
  model: string;
  driver: string;
  status: GpsStatus;
  speed: number;
  fuel: number;
  lastUpdate: string;
  address: string;
  lat: number;
  lng: number;
}

const mockVehicles: GpsVehicle[] = [
  { id: 'GPS-01', plate: 'B 1234 XYZ', model: 'Toyota Avanza', driver: 'Ahmad Fauzi', status: 'Bergerak', speed: 42, fuel: 68, lastUpdate: 'Baru saja', address: 'Jl. Sudirman, Jakarta Pusat', lat: -6.2088, lng: 106.8456 },
  { id: 'GPS-02', plate: 'B 5821 ABK', model: 'Honda Brio', driver: 'Dewi Lestari', status: 'Diam', speed: 0, fuel: 45, lastUpdate: '3 menit lalu', address: 'Jl. Asia Afrika, Bandung', lat: -6.9175, lng: 107.6191 },
  { id: 'GPS-03', plate: 'D 7719 QW', model: 'Mitsubishi Xpander', driver: 'Rizky Pratama', status: 'Bergerak', speed: 58, fuel: 82, lastUpdate: 'Baru saja', address: 'Jl. Pajajaran, Bogor', lat: -6.5971, lng: 106.806 },
  { id: 'GPS-04', plate: 'B 9902 LMN', model: 'Toyota Fortuner', driver: 'Siti Nurhaliza', status: 'Offline', speed: 0, fuel: 20, lastUpdate: '2 jam lalu', address: 'Terakhir terlihat: Jl. Gatot Subroto, Jakarta', lat: -6.2297, lng: 106.8175 },
  { id: 'GPS-05', plate: 'F 3345 RT', model: 'Daihatsu Xenia', driver: 'Budi Santoso', status: 'Bergerak', speed: 35, fuel: 55, lastUpdate: 'Baru saja', address: 'Tol Jagorawi KM 12', lat: -6.4025, lng: 106.8106 },
  { id: 'GPS-06', plate: 'B 6610 CVX', model: 'Honda HR-V', driver: 'Ahmad Fauzi', status: 'Diam', speed: 0, fuel: 90, lastUpdate: '8 menit lalu', address: 'Jl. Braga, Bandung', lat: -6.9147, lng: 107.6098 },
];

const statusStyles: Record<GpsStatus, string> = {
  Bergerak: 'bg-accent-50 text-accent-500',
  Diam: 'bg-primary-50 text-primary-600',
  Offline: 'bg-accent-100 text-black-400',
};

const statusDot: Record<GpsStatus, string> = {
  Bergerak: 'bg-accent-500',
  Diam: 'bg-primary-500',
  Offline: 'bg-black-400',
};

const statusFilters: Array<'Semua' | GpsStatus> = ['Semua', 'Bergerak', 'Diam', 'Offline'];

function markerIcon(status: GpsStatus) {
  const color = status === 'Bergerak' ? '#FFC20F' : status === 'Diam' ? '#15459A' : '#999999';
  return L.divIcon({
    className: '',
    html: `<div style="width:16px;height:16px;border-radius:9999px;background:${color};border:3px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.4);"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
}

function FlyToVehicle({ vehicle }: { vehicle: GpsVehicle | null }) {
  const map = useMap();
  if (vehicle) {
    map.flyTo([vehicle.lat, vehicle.lng], 13, { duration: 0.8 });
  }
  return null;
}

export default function GpsPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'Semua' | GpsStatus>('Semua');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return mockVehicles.filter((v) => {
      const matchesStatus = statusFilter === 'Semua' || v.status === statusFilter;
      const q = search.toLowerCase();
      const matchesSearch =
        v.plate.toLowerCase().includes(q) ||
        v.model.toLowerCase().includes(q) ||
        v.driver.toLowerCase().includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [search, statusFilter]);

  const counts = useMemo(
    () => ({
      total: mockVehicles.length,
      bergerak: mockVehicles.filter((v) => v.status === 'Bergerak').length,
      diam: mockVehicles.filter((v) => v.status === 'Diam').length,
      offline: mockVehicles.filter((v) => v.status === 'Offline').length,
    }),
    []
  );

  const selected = mockVehicles.find((v) => v.id === selectedId) ?? null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-black-900">Pelacakan GPS</h1>
          <p className="mt-1 text-sm text-black-400">
            Pantau lokasi armada secara langsung · data contoh (belum tersambung perangkat GPS asli)
          </p>
        </div>
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
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-accent-50">
            {filtered.map((v) => (
              <button
                key={v.id}
                onClick={() => setSelectedId(v.id)}
                className={`w-full text-left p-4 hover:bg-canvas transition-colors ${
                  selectedId === v.id ? 'bg-primary-50/60' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${statusDot[v.status]}`} />
                      <span className="font-mono text-xs font-semibold text-black-400">{v.plate}</span>
                    </div>
                    <p className="mt-1 text-sm font-semibold text-black-900 truncate">{v.model}</p>
                    <p className="text-xs text-black-400 truncate">{v.driver}</p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${statusStyles[v.status]}`}>
                    {v.status}
                  </span>
                </div>
              </button>
            ))}

            {filtered.length === 0 && (
              <div className="p-8 text-center text-sm text-black-400">Tidak ada kendaraan yang cocok.</div>
            )}
          </div>
        </div>

        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-accent-100 overflow-hidden">
          <div className="h-[420px] lg:h-[520px] w-full">
            <MapContainer center={[-6.6, 107.1]} zoom={9} scrollWheelZoom className="h-full w-full">
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              {mockVehicles.map((v) => (
                <Marker key={v.id} position={[v.lat, v.lng]} icon={markerIcon(v.status)} eventHandlers={{ click: () => setSelectedId(v.id) }}>
                  <Popup>
                    <div className="text-sm">
                      <p className="font-semibold">{v.plate}</p>
                      <p className="text-black-400">{v.model} · {v.driver}</p>
                      <p className="text-black-400">{v.status} · {v.speed} km/jam</p>
                    </div>
                  </Popup>
                </Marker>
              ))}

              <Circle
                center={[-6.2088, 106.8456]}
                radius={15000}
                pathOptions={{ color: '#15459A', fillColor: '#15459A', fillOpacity: 0.05, weight: 1 }}
              />

              <FlyToVehicle vehicle={selected} />
            </MapContainer>
          </div>
        </div>
      </div>

      {selected && (
        <div className="bg-white rounded-2xl shadow-sm border border-accent-100 p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-md border-2 border-black-800 bg-black-900 px-2.5 py-1 font-mono text-xs font-semibold tracking-wider text-white">
                  {selected.plate}
                </span>
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyles[selected.status]}`}>
                  {selected.status}
                </span>
              </div>
              <p className="mt-2 font-display text-lg font-semibold text-black-900">{selected.model}</p>
              <p className="flex items-center gap-1.5 text-sm text-black-400 mt-1">
                <MapPin size={14} />
                {selected.address}
              </p>
            </div>

            <button onClick={() => setSelectedId(null)} className="text-sm font-medium text-black-400 hover:text-black-700">
              Tutup detail
            </button>
          </div>

          <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="rounded-xl bg-canvas p-3">
              <p className="flex items-center gap-1.5 text-xs text-black-400"><User size={13} /> Driver</p>
              <p className="mt-1 text-sm font-semibold text-black-900">{selected.driver}</p>
            </div>
            <div className="rounded-xl bg-canvas p-3">
              <p className="flex items-center gap-1.5 text-xs text-black-400"><Gauge size={13} /> Kecepatan</p>
              <p className="mt-1 text-sm font-semibold text-black-900">{selected.speed} km/jam</p>
            </div>
            <div className="rounded-xl bg-canvas p-3">
              <p className="flex items-center gap-1.5 text-xs text-black-400"><Fuel size={13} /> Bahan Bakar</p>
              <p className="mt-1 text-sm font-semibold text-black-900">{selected.fuel}%</p>
            </div>
            <div className="rounded-xl bg-canvas p-3">
              <p className="flex items-center gap-1.5 text-xs text-black-400"><Clock size={13} /> Update Terakhir</p>
              <p className="mt-1 text-sm font-semibold text-black-900">{selected.lastUpdate}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}