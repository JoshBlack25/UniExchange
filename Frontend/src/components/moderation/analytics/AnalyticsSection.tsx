/*
  The charts on the moderation overview: one range control and a chart picker
  in a single row above the grid, scoping every chart below them.

  Changing the range keeps the current charts on screen, dimmed, until the new
  numbers arrive - no skeleton flash, no layout jump.

  Author: Mogamat Yaseen Kannemeyer 240453182
*/

import { useState } from 'react'
import { SlidersHorizontal } from '@phosphor-icons/react'

import { useIsAdmin } from '@/auth/roles'
import { useLoad } from '@/components/moderation/useLoad'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { moderationApi } from '@/lib/api/moderation'

import { CHARTS } from './chartCatalog'
import { ChartCard, ChartCardSkeleton } from './ChartCard'
import { ChartPicker } from './ChartPicker'
import { BUCKET_NAME } from './ranges'
import { RangePicker } from './RangePicker'
import { useChartPrefs } from './useChartPrefs'

export function AnalyticsSection() {
  const isAdmin = useIsAdmin()
  const { range, charts, setRange, setCharts, resetCharts } = useChartPrefs()
  const [pickerOpen, setPickerOpen] = useState(false)
  const { data, error, reload } = useLoad(() => moderationApi.analytics(range), [range])

  const available = CHARTS.filter((chart) => isAdmin || !chart.adminOnly)
  const shown = available.filter((chart) => charts.includes(chart.id))
  const stale = data != null && data.range !== range

  return (
    <section aria-labelledby="analytics-heading" className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="analytics-heading" className="text-base font-semibold text-fg">
            Trends
          </h2>
          <p className="text-xs text-fg-muted">
            {data ? `Per ${BUCKET_NAME[data.bucket]}, compared with the period before.` : 'Loading…'}
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => setPickerOpen(true)}>
          <SlidersHorizontal aria-hidden="true" className="size-4" />
          Choose charts
        </Button>
      </div>

      <RangePicker value={range} onChange={setRange} />

      {error && (
        <Alert>
          {error}{' '}
          <button type="button" onClick={reload} className="cursor-pointer font-semibold underline">
            Try again
          </button>
        </Alert>
      )}

      {shown.length === 0 ? (
        <EmptyState
          title="No charts selected"
          description="Choose which trends to follow on this page."
          action={
            <Button size="sm" onClick={() => setPickerOpen(true)}>
              Choose charts
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {shown.map((chart) =>
            data ? (
              <ChartCard key={chart.id} chart={chart} data={data} stale={stale} />
            ) : (
              <ChartCardSkeleton key={chart.id} />
            ),
          )}
        </div>
      )}

      <ChartPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        available={available}
        selected={shown.map((chart) => chart.id)}
        onSave={setCharts}
        onReset={resetCharts}
      />
    </section>
  )
}
