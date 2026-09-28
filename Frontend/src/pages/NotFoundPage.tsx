/*
  404. Replaces a silent redirect to "/" - a mistyped URL used to bounce with no
  explanation, which is confusing when a route genuinely is not built yet.

  Rendered outside AppLayout, so it brings its own gradient backdrop and a
  frosted card; one primary action (the feed when signed in, the home page
  otherwise), a quieter "Go back", and links to the main sections.

  Author: Mogamat Yaseen Kannemeyer 240453182
*/

import { ArrowLeft, Compass, House } from '@phosphor-icons/react'
import { Link, useLocation, useNavigate } from 'react-router-dom'

import { useAuth } from '@/auth/useAuth'
import { Logo } from '@/components/layout/Logo'
import { SiteFooter } from '@/components/layout/SiteFooter'
import { Seo } from '@/components/seo/Seo'
import { Button } from '@/components/ui/Button'

const SECTION_LINK =
  'inline-flex min-h-6 items-center rounded-sm font-semibold text-brand-700 underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500'

export function NotFoundPage() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()

  return (
    <div className="flex min-h-dvh flex-col">
      <Seo title="Page not found" description="There is no UniExchange page at this address." noindex />
      <div aria-hidden="true" className="app-backdrop" />

      <main className="mx-auto grid w-full max-w-md flex-1 place-items-center px-4 py-10 text-center">
        <div className="w-full">
          <div className="mb-8 flex justify-center">
            <Link
              to="/"
              aria-label="UniExchange home"
              className="rounded-full focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-500"
            >
              <Logo />
            </Link>
          </div>

          <div className="glass-strong rounded-3xl border p-6 shadow-float sm:p-8">
            <span
              aria-hidden="true"
              className="mx-auto grid size-16 place-items-center rounded-2xl bg-brand-50 text-brand-700 ring-1 ring-brand-100"
            >
              <Compass weight="duotone" className="size-8" />
            </span>

            <p className="mt-5 bg-linear-to-r from-brand-500 to-cyan-500 bg-clip-text text-6xl font-extrabold tracking-tight text-transparent tabular-nums">
              404
            </p>
            <h1 className="mt-2 text-xl font-bold tracking-tight text-fg">We couldn&apos;t find that page</h1>
            <p className="mt-2 text-sm text-fg-muted">
              Nothing lives at{' '}
              <code className="rounded-md bg-surface-muted px-1.5 py-0.5 font-mono text-xs text-fg wrap-anywhere">
                {pathname}
              </code>
              . It may have moved, or the link has a typo.
            </p>

            <div className="mt-6 flex flex-col gap-2 sm:flex-row-reverse">
              <Link
                to={isAuthenticated ? '/feed' : '/'}
                className={
                  'inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold ' +
                  'text-on-primary shadow-sm shadow-primary/25 transition hover:bg-primary-hover active:scale-[0.98] ' +
                  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500'
                }
              >
                <House aria-hidden="true" weight="fill" className="size-4" />
                {isAuthenticated ? 'Back to the feed' : 'Go home'}
              </Link>
              <Button variant="secondary" className="flex-1" onClick={() => navigate(-1)}>
                <ArrowLeft aria-hidden="true" className="size-4" />
                Go back
              </Button>
            </div>

            <nav aria-label="Popular pages" className="mt-6 border-t border-line pt-5">
              <ul className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm">
                <li>
                  <Link to="/feed" className={SECTION_LINK}>
                    Marketplace
                  </Link>
                </li>
                <li>
                  <Link to="/bulletin" className={SECTION_LINK}>
                    Campus bulletin
                  </Link>
                </li>
              </ul>
            </nav>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  )
}
