/*
  Gate for moderation and admin pages. Only a session opened in the right mode
  gets through; anyone else - including a moderator browsing normally - is sent
  back to the feed. The backend enforces the same rule on every request, so this
  only saves the user from a page of errors.
*/

import { Navigate, Outlet } from 'react-router-dom'

import { useIsAdmin, useIsModerator } from './roles'

export function ModeRoute({ require }: { require: 'MODERATOR' | 'ADMIN' }) {
  const isModerator = useIsModerator()
  const isAdmin = useIsAdmin()

  const allowed = require === 'ADMIN' ? isAdmin : isModerator
  if (!allowed) {
    return <Navigate to="/feed" replace />
  }

  return <Outlet />
}
