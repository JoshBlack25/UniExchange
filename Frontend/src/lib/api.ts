/*
  The single place that knows how to talk to the Spring Boot API.

  Two constraints from the backend's SecurityConfig worth remembering:
   - CORS allows ONLY the Authorization and Content-Type request headers.
     Adding any custom header (X-Requested-With and friends) makes the
     preflight fail with no useful error in the console.
   - Auth is a stateless bearer token. The backend reads no cookies, so
     credentials are never sent.
*/

const BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080').replace(/\/+$/, '')

/** Shape of the backend's GlobalExceptionHandler envelope. */
type ErrorEnvelope = {
  timestamp?: string
  status?: number
  error?: string
  message?: string
  /** Per-field messages from bean validation, e.g. { email: "..." }. */
  fields?: Record<string, string>
  /** Machine-readable discriminator, e.g. "EMAIL_NOT_VERIFIED". */
  code?: string
}

export class ApiError extends Error {
  readonly status: number
  readonly fields: Record<string, string>
  readonly code?: string

  constructor(status: number, message: string, fields: Record<string, string> = {}, code?: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.fields = fields
    this.code = code
  }

  /** True when the account exists but has not verified its email yet. */
  get isUnverified(): boolean {
    return this.code === 'EMAIL_NOT_VERIFIED'
  }
}

export type AuthResponse = {
  token: string
  tokenType: string
  expiresIn: number
  userId: number
  email: string
  roles: string[]
}

export type RegistrationResponse = {
  email: string
  message: string
  codeExpiresInSeconds: number
}

export type User = {
  userId: number
  email: string
  firstName: string
  middleName: string | null
  lastName: string
  cellPhone: string | null
  dateOfBirth: string | null
  accountStatus: 'PENDING_VERIFICATION' | 'ACTIVE' | 'SUSPENDED' | 'DEACTIVATED'
  emailVerifiedAt: string | null
  campusId: number | null
  createdAt: string
  updatedAt: string
}

export type Campus = {
  campusId: number
  name: string
  city: string
  address: string | null
}

type RequestOptions = {
  method?: string
  body?: unknown
  token?: string | null
  /**
   * Called when the server rejects the token. Lets AuthContext clear the
   * session without this module importing React or the router.
   */
  onUnauthorized?: () => void
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, token, onUnauthorized } = options

  const headers: Record<string, string> = {}
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (token) headers.Authorization = `Bearer ${token}`

  let response: Response
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    // fetch only rejects on a network-level failure, so this is genuinely
    // "the API is unreachable" rather than an HTTP error status.
    throw new ApiError(0, 'Cannot reach the UniExchange server. Is the backend running?')
  }

  if (response.status === 401) {
    onUnauthorized?.()
  }

  if (response.status === 204) {
    return undefined as T
  }

  const raw = await response.text()
  const payload: unknown = raw ? safeJson(raw) : null

  if (!response.ok) {
    const envelope = (payload ?? {}) as ErrorEnvelope
    throw new ApiError(
      response.status,
      envelope.message ?? fallbackMessage(response.status),
      envelope.fields ?? {},
      envelope.code,
    )
  }

  return payload as T
}

function safeJson(raw: string): unknown {
  try {
    return JSON.parse(raw)
  } catch {
    return { message: raw }
  }
}

function fallbackMessage(status: number): string {
  // The backend's 401 entry point returns an empty body, so supply the text.
  if (status === 401) return 'Your session has expired. Please sign in again.'
  if (status === 403) return 'You are not allowed to do that.'
  return `Request failed (${status}).`
}

export const api = {
  register: (body: {
    email: string
    firstName: string
    lastName: string
    password: string
    campusId?: number | null
  }) => request<RegistrationResponse>('/api/auth/register', { method: 'POST', body }),

  verifyOtp: (body: { email: string; code: string }) =>
    request<AuthResponse>('/api/auth/verify-otp', { method: 'POST', body }),

  resendOtp: (body: { email: string }) =>
    request<RegistrationResponse>('/api/auth/resend-otp', { method: 'POST', body }),

  login: (body: { email: string; password: string }) =>
    request<AuthResponse>('/api/auth/login', { method: 'POST', body }),

  me: (token: string, onUnauthorized?: () => void) =>
    request<User>('/api/auth/me', { token, onUnauthorized }),

  campuses: () => request<Campus[]>('/api/campuses'),
}
