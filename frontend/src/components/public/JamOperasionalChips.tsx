import type { JamOperasionalRow } from '../../lib/format';

interface JamOperasionalChipsProps {
  jam: JamOperasionalRow[];
  variant?: 'dark' | 'light';
  className?: string;
}

/**
 * Menampilkan jadwal operasional sebagai deretan chip per hari (rapi dan
 * ringkas), menggantikan string panjang satu baris. Variant 'dark' untuk
 * latar gelap (hero/footer), 'light' untuk latar terang (modal).
 */
export default function JamOperasionalChips({
  jam,
  variant = 'light',
  className = '',
}: JamOperasionalChipsProps) {
  const rows = (jam ?? []).filter((r) => r && typeof r.hari === 'string' && r.hari.trim());
  if (!rows.length) return null;

  const isDark = variant === 'dark';
  const chipClass = isDark
    ? 'border-white/10 bg-white/5 text-black-300'
    : 'border-black-200 bg-white text-black-500';
  const dayClass = isDark ? 'text-white/90' : 'text-black-800';

  return (
    <div className={`flex flex-wrap gap-1.5 ${className}`}>
      {rows.map((r) => {
        const libur = Boolean(r.libur) || !r.buka || !r.tutup;

        return (
          <span
            key={r.hari.trim()}
            className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] leading-none font-medium ${chipClass}`}
          >
            <span className={dayClass}>{r.hari.trim()}</span>
            <span className={isDark ? 'text-black-500' : 'text-black-300'}>·</span>
            {libur ? (
              <span className={isDark ? 'text-black-400' : 'text-black-400'}>Libur</span>
            ) : (
              <span className="text-black-400">
                {r.buka}–{r.tutup}
              </span>
            )}
          </span>
        );
      })}
    </div>
  );
}