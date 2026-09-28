/*
  Every moderation and admin page, re-exported from one module so App.tsx can
  lazy-load them as a single chunk: a student who never opens the moderation
  dashboard never downloads it, and a moderator gets all the tabs in one go.
*/

export { AdminStaffPage } from './AdminStaffPage'
export { ModerationActivityPage } from './ModerationActivityPage'
export { ModerationAnnouncementsPage } from './ModerationAnnouncementsPage'
export { ModerationCaseFilesPage } from './ModerationCaseFilesPage'
export { ModerationLayout } from './ModerationLayout'
export { ModerationListingsPage } from './ModerationListingsPage'
export { ModerationOverviewPage } from './ModerationOverviewPage'
export { ModerationPostsPage } from './ModerationPostsPage'
export { ModerationReportsPage } from './ModerationReportsPage'
export { ModerationReviewsPage } from './ModerationReviewsPage'
export { ModerationUsersPage } from './ModerationUsersPage'
