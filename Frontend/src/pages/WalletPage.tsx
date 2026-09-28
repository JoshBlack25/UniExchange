/*
  Wallet: balance, escrow, ledger and top-ups.

  ROUTE: /wallet

  Note the three figures at the top. `available` is what can be spent right now
  and is ALREADY net of anything held in escrow - money leaves the buyer's wallet
  the moment they buy. `held` is shown next to it so the difference is visible,
  never subtracted from it.

  Layout, top to bottom in a centred column:
    - the balance hero (available big, escrow and total as secondary tiles)
    - Top up / Send as a two-tab switch, so only one form is on screen at once
    - the ledger ("Activity"), credits and debits told apart by sign and icon,
      not by colour alone
*/

import {
  ArrowDownLeft,
  ArrowUpRight,
  Coins,
  LockSimple,
  PaperPlaneTilt,
  PlusCircle,
  Wallet,
} from '@phosphor-icons/react'
import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

import { Columns } from '@/components/layout/Columns'
import { PageHeader } from '@/components/layout/PageHeader'
import { Seo } from '@/components/seo/Seo'
import { SendMoneyForm } from '@/components/wallet/SendMoneyForm'
import { TopUpForm } from '@/components/wallet/TopUpForm'
import { formatZar } from '@/components/wallet/money'
import { Alert } from '@/components/ui/Alert'
import { walletApi } from '@/lib/api/wallet'
import { ApiError } from '@/lib/api/client'
import type { WalletSummary, WalletTransaction } from '@/lib/api/types'

/**
 * After returning from PayFast the balance may not have moved yet - the
 * confirming callback is server-to-server and can land a moment later. Rather
 * than showing a stale zero, re-check a few times before giving up.
 */
const POST_TOPUP_POLLS = 10
const POST_TOPUP_INTERVAL_MS = 2_000

export function WalletPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const justToppedUp = searchParams.get('topup') === 'done'
  const cancelledTopUp = searchParams.get('topup') === 'cancelled'

  const [summary, setSummary] = useState<WalletSummary | null>(null)
  const [ledger, setLedger] = useState<WalletTransaction[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [awaitingPayment, setAwaitingPayment] = useState(justToppedUp)

  const load = useCallback(async (signal?: { cancelled: boolean }) => {
    try {
      const [nextSummary, nextLedger] = await Promise.all([walletApi.summary(), walletApi.ledger()])
      if (!signal?.cancelled) {
        setSummary(nextSummary)
        setLedger(nextLedger)
        setError(null)
      }
      return nextSummary
    } catch (err: unknown) {
      if (!signal?.cancelled) {
        setError(err instanceof ApiError ? err.message : 'Something went wrong.')
      }
      return null
    }
  }, [])

  useEffect(() => {
    const signal = { cancelled: false }

    // Inline rather than calling load() directly: setState in an effect body
    // trips react-hooks/set-state-in-effect, and this matches how every other
    // page in the app fetches. load() is still used by the post-top-up poll,
    // which runs from a timer callback rather than the effect body.
    Promise.all([walletApi.summary(), walletApi.ledger()])
      .then(([nextSummary, nextLedger]) => {
        if (!signal.cancelled) {
          setSummary(nextSummary)
          setLedger(nextLedger)
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

  // Poll briefly after a return from PayFast, then stop.
  useEffect(() => {
    if (!justToppedUp) return

    const signal = { cancelled: false }
    let attempts = 0
    const before = summary?.total

    const interval = window.setInterval(() => {
      attempts += 1
      void load(signal).then((fresh) => {
        if (signal.cancelled) return
        // Stop as soon as the total changes, or when we run out of patience.
        if ((fresh && fresh.total !== before) || attempts >= POST_TOPUP_POLLS) {
          window.clearInterval(interval)
          setAwaitingPayment(false)
          setSearchParams({}, { replace: true })
        }
      })
    }, POST_TOPUP_INTERVAL_MS)

    return () => {
      signal.cancelled = true
      window.clearInterval(interval)
    }
    // Intentionally keyed only on the flag: re-running this when the summary
    // changes would restart the poll every time it succeeds.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [justToppedUp])

  return (
    <Columns narrow>
      <Seo title="Wallet" description="Your UniExchange wallet balance, top-ups and transfers." path="/wallet" noindex />
      <PageHeader title="Wallet" subtitle="Pay other students, and get paid" />

      {(error || cancelledTopUp || awaitingPayment) && (
        <div className="mb-4 space-y-3">
          {error && <Alert tone="error">{error}</Alert>}

          {cancelledTopUp && <Alert tone="info">Top-up cancelled. Nothing was charged.</Alert>}

          {awaitingPayment && (
            <Alert tone="info">
              Waiting for PayFast to confirm your payment. This usually takes a few seconds.
            </Alert>
          )}
        </div>
      )}

      {summary === null && !error ? (
        <WalletSkeleton />
      ) : (
        summary && (
          <div className="space-y-4">
            <BalanceHero summary={summary} />

            <MoveMoney summary={summary} onChanged={() => void load()} />

            <Activity ledger={ledger} />
          </div>
        )
      )}
    </Columns>
  )
}

/*
  Teal gradient card with frosted tiles. Fixed cyan/teal shades rather than
  the brand scale, because the brand scale is re-toned (lightened) in dark
  mode - these keep white text above 4.5:1 in both themes.
*/
function BalanceHero({ summary }: { summary: WalletSummary }) {
  const held = Number(summary.held) > 0

  return (
    <section
      aria-label="Balance"
      className="relative isolate overflow-hidden rounded-3xl bg-linear-to-br from-cyan-700 via-cyan-800 to-teal-900 p-5 text-on-primary shadow-float sm:p-6"
    >
      <span
        aria-hidden="true"
        className="absolute -right-16 -top-24 -z-10 size-64 rounded-full bg-cyan-300/30 blur-3xl"
      />
      <span
        aria-hidden="true"
        className="absolute -bottom-28 -left-16 -z-10 size-64 rounded-full bg-teal-400/20 blur-3xl"
      />

      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-sm font-semibold">
          <Wallet aria-hidden="true" weight="fill" className="size-5" />
          Available to spend
        </p>
        <span className="rounded-full border border-on-primary/20 bg-on-primary/10 px-2.5 py-0.5 text-xs font-semibold tracking-wide">
          {summary.currency}
        </span>
      </div>

      <p className="mt-2 text-4xl font-bold tracking-tight tabular-nums sm:text-5xl">
        {formatZar(summary.available)}
      </p>

      <dl className="mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-on-primary/15 bg-slate-950/15 p-3 backdrop-blur-md">
          <dt className="flex items-center gap-1.5 text-sm font-medium">
            <LockSimple aria-hidden="true" className="size-4" />
            In escrow
          </dt>
          <dd className="mt-0.5 text-lg font-semibold tabular-nums">{formatZar(summary.held)}</dd>
        </div>
        <div className="rounded-2xl border border-on-primary/15 bg-slate-950/15 p-3 backdrop-blur-md">
          <dt className="flex items-center gap-1.5 text-sm font-medium">
            <Coins aria-hidden="true" className="size-4" />
            Total
          </dt>
          <dd className="mt-0.5 text-lg font-semibold tabular-nums">{formatZar(summary.total)}</dd>
        </div>
      </dl>

      {held && (
        <p className="mt-3 text-sm">
          Money in escrow has left your wallet and is being held until you confirm you received
          the item.
        </p>
      )}
    </section>
  )
}

type Tab = 'topup' | 'send'

const TABS: { key: Tab; label: string; Icon: typeof PlusCircle }[] = [
  { key: 'topup', label: 'Top up', Icon: PlusCircle },
  { key: 'send', label: 'Send', Icon: PaperPlaneTilt },
]

/*
  Top up and Send as a WAI-ARIA tab switch (arrow keys move between tabs).
  Both panels stay mounted and are hidden, so a half-typed amount or email
  survives flipping between them.
*/
function MoveMoney({ summary, onChanged }: { summary: WalletSummary; onChanged: () => void }) {
  const [tab, setTab] = useState<Tab>('topup')
  const baseId = useId()
  const tabRefs = useRef<Record<Tab, HTMLButtonElement | null>>({ topup: null, send: null })

  function onKeyDown(event: React.KeyboardEvent) {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
    event.preventDefault()
    const index = TABS.findIndex((candidate) => candidate.key === tab)
    const nextIndex =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? TABS.length - 1
          : (index + (event.key === 'ArrowRight' ? 1 : -1) + TABS.length) % TABS.length
    const next = TABS[nextIndex].key
    setTab(next)
    tabRefs.current[next]?.focus()
  }

  return (
    <section aria-label="Move money" className="glass-card rounded-2xl border shadow-glass">
      <div
        role="tablist"
        aria-label="Move money"
        onKeyDown={onKeyDown}
        className="m-2 grid grid-cols-2 gap-1 rounded-xl bg-surface-muted p-1"
      >
        {TABS.map(({ key, label, Icon }) => {
          const selected = tab === key
          return (
            <button
              key={key}
              ref={(node) => {
                tabRefs.current[key] = node
              }}
              type="button"
              role="tab"
              id={`${baseId}-${key}-tab`}
              aria-selected={selected}
              aria-controls={`${baseId}-${key}-panel`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setTab(key)}
              className={
                'flex min-h-11 items-center justify-center gap-2 rounded-lg text-sm font-semibold transition active:scale-[0.98] ' +
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 ' +
                (selected
                  ? 'bg-surface text-fg shadow-sm ring-1 ring-line dark:bg-line'
                  : 'text-fg-muted hover:text-fg')
              }
            >
              <Icon aria-hidden="true" weight={selected ? 'fill' : 'regular'} className="size-5" />
              {label}
            </button>
          )
        })}
      </div>

      <div
        role="tabpanel"
        id={`${baseId}-topup-panel`}
        aria-labelledby={`${baseId}-topup-tab`}
        hidden={tab !== 'topup'}
        className="px-4 pb-4 pt-2 sm:px-5 sm:pb-5"
      >
        <TopUpForm mode={summary.topUpMode} onSimulated={onChanged} />
      </div>
      <div
        role="tabpanel"
        id={`${baseId}-send-panel`}
        aria-labelledby={`${baseId}-send-tab`}
        hidden={tab !== 'send'}
        className="px-4 pb-4 pt-2 sm:px-5 sm:pb-5"
      >
        <SendMoneyForm onSent={onChanged} />
      </div>
    </section>
  )
}

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString('en-ZA', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function Activity({ ledger }: { ledger: WalletTransaction[] | null }) {
  return (
    <section aria-labelledby="wallet-activity" className="glass-card rounded-2xl border shadow-glass">
      <div className="flex items-baseline justify-between px-4 pb-1 pt-4 sm:px-5">
        <h2 id="wallet-activity" className="text-base font-semibold text-fg">
          Activity
        </h2>
        {ledger && ledger.length > 0 && (
          <span className="text-xs tabular-nums text-fg-muted">
            {ledger.length} {ledger.length === 1 ? 'entry' : 'entries'}
          </span>
        )}
      </div>

      {ledger?.length === 0 ? (
        <div className="px-6 py-10 text-center">
          <span className="mx-auto grid size-12 place-items-center rounded-full bg-brand-50 text-brand-700">
            <Wallet aria-hidden="true" className="size-6" />
          </span>
          <p className="mt-3 text-sm font-semibold text-fg">Nothing yet</p>
          <p className="mt-1 text-sm text-fg-muted">
            Top up your wallet to start buying from other students.
          </p>
        </div>
      ) : (
        <ul className="px-2 pb-2">
          {ledger?.map((entry) => {
            const incoming = entry.type === 'CREDIT' || entry.type === 'REFUND'
            const Icon = incoming ? ArrowDownLeft : ArrowUpRight
            return (
              <li
                key={entry.walletTransactionId}
                className="flex items-center gap-3 rounded-xl px-2.5 py-3"
              >
                <span
                  aria-hidden="true"
                  className={`grid size-10 shrink-0 place-items-center rounded-full ${
                    incoming
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-surface-muted text-fg-muted ring-1 ring-inset ring-line'
                  }`}
                >
                  <Icon weight="bold" className="size-5" />
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-fg">
                    {entry.description ?? entry.type}
                  </span>
                  <span className="block text-xs text-fg-muted">{formatWhen(entry.createdAt)}</span>
                </span>

                <span className="shrink-0 text-right">
                  <span
                    className={`block text-sm font-semibold tabular-nums ${
                      incoming ? 'text-emerald-700' : 'text-fg'
                    }`}
                  >
                    <span className="sr-only">{incoming ? 'Received ' : 'Paid '}</span>
                    <span aria-hidden="true">{incoming ? '+' : '−'}</span>
                    {formatZar(entry.amount)}
                  </span>
                  <span className="block text-xs tabular-nums text-fg-muted">
                    Bal. {formatZar(entry.balanceAfter)}
                  </span>
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

function WalletSkeleton() {
  return (
    <div aria-hidden="true" className="space-y-4">
      <div className="h-52 animate-pulse rounded-3xl bg-surface-muted" />
      <div className="h-64 animate-pulse rounded-2xl bg-surface-muted" />
      <div className="glass-card space-y-1 rounded-2xl border p-2">
        {Array.from({ length: 3 }, (_, index) => (
          <div key={index} className="flex items-center gap-3 px-2.5 py-3">
            <span className="size-10 animate-pulse rounded-full bg-surface-muted" />
            <span className="flex-1 space-y-2">
              <span className="block h-3.5 w-1/2 animate-pulse rounded-full bg-surface-muted" />
              <span className="block h-3 w-1/3 animate-pulse rounded-full bg-surface-muted" />
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
