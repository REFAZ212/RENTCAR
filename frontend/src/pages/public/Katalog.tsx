import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { katalogAPI, type KategoriKendaraan, type TipeKendaraan, type KatalogItem } from '../../services/api';
import { todayJakarta, ADMIN_WA } from '../../lib/format';
import AnimatedSection from '../../components/public/landing/AnimatedSection';
import PesanSekarangModal from '../../components/public/PesanSekarangModal';
import VehicleCard from '../../components/public/VehicleCard';
import logo from '../../assets/logorentcar.png';
import logoFooter from '../../assets/logofooter.png';

interface KategoriWithCount extends KategoriKendaraan {
  slug: string;
  kendaraans_count: number;
}

interface TipeWithCount extends TipeKendaraan {
  slug: string;
  kendaraans_count: number;
}

interface KatalogMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

const SORT_OPTIONS = [
  { value: 'terbaru', label: 'Terbaru' },
  { value: 'harga_asc', label: 'Harga Terendah' },
  { value: 'harga_desc', label: 'Harga Tertinggi' },
  { value: 'nama', label: 'Nama A-Z' },
] as const;

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}

/* --- SKELETON --- */
function VehicleCardSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-black-200 overflow-hidden">
      <div className="h-44 w-full bg-black-200 animate-pulse" />
      <div className="p-4 space-y-3">
        <div className="h-5 w-3/4 bg-black-200 rounded animate-pulse" />
        <div className="h-4 w-1/2 bg-black-200 rounded animate-pulse" />
        <div className="h-4 w-2/3 bg-black-200 rounded animate-pulse" />
        <div className="h-8 w-full bg-black-200 rounded-lg animate-pulse" />
      </div>
    </div>
  );
}

/* --- PAGE --- KATALOG --- */
export default function Katalog() {
  const [items, setItems] = useState<KatalogItem[]>([]);
  const [kategoris, setKategoris] = useState<KategoriWithCount[]>([]);
  const [tipes, setTipes] = useState<TipeWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [kategoriSlug, setKategoriSlug] = useState('');
  const [tipeSlug, setTipeSlug] = useState('');
  const [sort, setSort] = useState('terbaru');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState<KatalogMeta | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const debouncedSearch = useDebounce(search, 300);
  const [tanggalMulai, setTanggalMulai] = useState('');
  const [durasiHari, setDurasiHari] = useState(1);
  const debouncedTanggal = useDebounce(tanggalMulai, 400);
  const debouncedDurasi = useDebounce(durasiHari, 400);
  const [modalItem, setModalItem] = useState<KatalogItem | null>(null);
  const catalogToday = useMemo(() => todayJakarta(), []);

  useEffect(() => {
    katalogAPI
      .kategoris()
      .then(({ data }) => setKategoris(data as unknown as KategoriWithCount[]))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const params: Record<string, string> = {};
    if (kategoriSlug) params.kategori_slug = kategoriSlug;
    katalogAPI
      .tipes(params)
      .then(({ data }) => setTipes(data as unknown as TipeWithCount[]))
      .catch(() => {});
  }, [kategoriSlug]);

  const load = useCallback(() => {
    setLoading(true);
    const params: Record<string, string | number> = { page, sort };
    if (debouncedSearch) params.search = debouncedSearch;
    if (tipeSlug) params.tipe_slug = tipeSlug;
    if (kategoriSlug) params.kategori_slug = kategoriSlug;
    if (debouncedTanggal) {
      params.tanggal_mulai = debouncedTanggal;
      params.durasi_hari = debouncedDurasi;
    }
    katalogAPI
      .list(params)
      .then(({ data }) => {
        setItems(data.data);
        setMeta(data.meta ?? null);
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [debouncedSearch, tipeSlug, page, sort, kategoriSlug, debouncedTanggal, debouncedDurasi]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    setPage(1);
    setTipeSlug('');
  }, [kategoriSlug]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, tipeSlug, sort, debouncedTanggal, debouncedDurasi]);

  const totalPages = meta?.last_page ?? 1;
  const showPagination = meta && meta.last_page > 1;

  const unavailableKategoriIds = useMemo(() => {
    if (!debouncedTanggal) return new Set<number>();
    const ids = new Set<number>();
    items.forEach((item) => {
      if (item.available_for_dates === false && item.kategori_id) {
        ids.add(item.kategori_id);
      }
    });
    return ids;
  }, [items, debouncedTanggal]);

  const unavailableTipeIds = useMemo(() => {
    if (!debouncedTanggal) return new Set<number>();
    const ids = new Set<number>();
    items.forEach((item) => {
      if (item.available_for_dates === false && item.tipe_id) {
        ids.add(item.tipe_id);
      }
    });
    return ids;
  }, [items, debouncedTanggal]);

  const serupaItems = useMemo(() => {
    if (!debouncedTanggal) return [];
    if (unavailableKategoriIds.size === 0 && unavailableTipeIds.size === 0) return [];
    return items.filter(
      (item) =>
        item.available_for_dates !== false &&
        (unavailableKategoriIds.has(item.kategori_id!) || unavailableTipeIds.has(item.tipe_id!))
    ).slice(0, 8);
  }, [items, debouncedTanggal, unavailableKategoriIds, unavailableTipeIds]);

  const unavailableCount = useMemo(() => {
    if (!debouncedTanggal) return 0;
    return items.filter((item) => item.available_for_dates === false).length;
  }, [items, debouncedTanggal]);

  const statusCounts = useMemo(() => {
    const tersedia = items.filter((i) => i.status === 'tersedia').length;
    const disewa = items.filter((i) => i.status === 'disewa').length;
    const servis = items.filter((i) => i.status === 'maintenance').length;
    return { tersedia, disewa, servis };
  }, [items]);

  return (
    <div className="min-h-screen bg-canvas">
      {/* Navbar */}
      <nav className="bg-white border-b border-black-200 sticky top-0 z-40" role="navigation" aria-label="Navigasi utama">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2.5 shrink-0">
            <img src={logo} alt="UDIN RENCTCAR" className="h-10 w-auto" />
          </Link>
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="flex items-center gap-2 px-4 py-2 bg-accent-100 text-black-700 text-sm font-medium rounded-lg hover:bg-black-200 transition-colors"
            >
              Beranda
            </Link>
            <a
              href={`https://wa.me/${ADMIN_WA}?text=Halo%2C%20saya%20ingin%20bertanya%20tentang%20layanan%20rental`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-success-500 text-white text-sm font-medium rounded-lg hover:bg-success-600 transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              Hubungi Kami
            </a>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="bg-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-16">
          <AnimatedSection>
            <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white leading-tight tracking-tight">
              Sewa Kendaraan
              <br />
              <span className="text-primary-400">Mudah &amp; Terpercaya</span>
            </h1>
            <p className="mt-4 text-black-400 text-lg leading-relaxed max-w-2xl">
              Pilihan kendaraan lengkap, harga transparan, proses cepat. Tersedia mobil dan motor untuk kebutuhan harian, wisata, hingga bisnis.
            </p>
            <div className="mt-6 flex flex-wrap gap-4">
              <a
                href="#katalog"
                className="px-6 py-3 bg-primary-600 text-white font-semibold rounded-xl hover:bg-primary-700 transition-colors shadow-lg shadow-primary-600/25"
              >
                Lihat Katalog
              </a>
              <a
                href={`https://wa.me/${ADMIN_WA}?text=Halo%2C%20saya%20ingin%20konsultasi%20tentang%20rental%20kendaraan`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-3 border-2 border-white/20 text-white font-semibold rounded-xl hover:bg-white/5 transition-colors"
              >
                Konsultasi Gratis
              </a>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-white border-b border-black-200" aria-label="Statistik layanan">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
            {[
              { label: 'Unit Tersedia', value: `${statusCounts.tersedia}`, color: 'text-success-600' },
              { label: 'Sedang Disewa', value: `${statusCounts.disewa}`, color: 'text-error-500' },
              { label: 'Sedang Servis', value: `${statusCounts.servis}`, color: 'text-accent-500' },
              { label: 'Total Unit', value: `${meta?.total ?? 0}`, color: 'text-primary-600' },
            ].map((s, i) => (
              <div key={i} className="flex flex-col items-center gap-1">
                <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                <div className="text-xs text-black-400">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Katalog */}
      <section id="katalog" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-black">Katalog Kendaraan</h2>
            <p className="text-sm text-black-400 mt-1">Pilih kendaraan yang sesuai kebutuhan Anda</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-black-200 p-4 mb-6 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              ref={searchRef}
              type="text"
              placeholder="Cari merek, nama, kategori..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-black-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none transition-shadow"
              aria-label="Cari kendaraan"
            />
          </div>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="px-3 py-2 border border-black-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
            aria-label="Urutkan"
          >
            {SORT_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>

        {/* Date Availability Filter */}
        <div className="bg-white rounded-xl border border-black-200 p-4 mb-6">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 shrink-0">
              <svg className="w-4 h-4 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-sm font-medium text-black-700">Cek Ketersediaan:</span>
            </div>
            <input
              type="date"
              value={tanggalMulai}
              min={catalogToday}
              onChange={(e) => setTanggalMulai(e.target.value)}
              className="px-3 py-2 border border-black-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
              aria-label="Tanggal mulai"
            />
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                value={durasiHari}
                min={1}
                max={365}
                onChange={(e) => setDurasiHari(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-20 px-3 py-2 border border-black-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                aria-label="Durasi hari"
              />
              <span className="text-sm text-black-400">hari</span>
            </div>
            {tanggalMulai && (
              <button
                onClick={() => { setTanggalMulai(''); setDurasiHari(1); }}
                className="text-sm text-black-400 hover:text-black-600 transition-colors flex items-center gap-1"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Reset
              </button>
            )}
          </div>
          {tanggalMulai && (
            <p className="text-xs text-black-400 mt-2">
              Menampilkan ketersediaan untuk tanggal {new Date(tanggalMulai + 'T00:00:00').toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} selama {durasiHari} hari
            </p>
          )}
        </div>

        {/* Kategori Tabs */}
        {kategoris.length > 0 && (
          <div className="flex gap-2 mb-4 overflow-x-auto pb-2" role="tablist" aria-label="Filter kategori">
            <button
              onClick={() => setKategoriSlug('')}
              className={`px-4 py-2 text-sm font-medium rounded-full whitespace-nowrap transition-colors ${
                kategoriSlug === '' ? 'bg-primary-600 text-white shadow-sm' : 'bg-white text-black-600 border border-black-200 hover:border-primary-400 hover:text-primary-600'
              }`}
              role="tab"
              aria-selected={kategoriSlug === ''}
            >
              Semua Kategori
            </button>
            {kategoris.map((k) => (
              <button
                key={k.id}
                onClick={() => setKategoriSlug(k.slug)}
                className={`px-4 py-2 text-sm font-medium rounded-full whitespace-nowrap transition-colors ${
                  kategoriSlug === k.slug ? 'bg-primary-600 text-white shadow-sm' : 'bg-white text-black-600 border border-black-200 hover:border-primary-400 hover:text-primary-600'
                }`}
                role="tab"
                aria-selected={kategoriSlug === k.slug}
              >
                {k.nama_kategori}
                {k.kendaraans_count > 0 && (
                  <span className={`ml-1.5 text-xs ${kategoriSlug === k.slug ? 'text-primary-200' : 'text-black-400'}`}>
                    ({k.kendaraans_count})
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Tipe Tabs */}
        {tipes.length > 0 && (
          <div className="flex gap-2 mb-6 overflow-x-auto pb-2" role="tablist" aria-label="Filter tipe">
            <button
              onClick={() => setTipeSlug('')}
              className={`px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap transition-colors ${
                tipeSlug === '' ? 'bg-primary-600 text-white shadow-sm' : 'bg-white text-black-600 border border-black-200 hover:border-primary-300 hover:text-primary-600'
              }`}
              role="tab"
              aria-selected={tipeSlug === ''}
            >
              Semua Tipe
            </button>
            {tipes.map((t) => (
              <button
                key={t.id}
                onClick={() => setTipeSlug(t.slug)}
                className={`px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap transition-colors ${
                  tipeSlug === t.slug ? 'bg-primary-600 text-white shadow-sm' : 'bg-white text-black-600 border border-black-200 hover:border-primary-300 hover:text-primary-600'
                }`}
                role="tab"
                aria-selected={tipeSlug === t.slug}
              >
                {t.nama_tipe}
                {t.kendaraans_count > 0 && (
                  <span className={`ml-1 ${tipeSlug === t.slug ? 'text-primary-200' : 'text-black-400'}`}>
                    ({t.kendaraans_count})
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {Array.from({ length: 8 }).map((_, i) => (
              <VehicleCardSkeleton key={i} />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-20">
            <svg className="w-16 h-16 text-black-200 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 17h.01M16 17h.01M3 11l1.5-5A2 2 0 016.4 4h11.2a2 2 0 011.9 1.4L21 11M3 11h18M3 11v6a1 1 0 001 1h1a1 1 0 001-1v-1h12v1a1 1 0 001 1h1a1 1 0 001-1v-6" />
            </svg>
            <p className="text-black-500 font-medium">Tidak ada kendaraan ditemukan</p>
            <p className="text-sm text-black-400 mt-1">Coba ubah filter pencarian Anda</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {items.map((item) => (
                <VehicleCard
                  key={item.id}
                  item={item}
                  onPesan={setModalItem}
                  availableForDates={item.available_for_dates}
                  tanggalMulai={tanggalMulai}
                  durasiHari={durasiHari}
                />
              ))}
            </div>
            {showPagination && (
              <nav className="flex items-center justify-center gap-2 mt-8" aria-label="Paginasi">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-2 text-sm font-medium border border-black-200 rounded-lg hover:bg-canvas disabled:opacity-40 transition-colors"
                >
                  Sebelumnya
                </button>
                <span className="text-sm text-black-600 px-3">
                  Halaman {page} dari {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-2 text-sm font-medium border border-black-200 rounded-lg hover:bg-canvas disabled:opacity-40 transition-colors"
                >
                  Selanjutnya
                </button>
              </nav>
            )}
          </>
        )}
      </section>

      {/* Kendaraan Serupa */}
      {debouncedTanggal && unavailableCount > 0 && serupaItems.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-10">
          <div className="bg-gradient-to-r from-primary-50 to-indigo-50 rounded-2xl border border-primary-100 p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-black">Kendaraan Serupa yang Tersedia</h3>
                <p className="text-sm text-black-400">
                  {serupaItems.length} kendaraan tersedia untuk tanggal yang dipilih
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 mt-5">
              {serupaItems.map((item) => (
                <VehicleCard
                  key={item.id}
                  item={item}
                  onPesan={setModalItem}
                  availableForDates={true}
                  tanggalMulai={tanggalMulai}
                  durasiHari={durasiHari}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="bg-primary-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
          <h2 className="text-2xl font-bold text-white">Butuh Kendaraan Sekarang?</h2>
          <p className="mt-2 text-primary-100">Hubungi kami via WhatsApp untuk konsultasi dan pemesanan cepat</p>
          <a
            href={`https://wa.me/${ADMIN_WA}?text=Halo%2C%20saya%20butuh%20kendaraan%20untuk%20disewa`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-flex items-center gap-2 px-8 py-3 bg-success-500 text-white font-semibold rounded-xl hover:bg-success-600 transition-colors shadow-lg"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            Chat WhatsApp Sekarang
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-black text-black-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <img src={logoFooter} alt="UDIN RENCTCAR" className="h-12 w-auto" />
              </div>
              <p className="text-sm leading-relaxed mt-1">Solusi rental kendaraan terpercaya. Armada lengkap, proses mudah, harga bersahabat.</p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-3">Kontak</h4>
              <div className="space-y-2 text-sm">
                <p>WhatsApp: 0895-3610-54272</p>
                <p>Email: info@udin-renctcar.com</p>
                <p>Jl. Contoh No. 123, Kota</p>
              </div>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-3">Jam Operasional</h4>
              <div className="space-y-2 text-sm">
                <p>Senin - Sabtu: 08.00 - 17.00</p>
                <p>Minggu: 08.00 - 12.00</p>
              </div>
            </div>
          </div>
          <div className="mt-8 pt-6 border-t border-black-800 text-center text-sm">
            &copy; {new Date().getFullYear()} UDIN RENCTCAR. Hak cipta dilindungi.
          </div>
        </div>
      </footer>

      {/* Modal */}
      {modalItem && (
        <PesanSekarangModal
          item={modalItem}
          onClose={() => setModalItem(null)}
          initialTanggalMulai={tanggalMulai}
          initialDurasi={durasiHari}
        />
      )}
    </div>
  );
}
