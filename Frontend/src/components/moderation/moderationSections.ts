/*
  The moderation sections, in tab order. ModerationTabs draws the strip from
  this, and ModerationLayout uses it for each section's breadcrumb and <title>.
  `description` is the page's meta description (these pages are noindex, but a
  unique one still helps browser history and screen-reader users).
*/

export type ModerationSection = { to: string; label: string; description: string }

export const MODERATION_SECTIONS: ModerationSection[] = [
  { to: '/moderation/overview', label: 'Overview', description: 'What needs attention now across UniExchange.' },
  { to: '/moderation/reports', label: 'Reports', description: 'Reports raised by students, waiting for a decision.' },
  { to: '/moderation/users', label: 'Users', description: 'Find, edit, suspend and restore student accounts.' },
  { to: '/moderation/listings', label: 'Listings', description: 'Review and remove marketplace listings.' },
  { to: '/moderation/posts', label: 'Posts', description: 'Review and remove campus bulletin posts.' },
  { to: '/moderation/announcements', label: 'Announcements', description: 'Publish announcements to every student.' },
  { to: '/moderation/reviews', label: 'Flagged reviews', description: 'Reviews that were flagged for a moderator.' },
  { to: '/moderation/case-files', label: 'Case files', description: 'The history of reports and actions per student.' },
  { to: '/moderation/activity', label: 'Activity', description: 'Every moderator and admin action, newest first.' },
]

export const ADMIN_SECTIONS: ModerationSection[] = [
  { to: '/admin/staff', label: 'Staff', description: 'Grant and revoke moderator and admin roles.' },
]
