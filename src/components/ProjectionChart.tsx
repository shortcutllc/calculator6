import { AreaChart, Area, XAxis, YAxis, Tooltip, ReferenceLine, ResponsiveContainer } from 'recharts';

interface ProjectionRow {
  year: number;
  noi: number;
  debtService: number;
  freeCashFlow: number;
}

function fmt(n: number): string {
  if (Math.abs(n) >= 1e6) return '$' + (n / 1e6).toFixed(2) + 'M';
  if (Math.abs(n) >= 1e3) return '$' + Math.round(n / 1e3).toLocaleString() + 'K';
  return '$' + n.toLocaleString();
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white rounded-xl shadow-lg border border-[#334A46]/[.1] px-4 py-3">
      <div className="text-[12px] font-bold text-[#334A46] mb-2">{label}</div>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2 text-[13px]">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.stroke }} />
          <span className="text-[#334A46]/60">{p.name}:</span>
          <span className="font-bold text-[#334A46]">{fmt(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

export default function ProjectionChart({ rows }: { rows: ProjectionRow[] }) {
  const chartData = rows
    .filter(r => r.year >= 2025)
    .map(r => ({
      year: r.year.toString(),
      noi: r.noi,
      debtService: r.debtService,
      freeCashFlow: r.freeCashFlow,
    }));

  return (
    <div className="bg-white rounded-2xl border border-[#334A46]/[.08] p-6 mb-10">
      <div className="flex items-center justify-between mb-4">
        <div className="text-[11px] font-bold uppercase tracking-[.15em] text-[#334A46]/40">
          NOI, Debt Service & Free Cash Flow
        </div>
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-0.5 bg-[#334A46] rounded" />
            <span className="text-[10px] text-[#334A46]/50 font-medium">NOI</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-0.5 bg-[#6B9E8A] rounded" />
            <span className="text-[10px] text-[#334A46]/50 font-medium">Free Cash Flow</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-0.5 bg-[#9CA3AF] rounded border-t border-dashed border-[#9CA3AF]" />
            <span className="text-[10px] text-[#334A46]/50 font-medium">Debt Service</span>
          </div>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
          <XAxis
            dataKey="year"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: '#334A46', opacity: 0.5, fontWeight: 600 }}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: '#334A46', opacity: 0.4 }}
            tickFormatter={(v: number) => '$' + (v / 1000).toFixed(0) + 'K'}
            width={60}
          />
          <Tooltip content={<ChartTooltip />} />
          <ReferenceLine
            x="2029"
            stroke="#334A46"
            strokeDasharray="4 4"
            strokeOpacity={0.3}
            label={{ value: 'Refi', position: 'top', fontSize: 11, fill: '#334A46', opacity: 0.5 }}
          />
          <Area
            type="monotone" dataKey="noi"
            stroke="#334A46" fill="#334A46" fillOpacity={0.08}
            strokeWidth={2.5} dot={false} name="NOI"
          />
          <Area
            type="monotone" dataKey="freeCashFlow"
            stroke="#6B9E8A" fill="#6B9E8A" fillOpacity={0.06}
            strokeWidth={2} dot={false} name="Free Cash Flow"
          />
          <Area
            type="monotone" dataKey="debtService"
            stroke="#9CA3AF" fill="none"
            strokeWidth={1.5} strokeDasharray="4 2" dot={false} name="Debt Service"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
