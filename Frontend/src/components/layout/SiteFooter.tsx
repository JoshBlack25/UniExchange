/*
  Footer for the public pages - the landing page, the auth screens and the 404.
  Signed-in pages use AppLayout's navigation instead.

  The About/FAQ entries are plain anchors to "/#..." rather than router links,
  so they scroll to the section from the landing page and navigate there from
  anywhere else.
*/

import { ArrowSquareOut } from '@phosphor-icons/react'
import { Link } from 'react-router-dom'

import { Logo } from '@/components/layout/Logo'
import { CPUT_URL } from '@/lib/site'

const LINK =
  'inline-flex min-h-6 items-center rounded-sm text-fg-muted transition hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500'

export function SiteFooter() {
  const year = new Date().getFullYear()

  return (
    <footer className="border-t border-line/70">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-[1.4fr_1fr_1fr] lg:px-8">
        <div>
          <Link
            to="/"
            aria-label="UniExchange home"
            className="inline-block rounded-full focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-500"
          >
            <Logo />
          </Link>
          <p className="mt-3 max-w-xs text-sm text-fg-muted">
            The verified marketplace for CPUT students and staff. Built by students of the Cape Peninsula
            University of Technology.
          </p>
        </div>

        <nav aria-label="Explore">
          <h2 className="text-sm font-semibold text-fg">Explore</h2>
          <ul className="mt-3 space-y-1.5 text-sm">
            <li>
              <a href="/#features" className={LINK}>
                About
              </a>
            </li>
            <li>
              <a href="/#safety" className={LINK}>
                Safety
              </a>
            </li>
            <li>
              <a href="/#faq" className={LINK}>
                FAQ
              </a>
            </li>
          </ul>
        </nav>

        <nav aria-label="Account">
          <h2 className="text-sm font-semibold text-fg">Get started</h2>
          <ul className="mt-3 space-y-1.5 text-sm">
            <li>
              <Link to="/signup" className={LINK}>
                Sign up
              </Link>
            </li>
            <li>
              <Link to="/login" className={LINK}>
                Log in
              </Link>
            </li>
            <li>
              <a href={CPUT_URL} target="_blank" rel="noopener noreferrer" className={`gap-1 ${LINK}`}>
                CPUT website
                <ArrowSquareOut aria-hidden="true" className="size-3.5" />
                <span className="sr-only">(opens in a new tab)</span>
              </a>
            </li>
          </ul>
        </nav>
      </div>

      <div className="border-t border-line/70">
        <p className="mx-auto max-w-6xl px-4 py-5 text-xs text-fg-subtle lg:px-8">
          © {year} UniExchange. For the Cape Peninsula University of Technology community.
        </p>
      </div>
    </footer>
  )
}
