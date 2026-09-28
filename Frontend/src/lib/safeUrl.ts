/*
  Guard for URLs that came from another user (listing photos, bulletin images,
  chat attachments) before they go into an href or src.

  React escapes text, but it does not stop a `javascript:` or `data:text/html`
  URL in an attribute. Only http(s) - absolute, protocol-relative or relative to
  this site - gets through; anything else comes back undefined, so the caller
  renders its "no image" fallback instead.

    <img src={safeUrl(listing.imageUrl)} ... />
*/

const ALLOWED_PROTOCOLS = new Set(['http:', 'https:'])

export function safeUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined
  const trimmed = url.trim()
  if (!trimmed) return undefined

  try {
    const parsed = new URL(trimmed, window.location.origin)
    return ALLOWED_PROTOCOLS.has(parsed.protocol) ? trimmed : undefined
  } catch {
    return undefined
  }
}
