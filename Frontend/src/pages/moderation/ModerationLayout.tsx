/*
  The shell every moderation page renders inside: title, the mode it is in,
  the section tabs, then the page. Mounted behind <ModeRoute require="MODERATOR">
  in App.tsx.

  Author: Mogamat Yaseen Kannemeyer 240453182
*/

import { Outlet, useLocation } from 'react-router-dom'

import { useIsAdmin } from '@/auth/roles'
import { PageHeader } from '@/components/layout/PageHeader'
import { ModerationTabs } from '@/components/moderation/ModerationUi'
import { ADMIN_SECTIONS, MODERATION_SECTIONS } from '@/components/moderation/moderationSections'
import { Seo } from '@/components/seo/Seo'
import { Badge } from '@/components/ui/Badge'

export function ModerationLayout() {
  const isAdmin = useIsAdmin()
  const { pathname } = useLocation()
  const section = [...MODERATION_SECTIONS, ...ADMIN_SECTIONS].find(
    (s) => pathname === s.to || pathname.startsWith(`${s.to}/`),
  )

  return (
    <div className="mx-auto max-w-5xl">
      <Seo
        title={section ? `${section.label} · Moderation` : 'Moderation'}
        description={section?.description ?? 'Keep UniExchange safe: people, listings, posts and reviews.'}
        noindex
      />
      <PageHeader
        breadcrumbs={[
          { label: 'Moderation', to: '/moderation/overview' },
          ...(section ? [{ label: section.label }] : []),
        ]}
        title={
          <span className="inline-flex flex-wrap items-center gap-2">
            Moderation
            <Badge tone={isAdmin ? 'warning' : 'brand'}>{isAdmin ? 'Admin' : 'Moderator'}</Badge>
          </span>
        }
        subtitle="Keep UniExchange safe: people, listings, posts and reviews."
      />
      <ModerationTabs />
      <Outlet />
    </div>
  )
}
