/*
  The report a moderator must write to suspend or delete an account, or take
  down a listing or post: a reason from the dropdown plus a written account of
  what happened. The backend refuses the action without both.

  For removals the report is sent to the owner (notification + email), so the
  copy says so; for suspensions and deletions it is kept on file.

  Stays open and shows the error if the request fails, so nothing typed is lost.

  Author: Mogamat Yaseen Kannemeyer 240453182
*/

import { useId, useState } from 'react'
import type { ReactNode } from 'react'

import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { Sheet } from '@/components/ui/Sheet'
import { Textarea } from '@/components/ui/Textarea'
import type { ActionReport, ModerationActionType, ReportReason } from '@/lib/api/types'
import { MIN_REPORT_DETAILS, REASON_LABEL, reasonsForAction } from '@/lib/reportReasons'

import { errorMessage } from './useLoad'

type ActionReportDialogProps = {
  open: boolean
  action: ModerationActionType
  title: string
  description: ReactNode
  confirmLabel: string
  /** Pre-selects the reason, e.g. the category a user reported it under. */
  initialReason?: ReportReason | null
  /** Links the report to the user report it answers. */
  userReportId?: number | null
  onClose: () => void
  onConfirm: (report: ActionReport) => Promise<void>
}

const SENT_TO_USER: Record<ModerationActionType, boolean> = {
  ACCOUNT_SUSPENDED: false,
  ACCOUNT_DELETED: false,
  LISTING_REMOVED: true,
  POST_REMOVED: true,
}

export function ActionReportDialog({
  open,
  action,
  title,
  description,
  confirmLabel,
  initialReason = null,
  userReportId = null,
  onClose,
  onConfirm,
}: ActionReportDialogProps) {
  const reasons = reasonsForAction(action)
  const [reason, setReason] = useState<ReportReason | ''>('')
  const [details, setDetails] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [wasOpen, setWasOpen] = useState(open)
  const hintId = useId()

  // Start fresh (with the suggested reason) each time the dialog opens.
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) {
      setReason(initialReason && reasons.includes(initialReason) ? initialReason : '')
      setDetails('')
      setError(null)
    }
  }

  const written = details.trim().length
  const ready = reason !== '' && written >= MIN_REPORT_DETAILS
  const sent = SENT_TO_USER[action]

  function close() {
    if (!busy) onClose()
  }

  async function confirm() {
    if (!ready || !reason) return
    setBusy(true)
    setError(null)
    try {
      await onConfirm({ reason, details: details.trim(), userReportId })
      onClose()
    } catch (caught) {
      setError(errorMessage(caught))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet
      open={open}
      onClose={close}
      variant="dialog"
      dismissible={!busy}
      title={title}
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" className="sm:w-auto" onClick={close} disabled={busy}>
            Cancel
          </Button>
          <Button variant="danger" className="sm:w-auto" loading={busy} disabled={!ready} onClick={confirm}>
            {confirmLabel}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{description}</div>
        {error && <Alert>{error}</Alert>}

        <Select
          label="Reason"
          value={reason}
          onChange={(event) => setReason(event.target.value as ReportReason | '')}
          data-autofocus
        >
          <option value="" disabled>
            Choose a reason…
          </option>
          {reasons.map((value) => (
            <option key={value} value={value}>
              {REASON_LABEL[value]}
            </option>
          ))}
        </Select>

        <div>
          <Textarea
            label="Report"
            rows={5}
            maxLength={2000}
            value={details}
            onChange={(event) => setDetails(event.target.value)}
            aria-describedby={hintId}
            placeholder="What happened, what you checked, and why this action is needed."
          />
          <p id={hintId} className="mt-1.5 flex justify-between gap-3 text-xs text-fg-muted">
            <span>
              {sent
                ? 'Saved, and sent to the owner by notification and email.'
                : 'Saved to the case file. Moderators and admins can read it later.'}
            </span>
            <span className={`shrink-0 tabular-nums ${written < MIN_REPORT_DETAILS ? '' : 'text-emerald-700'}`}>
              {written < MIN_REPORT_DETAILS ? `${MIN_REPORT_DETAILS - written} more characters` : `${written}/2000`}
            </span>
          </p>
        </div>
      </div>
    </Sheet>
  )
}
