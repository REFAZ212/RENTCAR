import { useNavigate, useLocation } from 'react-router-dom';
import { Clock } from 'lucide-react';
import type { KatalogItem } from '../../services/api';
import { formatRupiah, warnaKendaraanHex } from '../../lib/format';
import { getFotoUrl, getStatusInfo, statusPhotoClass } from '../../lib/katalogStatus';

export default function VehicleCard({
  item,
  onPesan,
  availableForDates,
  tanggalMulai,
  durasiHari,
  isHighlighted,
}: {
  item: KatalogItem;
  onPesan: (item: KatalogItem) => void;
  availableForDates?: boolean;
  tanggalMulai?: string;
  durasiHari?: number;
  isHighlighted?: boolean;
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const fotoUrl = getFotoUrl(item.foto);
  const status = getStatusInfo(item, availableForDates);
  const isDisabled = status.disabled;

  const buildDetailUrl = () => {
    const params = new URLSearchParams(location.search);
    if (tanggalMulai) params.set('tanggal_mulai', tanggalMulai);
    if (durasiHari && durasiHari > 0) params.set('durasi_hari', String(durasiHari));
    const qs = params.toString();
    return `/katalog/${item.id}${qs ? `?${qs}` : ''}`;
  };

  const goToDetail = () => {
    if (location.pathname === '/katalog') {
      sessionStorage.setItem(
        'katalog_return',
        JSON.stringify({ itemId: item.id, scrollY: window.scrollY })
      );
    }
    navigate(buildDetailUrl());
  };

  const handleCardClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    goToDetail();
  };

  return (
    <div
      id={`vehicle-${item.id}`}
      onClick={handleCardClick}
      className={`group bg-white rounded-xl border overflow-hidden transition-all duration-200 ${
        isHighlighted ? 'ring-2 ring-primary-500 border-primary-500' : ''
      } ${
        isDisabled
          ? 'border-black-200 opacity-80 cursor-pointer hover:shadow-lg hover:border-primary-200'
          : 'border-black-200 hover:shadow-lg hover:border-primary-200 cursor-pointer'
      }`}
    >
      <div className="relative h-44 bg-primary-100 overflow-hidden">
        {fotoUrl ? (
          <img
            src={fotoUrl}
            alt={`${item.nama_kendaraan}`}
            loading="lazy"
            className={`w-full h-full object-cover transition-transform duration-300 ${statusPhotoClass(item.status)} ${
              isDisabled ? '' : 'group-hover:scale-105'
            }`}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg className="w-12 h-12 text-black-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M8 17h.01M16 17h.01M3 11l1.5-5A2 2 0 016.4 4h11.2a2 2 0 011.9 1.4L21 11M3 11h18M3 11v6a1 1 0 001 1h1a1 1 0 001-1v-1h12v1a1 1 0 001 1h1a1 1 0 001-1v-6"
              />
            </svg>
          </div>
        )}
        {item.tipe && (
          <span className="absolute top-3 left-3 px-2.5 py-1 bg-white/90 backdrop-blur-sm text-xs font-semibold text-black-700 rounded-lg uppercase">
            {item.tipe.nama_tipe}
          </span>
        )}
        {isDisabled && (
          <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
            <span className={`px-3 py-1.5 ${status.color} text-white text-xs font-bold rounded-full shadow-lg`}>
              {status.label}
            </span>
          </div>
        )}
      </div>
      <div className="p-4">
        <h3
          className={`font-bold text-black transition-colors line-clamp-1 ${
            isDisabled ? '' : 'group-hover:text-primary-600'
          }`}
        >
          {item.nama_kendaraan}
        </h3>
        <p className="text-sm text-black-400 mt-0.5">
          {item.merek} &middot; {item.tahun}
        </p>
        {item.warna && (
          <p className="flex items-center gap-1.5 text-xs text-black-400 mt-1.5">
            <span
              className="h-3 w-3 shrink-0 rounded-full border border-black-200"
              style={{ backgroundColor: warnaKendaraanHex(item.warna) || '#E5E7EB' }}
            />
            {item.warna}
          </p>
        )}
        <div className="mt-3 pt-3 border-t border-primary-100 flex items-center justify-between gap-2">
          <span className="text-base sm:text-lg font-bold text-primary-600 truncate">
            {formatRupiah(item.harga_sewa_per_hari)}
            <span className="text-xs text-black-400 font-normal">/hari</span>
          </span>
          {!isDisabled && (
            <span className={`shrink-0 text-xs font-medium px-2.5 py-1 rounded-full ${status.bgColor} ${status.textColor}`}>
              {status.label}
            </span>
          )}
        </div>
        {isDisabled && status.reason === 'disewa' && status.estimatedReturn && (
          <p className="mt-2 flex items-center gap-1.5 text-xs text-black-400">
            <Clock className="w-3.5 h-3.5 shrink-0" />
            Estimasi kembali:{' '}
            {new Date(status.estimatedReturn + 'T00:00:00').toLocaleDateString('id-ID', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </p>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (isDisabled) {
              goToDetail();
            } else {
              onPesan(item);
            }
          }}
          className={`mt-3 w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl transition-colors ${
            isDisabled
              ? 'bg-canvas text-black-600 border border-black-200 hover:bg-black-200'
              : 'bg-primary-600 text-white hover:bg-primary-700'
          }`}
        >
          {isDisabled ? 'Lihat Detail' : 'Sewa Sekarang'}
        </button>
      </div>
    </div>
  );
}
