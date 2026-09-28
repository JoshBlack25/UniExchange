/*
  Authentication. OWNER: Mogamat Yaseen Kannemeyer 240453182 - this one is done.

  Only /verify-otp issues a token: registration deliberately returns 202 with no
  token so an unverifiable address can never obtain credentials, and it is also
  the only place a device can earn the right to skip the code next time.

  Signing in therefore has TWO outcomes - see login() below.

  Every body here is built field by field rather than by spreading a form object.
  The login form now carries a rememberMe field that must be sent and a
  confirmPassword-style field that must not; spreading makes that distinction
  invisible, and TypeScript will not catch it because a variable is not subject
  to excess-property checking.
*/

import { authedRequest, request } from './client'
import type { AuthResponse, Campus, RegistrationResponse, SessionMode, User } from './types'

/**
 * What /api/auth/login returns. A `token` means the device was trusted and the
 * student is signed in; no `token` means a code has just been emailed and the
 * flow continues at /verify-otp.
 *
 * Narrow it with `'token' in result`.
 */
export type LoginResult = AuthResponse | RegistrationResponse

export const authApi = {
  /** 202 + no token. The account stays PENDING_VERIFICATION until the code is used. */
  register: (body: {
    email: string
    firstName: string
    lastName: string
    password: string
    campusId?: number | null
  }) =>
    request<RegistrationResponse>('/api/auth/register', {
      method: 'POST',
      body: {
        email: body.email,
        firstName: body.firstName,
        lastName: body.lastName,
        password: body.password,
        campusId: body.campusId ?? null,
      },
    }),

  /**
   * The only endpoint that issues a JWT, and the only one that trusts a device.
   * `rememberMe` decides both how long the session lasts and how long this
   * browser may skip the code.
   */
  verifyOtp: (body: {
    email: string
    code: string
    rememberMe: boolean
    mode?: SessionMode
    loginTicket?: string | null
  }) =>
    request<AuthResponse>('/api/auth/verify-otp', {
      method: 'POST',
      body: {
        email: body.email,
        code: body.code,
        rememberMe: body.rememberMe,
        mode: body.mode ?? null,
        loginTicket: body.loginTicket ?? null,
      },
    }),

  resendOtp: (body: { email: string }) =>
    request<RegistrationResponse>('/api/auth/resend-otp', {
      method: 'POST',
      body: { email: body.email },
    }),

  /**
   * Sign in. The password is always required; the emailed code is required on
   * top of it unless `deviceToken` proves this browser has been trusted before.
   *
   *   const result = await authApi.login({ ... })
   *   if ('token' in result) signIn(result, rememberMe)   // trusted device
   *   else navigate('/verify', ...)                       // a code was sent
   *
   * Still throws 403 EMAIL_NOT_VERIFIED when the account never used its first code,
   * and 403 ACCOUNT_SUSPENDED for a banned account.
   *
   * `mode` is only sent by the hidden moderator/admin sign-in. An account without
   * the role gets the same 401 as a wrong password.
   */
  login: (body: {
    email: string
    password: string
    deviceToken: string | null
    rememberMe: boolean
    mode?: SessionMode
  }) =>
    request<LoginResult>('/api/auth/login', {
      method: 'POST',
      body: {
        email: body.email,
        password: body.password,
        deviceToken: body.deviceToken,
        rememberMe: body.rememberMe,
        mode: body.mode ?? null,
      },
    }),

  /** Re-enter the password to switch an open session into moderator or admin mode. */
  elevate: (body: { password: string; mode: Exclude<SessionMode, 'STANDARD'> }) =>
    authedRequest<AuthResponse>('/api/auth/elevate', {
      method: 'POST',
      body: { password: body.password, mode: body.mode },
    }),

  /** Leave moderator/admin mode and carry on as an ordinary session. */
  stepDown: (body: { rememberMe: boolean }) =>
    authedRequest<AuthResponse>('/api/auth/step-down', {
      method: 'POST',
      body: { rememberMe: body.rememberMe },
    }),

  /** Returns a fresh token for this session; every other session is signed out. */
  changePassword: (body: { currentPassword: string; newPassword: string; rememberMe: boolean }) =>
    authedRequest<AuthResponse>('/api/auth/change-password', {
      method: 'POST',
      body: {
        currentPassword: body.currentPassword,
        newPassword: body.newPassword,
        rememberMe: body.rememberMe,
      },
    }),

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
