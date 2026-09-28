/*
  Starts a PayFast top-up.

  The response is rendered as a hidden, self-submitting form rather than turned
  into a redirect URL. PayFast's signature covers the field values, so they have
  to reach PayFast exactly as the backend produced them - rebuilding the URL
  client-side risks re-encoding a character and having the payment rejected.

  Nothing here credits the wallet. Only PayFast's server-to-server notification
  does that, which is why the caller polls the balance afterwards rather than
  assuming the return trip means success.

  Author: Mogamat Yaseen Kannemeyer 240453182
*/

import { Info, PlusCircle } from '@phosphor-icons/react'
import { useState } from 'react'

import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { TextField } from '@/components/ui/TextField'
import { walletApi } from '@/lib/api/wallet'
import { ApiError } from '@/lib/api/client'
import type { PayFastRedirect, WalletSummary } from '@/lib/api/types'

import { MAX_DAILY, MAX_TOPUP, exceedsLimit, formatZar, isValidAmount } from './money'

const QUICK_AMOUNTS = ['50.00', '100.00', '250.00', '500.00']

type TopUpFormProps = {
  /** What a top-up will actually do here. Drives the notice and the button label. */
  mode: WalletSummary['topUpMode']
  onSimulated?: () => void
}

export function TopUpForm({ mode, onSimulated }: TopUpFormProps) {
  const [amount, setAmount] = useState('100.00')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function startTopUp(event: React.FormEvent) {
    event.preventDefault()

    if (!isValidAmount(amount)) {
      setError('Enter an amount like 100.00.')
      return
    }
    if (exceedsLimit(amount, MAX_TOPUP)) {
      setError(`You can top up at most ${formatZar(MAX_TOPUP)} at a time.`)
      return
    }

    setSubmitting(true)
    setError(null)
    try {
      const response = await walletApi.startTopUp(amount)

      /*
       Local development: complete it here instead of redirecting.

       PayFast confirms a payment by calling the backend from their own servers,
       and that can never reach localhost - so sending the student to the sandbox
       would take the money and the callback would never arrive. The backend tells
       us when it is running with the simulator on, and this uses the same
       crediting path the real callback does.
      */
      if (response.simulatorEnabled) {
        await walletApi.simulateTopUpCompletion(response.merchantPaymentId)
        setSubmitting(false)
        onSimulated?.()
        return
      }

      // Built outside React: a ref-based form rendered after setState is not
      // guaranteed to be committed by the next tick, and a null ref no-ops silently.
      submitToPayFast(response)
    } catch (err: unknown) {
      setError(err instanceof ApiError ? err.message : 'Could not start the top-up.')
      setSubmitting(false)
    }
  }

  return (
    // No card of its own: WalletPage shows this inside its "Top up" tab.
    <div>
      <p className="text-sm text-fg-muted">
        {mode === 'SIMULATED'
          ? 'Your balance is credited straight away.'
          : 'You will be taken to PayFast to pay. Your balance updates once PayFast confirms it.'}
      </p>

      {/*
        The notice says what will actually happen in THIS environment. An earlier
        version always claimed sandbox and told the student to "use the sandbox
        test details", which was unhelpful two ways: with the simulator on they
        never reach PayFast at all, and the copy named no details and linked
        nowhere, so there was nothing to act on.
      */}
      {mode === 'SIMULATED' && (
        <div className="mt-3 flex gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-800">
          <Info aria-hidden="true" weight="fill" className="mt-px size-4 shrink-0" />
          <p>
            <strong className="font-semibold">Local demo mode.</strong> PayFast is not contacted at
            all — the top-up is completed in the app, because PayFast&apos;s confirmation cannot
            reach a machine running on localhost. No money moves, and nothing is charged.
          </p>
        </div>
      )}

      {mode === 'SANDBOX' && (
        <div className="mt-3 flex gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-800">
          <Info aria-hidden="true" weight="fill" className="mt-px size-4 shrink-0" />
          <p>
            <strong className="font-semibold">Sandbox mode.</strong> This opens PayFast&apos;s test
            environment, so nothing is charged. You will need PayFast&apos;s sandbox test buyer
            details to finish on their screen — see{' '}
            <a
              href="https://developers.payfast.co.za/docs#sandbox"
              target="_blank"
              rel="noreferrer"
              className="font-medium underline"
            >
              developers.payfast.co.za
            </a>
            .
          </p>
        </div>
      )}

      <form onSubmit={startTopUp} className="mt-4 space-y-3">
        {error && <Alert tone="error">{error}</Alert>}

        <div role="group" aria-label="Quick amounts" className="grid grid-cols-4 gap-2">
          {QUICK_AMOUNTS.map((preset) => (
            <button
              key={preset}
              type="button"
              aria-pressed={amount === preset}
              onClick={() => setAmount(preset)}
              className={
                'min-h-11 rounded-xl border text-sm font-semibold tabular-nums transition active:scale-[0.97] ' +
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 ' +
                (amount === preset
                  ? 'border-transparent bg-brand-50 text-brand-800 ring-2 ring-inset ring-brand-500'
                  : 'border-line bg-surface text-fg hover:border-brand-300 hover:bg-surface-muted')
              }
            >
              {/* Display only - the preset string itself is what gets sent. */}
              R{preset.replace(/\.00$/, '')}
            </button>
          ))}
        </div>

        <TextField
          name="amount"
          // Both wallet forms are mounted at once (WalletPage tabs), so ids must differ.
          id="topup-amount"
          label="Amount (ZAR)"
          hint={`Up to ${formatZar(MAX_TOPUP)} per top-up, ${formatZar(MAX_DAILY)} a day.`}
          inputMode="decimal"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
        />

        <Button type="submit" loading={submitting}>
          <PlusCircle aria-hidden="true" weight="bold" className="size-5" />
          {mode === 'SIMULATED' ? 'Add funds' : 'Continue to PayFast'}
        </Button>
      </form>
    </div>
  )
}

// Field order matters to the signature, so inputs are appended in server order.
function submitToPayFast(redirect: PayFastRedirect) {
  const form = document.createElement('form')
  form.method = 'POST'
  form.action = redirect.processUrl
  form.style.display = 'none'

  for (const [name, value] of Object.entries(redirect.fields)) {
    const input = document.createElement('input')
    input.type = 'hidden'
    input.name = name
    input.value = value
    form.appendChild(input)
  }

  document.body.appendChild(form)
  form.submit()
}
