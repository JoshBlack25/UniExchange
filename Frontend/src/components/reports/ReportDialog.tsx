/*
  The Report button's dialog, for everyone: pick why from a dropdown (options
  depend on what is being reported), optionally add details, send. Moderators
  are alerted and the reporter hears back when it has been dealt with.

    <ReportButton targetType="LISTING" targetId={listing.listingId} targetName={listing.title} />

  or, from a menu, render <ReportDialog open ... /> yourself.

  Author: Mogamat Yaseen Kannemeyer 240453182
*/

import { Flag } from '@phosphor-icons/react'
import { useState } from 'react'

import { errorMessage } from '@/components/moderation/useLoad'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { Sheet } from '@/components/ui/Sheet'
import { Textarea } from '@/components/ui/Textarea'
import { reportsApi, type FileReportBody } from '@/lib/api/reports'
import type { ReportReason } from '@/lib/api/types'
import { REASON_LABEL, reasonsForTarget } from '@/lib/reportReasons'

type Target = {
  targetType: FileReportBody['targetType']
  targetId: number
  /** What the dialog calls the thing: a listing title, post title or person's name. */
  targetName: string
}

const NOUN: Record<FileReportBody['targetType'], string> = {
  LISTING: 'listing',
  BULLETIN_POST: 'post',
  USER: 'profile',
}

export function ReportDialog({
  open,
  onClose,
  targetType,
  targetId,
  targetName,
}: Target & { open: boolean; onClose: () => void }) {
  const reasons = reasonsForTarget(targetType)
  const [category, setCategory] = useState<ReportReason | ''>('')
  const [details, setDetails] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const [wasOpen, setWasOpen] = useState(open)

  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) {
      setCategory('')
      setDetails('')
      setError(null)
      setSent(false)
    }
  }

  function close() {
    if (!busy) onClose()
  }

  async function submit() {
    if (category === '') return
    setBusy(true)
    setError(null)
    try {
      await reportsApi.file({ targetType, targetId, category, details: details.trim() || undefined })
      setSent(true)
    } catch (caught) {
      setError(errorMessage(caught))
    } finally {
      setBusy(false)
    }
  }

  const noun = NOUN[targetType]

  return (
    <Sheet
      open={open}
      onClose={close}
      variant="dialog"
      dismissible={!busy}
      title={sent ? 'Thanks for letting us know' : `Report this ${noun}`}
      footer={
        sent ? (
          <div className="flex justify-end">
            <Button className="sm:w-auto" onClick={onClose}>
              Done
            </Button>
          </div>
        ) : (
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="secondary" className="sm:w-auto" onClick={close} disabled={busy}>
              Cancel
            </Button>
            <Button variant="danger" className="sm:w-auto" loading={busy} disabled={category === ''} onClick={submit}>
              Send report
            </Button>
          </div>
        )
      }
    >
      {sent ? (
        <p className="text-sm text-fg-muted">
          A moderator will review <strong className="text-fg">{targetName}</strong>. We'll send you a notification
          once it has been dealt with. The person you reported is not told who reported them.
        </p>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-fg-muted">
            Reporting <strong className="text-fg">{targetName}</strong>. Reports are private - the other person is
            not told who sent it.
          </p>
          {error && <Alert>{error}</Alert>}
          <Select
            label="What's wrong?"
            value={category}
            onChange={(event) => setCategory(event.target.value as ReportReason | '')}
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
          <Textarea
            label="Details (optional)"
            rows={3}
            maxLength={500}
            value={details}
            onChange={(event) => setDetails(event.target.value)}
            hint="Anything that helps a moderator understand - what happened, and when."
          />
        </div>
      )}
    </Sheet>
  )
}

/** A quiet "Report" button that opens the dialog. */
export function ReportButton({ className = '', ...target }: Target & { className?: string }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          'inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-lg px-2 text-sm font-medium text-fg-muted ' +
          'transition hover:bg-red-50 hover:text-red-700 focus-visible:outline-2 focus-visible:outline-brand-500 ' +
          className
        }
      >
        <Flag aria-hidden="true" className="size-4" />
        Report {NOUN[target.targetType]}
      </button>
      <ReportDialog open={open} onClose={() => setOpen(false)} {...target} />
    </>
  )
}
