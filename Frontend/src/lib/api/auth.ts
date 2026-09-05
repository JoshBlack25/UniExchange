/*
  Authentication. OWNER: Mogamat Yaseen Kannemeyer 240453182 - this one is done.

  Only /verify-otp issues a token: registration deliberately returns 202 with no
  token so an unverifiable address can never obtain credentials.
*/

import { request } from './client'
import type { AuthResponse, Campus, RegistrationResponse, User } from './types'

export const authApi = {
  /** 202 + no token. The account stays PENDING_VERIFICATION until the code is used. */
  register: (body: {
    email: string
    firstName: string
    lastName: string
    password: string
    campusId?: number | null
  }) => request<RegistrationResponse>('/api/auth/register', { method: 'POST', body }),

  /** The only endpoint that issues a JWT. */
  verifyOtp: (body: { email: string; code: string }) =>
    request<AuthResponse>('/api/auth/verify-otp', { method: 'POST', body }),

  resendOtp: (body: { email: string }) =>
    request<RegistrationResponse>('/api/auth/resend-otp', { method: 'POST', body }),

  /** 403 with code EMAIL_NOT_VERIFIED when the account has not used its code yet. */
  login: (body: { email: string; password: string }) =>
    request<AuthResponse>('/api/auth/login', { method: 'POST', body }),

  /*
    Takes the token explicitly rather than using authedRequest, because
    AuthProvider calls this while deciding whether the stored session is still
    good - it must not read the session it is in the middle of validating.
  */
  me: (token: string, onUnauthorized?: () => void) =>
    request<User>('/api/auth/me', { token, onUnauthorized }),

  /** Public - used to populate the campus picker on the signup form. */
  campuses: () => request<Campus[]>('/api/campuses'),
}
