import type { LucideIcon } from 'lucide-react';
import Sparkline from './Sparkline';

/**
 * Menghasilkan pola sparkline dekoratif dari nama metrik + nilai saat ini.
 * PENTING: ini BUKAN data historis asli — backend belum punya endpoint
 * riwayat harian per metrik. Ini murni hiasan visual yang konsisten
 * (nilai akhir sparkline selalu = nilai asli dari API).
 *
 * Begitu backend sudah sediakan data tren per metrik, ganti pemanggilan
 * ini dengan array riwayat asli.
 */
export function decorativeSparkline(seed: string, endValue: number, points = 10): number[] {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const next = () => {
    h = (h * 1103515245 + 12345) >>> 0;
    return (h % 1000) / 1000;
  };
  const base = Math.max(Math.abs(endValue), 1);
  const arr = Array.from({ length: points }, () => base * (0.55 + next() * 0.5));
  arr[arr.length - 1] = base;
  return arr;
}

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
  sparkData: number[];
  sparkColor: string;
  sparkId: string;
}

export default function StatCard({
  label,
  value,
  icon: Icon,
  iconBg,
  iconColor,
  sparkData,
  sparkColor,
  sparkId,
}: StatCardProps) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <p className="text-sm font-medium text-gray-500">{label}</p>
        <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${iconBg} shrink-0`}>
          <Icon size={18} className={iconColor} />
        </div>
      </div>

      <div className="mt-3 flex items-end justify-between gap-2">
        <span className="text-2xl font-bold text-gray-900 truncate">{value}</span>
        <Sparkline data={sparkData} color={sparkColor} fillId={sparkId} />
      </div>
    </div>
  );
}