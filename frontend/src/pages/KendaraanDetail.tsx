import { useState, useEffect } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { katalogAPI, type KatalogItem } from '../services/api';
import { formatRupiah, ADMIN_WA } from '../lib/format';
import PesanSekarangModal from '../components/public/PesanSekarangModal';
import VehicleCard from '../components/public/VehicleCard';
import { getFotoUrl, getStatusInfo, statusPhotoClass } from '../lib/katalogStatus';

interface SpecItem {
  icon: string;
  label: string;
  value: string | number;
}

/** Format tanggal YYYY-MM-DD ke Bahasa Indonesia (cth: 12 Agustus 2026). */
const formatTanggalId = (tanggal: string): string => {
  return new Date(tanggal + 'T00:00:00').toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

const buildWALink = (item: KatalogItem, tanggalMulai = '', durasiHari = ''): string => {
  const tanggalTeks = tanggalMulai ? formatTanggalId(tanggalMulai) : '-';
  const durasiTeks = durasiHari && Number(durasiHari) > 0 ? `${durasiHari} hari` : '-';
  const pesan = `Halo, saya tertarik untuk menyewa:\n\n${item.nama_kendaraan} (${item.tahun})\nPlat: ${item.plat_nomor}\nHarga: ${formatRupiah(item.harga_sewa_per_hari)}/hari\n\nTanggal: ${tanggalTeks}\nDurasi: ${durasiTeks}\n\nMohon info ketersediaan dan cara pemesanannya. Terima kasih.`;
  return `https://wa.me/${ADMIN_WA}?text=${encodeURIComponent(pesan)}`;
};

function DetailSkeleton() {
  return (
    <div className="min-h-screen bg-canvas">
      <div className="max-w-4xl mx-auto px-4 py-10">
        <div className="skeleton h-6 w-32 mb-6 rounded" />
        <div className="skeleton h-80 w-full rounded-xl mb-6" />
        <div className="bg-white rounded-2xl border border-black-200 p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="space-y-3">
              <div className="skeleton h-6 w-24 rounded-full" />
              <div className="skeleton h-8 w-64 rounded" />
              <div className="skeleton h-5 w-40 rounded" />
            </div>
            <div className="text-right space-y-2">
              <div className="skeleton h-8 w-32 rounded" />
              <div className="skeleton h-4 w-16 rounded ml-auto" />
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-accent-100">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="skeleton h-9 w-9 rounded-lg" />
                <div className="space-y-1">
                  <div className="skeleton h-3 w-12 rounded" />
                  <div className="skeleton h-4 w-20 rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="skeleton h-32 w-full rounded-2xl" />
      </div>
    </div>
  );
}

function NotFoundView() {
  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center">
      <div className="text-center">
        <svg className="w-16 h-16 text-black-200 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <h2 className="text-xl font-bold text-black-700 mb-2">Kendaraan Tidak Ditemukan</h2>
        <p className="text-black-400 mb-4">Kendaraan mungkin sudah tidak tersedia</p>
        <Link
          to="/katalog"
          className="px-5 py-2.5 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors inline-block"
        >
          Kembali ke Katalog
        </Link>
      </div>
    </div>
  );
}

function LoadErrorView({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center">
      <div className="text-center">
        <svg className="w-16 h-16 text-black-200 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M18.364 5.636a9 9 0 010 12.728M17.657 8.343a6 6 0 010 8.486M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01"
          />
        </svg>
        <h2 className="text-xl font-bold text-black-700 mb-2">Gagal Memuat Data</h2>
        <p className="text-black-400 mb-4">Periksa koneksi internet Anda lalu coba lagi.</p>
        <button
          onClick={onRetry}
          className="px-5 py-2.5 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors"
        >
          Coba Lagi
        </button>
      </div>
    </div>
  );
}

export default function KendaraanDetail() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const [item, setItem] = useState<KatalogItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [modalItem, setModalItem] = useState<KatalogItem | null>(null);
  const [rekos, setRekos] = useState<KatalogItem[]>([]);
  const [rekosLoading, setRekosLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const tanggalMulai = searchParams.get('tanggal_mulai') || '';
  const durasiHari = searchParams.get('durasi_hari') || '';

  useEffect(() => {
    if (!id) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setNotFound(false);
    setLoadError(false);

    const params: Record<string, string> = {};
    if (tanggalMulai) params.tanggal_mulai = tanggalMulai;
    if (durasiHari) params.durasi_hari = durasiHari;

    katalogAPI
      .get(Number(id), Object.keys(params).length > 0 ? params : undefined)
      .then(({ data }) => {
        if (cancelled) return;
        setItem(data as unknown as KatalogItem);
      })
      .catch((err) => {
        if (cancelled) return;
        const isNotFound = (err as { response?: { status?: number } })?.response?.status === 404;
        if (isNotFound) {
          setNotFound(true);
        } else {
          setLoadError(true);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id, tanggalMulai, durasiHari, reloadKey]);

  useEffect(() => {
    if (!item || item.id !== Number(id)) return;
    let cancelled = false;
    setRekosLoading(true);
    katalogAPI
      .list({
        per_page: 8,
        sort: 'harga_asc',
        ...(item.kategori?.slug ? { kategori_slug: item.kategori.slug } : {}),
        ...(tanggalMulai ? { tanggal_mulai: tanggalMulai } : {}),
        ...(durasiHari ? { durasi_hari: durasiHari } : {}),
      })
      .then(({ data }) => {
        if (cancelled) return;
        const res = data as unknown as { data: KatalogItem[] };
        setRekos(res.data.filter((k) => k.id !== item.id).slice(0, 3));
      })
      .catch(() => {
        if (!cancelled) setRekos([]);
      })
      .finally(() => {
        if (!cancelled) setRekosLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [item, id, tanggalMulai, durasiHari]);

  useEffect(() => {
    if (!item) return;
    const previous = document.title;
    document.title = `${item.nama_kendaraan} — UDIN RENTCAR`;
    return () => {
      document.title = previous;
    };
  }, [item]);

  if (loading) return <DetailSkeleton />;
  if (loadError) return <LoadErrorView onRetry={() => setReloadKey((k) => k + 1)} />;
  if (notFound || !item) return <NotFoundView />;

  const specs: SpecItem[] = [
    {
      icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',
      label: 'Tipe',
      value: item.tipe?.nama_tipe?.toUpperCase() ?? '-',
    },
    {
      icon: 'M8 17h.01M16 17h.01M3 11l1.5-5A2 2 0 016.4 4h11.2a2 2 0 011.9 1.4L21 11M3 11h18M3 11v6a1 1 0 001 1h1a1 1 0 001-1v-1h12v1a1 1 0 001 1h1a1 1 0 001-1v-6',
      label: 'Kapasitas',
      value: `${item.kapasitas_penumpang} kursi`,
    },
    {
      icon: 'M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01',
      label: 'Warna',
      value: item.warna,
    },
    {
      icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
      label: 'Plat',
      value: item.plat_nomor,
    },
  ];

  const fotoUrl = getFotoUrl(item.foto);
  const waLink = buildWALink(item, tanggalMulai, durasiHari);
  const statusInfo = getStatusInfo(item, item.available_for_dates);

  const handleShare = async () => {
    const url = window.location.href;
    const teks = `${item.nama_kendaraan} (${item.tahun}) — ${formatRupiah(item.harga_sewa_per_hari)}/hari`;
    if (navigator.share) {
      await navigator.share({ title: item.nama_kendaraan, text: teks, url }).catch(() => undefined);
      return;
    }
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(url).catch(() => undefined);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-canvas">
      {/* Top bar */}
      <nav className="bg-white border-b border-black-200 sticky top-0 z-40" aria-label="Navigasi detail kendaraan">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 flex items-center justify-between h-14">
          <Link to="/katalog" className="flex items-center gap-2 text-sm text-black-400 hover:text-primary-600 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Katalog
          </Link>
          <div className="flex items-center gap-2">
            <button
              onClick={handleShare}
              aria-label="Bagikan kendaraan ini"
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-black-500 hover:text-primary-600 border border-black-200 rounded-lg hover:border-primary-200 transition-colors"
            >
              {copied ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                  />
                </svg>
              )}
              {copied ? 'Tersalin' : 'Bagikan'}
            </button>
            <button
              onClick={() => setModalItem(item)}
              className="flex items-center gap-2 px-4 py-2 bg-accent-500 text-white text-sm font-medium rounded-lg hover:bg-accent-600 transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              Pesan Sekarang
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {/* Foto */}
        <article className="bg-white rounded-2xl border border-black-200 overflow-hidden mb-6">
          {fotoUrl ? (
            <img
              src={fotoUrl}
              alt={`${item.nama_kendaraan}`}
              className={`w-full h-72 sm:h-96 object-cover ${statusPhotoClass(item.status)}`}
            />
          ) : (
            <div className="w-full h-72 sm:h-96 bg-accent-100 flex items-center justify-center">
              <svg className="w-20 h-20 text-black-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M8 17h.01M16 17h.01M3 11l1.5-5A2 2 0 016.4 4h11.2a2 2 0 011.9 1.4L21 11M3 11h18M3 11v6a1 1 0 001 1h1a1 1 0 001-1v-1h12v1a1 1 0 001 1h1a1 1 0 001-1v-6"
                />
              </svg>
            </div>
          )}
        </article>

        {/* Info */}
        <section className="bg-white rounded-2xl border border-black-200 p-6 mb-6" aria-label="Detail kendaraan">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                {item.tipe && (
                  <span className="text-xs font-semibold text-primary-600 bg-primary-50 px-2.5 py-1 rounded-full uppercase">
                    {item.tipe.nama_tipe}
                  </span>
                )}
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusInfo.className}`}>
                  {statusInfo.label}
                </span>
              </div>
              <h1 className="text-2xl font-bold text-black-900 mt-2">{item.nama_kendaraan}</h1>
              <p className="text-black-400 mt-1">
                {item.merek} &middot; {item.tahun}
              </p>
            </div>
            <div className="text-right shrink-0">
              <div className="text-2xl font-bold text-primary-600">{formatRupiah(item.harga_sewa_per_hari)}</div>
              <div className="text-sm text-black-400">per hari</div>
              {tanggalMulai && Number(durasiHari) > 0 && (
                <div className="text-xs text-black-400 mt-2 bg-canvas rounded-lg px-3 py-2">
                  Estimasi {durasiHari} hari:{' '}
                  <span className="font-semibold text-primary-600">
                    {formatRupiah(Number(item.harga_sewa_per_hari) * Number(durasiHari))}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Specs grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-accent-100">
            {specs.map((s, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-9 h-9 bg-canvas rounded-lg flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4 text-black-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={s.icon} />
                  </svg>
                </div>
                <div>
                  <div className="text-xs text-black-400">{s.label}</div>
                  <div className="text-sm font-semibold text-black-900 capitalize">{s.value}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Garasi */}
          {item.garasi_partner && (
            <div className="mt-4 pt-4 border-t border-accent-100 flex items-center gap-2 text-sm text-black-400">
              <svg className="w-4 h-4 text-black-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Garasi: <span className="font-medium text-black-900">{item.garasi_partner.nama_garasi}</span>
            </div>
          )}
        </section>

        {/* Unavailable Banner */}
        {tanggalMulai && item.available_for_dates === false && (
          <div className="bg-accent-50 border border-accent-200 rounded-2xl p-5 mb-6 flex items-start gap-3">
            <div className="w-9 h-9 bg-accent-100 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
              <svg className="w-5 h-5 text-accent-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-accent-700">Kendaraan tidak tersedia untuk tanggal ini</p>
              <p className="text-xs text-accent-600 mt-1">
                Kendaraan ini sudah memiliki order pada tanggal yang Anda pilih. Silakan pilih tanggal lain atau lihat
                kendaraan serupa.
              </p>
              <Link
                to="/katalog"
                className="inline-flex items-center gap-1 text-xs font-medium text-accent-600 hover:text-accent-700 mt-2 underline underline-offset-2"
              >
                Lihat katalog lengkap
              </Link>
            </div>
          </div>
        )}

        {item.status === 'disewa' && (item.active_orders_count ?? 0) > 0 && item.available_for_dates !== false && (
          <div className="bg-accent-50 border border-accent-200 rounded-2xl p-5 mb-6 flex items-start gap-3">
            <div className="w-9 h-9 bg-accent-100 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
              <svg className="w-5 h-5 text-accent-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-accent-700">Kendaraan ini sedang disewa</p>
              {item.rented_from && item.rented_until && item.rented_until >= item.rented_from ? (
                <p className="text-xs text-accent-600 mt-1">
                  Tidak tersedia {formatTanggalId(item.rented_from)} s/d {formatTanggalId(item.rented_until)}
                  {item.rented_from_time && item.rented_until_time && (
                    <span>
                      , jam {item.rented_from_time.slice(0, 5)} s/d {item.rented_until_time.slice(0, 5)}
                    </span>
                  )}
                </p>
              ) : item.rented_from ? (
                <p className="text-xs text-accent-600 mt-1">
                  Tidak tersedia mulai {formatTanggalId(item.rented_from)}
                </p>
              ) : (
                item.estimated_return_date && (
                  <p className="text-xs text-accent-600 mt-1">
                    Diperkirakan kembali: {formatTanggalId(item.estimated_return_date)}
                  </p>
                )
              )}
              <p className="text-xs text-accent-600 mt-1">
                Hubungi kami untuk mengetahui ketersediaan kendaraan ini.
              </p>
            </div>
          </div>
        )}

        {/* Kendaraan Lainnya */}
        {(rekos.length > 0 || rekosLoading) && (
          <section className="mb-6" aria-label="Kendaraan lainnya">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-black-900">Kendaraan Lainnya</h2>
                <p className="text-sm text-black-400">
                  Mobil lain dalam kategori yang sama
                  {item.kategori ? ` (${item.kategori.nama_kategori})` : ''}
                </p>
              </div>
              <Link
                to="/katalog"
                className="text-sm font-medium text-primary-600 hover:text-primary-700 transition-colors shrink-0"
              >
                Lihat Semua &rarr;
              </Link>
            </div>
            {rekosLoading && rekos.length === 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="bg-white rounded-xl border border-black-200 overflow-hidden">
                    <div className="h-44 bg-black-200 animate-pulse" />
                    <div className="p-4 space-y-3">
                      <div className="h-4 w-3/4 bg-black-200 rounded animate-pulse" />
                      <div className="h-3 w-1/2 bg-black-200 rounded animate-pulse" />
                      <div className="h-8 w-full bg-black-200 rounded-lg animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {rekos.map((rek) => (
                  <VehicleCard
                    key={rek.id}
                    item={rek}
                    onPesan={setModalItem}
                    availableForDates={rek.available_for_dates}
                    tanggalMulai={tanggalMulai}
                    durasiHari={Number(durasiHari) || undefined}
                  />
                ))}
              </div>
            )}
          </section>
        )}

        {/* CTA */}
        <section className="bg-gradient-to-br from-accent-500 to-accent-600 rounded-2xl p-6 text-white">
          <h2 className="text-lg font-bold">Tertarik dengan kendaraan ini?</h2>
          <p className="text-accent-100 text-sm mt-1">Pesan langsung atau konsultasi via WhatsApp</p>
          <div className="mt-4 flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => setModalItem(item)}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-accent-600 font-semibold rounded-xl hover:bg-accent-50 transition-colors shadow-lg"
            >
              Pesan Sekarang
            </button>
            <a
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 border-2 border-accent-300 text-accent-50 text-sm font-medium rounded-xl hover:bg-accent-600 transition-colors"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              Tanya via WhatsApp
            </a>
          </div>
        </section>
      </main>

      <a
        href={waLink}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Konsultasi via WhatsApp"
        className="md:hidden fixed bottom-4 right-4 z-40 w-14 h-14 bg-success-500 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-success-600 transition-colors"
      >
        <svg className="w-7 h-7" viewBox="0 0 24 24" fill="currentColor">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
      </a>

        {modalItem && (
          <PesanSekarangModal
            item={modalItem}
            onClose={() => setModalItem(null)}
            initialTanggalMulai={tanggalMulai}
            initialDurasi={Number(durasiHari) > 0 ? Number(durasiHari) : undefined}
          />
        )}
    </div>
  );
}
