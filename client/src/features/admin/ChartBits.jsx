import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { CHART_COLORS } from '../../lib/chartTheme';

export function DonutChart({ data = [], dataKey = 'value', nameKey = 'name', height = 240, centerLabel, centerValue }) {
  const total = data.reduce((sum, item) => sum + (Number(item[dataKey]) || 0), 0);

  return (
    <div className="relative" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey={dataKey}
            nameKey={nameKey}
            innerRadius="62%"
            outerRadius="88%"
            paddingAngle={2}
            stroke="var(--surface-1)"
            strokeWidth={2}
            isAnimationActive
            animationDuration={700}
          >
            {data.map((entry, index) => (
              <Cell key={entry[nameKey] || index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip content={<ChartTooltip />} />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="tabular text-[22px] font-semibold tracking-[-0.03em] text-ink">
          {centerValue ?? (total ? total.toLocaleString('en-IN') : '0')}
        </span>
        <span className="mt-0.5 text-[10px] uppercase tracking-[0.1em] text-ink-muted">
          {centerLabel || 'Total'}
        </span>
      </div>
    </div>
  );
}

export function ChartTooltip({ active, payload, label, formatter }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-sm border border-hairline bg-surface-2 px-3 py-2 shadow-lift">
      {label ? <p className="mb-1 text-[10.5px] font-semibold text-ink-muted">{label}</p> : null}
      {payload.map((entry) => (
        <div key={entry.dataKey || entry.name} className="flex items-center gap-2 text-[11.5px]">
          <span
            className="h-2 w-2 rounded-full"
            style={{ background: entry.color || entry.payload?.fill || 'var(--accent)' }}
            aria-hidden="true"
          />
          <span className="text-ink-secondary">{entry.name}</span>
          <span className="ml-auto tabular font-semibold text-ink">
            {formatter ? formatter(entry.value, entry) : Number(entry.value).toLocaleString('en-IN')}
          </span>
        </div>
      ))}
    </div>
  );
}

export function DonutLegend({ data, nameKey = 'name', valueKey = 'value', colors = CHART_COLORS, formatter }) {
  const total = data.reduce((sum, item) => sum + (Number(item[valueKey]) || 0), 0);
  return (
    <ul className="space-y-2.5">
      {data.map((item, index) => {
        const value = Number(item[valueKey]) || 0;
        const pct = total ? (value / total) * 100 : 0;
        return (
          <li key={item[nameKey] || index} className="flex items-center gap-2.5 text-[12px]">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ background: colors[index % colors.length] }}
              aria-hidden="true"
            />
            <span className="min-w-0 flex-1 truncate text-ink-secondary">{item[nameKey]}</span>
            <span className="tabular text-[11.5px] font-semibold text-ink">
              {formatter ? formatter(value, pct) : `${pct.toFixed(1)}%`}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

export default DonutChart;
