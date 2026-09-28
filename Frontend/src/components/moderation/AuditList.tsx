/* One list of audit entries, used by the overview (recent) and the activity page (all). */

import { Link } from 'react-router-dom'

import { formatRelativeTime } from '@/components/bulletin/relativeTime'
import { Avatar } from '@/components/ui/Avatar'
import type { AuditEntry } from '@/lib/api/types'

import { auditTarget, describeAction } from './auditLabels'
import { ListCard } from './ModerationUi'

export function AuditList({ entries }: { entries: AuditEntry[] }) {
  return (
    <ListCard>
      {entries.map((entry) => {
        const target = auditTarget(entry)
        return (
          <li key={entry.auditLogId} className="flex items-start gap-3 p-4">
            <Avatar name={entry.actor?.name ?? null} className="size-9" />
            <div className="min-w-0 flex-1">
              <p className="text-sm text-fg">
                <span className="font-semibold">{entry.actor?.name ?? 'A moderator'}</span>{' '}
                {describeAction(entry.action)}
                {target && (
                  <>
                    {' · '}
                    <Link to={target.to} className="font-medium text-brand-700 hover:underline">
                      {target.label}
                    </Link>
                  </>
                )}
              </p>
              {entry.details && <p className="mt-0.5 text-sm break-words text-fg-muted">{entry.details}</p>}
              <p className="mt-1 text-xs text-fg-subtle">
                <time dateTime={entry.createdAt}>{formatRelativeTime(entry.createdAt)}</time>
              </p>
            </div>
          </li>
        )
      })}
    </ListCard>
  )
}
