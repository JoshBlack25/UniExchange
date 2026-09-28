/*
  One dashboard chart: title, headline number with its change against the
  previous period, the plot, and a screen-reader table of the same values.

  The delta is coloured by whether the change is good news for this metric
  (more suspensions is bad), and always carries an arrow and a sign, so it never
  relies on colour alone.

  Author: Mogamat Yaseen Kannemeyer 240453182
*/

import { lazy, Suspense } from 'react'
import { ArrowDownRight, ArrowRight, ArrowUpRight } from '@phosphor-icons/react'

import type { Analytics } from '@/lib/api/types'

import { formatValue, type ChartDef } from './chartCatalog'
import { bucketLabel, rangeLabel } from './ranges'

const AnalyticsChart = lazy(() => import('./AnalyticsChart'))

function headlineOf(chart: ChartDef, data: Analytics) {
  const key = chart.headline ?? chart.series[0].key
  const series = data.series[key]
  if (!series) return { value: null, previous: null }
  return { value: series.total, previous: series.previousTotal }
}

function Delta({ chart, value, previous }: { chart: ChartDef; value: number | null; previous: number | null }) {
  if (value == null || previous == null) return null
  const diff = value - previous
  if (diff === 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-surface-muted px-2 py-0.5 text-xs font-medium text-fg-muted">
        <ArrowRight aria-hidden="true" className="size-3" weight="bold" />
        No change
      </span>
    )
  }
  const up = diff > 0
  const good = chart.higherIsBetter == null ? null : up === chart.higherIsBetter
  const tone =
    good == null ? 'bg-surface-muted text-fg-muted' : good ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
  const pct = previous !== 0 ? Math.round((Math.abs(diff) / Math.abs(previous)) * 100) : null
  const Icon = up ? ArrowUpRight : ArrowDownRight
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium tabular-nums ${tone}`}>
      <Icon aria-hidden="true" className="size-3" weight="bold" />
      {up ? '+' : '−'}
      {pct != null ? `${pct}%` : formatValue(Math.abs(diff), chart.format)}
      <span className="sr-only"> compared with the previous period</span>
    </span>
  )
}

function isEmpty(chart: ChartDef, data: Analytics) {
  return chart.series.every((s) => (data.series[s.key]?.values ?? []).every((v) => v == null || v === 0))
}

export function ChartCard({ chart, data, stale }: { chart: ChartDef; data: Analytics; stale: boolean }) {
  const { value, previous } = headlineOf(chart, data)
  const summary = `${chart.title}: ${formatValue(value, chart.format)} over ${rangeLabel(data.range)}.`
  const empty = isEmpty(chart, data)

  return (
    <article
      aria-label={chart.title}
      aria-busy={stale}
      className={`glass-card rounded-2xl border p-4 shadow-glass transition-opacity sm:p-5 ${stale ? 'opacity-60' : ''}`}
    >
      <header className="mb-3 flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-fg">{chart.title}</h3>
          <p className="text-xs text-fg-muted">{chart.description}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold tabular-nums text-fg">{formatValue(value, chart.format)}</span>
          <Delta chart={chart} value={value} previous={previous} />
        </div>
      </header>

      {empty ? (
        <div className="grid h-[220px] place-items-center rounded-xl bg-surface-muted/60 text-center">
          <p className="max-w-60 text-sm text-fg-muted">Nothing recorded in {rangeLabel(data.range)}.</p>
        </div>
      ) : (
        <div role="img" aria-label={summary}>
          <Suspense fallback={<div className="h-[220px] animate-pulse rounded-xl bg-surface-muted" />}>
            <AnalyticsChart chart={chart} data={data} />
          </Suspense>
        </div>
      )}

      <table className="sr-only">
        <caption>{summary}</caption>
        <thead>
          <tr>
            <th scope="col">Period</th>
            {chart.series.map((s) => (
              <th key={s.key} scope="col">
                {s.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.buckets.map((t, i) => (
            <tr key={t}>
              <th scope="row">{bucketLabel(t, data.bucket)}</th>
              {chart.series.map((s) => (
                <td key={s.key}>{formatValue(data.series[s.key]?.values[i], chart.format)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </article>
  )
}

export function ChartCardSkeleton() {
  return (
    <div className="glass-card rounded-2xl border p-4 shadow-glass sm:p-5" aria-hidden="true">
      <div className="mb-3 flex justify-between">
        <div className="space-y-2">
          <div className="h-4 w-32 animate-pulse rounded bg-surface-muted" />
          <div className="h-3 w-48 animate-pulse rounded bg-surface-muted" />
        </div>
        <div className="h-6 w-16 animate-pulse rounded bg-surface-muted" />
      </div>
      <div className="h-[220px] animate-pulse rounded-xl bg-surface-muted" />
    </div>
  )
}
