/*
  The send-money popup, in two steps:

    1. Confirm - transfers are instant and cannot be reversed, so the amount and
       recipient are shown once more before anything moves.
    2. Sent    - once the backend has moved the money, the same popup says so.

  Built on the shared Sheet (variant="dialog") so it has the app's one modal
  look: a bottom sheet on phones, a centred dialog from sm up, with focus
  trap, Esc and scrim close handled there. Closing is blocked mid-send
  (dismissible={false}) so the outcome can't be missed.

  Author: Mogamat Yaseen Kannemeyer 240453182
*/

import { CheckCircle, PaperPlaneTilt, Warning } from '@phosphor-icons/react'

import { Button } from '@/components/ui/Button'
import { Sheet } from '@/components/ui/Sheet'

import { formatZar } from './money'

type ConfirmSendModalProps = {
  recipientEmail: string
  amount: string
  sending: boolean
  /** Set once the transfer succeeded; switches the popup to its "sent" view. */
  sentTo: string | null
  onConfirm: () => void
  onClose: () => void
}

export function ConfirmSendModal({
  recipientEmail,
  amount,
  sending,
  sentTo,
  onConfirm,
  onClose,
}: ConfirmSendModalProps) {
  // Distinct keys remount the Sheet between the two steps, so focus moves
  // onto "Done" instead of being stranded on the now-gone Send button.
  if (sentTo) {
    return (
      <Sheet
        key="sent"
        open
        onClose={onClose}
        variant="dialog"
        title="Money sent"
        footer={
          <Button onClick={onClose} className="sm:w-auto sm:px-8" data-autofocus>
            Done
          </Button>
        }
      >
        <div className="py-2 text-center">
          <span className="mx-auto grid size-16 place-items-center rounded-full bg-emerald-100 text-emerald-700 motion-safe:animate-pop-in">
            <CheckCircle aria-hidden="true" weight="fill" className="size-9" />
          </span>
          <p className="mt-3 text-3xl font-bold tracking-tight tabular-nums text-fg">
            {formatZar(amount)}
          </p>
          <p className="mt-1 text-sm text-fg-muted">is now in {sentTo}&apos;s wallet.</p>
        </div>
      </Sheet>
    )
  }

  return (
    <Sheet
      key="confirm"
      open
      onClose={onClose}
      variant="dialog"
      dismissible={!sending}
      title={`Send ${formatZar(amount)}?`}
      description="Check the details - this can't be undone."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={sending} className="sm:w-auto">
            Cancel
          </Button>
          <Button onClick={onConfirm} loading={sending} className="sm:w-auto" data-autofocus>
            {!sending && <PaperPlaneTilt aria-hidden="true" weight="bold" className="size-5" />}
            Send {formatZar(amount)}
          </Button>
        </>
      }
    >
      <dl className="divide-y divide-line rounded-2xl border border-line bg-surface-muted text-sm">
        <div className="flex items-start justify-between gap-4 px-4 py-3">
          <dt className="text-fg-muted">To</dt>
          <dd className="min-w-0 break-all text-right font-medium text-fg">{recipientEmail}</dd>
        </div>
        <div className="flex items-center justify-between gap-4 px-4 py-3">
          <dt className="text-fg-muted">Amount</dt>
          <dd className="text-base font-semibold tabular-nums text-fg">{formatZar(amount)}</dd>
        </div>
      </dl>

      <p className="mt-3 flex gap-2 text-sm text-fg-muted">
        <Warning aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-amber-700" />
        The money arrives in their wallet immediately and can&apos;t be taken back.
      </p>
    </Sheet>
  )
}
