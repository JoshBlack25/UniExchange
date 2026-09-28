/*
  Per-page <head> tags. React 19 hoists <title>, <meta> and <link> rendered
  anywhere in the tree into document.head, so this needs no helmet library -
  drop it at the top of a page:

    <Seo title="Wallet" description="Your balance and top-ups." path="/wallet" noindex />

  `title` becomes "Wallet · UniExchange"; pass `fullTitle` when the page's
  title is already complete (the landing page). Pages behind the login pass
  `noindex` - crawlers only ever see the login form there anyway.

  `jsonLd` is structured data (schema.org). It is serialised with `<` escaped,
  so a value can never close the <script> tag early.
*/

import { DEFAULT_OG_IMAGE, SITE_NAME, absoluteUrl } from '@/lib/site'

type SeoProps = {
  title: string
  description: string
  /** Path of this page for the canonical URL, e.g. "/login". Omit on pages with ids in them. */
  path?: string
  noindex?: boolean
  /** Use `title` as-is instead of appending " · UniExchange". */
  fullTitle?: boolean
  /** Social card image, a site path or absolute URL. */
  image?: string
  jsonLd?: object | object[]
}

export function Seo({ title, description, path, noindex = false, fullTitle = false, image, jsonLd }: SeoProps) {
  const pageTitle = fullTitle ? title : `${title} · ${SITE_NAME}`
  const canonical = path !== undefined ? absoluteUrl(path) : undefined
  const imageUrl = absoluteUrl(image ?? DEFAULT_OG_IMAGE)

  return (
    <>
      <title>{pageTitle}</title>
      <meta name="description" content={description} />
      {noindex && <meta name="robots" content="noindex,nofollow" />}
      {canonical && !noindex && <link rel="canonical" href={canonical} />}

      <meta property="og:type" content="website" />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:title" content={pageTitle} />
      <meta property="og:description" content={description} />
      {canonical && <meta property="og:url" content={canonical} />}
      <meta property="og:image" content={imageUrl} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={pageTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={imageUrl} />

      {jsonLd && (
        <script type="application/ld+json">{JSON.stringify(jsonLd).replace(/</g, '\\u003c')}</script>
      )}
    </>
  )
}
