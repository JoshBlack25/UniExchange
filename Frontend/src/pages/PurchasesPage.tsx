/*
  Purchases and sales.

  ROUTE: /purchases

  This is where escrow becomes visible to the student: a PENDING row is money
  that has left the buyer's wallet and has not reached the seller. The buyer's
  "I received it" button is the thing that actually pays the seller, and only
  once that has happened can either side review the other.

  Layout: a centred column of glass cards, one per transaction - what it
  was, the amount, a status badge, and (while PENDING) the actions, with the
  buyer's "I received it" as the one primary button and "Cancel and refund"
  as the quieter secondary next to it.
*/

import {
  CheckCircle,
  ClockCountdown,
  LockSimple,
  ShoppingBag,
  Star,
  Storefront,
  XCircle,
} from '@phosphor-icons/react'
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import { Columns } from '@/components/layout/Columns'
import { PageHeader } from '@/components/layout/PageHeader'
import { ReviewForm } from '@/components/reviews/ReviewForm'
import { Seo } from '@/components/seo/Seo'
import { formatZar } from '@/components/wallet/money'
import { Alert } from '@/components/ui/Alert'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { useAuth } from '@/auth/useAuth'
import { ApiError } from '@/lib/api/client'
import { reviewsApi } from '@/lib/api/reviews'
import { purchasesApi } from '@/lib/api/wallet'
import type { Transaction } from '@/lib/api/types'

export function PurchasesPage() {
  const { session } = useAuth()
  const myUserId = session?.userId ?? 0

  const [transactions, setTransactions] = useState<Transaction[] | null>(null)
  const [reviewable, setReviewable] = useState<number[]>([])
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<number | null>(null)
  // Which of the two buttons was pressed, so only that one shows a spinner.
  const [busyAction, setBusyAction] = useState<'confirm' | 'cancel' | null>(null)
  const [reviewingId, setReviewingId] = useState<number | null>(null)

  const load = useCallback(async (signal?: { cancelled: boolean }) => {
    try {
      const [history, pending] = await Promise.all([
        purchasesApi.history(),
        reviewsApi.pending(),
      ])
      if (!signal?.cancelled) {
        setTransactions(history)
        setReviewable(pending.map((transaction) => transaction.transactionId))
        setError(null)
      }
    } catch (err: unknown) {
      if (!signal?.cancelled) {
        setError(err instanceof ApiError ? err.message : 'Something went wrong.')
      }
    }
  }, [])

  useEffect(() => {
    const signal = { cancelled: false }

    // Inline rather than calling load() directly: setState in an effect body
    // trips react-hooks/set-state-in-effect, and this matches how every other
    // page in the app fetches. load() is still used for refreshes after an
    // action, where it runs from an event handler rather than an effect.
    Promise.all([purchasesApi.history(), reviewsApi.pending()])
      .then(([history, pending]) => {
        if (!signal.cancelled) {
          setTransactions(history)
          setReviewable(pending.map((transaction) => transaction.transactionId))
          setError(null)
        }
      })
      .catch((err: unknown) => {
        if (!signal.cancelled) {
          setError(err instanceof ApiError ? err.message : 'Something went wrong.')
        }
      })

    return () => {
      signal.cancelled = true
    }
  }, [])

  async function act(transactionId: number, action: 'confirm' | 'cancel') {
    setBusyId(transactionId)
    setBusyAction(action)
    setError(null)
    try {
      await (action === 'confirm'
        ? purchasesApi.confirm(transactionId)
        : purchasesApi.cancel(transactionId))
      await load()
    } catch (err: unknown) {
      setError(err instanceof ApiError ? err.message : 'That did not work.')
    } finally {
      setBusyId(null)
      setBusyAction(null)
    }
  }

  return (
    <Columns narrow>
      <Seo title="Purchases" description="What you have bought and sold, and the escrow status of each order." path="/purchases" noindex />
      <PageHeader title="Purchases" subtitle="What you have bought and sold" />

      {error && (
        <div className="mb-4">
          <Alert tone="error">{error}</Alert>
        </div>
      )}

      {transactions === null && !error && (
        <ul aria-hidden="true" className="space-y-3">
          {Array.from({ length: 3 }, (_, index) => (
            <li key={index} className="glass-card flex items-center gap-3 rounded-2xl border p-4">
              <span className="size-11 animate-pulse rounded-full bg-surface-muted" />
              <span className="flex-1 space-y-2">
                <span className="block h-3.5 w-2/5 animate-pulse rounded-full bg-surface-muted" />
                <span className="block h-3 w-3/5 animate-pulse rounded-full bg-surface-muted" />
              </span>
              <span className="h-4 w-16 animate-pulse rounded-full bg-surface-muted" />
            </li>
          ))}
        </ul>
      )}

      {transactions?.length === 0 && (
        <EmptyState
          title="Nothing yet"
          description="When you buy something with your wallet it will show up here."
        />
      )}

      <ul className="space-y-3">
        {transactions?.map((transaction) => {
          const iAmBuyer = transaction.buyerId === myUserId
          const canReview = reviewable.includes(transaction.transactionId)
          const busy = busyId === transaction.transactionId
          const RoleIcon = iAmBuyer ? ShoppingBag : Storefront

          return (
            <li key={transaction.transactionId}>
              <Card>
                <div className="flex items-start gap-3">
                  <span
                    aria-hidden="true"
                    className={`grid size-11 shrink-0 place-items-center rounded-full ${
                      iAmBuyer ? 'bg-brand-100 text-brand-700' : 'bg-emerald-100 text-emerald-700'
                    }`}
                  >
                    <RoleIcon weight="fill" className="size-5" />
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-wide text-fg-muted">
                          {iAmBuyer ? 'Bought' : 'Sold'}
                        </p>
                        <Link
                          to={`/listings/${transaction.listingId}`}
                          className="block truncate rounded font-semibold text-fg underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-brand-500"
                        >
                          Listing #{transaction.listingId}
                        </Link>
                      </div>
                      <p className="shrink-0 text-lg font-bold tabular-nums text-fg">
                        {formatZar(transaction.amount)}
                      </p>
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-fg-muted">
                      <StatusBadge status={transaction.status} iAmBuyer={iAmBuyer} />
                      <span className="tabular-nums">
                        {new Date(transaction.createdAt).toLocaleDateString('en-ZA', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                  </div>
                </div>

                {transaction.status === 'PENDING' && (
                  <div className="mt-4 border-t border-line pt-4">
                    {iAmBuyer && (
                      <p className="mb-3 flex gap-2 text-sm text-fg-muted">
                        <LockSimple aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-amber-700" />
                        {formatZar(transaction.amount)} is held in escrow. Confirm once you have the
                        item and it is paid to the seller.
                      </p>
                    )}
                    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                      <Button
                        variant="secondary"
                        className="sm:w-auto"
                        loading={busy && busyAction === 'cancel'}
                        disabled={busy}
                        onClick={() => act(transaction.transactionId, 'cancel')}
                      >
                        Cancel and refund
                      </Button>
                      {iAmBuyer && (
                        <Button
                          className="sm:w-auto"
                          loading={busy && busyAction === 'confirm'}
                          disabled={busy}
                          onClick={() => act(transaction.transactionId, 'confirm')}
                        >
                          <CheckCircle aria-hidden="true" weight="bold" className="size-5" />
                          I received it
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                {transaction.status === 'COMPLETED' && canReview && (
                  <div className="mt-4 border-t border-line pt-4">
                    {reviewingId === transaction.transactionId ? (
                      <ReviewForm
                        transactionId={transaction.transactionId}
                        subject={iAmBuyer ? 'the seller' : 'the buyer'}
                        onDone={() => {
                          setReviewingId(null)
                          void load()
                        }}
                      />
                    ) : (
                      <Button
                        variant="secondary"
                        className="sm:w-auto"
                        onClick={() => setReviewingId(transaction.transactionId)}
                      >
                        <Star aria-hidden="true" className="size-5" />
                        Leave a review
                      </Button>
                    )}
                  </div>
                )}
              </Card>
            </li>
          )
        })}
      </ul>
    </Columns>
  )
}

function StatusBadge({ status, iAmBuyer }: { status: Transaction['status']; iAmBuyer: boolean }) {
  if (status === 'PENDING') {
    return (
      <Badge tone="warning">
        <ClockCountdown aria-hidden="true" weight="bold" className="size-3.5" />
        {iAmBuyer ? 'Held in escrow' : 'Awaiting buyer confirmation'}
      </Badge>
    )
  }
  if (status === 'COMPLETED')
    return (
      <Badge tone="success">
        <CheckCircle aria-hidden="true" weight="bold" className="size-3.5" />
        Complete
      </Badge>
    )
  if (status === 'CANCELLED')
    return (
      <Badge tone="neutral">
        <XCircle aria-hidden="true" weight="bold" className="size-3.5" />
        Cancelled and refunded
      </Badge>
    )
  return (
    <Badge tone="danger">
      <XCircle aria-hidden="true" weight="bold" className="size-3.5" />
      Failed
    </Badge>
  )
}
