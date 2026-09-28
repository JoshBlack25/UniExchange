/*
  The dashboard's time ranges, and how each bucket is labelled on an axis.

  The backend decides the bucket size (hourly up to 3 days, daily up to 3
  months, weekly beyond), so the formatters key off the response's bucket, not
  the range.

  Author: Mogamat Yaseen Kannemeyer 240453182
*/

import type { AnalyticsBucket, AnalyticsRange } from '@/lib/api/types'

export const RANGES: { value: AnalyticsRange; label: string; long: string }[] = [
  { value: '1d', label: '24h', long: 'the last 24 hours' },
  { value: '2d', label: '2d', long: 'the last 2 days' },
  { value: '3d', label: '3d', long: 'the last 3 days' },
  { value: '1w', label: '1w', long: 'the last week' },
  { value: '2w', label: '2w', long: 'the last 2 weeks' },
  { value: '1m', label: '1m', long: 'the last month' },
  { value: '2m', label: '2m', long: 'the last 2 months' },
  { value: '3m', label: '3m', long: 'the last 3 months' },
  { value: '6m', label: '6m', long: 'the last 6 months' },
  { value: '1y', label: '1y', long: 'the last year' },
]

export function rangeLabel(range: AnalyticsRange): string {
  return RANGES.find((r) => r.value === range)?.long ?? range
}

export const BUCKET_NAME: Record<AnalyticsBucket, string> = {
  HOUR: 'hour',
  DAY: 'day',
  WEEK: 'week',
}

const hour = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' })
const dayMonth = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short' })
const full = new Intl.DateTimeFormat(undefined, {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
})
const fullDay = new Intl.DateTimeFormat(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })

/** Short axis tick. */
export function tickLabel(iso: string, bucket: AnalyticsBucket): string {
  const date = new Date(iso)
  return bucket === 'HOUR' ? hour.format(date) : dayMonth.format(date)
}

/** Tooltip / table heading for one bucket. */
export function bucketLabel(iso: string, bucket: AnalyticsBucket): string {
  const date = new Date(iso)
  if (bucket === 'HOUR') return full.format(date)
  if (bucket === 'WEEK') return `Week of ${fullDay.format(date)}`
  return fullDay.format(date)
}
