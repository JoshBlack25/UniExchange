/*
  /api/profile-photos - your own profile picture. The backend checks the file
  really is a JPEG, PNG, WebP or GIF (5 MB max) and returns the updated User.

  Author: Mogamat Yaseen Kannemeyer 240453182
*/

import { authedRequest, authedUpload, BASE_URL } from './client'
import type { User } from './types'

export const profilePhotosApi = {
  upload: (file: File) => authedUpload<User>('/api/profile-photos/me', file),
  remove: () => authedRequest<User>('/api/profile-photos/me', { method: 'DELETE' }),
}

/** An absolute <img> src for a user's photo, or undefined when they have none. */
export function photoSrc(user: { profilePhotoUrl?: string | null } | null | undefined): string | undefined {
  return user?.profilePhotoUrl ? `${BASE_URL}${user.profilePhotoUrl}` : undefined
}
