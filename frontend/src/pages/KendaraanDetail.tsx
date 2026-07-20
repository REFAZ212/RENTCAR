import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { katalogAPI } from '../services/api';

/* ------------------------------------------------------------------ */
/* Types                                                               */
/*                                                                      */
/* NOTE: I don't have your actual `services/api` / shared model types, */
/* so this is inferred from the fields this component reads. If you    */
/* already have a `Kendaraan` type (e.g. from Kendaraan.tsx), import   */
/* and reuse that instead of duplicating it here.                      */
/* ------------------------------------------------------------------ */

interface GarasiPartnerRef {
  nama_garasi: string;
}

interface KatalogKendaraan {
  id: number | string;
  nama_kendaraan: string;
  tipe: string;
  merek: string;
  model: string;
  tahun: number;
  warna: string;
  plat_nomor: string;
  kapasitas_penumpang: number;
  harga_sewa_per_hari: number | string;
  foto?: string | null;
  catatan?: string | null;
  garasi_partner?: GarasiPartnerRef;
}

interface SpecItem {
  icon: string;
  label: string;
  value: string | number;
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function formatRupiah(n: number | string): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(Number(n));
}

function getFotoUrl(foto?: string | null): string | null {
  if (!foto) return null;
  if (foto.startsWith('http')) return foto;
  return `/storage/${foto}`;
}

function buildWALink(item: KatalogKendaraan, adminPhone = '62895361054272'): string {
  const pesan = `Halo, saya tertarik untuk menyewa:\n\n${item.nama_kendaraan} (${item.merek} ${item.model} ${item.tahun})\nPlat: ${item.plat_nomor}\nHarga: ${formatRupiah(item.harga_sewa_per_hari)}/hari\n\nTanggal: -\nDurasi: - hari\n\nMohon info ketersediaan dan cara pemesanannya. Terima kasih.`;
  return `https://wa.me/${adminPhone}?text=${encodeURIComponent(pesan)}`;
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export default function KendaraanDetail() {
  const { id } = useParams<{ id: string }>();
  const [item, setItem] = useState<KatalogKendaraan | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    setLoading(true);
    setNotFound(false);
    katalogAPI
      .get(id)
      .then(({ data }: { data: KatalogKendaraan }) => setItem(data))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 py-10">
          <div className="skeleton h-6 w-32 mb-6 rounded" />
          <div className="skeleton h-80 w-full rounded-xl mb-6" />
          <div className="skeleton h-8 w-2/3 mb-3 rounded" />
          <div className="skeleton h-5 w-1/3 mb-6 rounded" />
          <div className="skeleton h-40 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (notFound || !item) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <h2 className="text-xl font-bold text-gray-700 mb-2">Kendaraan Tidak Ditemukan</h2>
          <p className="text-gray-500 mb-4">Kendaraan mungkin sudah tidak tersedia</p>
          <Link
            to="/katalog"
            className="px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            Kembali ke Katalog
          </Link>
        </div>
      </div>
    );
  }

  const specs: SpecItem[] = [
    {
      icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',
      label: 'Tipe',
      value: item.tipe?.toUpperCase(),
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
  const waLink = buildWALink(item);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 flex items-center justify-between h-14">
          <Link to="/katalog" className="flex items-center gap-2 text-sm text-gray-600 hover:text-blue-600 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Katalog
          </Link>
          <a
            href={waLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white text-sm font-medium rounded-lg hover:bg-green-600 transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            Pesan via WhatsApp
          </a>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {/* Foto */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden mb-6">
          {fotoUrl ? (
            <img src={fotoUrl} alt={item.nama_kendaraan} className="w-full h-72 sm:h-96 object-cover" />
          ) : (
            <div className="w-full h-72 sm:h-96 bg-gray-100 flex items-center justify-center">
              <svg className="w-20 h-20 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M8 17h.01M16 17h.01M3 11l1.5-5A2 2 0 016.4 4h11.2a2 2 0 011.9 1.4L21 11M3 11h18M3 11v6a1 1 0 001 1h1a1 1 0 001-1v-1h12v1a1 1 0 001 1h1a1 1 0 001-1v-6"
                />
              </svg>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full uppercase">
                {item.tipe}
              </span>
              <h1 className="text-2xl font-bold text-gray-900 mt-2">{item.nama_kendaraan}</h1>
              <p className="text-gray-500 mt-1">
                {item.merek} {item.model} &middot; {item.tahun}
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-blue-600">{formatRupiah(item.harga_sewa_per_hari)}</div>
              <div className="text-sm text-gray-500">per hari</div>
            </div>
          </div>

          {/* Specs grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-gray-100">
            {specs.map((s, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-9 h-9 bg-gray-50 rounded-lg flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={s.icon} />
                  </svg>
                </div>
                <div>
                  <div className="text-xs text-gray-500">{s.label}</div>
                  <div className="text-sm font-semibold text-gray-900 capitalize">{s.value}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Garasi */}
          {item.garasi_partner && (
            <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-2 text-sm text-gray-600">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Garasi: <span className="font-medium text-gray-900">{item.garasi_partner.nama_garasi}</span>
            </div>
          )}

          {/* Catatan */}
          {item.catatan && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="text-xs text-gray-500 mb-1">Catatan</div>
              <p className="text-sm text-gray-700 whitespace-pre-line">{item.catatan}</p>
            </div>
          )}
        </div>

        {/* CTA */}
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-6 text-white">
          <h3 className="text-lg font-bold">Tertarik dengan kendaraan ini?</h3>
          <p className="text-green-100 text-sm mt-1">Hubungi kami via WhatsApp untuk konsultasi dan pemesanan</p>
          <a
            href={waLink}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-2 px-6 py-3 bg-white text-green-700 font-semibold rounded-xl hover:bg-green-50 transition-colors shadow-lg"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            Pesan via WhatsApp
          </a>
        </div>
      </div>
    </div>
  );
}