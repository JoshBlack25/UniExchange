/*
  Moderation home: what needs attention now, how things are trending, and what
  other moderators did recently. Each stat links to the tab that deals with it.

  Author: Mogamat Yaseen Kannemeyer 240453182
*/

import { Flag, Prohibit, Storefront, Trash, Users, WarningCircle } from '@phosphor-icons/react'

import { AnalyticsSection } from '@/components/moderation/analytics/AnalyticsSection'
import { AuditList } from '@/components/moderation/AuditList'
import { StatCard } from '@/components/moderation/ModerationUi'
import { useLoad } from '@/components/moderation/useLoad'
import { Alert } from '@/components/ui/Alert'
import { EmptyState } from '@/components/ui/EmptyState'
import { moderationApi } from '@/lib/api/moderation'

export function ModerationOverviewPage() {
  const { data, error } = useLoad(() => moderationApi.overview(), [])

  return (
    <div className="space-y-6">
      {error && <Alert>{error}</Alert>}

      <section aria-label="Needs attention" className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
        <StatCard
          label="Flagged reviews"
          value={data?.flaggedReviews ?? null}
          to="/moderation/reviews"
          tone={data && data.flaggedReviews > 0 ? 'danger' : 'neutral'}
          icon={<Flag weight="duotone" />}
        />
        <StatCard
          label="Suspended accounts"
          value={data?.suspendedUsers ?? null}
          to="/moderation/users?status=SUSPENDED"
          tone="warning"
          icon={<Prohibit weight="duotone" />}
        />
        <StatCard
          label="Removed this week"
          value={data?.removedThisWeek ?? null}
          to="/moderation/listings?status=REMOVED"
          icon={<Trash weight="duotone" />}
        />
        <StatCard
          label="Open reports"
          value={data?.pendingReports ?? null}
          to="/moderation/reports"
          tone={data && data.pendingReports > 0 ? 'warning' : 'neutral'}
          icon={<WarningCircle weight="duotone" />}
        />
        <StatCard
          label="Accounts"
          value={data?.totalUsers ?? null}
          to="/moderation/users"
          tone="brand"
          icon={<Users weight="duotone" />}
        />
        <StatCard
          label="Active listings"
          value={data?.activeListings ?? null}
          to="/moderation/listings?status=ACTIVE"
          tone="brand"
          icon={<Storefront weight="duotone" />}
        />
      </section>

      <AnalyticsSection />

      <section aria-labelledby="recent-activity">
        <h2 id="recent-activity" className="mb-3 text-sm font-semibold text-fg">
          Recent activity
        </h2>
        {data && data.recentActivity.length === 0 ? (
          <EmptyState title="Nothing yet" description="Moderator actions will show up here." />
        ) : (
          data && <AuditList entries={data.recentActivity} />
        )}
      </section>
    </div>
  )
}
