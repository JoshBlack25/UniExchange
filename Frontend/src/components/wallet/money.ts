/*
  Money formatting.

  Amounts cross the wire as strings, not numbers, and stay that way until they
  are displayed. BigDecimal on the backend is exact; JavaScript's number is a
  float, so parsing "0.1" and "0.2" and adding them gives 0.30000000000000004.
  Arithmetic on money belongs on the server - this module only renders.
*/

export function formatZar(amount: string | number): string {
  const value = typeof amount === 'number' ? amount : Number(amount)
  if (Number.isNaN(value)) return 'R0.00'

  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
    minimumFractionDigits: 2,
  }).format(value)
}

/** True when a string amount is a positive value with at most 2 decimals - matches the backend rule. */
export function isValidAmount(raw: string): boolean {
  if (!/^\d+(\.\d{1,2})?$/.test(raw.trim())) return false
  return Number(raw) > 0
}

/*
  Per-transaction caps, mirroring the backend's app.wallet.max-topup and
  app.wallet.max-transfer (R5 000 each; there is also a R10 000 rolling 24-hour
  limit per kind, which only the server can check). Checked here too so a
  student sees the rule before the request, not as a 400 afterwards.
*/
export const MAX_TOPUP = 5000
export const MAX_TRANSFER = 5000
/** Rolling 24 hours, per kind (top-ups, transfers). Enforced server-side only. */
export const MAX_DAILY = 10000

/** True when a (valid) string amount is above `max` rand. */
export function exceedsLimit(raw: string, max: number): boolean {
  return Number(raw) > max
}
