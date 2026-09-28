/*
  /api/moderation - the moderator dashboard.

  Every call here needs a session opened in moderator or admin mode (hidden
  sign-in, Ctrl+Alt+M / Ctrl+Alt+A). In a normal session the backend answers 403,
  so these are only called from pages behind <ModeRoute>.

  Nothing is hard-deleted except a flagged review: listings and posts are
  REMOVED (and can be restored), "delete user" closes and anonymises the account.

  Author: Mogamat Yaseen Kannemeyer 240453182
*/

import { authedRequest } from './client'
import type {
  AccountStatus,
  ActionReport,
  ModerationActionType,
  ModerationReport,
  ReportStatus,
  UserReport,
  Analytics,
  AnalyticsRange,
  AuditEntry,
  BulletinPost,
  BulletinPostCategory,
  BulletinPostStatus,
  FlaggedReview,
  Listing,
  ListingStatus,
  ModeratedPost,
  ModeratedUser,
  ModerationOverview,
  PageResponse,
} from './types'

export type UpdateUserBody = {
  email?: string
  firstName?: string
  middleName?: string | null
  lastName?: string
  cellPhone?: string | null
  campusId?: number | null
}

export type AnnouncementBody = {
  title: string
  content: string
  category: BulletinPostCategory
}

export const moderationApi = {
  overview: () => authedRequest<ModerationOverview>('/api/moderation/overview'),

  analytics: (range: AnalyticsRange) =>
    authedRequest<Analytics>(`/api/moderation/analytics?range=${encodeURIComponent(range)}`),

  /* ---- users */

  users: (params: { q?: string; status?: AccountStatus | ''; page?: number; size?: number } = {}) =>
    authedRequest<PageResponse<ModeratedUser>>('/api/moderation/users', {
      query: {
        q: params.q || undefined,
        status: params.status || undefined,
        page: params.page ?? 0,
        size: params.size ?? 25,
      },
    }),

  user: (userId: number) => authedRequest<ModeratedUser>(`/api/moderation/users/${userId}`),

  updateUser: (userId: number, body: UpdateUserBody) =>
    authedRequest<ModeratedUser>(`/api/moderation/users/${userId}`, {
      method: 'PATCH',
      body: {
        email: body.email,
        firstName: body.firstName,
        middleName: body.middleName,
        lastName: body.lastName,
        cellPhone: body.cellPhone,
        campusId: body.campusId,
      },
    }),

  /** Needs a written report: a reason from the dropdown and at least 20 characters. */
  suspend: (userId: number, report: ActionReport) =>
    authedRequest<ModeratedUser>(`/api/moderation/users/${userId}/suspend`, {
      method: 'POST',
      body: report,
    }),

  reinstate: (userId: number) =>
    authedRequest<ModeratedUser>(`/api/moderation/users/${userId}/reinstate`, { method: 'POST' }),

  /** Emails the user a temporary password. The moderator never sees it. */
  resetPassword: (userId: number) =>
    authedRequest<void>(`/api/moderation/users/${userId}/reset-password`, { method: 'POST' }),

  /** Closes and anonymises the account; money and chat history stay intact. */
  deleteUser: (userId: number, report: ActionReport) =>
    authedRequest<void>(`/api/moderation/users/${userId}`, { method: 'DELETE', body: report }),

  /* ---- listings */

  listings: (params: { status?: ListingStatus | ''; q?: string } = {}) =>
    authedRequest<Listing[]>('/api/moderation/listings', {
      query: { status: params.status || undefined, q: params.q || undefined },
    }),

  /** The report is emailed to the seller and shown in their notifications. */
  removeListing: (listingId: number, report: ActionReport) =>
    authedRequest<Listing>(`/api/moderation/listings/${listingId}/remove`, {
      method: 'POST',
      body: report,
    }),

  restoreListing: (listingId: number) =>
    authedRequest<Listing>(`/api/moderation/listings/${listingId}/restore`, { method: 'POST' }),

  /* ---- bulletin posts */

  posts: (params: { status?: BulletinPostStatus | ''; announcements?: boolean } = {}) =>
    authedRequest<ModeratedPost[]>('/api/moderation/posts', {
      query: { status: params.status || undefined, announcements: params.announcements },
    }),

  /** The report is emailed to the author and shown in their notifications. */
  removePost: (postId: number, report: ActionReport) =>
    authedRequest<BulletinPost>(`/api/moderation/posts/${postId}/remove`, {
      method: 'POST',
      body: report,
    }),

  /* ---- reports */

  /** Reports users filed with the Report button. */
  userReports: (status: ReportStatus | '' = 'PENDING') =>
    authedRequest<UserReport[]>('/api/moderation/user-reports', { query: { status: status || undefined } }),

  dismissUserReport: (reportId: number, note: string) =>
    authedRequest<UserReport>(`/api/moderation/user-reports/${reportId}/dismiss`, {
      method: 'POST',
      body: { reason: note },
    }),

  /** The written reports behind suspensions, deletions and removals. */
  actionReports: (params: { action?: ModerationActionType | ''; userId?: number } = {}) =>
    authedRequest<ModerationReport[]>('/api/moderation/action-reports', {
      query: { action: params.action || undefined, userId: params.userId },
    }),

  actionReport: (id: number) => authedRequest<ModerationReport>(`/api/moderation/action-reports/${id}`),

  restorePost: (postId: number) =>
    authedRequest<BulletinPost>(`/api/moderation/posts/${postId}/restore`, { method: 'POST' }),

  /* ---- campus announcements (shown in Campus News) */

  announcements: () => authedRequest<ModeratedPost[]>('/api/moderation/announcements'),

  createAnnouncement: (body: AnnouncementBody) =>
    authedRequest<BulletinPost>('/api/moderation/announcements', {
      method: 'POST',
      body: { title: body.title, content: body.content, category: body.category },
    }),

  updateAnnouncement: (postId: number, body: AnnouncementBody) =>
    authedRequest<BulletinPost>(`/api/moderation/announcements/${postId}`, {
      method: 'PUT',
      body: { title: body.title, content: body.content, category: body.category },
    }),

  deleteAnnouncement: (postId: number) =>
    authedRequest<void>(`/api/moderation/announcements/${postId}`, { method: 'DELETE' }),

  /* ---- flagged reviews (rating 2 or lower) */

  flaggedReviews: () => authedRequest<FlaggedReview[]>('/api/moderation/reviews/flagged'),

  /** The review is fine: it stays up and leaves the queue. */
  dismissReview: (reviewId: number, reason: string) =>
    authedRequest<void>(`/api/moderation/reviews/${reviewId}/dismiss`, {
      method: 'POST',
      body: { reason },
    }),

  removeReview: (reviewId: number, reason: string) =>
    authedRequest<void>(`/api/moderation/reviews/${reviewId}`, { method: 'DELETE', query: { reason } }),

  /* ---- activity */

  auditLog: (page = 0, size = 25) =>
    authedRequest<PageResponse<AuditEntry>>('/api/moderation/audit-log', { query: { page, size } }),
}
