/*
  Temporary landing page after sign-in.

  This is a placeholder on purpose - it proves the token works end to end by
  calling GET /api/auth/me, and nothing more. The marketplace (listings,
  categories, wallet, messaging, bulletin board) replaces it.
*/

import { useAuth } from '@/auth/useAuth'
import { Button } from '@/components/Button'
import { Logo } from '@/components/Logo'

export function DashboardPage() {
  const { user, session, loadingUser, signOut } = useAuth()

  const verified = user?.emailVerifiedAt !== null && user?.emailVerifiedAt !== undefined

  return (
    <div className="min-h-dvh bg-brand-50/40">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3.5">
          <Logo />
          <div className="w-auto">
            <Button variant="ghost" onClick={signOut} className="w-auto px-3">
              Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-2xl font-semibold tracking-tight text-ink-900">
          {loadingUser
            ? 'Loading your account…'
            : `Welcome, ${user?.firstName ?? session?.email ?? 'student'}`}
        </h1>
        <p className="mt-1.5 text-sm text-ink-500">
          Your student email is verified, so you have full access to UniExchange.
        </p>

        <dl className="mt-6 grid gap-3 sm:grid-cols-2">
          <Detail label="Student email" value={user?.email ?? session?.email ?? '—'} />
          <Detail
            label="Account status"
            value={
              <span
                className={
                  'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ' +
                  (verified
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-amber-50 text-amber-700')
                }
              >
                {user?.accountStatus ?? '—'}
              </span>
            }
          />
          <Detail
            label="Roles"
            value={session?.roles.map((role) => role.replace('ROLE_', '')).join(', ') || '—'}
          />
          <Detail
            label="Verified at"
            value={
              user?.emailVerifiedAt
                ? new Date(user.emailVerifiedAt).toLocaleString()
                : 'Not verified'
            }
          />
        </dl>

        <div className="mt-8 rounded-2xl border border-dashed border-brand-200 bg-white p-6 text-center">
          <p className="text-sm font-medium text-ink-700">The marketplace goes here</p>
          <p className="mx-auto mt-1.5 max-w-sm text-sm text-ink-500">
            Listings, categories, campus filters, messaging and the bulletin board are the
            next milestone. This page only exists to prove sign-in works.
          </p>
        </div>
      </main>
    </div>
  )
}

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
      <dt className="text-xs font-medium uppercase tracking-wide text-ink-400">{label}</dt>
      <dd className="mt-1 text-sm text-ink-900">{value}</dd>
    </div>
  )
}
