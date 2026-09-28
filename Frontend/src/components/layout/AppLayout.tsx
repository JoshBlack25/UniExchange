/*
  The shell every signed-in page renders inside.

  Mounted once as a layout route in App.tsx, so no page writes its own header,
  nav or sign-out button. If you are building a page, you render only its
  content - start with <PageHeader> and go from there. Want a right-hand rail
  (filters, related items, news) on wide screens? Wrap the page in <Columns>.

    phone      TopBar · page · BottomNav
    md         TopBar with centre tabs · page
    lg         TopBar · LeftSidebar | page
    xl         TopBar · LeftSidebar | page | page's aside (via Columns)

  Author: Mogamat Yaseen Kannemeyer 240453182
*/

import { Suspense } from 'react'
import { Outlet } from 'react-router-dom'

import { ElevateSheet } from '@/components/moderation/ElevateSheet'
import { ModeBanner } from '@/components/moderation/ModeBanner'

import { BottomNav } from './BottomNav'
import { LeftSidebar } from './LeftSidebar'
import { RouteFallback } from './RouteFallback'
import { TopBar } from './TopBar'

export function AppLayout() {
  return (
    <div className="min-h-dvh">
      <div aria-hidden="true" className="app-backdrop" />

      <a
        href="#main"
        className="sr-only z-50 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-on-primary focus:not-sr-only focus:fixed focus:left-3 focus:top-3"
      >
        Skip to content
      </a>

      <TopBar />
      <ModeBanner />
      {/* Ctrl+Alt+M / Ctrl+Alt+A - the hidden way into moderator and admin mode. */}
      <ElevateSheet />

      <div className="mx-auto flex max-w-360 gap-6 px-3 sm:px-4 lg:px-4">
        <LeftSidebar />

        {/* Bottom padding keeps content clear of the fixed phone tab bar. */}
        <main
          id="main"
          tabIndex={-1}
          className="min-w-0 flex-1 pt-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] outline-none sm:pt-6 md:pb-10"
        >
          {/* Pages are lazy chunks: the shell stays put while one loads. */}
          <Suspense fallback={<RouteFallback />}>
            <Outlet />
          </Suspense>
        </main>
      </div>

      <BottomNav />
    </div>
  )
}
