/*
  "Choose charts": a checklist of every chart this session may see. Admin-only
  charts are not offered in a moderator session at all.

  Author: Mogamat Yaseen Kannemeyer 240453182
*/

import { useState } from 'react'

import { Button } from '@/components/ui/Button'
import { Checkbox } from '@/components/ui/Checkbox'
import { Sheet } from '@/components/ui/Sheet'

import type { ChartDef } from './chartCatalog'

type ChartPickerProps = {
  open: boolean
  onClose: () => void
  available: ChartDef[]
  selected: string[]
  onSave: (charts: string[]) => void
  onReset: () => void
}

export function ChartPicker({ open, onClose, available, selected, onSave, onReset }: ChartPickerProps) {
  const [draft, setDraft] = useState<string[]>(selected)
  const [wasOpen, setWasOpen] = useState(open)

  // Start from the current selection each time the sheet opens.
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) setDraft(selected)
  }

  function toggle(id: string, on: boolean) {
    // Keep catalogue order so the grid doesn't reshuffle as boxes are ticked.
    setDraft((current) => available.map((c) => c.id).filter((c) => (c === id ? on : current.includes(c))))
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Choose charts"
      description="Pick what the overview shows. Your choice is remembered on this device."
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              onReset()
              onClose()
            }}
          >
            Reset to default
          </Button>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => {
                onSave(draft)
                onClose()
              }}
            >
              Show {draft.length} {draft.length === 1 ? 'chart' : 'charts'}
            </Button>
          </div>
        </div>
      }
    >
      <fieldset className="space-y-3">
        <legend className="sr-only">Charts</legend>
        {available.map((chart) => (
          <Checkbox
            key={chart.id}
            label={chart.adminOnly ? `${chart.title} (admin)` : chart.title}
            hint={chart.description}
            checked={draft.includes(chart.id)}
            onChange={(event) => toggle(chart.id, event.target.checked)}
          />
        ))}
      </fieldset>
    </Sheet>
  )
}
