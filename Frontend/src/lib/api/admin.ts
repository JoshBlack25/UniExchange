/*
  /api/admin - who else is a moderator or an admin. Needs a session opened in
  admin mode (Ctrl+Alt+A). The backend refuses to remove your own admin role
  or the last admin account.

  Author: Mogamat Yaseen Kannemeyer 240453182
*/

import { authedRequest } from './client'
import type { ModeratedUser } from './types'

export type StaffRole = 'moderator' | 'admin'

export const adminApi = {
  staff: () => authedRequest<ModeratedUser[]>('/api/admin/staff'),

  grant: (userId: number, role: StaffRole) =>
    authedRequest<ModeratedUser>(`/api/admin/users/${userId}/${role}`, { method: 'POST' }),

  revoke: (userId: number, role: StaffRole) =>
    authedRequest<ModeratedUser>(`/api/admin/users/${userId}/${role}`, { method: 'DELETE' }),
}
