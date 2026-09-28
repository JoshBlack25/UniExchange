/*
  The plot inside a chart card. The only file that imports Recharts; it is
  loaded lazily (see ChartCard) so students never download the library.

  Mark rules (dataviz skill): one y-axis; 2px lines with no resting dots; bars
  with 4px rounded tops and a surface-coloured gap between stacked segments;
  a recessive grid. Series 2 and 3 of a line chart are dashed/dotted so identity
  never rests on colour alone, and a legend is shown whenever there is more than
  one series. Colours are CSS variables, so the chart follows the theme with no
  re-render.

  Author: Mogamat Yaseen Kannemeyer 240453182
*/

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from 'recharts'
import type { NameType, ValueType } from 'recharts/types/component/DefaultTooltipContent'

import type { Analytics } from '@/lib/api/types'

import { formatValue, type ChartDef } from './chartCatalog'
import { bucketLabel, tickLabel } from './ranges'

const DASH = { 1: undefined, 2: '6 4', 3: '2 3' } as const

type Row = { t: string } & Record<string, number | string | null>

function toRows(chart: ChartDef, data: Analytics): Row[] {
  return data.buckets.map((t, i) => {
    const row: Row = { t }
    for (const s of chart.series) row[s.key] = data.series[s.key]?.values[i] ?? null
    return row
  })
}

const axisTick = { fill: 'var(--ux-chart-axis)', fontSize: 12 }

function compact(value: number, chart: ChartDef): string {
  if (chart.format === 'rand') {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value)
  }
  return new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 }).format(value)
}

export default function AnalyticsChart({ chart, data }: { chart: ChartDef; data: Analytics }) {
  const rows = toRows(chart, data)
  const multi = chart.series.length > 1
  const common = { data: rows, margin: { top: 8, right: 8, bottom: 0, left: 0 } }

  const axes = (
    <>
      <CartesianGrid vertical={false} stroke="var(--ux-chart-grid)" />
      <XAxis
        dataKey="t"
        tickFormatter={(t: string) => tickLabel(t, data.bucket)}
        tick={axisTick}
        tickLine={false}
        axisLine={{ stroke: 'var(--ux-chart-grid)' }}
        minTickGap={24}
        interval="preserveStartEnd"
      />
      <YAxis
        width={44}
        tick={axisTick}
        tickLine={false}
        axisLine={false}
        allowDecimals={chart.format === 'rating' || chart.format === 'rate'}
        domain={chart.format === 'rating' ? [0, 5] : [0, 'auto']}
        tickFormatter={(v: number) => compact(v, chart)}
      />
      <Tooltip
        cursor={chart.kind === 'line' ? { stroke: 'var(--ux-line-strong)', strokeWidth: 1 } : { fill: 'var(--ux-surface-muted)' }}
        content={(props) => <ChartTooltip {...props} chart={chart} data={data} />}
      />
      {multi && (
        <Legend
          verticalAlign="top"
          align="left"
          height={28}
          iconSize={10}
          wrapperStyle={{ fontSize: 12, color: 'var(--ux-fg-muted)' }}
        />
      )}
    </>
  )

  return (
    <ResponsiveContainer width="100%" height={220}>
      {chart.kind === 'line' ? (
        <LineChart {...common}>
          {axes}
          {chart.series.map((s) => (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.label}
              stroke={`var(--ux-series-${s.slot})`}
              strokeWidth={2}
              strokeDasharray={DASH[s.slot]}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 2, stroke: 'var(--ux-surface)' }}
              connectNulls={chart.format === 'rating'}
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      ) : (
        <BarChart {...common} barCategoryGap="20%">
          {axes}
          {chart.series.map((s, i) => {
            const top = chart.kind !== 'stackedBar' || i === chart.series.length - 1
            return (
              <Bar
                key={s.key}
                dataKey={s.key}
                name={s.label}
                fill={`var(--ux-series-${s.slot})`}
                stackId={chart.kind === 'stackedBar' ? 'stack' : undefined}
                radius={top ? [4, 4, 0, 0] : 0}
                stroke="var(--ux-surface)"
                strokeWidth={chart.kind === 'stackedBar' ? 1 : 0}
                maxBarSize={28}
                isAnimationActive={false}
              />
            )
          })}
        </BarChart>
      )}
    </ResponsiveContainer>
  )
}

/* Values lead, labels follow; every series at that bucket in one readout. */
function ChartTooltip({
  active,
  payload,
  label,
  chart,
  data,
}: TooltipContentProps<ValueType, NameType> & { chart: ChartDef; data: Analytics }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-line bg-surface px-3 py-2 text-xs shadow-float">
      <p className="mb-1 text-fg-muted">{bucketLabel(String(label), data.bucket)}</p>
      <ul className="space-y-0.5">
        {chart.series.map((s) => {
          const entry = payload.find((p) => p.dataKey === s.key)
          const raw = entry?.value
          const value = typeof raw === 'number' ? raw : null
          return (
            <li key={s.key} className="flex items-center gap-2">
              <svg aria-hidden="true" width="14" height="4" className="shrink-0">
                <line
                  x1="0"
                  y1="2"
                  x2="14"
                  y2="2"
                  stroke={`var(--ux-series-${s.slot})`}
                  strokeWidth="3"
                  strokeDasharray={chart.kind === 'line' ? DASH[s.slot] : undefined}
                />
              </svg>
              <span className="font-semibold tabular-nums text-fg">{formatValue(value, chart.format)}</span>
              <span className="text-fg-muted">{s.label}</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
