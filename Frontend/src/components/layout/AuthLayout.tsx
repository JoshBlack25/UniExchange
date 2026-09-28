/*
  Shell for the three auth screens.

  Phone: the glass form card over the gradient backdrop, full width.
  lg+: split screen - the brand story on the left, the form on the right,
  the same shape as Facebook's sign-in page.
*/

import { ChatsCircle, ShieldCheck, Storefront } from '@phosphor-icons/react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

import { Logo } from './Logo'
import { SiteFooter } from './SiteFooter'

/* The wordmark doubles as the way back to the public landing page. */
function HomeLogo() {
  return (
    <Link
      to="/"
      aria-label="UniExchange home"
      className="inline-block rounded-full focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-500"
    >
      <Logo />
    </Link>
  )
}

type AuthLayoutProps = {
  title: string
  subtitle?: ReactNode
  children: ReactNode
  footer?: ReactNode
}

const POINTS = [
  { Icon: ShieldCheck, text: 'Every account is a verified CPUT student or staff member.' },
  { Icon: Storefront, text: 'Buy, sell and swap textbooks, tech and more on campus.' },
  { Icon: ChatsCircle, text: 'Chat, pay from your wallet and meet up safely.' },
]

export function AuthLayout({ title, subtitle, children, footer }: AuthLayoutProps) {
  return (
    <div className="min-h-dvh">
      <div aria-hidden="true" className="app-backdrop" />

      <div className="mx-auto grid min-h-dvh max-w-6xl grid-cols-[minmax(0,1fr)] items-center gap-10 px-4 py-8 sm:py-12 lg:grid-cols-[1.1fr_1fr] lg:gap-16 lg:px-8">
        {/* Brand story - lg and up. */}
        <section className="hidden lg:block">
          <HomeLogo />
          <h2 className="mt-8 text-5xl font-extrabold leading-[1.05] tracking-tight text-balance text-fg">
            Your campus marketplace,{' '}
            <span className="bg-gradient-to-r from-brand-500 to-cyan-500 bg-clip-text text-transparent">
              verified.
            </span>
          </h2>
          <p className="mt-4 max-w-md text-lg text-fg-muted">
            UniExchange connects CPUT students to trade safely with people they can trust.
          </p>
          <ul className="mt-8 space-y-3">
            {POINTS.map(({ Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-fg">
                <span className="glass grid size-10 place-items-center rounded-full border text-brand-600">
                  <Icon aria-hidden="true" className="size-5" weight="duotone" />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </section>

        <main className="mx-auto w-full max-w-md">
          <div className="mb-6 flex justify-center lg:hidden">
            <HomeLogo />
          </div>

          <div className="glass-strong rounded-3xl border p-6 shadow-float sm:p-8">
            <h1 className="text-2xl font-bold tracking-tight text-fg">{title}</h1>
            {subtitle && <p className="mt-1.5 text-sm text-fg-muted">{subtitle}</p>}

            <div className="mt-6">{children}</div>
          </div>

          {footer && <div className="mt-5 text-center text-sm text-fg-muted">{footer}</div>}

          <p className="mt-8 text-center text-xs text-fg-subtle lg:hidden">
            A verified marketplace for CPUT students.
          </p>
        </main>
      </div>

      <SiteFooter />
    </div>
  )
}
