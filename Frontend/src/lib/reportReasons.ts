/*
  The dropdown options for reports - both the user's Report button and the
  moderator's report behind a ban or removal. One list, so a user's report and
  the action that answers it use the same words. Keep in step with the backend's
  ReportReasons.java.

  Each context offers only the reasons that make sense there: a listing can be a
  prohibited item, a profile can be a fake account.

  Author: Mogamat Yaseen Kannemeyer 240453182
*/

import type { ModerationActionType, ReportReason, ReportTargetType } from '@/lib/api/types'

export const REASON_LABEL: Record<ReportReason, string> = {
  SCAM_OR_FRAUD: 'Scam or fraud',
  PROHIBITED_ITEM: 'Prohibited or illegal item',
  MISLEADING_LISTING: 'Misleading or inaccurate listing',
  HARASSMENT_OR_BULLYING: 'Harassment or bullying',
  HATE_SPEECH: 'Hate speech',
  INAPPROPRIATE_CONTENT: 'Inappropriate or explicit content',
  SPAM: 'Spam',
  FAKE_ACCOUNT: 'Fake account',
  IMPERSONATION: 'Impersonation',
  UNSAFE_MEETUP: 'Unsafe meet-up or off-platform payment',
  OTHER: 'Other',
}

const FOR_LISTING: ReportReason[] = [
  'SCAM_OR_FRAUD',
  'PROHIBITED_ITEM',
  'MISLEADING_LISTING',
  'UNSAFE_MEETUP',
  'INAPPROPRIATE_CONTENT',
  'SPAM',
  'OTHER',
]

const FOR_POST: ReportReason[] = [
  'HARASSMENT_OR_BULLYING',
  'HATE_SPEECH',
  'INAPPROPRIATE_CONTENT',
  'SPAM',
  'SCAM_OR_FRAUD',
  'OTHER',
]

const FOR_ACCOUNT: ReportReason[] = [
  'SCAM_OR_FRAUD',
  'HARASSMENT_OR_BULLYING',
  'HATE_SPEECH',
  'FAKE_ACCOUNT',
  'IMPERSONATION',
  'UNSAFE_MEETUP',
  'SPAM',
  'OTHER',
]

export function reasonsForTarget(target: ReportTargetType): ReportReason[] {
  if (target === 'LISTING') return FOR_LISTING
  if (target === 'BULLETIN_POST') return FOR_POST
  return FOR_ACCOUNT
}

export function reasonsForAction(action: ModerationActionType): ReportReason[] {
  if (action === 'LISTING_REMOVED') return FOR_LISTING
  if (action === 'POST_REMOVED') return FOR_POST
  return FOR_ACCOUNT
}

export function reasonLabel(reason: ReportReason | null | undefined): string {
  return reason ? REASON_LABEL[reason] : 'Not specified'
}

export const ACTION_LABEL: Record<ModerationActionType, string> = {
  ACCOUNT_SUSPENDED: 'Account suspended',
  ACCOUNT_DELETED: 'Account deleted',
  LISTING_REMOVED: 'Listing removed',
  POST_REMOVED: 'Post removed',
}

/** Matches ModerationReportFactory.MIN_DETAILS on the backend. */
export const MIN_REPORT_DETAILS = 20
