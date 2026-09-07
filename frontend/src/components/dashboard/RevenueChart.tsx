import { useMemo, useState } from 'react';
import {
  ComposedChart,
  Bar,
  Line,
  LabelList,
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
  activeRange?: (typeof ranges)[number];
  onRangeChange?: (range: (typeof ranges)[number]) => void;
}

function RevenueTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: { payload?: ChartPendapatanPoint }[];
  label?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const row = payload[0]?.payload;
  if (!row) return null;

  const rows = [
    {
      name: 'Pendapatan',
      color: '#0A4DFF',
      value: `Rp ${Math.round(row.pendapatan * 1_000_000).toLocaleString('id-ID')}`,
    },
    {
      name: 'Jumlah Sewa',
      color: '#bbbbbb',
      value: `${row.jumlah_sewa} sewa`,
    },
  ];

  return (
    <div className="min-w-[180px] rounded-lg border border-black-200 bg-surface px-3.5 py-2.5 text-xs shadow-md">
      {label != null && <p className="mb-1.5 font-medium text-black-900">{label}</p>}
      <div className="space-y-1.5">
        {rows.map((r) => (
          <div key={r.name} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-2 text-black-500">
              <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: r.color }} />
              {r.name}
            </span>
            <span className="font-mono font-semibold text-black-900">{r.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function RevenueChart({ data, activeRange, onRangeChange }: RevenueChartProps) {
  const [range, setRange] = useState<(typeof ranges)[number]>(activeRange ?? 'Bulanan');

  const handleRange = (r: (typeof ranges)[number]) => {
    setRange(r);
    onRangeChange?.(r);
  };

  const totalPendapatan = useMemo(
    () => (data ?? []).reduce((acc, p) => acc + p.pendapatan, 0),
    [data],
  );
  const totalSewa = useMemo(
    () => (data ?? []).reduce((acc, p) => acc + p.jumlah_sewa, 0),
    [data],
  );

  const xInterval = useMemo(() => {
    const n = data?.length ?? 0;
    if (n <= 10) return 0;
    return Math.max(0, Math.ceil(n / 8) - 1);
  }, [data]);

  const showValueLabels = (data?.length ?? 0) <= 12;

  return (
    <div className="rounded-2xl border border-primary-100 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-lg font-semibold text-black-900">Rentals & Revenue</h2>
          <p className="mt-1 text-sm text-black-400">Jumlah penyewaan dan pendapatan per {range === 'Harian' ? 'hari' : range === 'Mingguan' ? 'minggu' : 'bulan'}</p>
        </div>

        <div className="flex items-center rounded-lg border border-black-200 p-1">
          {ranges.map((r) => (
            <button
              key={r}
              onClick={() => handleRange(r)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                range === r ? 'bg-primary-600 text-white' : 'text-black-400 hover:text-black-700'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {data && data.length > 0 && (
        <div className="mt-5 grid grid-cols-2 gap-3 sm:max-w-md">
          <div className="rounded-xl border border-black-200 px-4 py-3">
            <p className="text-xs font-medium text-black-400">Total Pendapatan</p>
            <p className="mt-1 font-mono text-lg font-semibold text-primary-600">
              Rp {Math.round(totalPendapatan * 1_000_000).toLocaleString('id-ID')}
            </p>
          </div>
          <div className="rounded-xl border border-black-200 px-4 py-3">
            <p className="text-xs font-medium text-black-400">Total Penyewaan</p>
            <p className="mt-1 font-mono text-lg font-semibold text-black-900">
              {totalSewa} sewa
            </p>
          </div>
        </div>
      )}

      {!data || data.length === 0 ? (
        <div className="mt-6 flex h-72 flex-col items-center justify-center rounded-xl border border-dashed border-black-200 text-center">
          <BarChart3 size={36} className="text-black-200 mb-2" strokeWidth={1.5} />
          <p className="text-sm text-black-400 font-medium">Data tren pendapatan belum tersedia</p>
          <p className="text-xs text-black-400 mt-1 max-w-xs">
            Backend perlu menambahkan field <code className="font-mono">chart_pendapatan</code> di endpoint{' '}
            <code className="font-mono">/api/dashboard</code>.
          </p>
        </div>
      ) : (
        <>
          <div className="mt-4 flex items-center gap-5 text-sm text-black-400">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-black-400" />
              Jumlah Sewa
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-primary-500" />
              Pendapatan (jt)
            </span>
          </div>

          <div className="mt-6 h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data} margin={{ top: 20, right: 0, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="var(--color-black-200)" />
                <XAxis
                  dataKey="bulan"
                  interval={xInterval}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'var(--color-black-400)', fontSize: 11 }}
                  tickMargin={10}
                />
                <YAxis
                  yAxisId="left"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'var(--color-black-500)', fontSize: 11 }}
                  width={44}
                  tickFormatter={(v: number) => `${v} sewa`}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'var(--color-primary-600)', fontSize: 11 }}
                  width={44}
                  tickFormatter={(v: number) => `${Math.round(v)} jt`}
                />
                <Tooltip content={<RevenueTooltip />} cursor={{ fill: 'var(--color-black-200)', opacity: 0.4 }} />
                <Bar yAxisId="left" dataKey="jumlah_sewa" name="Jumlah Sewa" fill="var(--color-black-400)" radius={[4, 4, 0, 0]} barSize={10}>
                  {showValueLabels && (
                    <LabelList
                      dataKey="jumlah_sewa"
                      position="top"
                      fill="var(--color-black-600)"
                      fontSize={10}
                      fontWeight={600}
                    />
                  )}
                </Bar>
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="pendapatan"
                  name="Pendapatan (Jt)"
                  stroke="var(--color-primary-500)"
                  strokeWidth={3}
                  dot={{ r: 3.5, fill: 'var(--color-primary-500)', strokeWidth: 0 }}
                  activeDot={{ r: 5 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
}
