/*
  Every moderator and admin action, newest first. The audit trail is the
  point: anyone with these powers can see what every other moderator did.

  Author: Mogamat Yaseen Kannemeyer 240453182
*/

import { useState } from 'react'

import { AuditList } from '@/components/moderation/AuditList'
import { ListSkeleton } from '@/components/moderation/ModerationUi'
import { useLoad } from '@/components/moderation/useLoad'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { moderationApi } from '@/lib/api/moderation'

const PAGE_SIZE = 25

export function ModerationActivityPage() {
  const [page, setPage] = useState(0)
  const { data, error, loading } = useLoad(() => moderationApi.auditLog(page, PAGE_SIZE), [page])

  const lastPage = data ? Math.max(0, Math.ceil(data.total / PAGE_SIZE) - 1) : 0

  return (
    <div className="space-y-4">
      {error && <Alert>{error}</Alert>}
      {loading && !data && <ListSkeleton />}
      {data && data.items.length === 0 && (
        <EmptyState title="No activity yet" description="Moderator actions will be recorded here." />
      )}
      {data && data.items.length > 0 && <AuditList entries={data.items} />}

      {data && data.total > PAGE_SIZE && (
        <div className="flex items-center justify-between gap-3">
          <Button variant="secondary" size="sm" className="w-auto" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
            Newer
          </Button>
          <span className="text-sm text-fg-muted">
            Page {page + 1} of {lastPage + 1}
          </span>
          <Button variant="secondary" size="sm" className="w-auto" disabled={page >= lastPage} onClick={() => setPage((p) => p + 1)}>
            Older
          </Button>
        </div>
      )}
    </div>
  )
}
