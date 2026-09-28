/*
  The public home page at "/" - the only page a search engine or a link
  preview can actually read, since everything else sits behind the login.
  Signed-in students never see it: App.tsx sends them straight to /feed.

  Every claim here is something the app really does (see the root README):
  verified CPUT sign-up, chat, the PayFast-funded wallet with escrow, the
  bulletin, reviews and the Trusted Seller badge, reports and moderation.
  No stats, no testimonials - there are none to quote yet.

  The FAQ array feeds both the visible <details> list and the FAQPage
  structured data, so the two can never drift apart.

  Author: Mogamat Yaseen Kannemeyer 240453182
*/

import {
  ArrowRight,
  CaretDown,
  ChatsCircle,
  CheckCircle,
  EnvelopeSimple,
  Flag,
  Handshake,
  Key,
  LockKey,
  MapPinArea,
  Megaphone,
  SealCheck,
  ShieldCheck,
  Storefront,
  Wallet,
} from '@phosphor-icons/react'
import type { Icon } from '@phosphor-icons/react'
import { Link } from 'react-router-dom'

import { Logo } from '@/components/layout/Logo'
import { SiteFooter } from '@/components/layout/SiteFooter'
import { Seo } from '@/components/seo/Seo'
import { CPUT_URL, SITE_DESCRIPTION, SITE_NAME, SITE_TITLE, SITE_URL, absoluteUrl } from '@/lib/site'

/* Link styled as the primary / secondary Button - Button itself only renders a <button>. */
const PRIMARY_LINK =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold ' +
  'text-on-primary shadow-sm shadow-primary/25 transition hover:bg-primary-hover active:scale-[0.98] ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500'
const SECONDARY_LINK =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-line bg-surface-muted/80 px-5 py-2.5 ' +
  'text-sm font-semibold text-fg transition hover:border-line-strong hover:bg-surface-muted active:scale-[0.98] ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500'
const NAV_LINK =
  'rounded-lg px-3 py-2 text-sm font-medium text-fg-muted transition hover:bg-surface-muted hover:text-fg ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500'

const SECTION = 'mx-auto max-w-6xl scroll-mt-24 px-4 py-14 lg:px-8 lg:py-20'
const EYEBROW = 'text-xs font-semibold uppercase tracking-[0.14em] text-brand-700'
const SECTION_TITLE = 'mt-2 text-3xl font-bold tracking-tight text-balance text-fg sm:text-4xl'

/* ── content ──────────────────────────────────────────────────────────────── */

/* Short on purpose - the features section below carries the detail. */
const HERO_POINTS = [
  { Icon: SealCheck, text: 'Verified CPUT accounts' },
  { Icon: LockKey, text: 'Escrow on wallet payments' },
  { Icon: MapPinArea, text: 'Meet up on campus' },
]

const ESCROW_STEPS = [
  { title: 'You tap Buy', text: 'The price leaves your wallet and is held - the seller does not have it yet.' },
  { title: 'You meet on campus', text: 'Check the textbook, test the laptop, make sure it is what was listed.' },
  { title: 'You confirm it arrived', text: 'Only then is the money released to the seller.' },
]

const FEATURES: { Icon: Icon; title: string; text: string }[] = [
  {
    Icon: Storefront,
    title: 'Buy, sell and swap',
    text: 'List textbooks, tech, stationery and res items with photos and a price in a minute. Browse by campus and category, or search by title.',
  },
  {
    Icon: ChatsCircle,
    title: 'Chat with the seller',
    text: 'Message about a listing without swapping phone numbers. Send photos, videos and voice notes in the thread.',
  },
  {
    Icon: Wallet,
    title: 'Wallet with escrow',
    text: 'Top up through PayFast and pay for listings from your wallet. The money is held until you confirm the item arrived. You can also send money to another student.',
  },
  {
    Icon: Megaphone,
    title: 'Campus bulletin',
    text: 'Events, study groups, lost and found and general notices from around your campus, all in one feed.',
  },
  {
    Icon: SealCheck,
    title: 'Reviews and Trusted Sellers',
    text: 'Only someone who completed a deal with a seller can review them. Sellers with a run of well-rated sales to different buyers earn the Trusted Seller badge.',
  },
  {
    Icon: Flag,
    title: 'Reports and moderation',
    text: 'Report a listing, post or person in a couple of taps. Moderators review every report and can remove content or suspend an account.',
  },
]

const STEPS: { Icon: Icon; title: string; text: string }[] = [
  {
    Icon: EnvelopeSimple,
    title: 'Sign up with your CPUT email',
    text: 'Students use their student number @mycput.ac.za address; staff use their @cput.ac.za address.',
  },
  {
    Icon: Key,
    title: 'Enter the code we email you',
    text: 'The one-time code proves the mailbox is yours. Until then, the account cannot sign in.',
  },
  {
    Icon: Handshake,
    title: 'Buy, sell and chat',
    text: 'Post a listing, message sellers, pay from your wallet and meet on campus to swap.',
  },
]

const SAFETY: { Icon: Icon; title: string; text: string }[] = [
  {
    Icon: ShieldCheck,
    title: 'Closed to the public',
    text: 'Unlike open classifieds, every account belongs to a verified CPUT mailbox, which keeps listings on campus and cuts down on scams.',
  },
  {
    Icon: LockKey,
    title: 'A code on new devices',
    text: 'Signing in on a browser we have not seen before needs a fresh emailed code, so a leaked password alone is not enough.',
  },
  {
    Icon: Wallet,
    title: 'Money held in escrow',
    text: 'Wallet purchases are only paid out once the buyer confirms receipt. Until then either side can cancel and the buyer is refunded in full.',
  },
  {
    Icon: MapPinArea,
    title: 'Meet somewhere busy',
    text: 'Trade in well-lit, busy spots on campus, and always test electronics before you confirm a purchase.',
  },
]

type Faq = { question: string; answer: string }

const FAQS: Faq[] = [
  {
    question: 'Who can use UniExchange?',
    answer:
      'CPUT students and staff. Students sign up with their student number @mycput.ac.za email address and staff with their @cput.ac.za address. We email a one-time code to confirm the address is yours before the account can be used.',
  },
  {
    question: 'What can I sell on UniExchange?',
    answer:
      'Textbooks, tech, stationery, res items and other everyday student essentials. Listings that break the rules can be reported, and moderators can remove them.',
  },
  {
    question: 'How does paying from the wallet work?',
    answer:
      'You top up your UniExchange wallet through PayFast. When you buy a listing with your wallet, the money is held in escrow and only released to the seller once you confirm you received the item. If either of you cancels before then, you are refunded in full.',
  },
  {
    question: 'Why do I sometimes need a code to log in?',
    answer:
      'When you sign in on a browser we have not seen before, we email you a code as a second check. Tick "Remember me" when you enter it and that browser can skip the code next time.',
  },
  {
    question: 'What if something goes wrong with a trade?',
    answer:
      'Use Report on the listing, post or profile and a moderator will review it. For wallet purchases, only confirm receipt once you have the item - until you do, the money stays in escrow.',
  },
  {
    question: 'Who built UniExchange?',
    answer: 'A team of students at the Cape Peninsula University of Technology (CPUT), as a group project.',
  },
]

/* ── structured data ──────────────────────────────────────────────────────── */

/*
  Organization, not LocalBusiness: UniExchange has no shop front, opening
  hours or street address, so LocalBusiness markup would be inaccurate.
*/
const JSON_LD = [
  {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${SITE_URL}/#organization`,
    name: SITE_NAME,
    url: `${SITE_URL}/`,
    logo: absoluteUrl('/icon-512.png'),
    description: SITE_DESCRIPTION,
    areaServed: { '@type': 'City', name: 'Cape Town' },
    // Serves the CPUT community but is not run by the university, so no
    // parentOrganization claim.
    audience: {
      '@type': 'EducationalAudience',
      educationalRole: 'student',
      audienceType: 'Cape Peninsula University of Technology students and staff',
    },
  },
  {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${SITE_URL}/#website`,
    name: SITE_NAME,
    url: `${SITE_URL}/`,
    description: SITE_DESCRIPTION,
    inLanguage: 'en-ZA',
    publisher: { '@id': `${SITE_URL}/#organization` },
  },
  {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQS.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: { '@type': 'Answer', text: faq.answer },
    })),
  },
]

/* ── page ─────────────────────────────────────────────────────────────────── */

export function LandingPage() {
  return (
    <div className="min-h-dvh">
      <Seo title={SITE_TITLE} fullTitle description={SITE_DESCRIPTION} path="/" jsonLd={JSON_LD} />
      <div aria-hidden="true" className="app-backdrop" />

      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-xl focus:bg-surface focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-fg focus:shadow-float"
      >
        Skip to content
      </a>

      <header className="glass sticky top-0 z-30 border-b">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 lg:px-8">
          <Link
            to="/"
            aria-label="UniExchange home"
            className="rounded-full focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-500"
          >
            <Logo />
          </Link>

          <nav aria-label="Sections" className="ml-4 hidden md:block">
            <ul className="flex items-center gap-1">
              <li>
                <a href="#features" className={NAV_LINK}>
                  Features
                </a>
              </li>
              <li>
                <a href="#how-it-works" className={NAV_LINK}>
                  How it works
                </a>
              </li>
              <li>
                <a href="#safety" className={NAV_LINK}>
                  Safety
                </a>
              </li>
              <li>
                <a href="#faq" className={NAV_LINK}>
                  FAQ
                </a>
              </li>
            </ul>
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <Link to="/login" className={`${NAV_LINK} font-semibold text-fg`}>
              Log in
            </Link>
            <Link to="/signup" className={`${PRIMARY_LINK} min-h-10 px-4`}>
              Sign up
            </Link>
          </div>
        </div>
      </header>

      <main id="main">
        {/* ── hero ── */}
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 pb-10 pt-10 sm:pt-14 lg:grid-cols-[1.15fr_1fr] lg:gap-16 lg:px-8 lg:pb-16 lg:pt-20">
          <div>
            <p className="glass inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold text-brand-700">
              <ShieldCheck aria-hidden="true" weight="fill" className="size-4" />
              Only for verified CPUT students and staff
            </p>
            <h1 className="mt-5 text-4xl font-extrabold leading-[1.05] tracking-tight text-balance text-fg sm:text-5xl lg:text-6xl">
              The verified marketplace for{' '}
              <span className="bg-linear-to-r from-brand-500 to-cyan-500 bg-clip-text text-transparent">
                CPUT students
              </span>
            </h1>
            <p className="mt-5 max-w-xl text-lg text-fg-muted">
              UniExchange connects CPUT students to trade safely with people they can trust. Buy, sell and swap
              on campus, chat with the seller, and pay from a wallet that holds the money until the item is in
              your hands.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link to="/signup" className={PRIMARY_LINK}>
                Create your account
                <ArrowRight aria-hidden="true" weight="bold" className="size-4" />
              </Link>
              <Link to="/login" className={SECONDARY_LINK}>
                I already have an account
              </Link>
            </div>

            <ul className="mt-8 flex flex-wrap gap-x-5 gap-y-2.5 text-sm font-medium text-fg-muted">
              {HERO_POINTS.map(({ Icon, text }) => (
                <li key={text} className="flex items-center gap-2">
                  <Icon aria-hidden="true" className="size-5 text-brand-600" weight="duotone" />
                  {text}
                </li>
              ))}
            </ul>
          </div>

          {/* How a wallet purchase works - the one flow worth showing up front. */}
          <aside
            aria-labelledby="escrow-title"
            className="glass-strong relative mt-6 rounded-3xl border p-6 pt-10 shadow-float sm:p-8 sm:pt-12 lg:mt-0"
          >
            {/* Sign-up is the other half of the trust story; pinned to the card's corner for depth. */}
            <p className="absolute -top-5 left-5 flex items-center gap-2.5 rounded-2xl border border-line bg-surface px-3.5 py-2 text-xs shadow-glass sm:left-8">
              <span className="grid size-7 place-items-center rounded-full bg-emerald-50 text-emerald-700">
                <SealCheck aria-hidden="true" weight="fill" className="size-4" />
              </span>
              <span>
                <span className="block font-semibold text-fg">Verified sign-up</span>
                <span className="block text-fg-muted">@mycput.ac.za or @cput.ac.za</span>
              </span>
            </p>

            <div className="flex items-center gap-3">
              <span className="grid size-11 place-items-center rounded-2xl bg-brand-50 text-brand-700 ring-1 ring-brand-100">
                <Wallet aria-hidden="true" weight="duotone" className="size-6" />
              </span>
              <div>
                <h2 id="escrow-title" className="text-base font-semibold text-fg">
                  How a wallet purchase works
                </h2>
                <p className="text-sm text-fg-muted">Your money is held until you have the item.</p>
              </div>
            </div>

            <ol className="mt-6 space-y-0">
              {ESCROW_STEPS.map((step, index) => (
                <li key={step.title} className="relative flex gap-4 pb-6 last:pb-0">
                  {index < ESCROW_STEPS.length - 1 && (
                    <span aria-hidden="true" className="absolute left-4 top-9 bottom-1 w-px bg-line-strong" />
                  )}
                  <span className="relative grid size-8 shrink-0 place-items-center rounded-full bg-primary text-sm font-bold text-on-primary tabular-nums">
                    {index + 1}
                  </span>
                  <div className="pt-1">
                    <p className="text-sm font-semibold text-fg">{step.title}</p>
                    <p className="mt-0.5 text-sm text-fg-muted">{step.text}</p>
                  </div>
                </li>
              ))}
            </ol>

            <p className="mt-6 flex items-start gap-2 rounded-xl bg-emerald-50 p-3 text-xs text-emerald-800">
              <CheckCircle aria-hidden="true" weight="fill" className="size-4 shrink-0" />
              Changed your mind before confirming? Either of you can cancel and the buyer is refunded in full.
            </p>
          </aside>
        </section>

        {/* ── features ── */}
        <section id="features" aria-labelledby="features-title" className={SECTION}>
          <div className="max-w-2xl">
            <p className={EYEBROW}>What you can do</p>
            <h2 id="features-title" className={SECTION_TITLE}>
              Everything a campus trade needs, in one place
            </h2>
            <p className="mt-3 text-fg-muted">
              UniExchange is a marketplace, a messenger and a wallet built for the CPUT community - not a
              public classifieds site with strangers on the other end.
            </p>
          </div>

          <ul className="mt-10 grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
            {FEATURES.map(({ Icon, title, text }) => (
              <li key={title} className="glass-card flex gap-4 rounded-2xl border p-5 shadow-glass sm:p-6">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700">
                  <Icon aria-hidden="true" weight="duotone" className="size-5" />
                </span>
                <div className="min-w-0">
                  <h3 className="text-base font-semibold text-fg">{title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-fg-muted">{text}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* ── how it works ── */}
        <div className="border-y border-line/70 bg-surface/45">
          <section id="how-it-works" aria-labelledby="how-title" className={SECTION}>
            <div className="max-w-2xl">
              <p className={EYEBROW}>How it works</p>
              <h2 id="how-title" className={SECTION_TITLE}>
                From sign-up to your first sale in three steps
              </h2>
            </div>

            <ol className="mt-10 grid gap-4 md:grid-cols-3">
              {STEPS.map(({ Icon, title, text }, index) => (
                <li key={title} className="glass-card flex gap-4 rounded-2xl border p-5 shadow-glass sm:p-6">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary text-on-primary shadow-sm shadow-primary/25">
                    <Icon aria-hidden="true" weight="bold" className="size-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-700 tabular-nums">
                      Step {index + 1}
                    </p>
                    <h3 className="mt-0.5 text-base font-semibold text-fg">{title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-fg-muted">{text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        </div>

        {/* ── safety ── */}
        <section id="safety" aria-labelledby="safety-title" className={SECTION}>
          <div className="glass-strong rounded-3xl border p-6 shadow-float sm:p-10">
            <div className="grid gap-10 lg:grid-cols-[1fr_1.4fr]">
              <div>
                <p className={EYEBROW}>Safety</p>
                <h2 id="safety-title" className={SECTION_TITLE}>
                  Trade with people you can trust
                </h2>
                <p className="mt-3 text-fg-muted">
                  Only someone who can prove they hold a CPUT mailbox can create an account. That one rule does
                  most of the work - the rest is here for when a deal still goes wrong.
                </p>
              </div>

              <ul className="grid gap-5 sm:grid-cols-2">
                {SAFETY.map(({ Icon, title, text }) => (
                  <li key={title} className="flex gap-3">
                    <span className="grid size-10 shrink-0 place-items-center rounded-full bg-emerald-50 text-emerald-700">
                      <Icon aria-hidden="true" weight="duotone" className="size-5" />
                    </span>
                    <div>
                      <h3 className="text-sm font-semibold text-fg">{title}</h3>
                      <p className="mt-1 text-sm leading-relaxed text-fg-muted">{text}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section id="faq" aria-labelledby="faq-title" className={SECTION}>
          <div className="mx-auto max-w-3xl">
            <div className="text-center">
              <p className={EYEBROW}>FAQ</p>
              <h2 id="faq-title" className={SECTION_TITLE}>
                Questions students ask
              </h2>
            </div>

            <div className="mt-10 space-y-3">
              {FAQS.map((faq) => (
                <details key={faq.question} className="glass-card group rounded-2xl border shadow-glass transition-colors open:border-brand-200">
                  <summary className="flex min-h-14 list-none items-center justify-between gap-4 rounded-2xl px-5 py-4 text-left text-base font-semibold text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 [&::-webkit-details-marker]:hidden">
                    <h3>{faq.question}</h3>
                    <CaretDown
                      aria-hidden="true"
                      weight="bold"
                      className="size-4 shrink-0 text-fg-muted transition group-open:rotate-180"
                    />
                  </summary>
                  <p className="mx-5 border-t border-line pb-5 pt-4 text-sm leading-relaxed text-fg-muted">{faq.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ── call to action ── */}
        <section aria-labelledby="cta-title" className="mx-auto max-w-6xl px-4 pb-20 pt-4 lg:px-8">
          <div className="relative overflow-hidden rounded-3xl bg-linear-to-br from-brand-500 to-brand-700 px-6 py-12 text-center shadow-float sm:px-12 dark:from-brand-300 dark:to-brand-100">
            <h2 id="cta-title" className="text-3xl font-bold tracking-tight text-balance text-white sm:text-4xl">
              Ready to trade on campus?
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-white/85">
              Sign up with your CPUT email - it takes a minute, and you only need the code we send you.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                to="/signup"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-brand-700 shadow-sm transition hover:bg-white/90 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white dark:text-[#135070]"
              >
                Sign up
                <ArrowRight aria-hidden="true" weight="bold" className="size-4" />
              </Link>
              <Link
                to="/login"
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-white/40 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                Log in
              </Link>
            </div>
            <p className="mt-6 text-xs text-white/75">
              New to CPUT?{' '}
              <a
                href={CPUT_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-sm font-semibold text-white underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-white"
              >
                Visit cput.ac.za<span className="sr-only"> (opens in a new tab)</span>
              </a>
            </p>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}
