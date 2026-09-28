/*
  Site-wide constants for SEO: the public origin, the product name and the
  default description. SITE_URL comes from VITE_SITE_URL at build time (set it
  to the real domain in production) and falls back to wherever the app is
  actually being served, so local dev and previews still get valid canonicals.

  vite.config.ts reads the same variable to write sitemap.xml, robots.txt and
  llms.txt - keep the two in step.
*/

export const SITE_NAME = 'UniExchange'

export const SITE_TITLE = 'UniExchange — CPUT Student Marketplace'

export const SITE_DESCRIPTION =
  'A verified marketplace for CPUT students and staff: buy, sell and swap textbooks, tech, stationery ' +
  'and res essentials, chat with sellers and pay safely from an in-app wallet.'

export const SITE_URL = (import.meta.env.VITE_SITE_URL || window.location.origin).replace(/\/+$/, '')

/** 1200x630 social card in public/, built from public/og-image.svg. */
export const DEFAULT_OG_IMAGE = '/og-image.png'

export const CPUT_URL = 'https://www.cput.ac.za'

/** Absolute URL for a site path ("/login" -> "https://example.com/login"). */
export function absoluteUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`
}
