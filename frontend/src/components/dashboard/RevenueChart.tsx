import { useState } from 'react';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { BarChart3 } from 'lucide-react';

export interface ChartPendapatanPoint {
  bulan: string;
  pendapatan: number;
  jumlah_sewa: number;
}

const ranges = ['Harian', 'Mingguan', 'Bulanan'] as const;

interface RevenueChartProps {
  data?: ChartPendapatanPoint[];
}

export default function RevenueChart({ data }: RevenueChartProps) {
  const [range, setRange] = useState<(typeof ranges)[number]>('Bulanan');

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-lg font-semibold text-ink-900">Rentals & Revenue</h2>
          <p className="mt-1 text-sm text-gray-500">Jumlah penyewaan dan pendapatan per bulan (dalam juta Rupiah)</p>
        </div>

        <div className="flex items-center rounded-lg border border-gray-200 p-1">
          {ranges.map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                range === r ? 'bg-ink-900 text-white' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {!data || data.length === 0 ? (
        <div className="mt-6 flex h-72 flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 text-center">
          <BarChart3 size={36} className="text-gray-300 mb-2" strokeWidth={1.5} />
          <p className="text-sm text-gray-500 font-medium">Data tren pendapatan belum tersedia</p>
          <p className="text-xs text-gray-400 mt-1 max-w-xs">
            Backend perlu menambahkan field <code className="font-mono">chart_pendapatan</code> di endpoint{' '}
            <code className="font-mono">/api/dashboard</code>.
          </p>
        </div>
      ) : (
        <>
          <div className="mt-4 flex items-center gap-5 text-sm text-gray-600">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-brand-500" />
              Pendapatan (Jt)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-ink-700" />
              Jumlah Sewa
            </span>
          </div>

          <div className="mt-6 h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="bulan" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} />
                <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#9ca3af', fontSize: 12 }}
                />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: '1px solid #f1f5f9', boxShadow: '0 4px 12px rgba(0,0,0,0.06)' }}
                />
                <Bar yAxisId="left" dataKey="jumlah_sewa" name="Jumlah Sewa" fill="#2b3742" radius={[6, 6, 0, 0]} barSize={18} />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="pendapatan"
                  name="Pendapatan (Jt)"
                  stroke="#2f4b8f"
                  strokeWidth={3}
                  dot={{ r: 3, fill: '#2f4b8f' }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
}