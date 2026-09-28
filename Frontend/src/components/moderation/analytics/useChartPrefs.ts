/*
  Which charts and which range this moderator last chose. A per-browser
  convenience, so it lives in localStorage; storage can be missing or throw
  (private windows, blocked site data), in which case the defaults apply.

  Author: Mogamat Yaseen Kannemeyer 240453182
*/

import { useCallback, useState } from 'react'

import type { AnalyticsRange } from '@/lib/api/types'

import { CHARTS, DEFAULT_CHARTS } from './chartCatalog'
import { RANGES } from './ranges'

const KEY = 'ux-mod-charts'

type Prefs = { range: AnalyticsRange; charts: string[] }

const DEFAULTS: Prefs = { range: '1w', charts: DEFAULT_CHARTS }

function read(): Prefs {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return DEFAULTS
    const parsed = JSON.parse(raw) as Partial<Prefs>
    const range = RANGES.some((r) => r.value === parsed.range) ? (parsed.range as AnalyticsRange) : DEFAULTS.range
    const charts = Array.isArray(parsed.charts)
      ? parsed.charts.filter((id): id is string => CHARTS.some((c) => c.id === id))
      : DEFAULTS.charts
    return { range, charts }
  } catch {
    return DEFAULTS
  }
}

function write(prefs: Prefs) {
  try {
    localStorage.setItem(KEY, JSON.stringify(prefs))
  } catch {
    /* storage unavailable: the choice just won't survive a reload */
  }
}

export function useChartPrefs() {
  const [prefs, setPrefs] = useState<Prefs>(read)

  const update = useCallback((next: Partial<Prefs>) => {
    setPrefs((current) => {
      const merged = { ...current, ...next }
      write(merged)
      return merged
    })
  }, [])

  return {
    range: prefs.range,
    charts: prefs.charts,
    setRange: (range: AnalyticsRange) => update({ range }),
    setCharts: (charts: string[]) => update({ charts }),
    resetCharts: () => update({ charts: DEFAULT_CHARTS }),
  }
}
