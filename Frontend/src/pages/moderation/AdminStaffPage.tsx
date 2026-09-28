/*
  Admin only: who can moderate. Lists every moderator and admin, and finds an
  active account to promote. Revoking is confirmed first; the backend refuses
  to take away your own admin access or the last admin account, and that
  message is shown in the dialog.

  Author: Mogamat Yaseen Kannemeyer 240453182
*/

import { MagnifyingGlass, ShieldCheck, ShieldStar } from '@phosphor-icons/react'
import { useState } from 'react'
import type { FormEvent } from 'react'

import { useAuth } from '@/auth/useAuth'
import {
  AccountStatusBadge,
  AffiliationBadge,
  ConfirmDialog,
  ListCard,
  ListSkeleton,
  StaffRoleBadges,
} from '@/components/moderation/ModerationUi'
import { errorMessage, useLoad } from '@/components/moderation/useLoad'
import { Alert } from '@/components/ui/Alert'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { TextField } from '@/components/ui/TextField'
import { adminApi } from '@/lib/api/admin'
import type { StaffRole } from '@/lib/api/admin'
import { moderationApi } from '@/lib/api/moderation'
import type { ModeratedUser } from '@/lib/api/types'

const ROLE_LABEL: Record<StaffRole, string> = { moderator: 'moderator', admin: 'admin' }

type Revoking = { user: ModeratedUser; role: StaffRole } | null

function fullName(user: ModeratedUser) {
  return `${user.firstName} ${user.lastName}`
}

function UserLine({ user, children }: { user: ModeratedUser; children?: React.ReactNode }) {
  return (
    <li className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <Avatar name={fullName(user)} className="size-10" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-fg">{fullName(user)}</p>
          <p className="truncate text-sm text-fg-muted">{user.email}</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <StaffRoleBadges roles={user.roles} />
            <AffiliationBadge affiliation={user.affiliation} />
            {user.accountStatus !== 'ACTIVE' && <AccountStatusBadge status={user.accountStatus} />}
          </div>
        </div>
      </div>
      {children && <div className="flex flex-wrap gap-2 sm:justify-end">{children}</div>}
    </li>
  )
}

export function AdminStaffPage() {
  const { session } = useAuth()
  const staff = useLoad(() => adminApi.staff(), [])

  const [draft, setDraft] = useState('')
  const [results, setResults] = useState<ModeratedUser[] | null>(null)
  const [searching, setSearching] = useState(false)
  const [granting, setGranting] = useState<string | null>(null)
  const [revoking, setRevoking] = useState<Revoking>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  async function search(event: FormEvent) {
    event.preventDefault()
    const q = draft.trim()
    if (!q) return
    setSearching(true)
    setActionError(null)
    try {
      const page = await moderationApi.users({ q, status: 'ACTIVE', size: 10 })
      setResults(page.items)
    } catch (caught) {
      setActionError(errorMessage(caught))
    } finally {
      setSearching(false)
    }
  }

  async function grant(user: ModeratedUser, role: StaffRole) {
    setGranting(`${user.userId}:${role}`)
    setActionError(null)
    setNotice(null)
    try {
      const updated = await adminApi.grant(user.userId, role)
      setNotice(`${fullName(user)} is now a ${ROLE_LABEL[role]}. It applies the next time they open that mode.`)
      setResults((current) => current?.map((u) => (u.userId === updated.userId ? updated : u)) ?? null)
      staff.reload()
    } catch (caught) {
      setActionError(errorMessage(caught))
    } finally {
      setGranting(null)
    }
  }

  return (
    <div className="space-y-6">
      {notice && <Alert tone="success">{notice}</Alert>}
      {actionError && <Alert>{actionError}</Alert>}

      <section aria-labelledby="staff-heading" className="space-y-3">
        <h2 id="staff-heading" className="text-sm font-semibold text-fg">
          Moderators and admins
        </h2>
        {staff.error && <Alert>{staff.error}</Alert>}
        {staff.loading && !staff.data && <ListSkeleton rows={3} />}
        {staff.data && staff.data.length === 0 && <EmptyState title="No staff yet" />}
        {staff.data && staff.data.length > 0 && (
          <ListCard>
            {staff.data.map((user) => {
              const isMe = user.userId === session?.userId
              return (
                <UserLine key={user.userId} user={user}>
                  {user.roles.includes('MODERATOR') && (
                    <Button
                      variant="secondary"
                      size="sm"
                      className="sm:w-auto"
                      onClick={() => setRevoking({ user, role: 'moderator' })}
                    >
                      Remove moderator
                    </Button>
                  )}
                  {user.roles.includes('ADMIN') && !isMe && (
                    <Button
                      variant="secondary"
                      size="sm"
                      className="sm:w-auto"
                      onClick={() => setRevoking({ user, role: 'admin' })}
                    >
                      Remove admin
                    </Button>
                  )}
                  {isMe && <p className="text-xs text-fg-subtle">This is you.</p>}
                </UserLine>
              )
            })}
          </ListCard>
        )}
      </section>

      <section aria-labelledby="promote-heading" className="space-y-3">
        <h2 id="promote-heading" className="text-sm font-semibold text-fg">
          Add someone
        </h2>
        <form role="search" onSubmit={search} className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
          <TextField
            label="Find an active account"
            placeholder="Name, email or user id"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
          />
          <Button type="submit" variant="secondary" className="sm:w-auto" loading={searching}>
            <MagnifyingGlass aria-hidden="true" className="size-5" />
            Search
          </Button>
        </form>

        {results && results.length === 0 && (
          <EmptyState title="No active accounts found" description="Only active accounts can be given a staff role." />
        )}
        {results && results.length > 0 && (
          <ListCard>
            {results.map((user) => (
              <UserLine key={user.userId} user={user}>
                {!user.roles.includes('MODERATOR') && !user.roles.includes('ADMIN') && (
                  <Button
                    variant="secondary"
                    size="sm"
                    className="sm:w-auto"
                    loading={granting === `${user.userId}:moderator`}
                    disabled={granting !== null}
                    onClick={() => grant(user, 'moderator')}
                  >
                    <ShieldCheck aria-hidden="true" className="size-4" />
                    Make moderator
                  </Button>
                )}
                {!user.roles.includes('ADMIN') && (
                  <Button
                    variant="secondary"
                    size="sm"
                    className="sm:w-auto"
                    loading={granting === `${user.userId}:admin`}
                    disabled={granting !== null}
                    onClick={() => grant(user, 'admin')}
                  >
                    <ShieldStar aria-hidden="true" className="size-4" />
                    Make admin
                  </Button>
                )}
              </UserLine>
            ))}
          </ListCard>
        )}
      </section>

      <ConfirmDialog
        open={revoking !== null}
        title={`Remove ${revoking ? ROLE_LABEL[revoking.role] : ''} access?`}
        description={
          <>
            <strong>{revoking && fullName(revoking.user)}</strong> loses their {revoking && ROLE_LABEL[revoking.role]}{' '}
            powers straight away, including in any session they have open now.
          </>
        }
        confirmLabel="Remove access"
        onClose={() => setRevoking(null)}
        onConfirm={async () => {
          if (!revoking) return
          await adminApi.revoke(revoking.user.userId, revoking.role)
          setNotice(`${fullName(revoking.user)} is no longer a ${ROLE_LABEL[revoking.role]}.`)
          setResults(null)
          staff.reload()
        }}
      />
    </div>
  )
}
