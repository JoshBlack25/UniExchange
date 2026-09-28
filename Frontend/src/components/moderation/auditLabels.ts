/*
  Plain-English wording for audit log actions ("suspended a user") and a link to
  what each entry is about. Kept here so the overview and the activity page
  describe the same entry the same way.

  Author: Mogamat Yaseen Kannemeyer 240453182
*/

import type { AuditEntry } from '@/lib/api/types'

const ACTIONS: Record<string, string> = {
  USER_UPDATED: 'edited a user',
  USER_SUSPENDED: 'suspended a user',
  USER_REINSTATED: 'reinstated a user',
  USER_PASSWORD_RESET: "reset a user's password",
  USER_DELETED: 'deleted a user',
  LISTING_REMOVED: 'removed a listing',
  LISTING_RESTORED: 'restored a listing',
  POST_REMOVED: 'removed a post',
  POST_RESTORED: 'restored a post',
  ANNOUNCEMENT_CREATED: 'published an announcement',
  ANNOUNCEMENT_UPDATED: 'edited an announcement',
  ANNOUNCEMENT_REMOVED: 'removed an announcement',
  REVIEW_DISMISSED: 'dismissed a flagged review',
  REVIEW_REMOVED: 'removed a review',
  MODERATOR_GRANTED: 'made someone a moderator',
  MODERATOR_REVOKED: 'removed a moderator',
  ADMIN_GRANTED: 'made someone an admin',
  ADMIN_REVOKED: 'removed an admin',
}

export function describeAction(action: string): string {
  return ACTIONS[action] ?? action.toLowerCase().replaceAll('_', ' ')
}

export function auditTarget(entry: AuditEntry): { to: string; label: string } | null {
  if (entry.targetId === null) return null
  switch (entry.targetType) {
    case 'USER':
      return { to: `/profile/${entry.targetId}`, label: `User #${entry.targetId}` }
    case 'LISTING':
      return { to: `/listings/${entry.targetId}`, label: `Listing #${entry.targetId}` }
    case 'BULLETIN_POST':
      return { to: '/moderation/posts', label: `Post #${entry.targetId}` }
    case 'REVIEW':
      return { to: '/moderation/reviews', label: `Review #${entry.targetId}` }
    default:
      return null
  }
}
