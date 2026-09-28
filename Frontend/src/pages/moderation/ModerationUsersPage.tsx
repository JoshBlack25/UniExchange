/*
  Find a user and act on their account: edit details, reset password,
  suspend / reinstate, delete.

  Moderators look after ordinary accounts only. Moderator and admin accounts
  show their actions disabled unless this is an admin session, and your own
  account is never actionable here - the backend enforces both.

  Author: Mogamat Yaseen Kannemeyer 240453182
*/

import {
  ArrowCounterClockwise,
  DotsThree,
  Key,
  MagnifyingGlass,
  PencilSimple,
  Prohibit,
  Trash,
  UserCircle,
} from '@phosphor-icons/react'
import { useState } from 'react'
import type { FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'

import { useIsAdmin } from '@/auth/roles'
import { useAuth } from '@/auth/useAuth'
import { ActionReportDialog } from '@/components/moderation/ActionReportDialog'
import { EditUserSheet } from '@/components/moderation/EditUserSheet'
import {
  AccountStatusBadge,
  AffiliationBadge,
  ConfirmDialog,
  ListCard,
  ListSkeleton,
  StaffRoleBadges,
} from '@/components/moderation/ModerationUi'
import { useLoad } from '@/components/moderation/useLoad'
import { Alert } from '@/components/ui/Alert'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { Menu, MenuItem, MenuSeparator } from '@/components/ui/Menu'
import { Select } from '@/components/ui/Select'
import { TextField } from '@/components/ui/TextField'
import { moderationApi } from '@/lib/api/moderation'
import type { AccountStatus, ActionReport, ModeratedUser } from '@/lib/api/types'

const PAGE_SIZE = 25

type Pending =
  | { kind: 'suspend' | 'reinstate' | 'reset' | 'delete'; user: ModeratedUser }
  | null

const STATUSES: Array<{ value: AccountStatus | ''; label: string }> = [
  { value: '', label: 'Any status' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'SUSPENDED', label: 'Suspended' },
  { value: 'PENDING_VERIFICATION', label: 'Unverified' },
  { value: 'DEACTIVATED', label: 'Deleted' },
]

export function ModerationUsersPage() {
  const { session } = useAuth()
  const isAdmin = useIsAdmin()
  const [params, setParams] = useSearchParams()
  const query = params.get('q') ?? ''
  const status = (params.get('status') ?? '') as AccountStatus | ''
  const [page, setPage] = useState(0)
  const [draft, setDraft] = useState(query)

  const [editing, setEditing] = useState<ModeratedUser | null>(null)
  const [pending, setPending] = useState<Pending>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const { data, error, loading, reload } = useLoad(
    () => moderationApi.users({ q: query, status, page, size: PAGE_SIZE }),
    [query, status, page],
  )

  // Keep the search box in step when the URL changes (back button, a stat link).
  const [syncedQuery, setSyncedQuery] = useState(query)
  if (query !== syncedQuery) {
    setSyncedQuery(query)
    setDraft(query)
  }

  function updateParams(next: { q?: string; status?: string }) {
    const merged = new URLSearchParams(params)
    for (const [key, value] of Object.entries(next)) {
      if (value) merged.set(key, value)
      else merged.delete(key)
    }
    setPage(0)
    setParams(merged, { replace: true })
  }

  function search(event: FormEvent) {
    event.preventDefault()
    updateParams({ q: draft.trim() })
  }

  /** Why this row's actions are unavailable, or null when they are. */
  function lockReason(user: ModeratedUser): string | null {
    if (user.userId === session?.userId) return 'This is your account.'
    const isStaff = user.roles.includes('MODERATOR') || user.roles.includes('ADMIN')
    if (isStaff && !isAdmin) return 'Only an admin can change a moderator or admin account.'
    if (user.accountStatus === 'DEACTIVATED') return 'This account has been deleted.'
    return null
  }

  /* Suspend and delete: both need the written report. */
  async function runReported(report: ActionReport) {
    if (!pending) return
    const { kind, user } = pending
    const name = `${user.firstName} ${user.lastName}`
    if (kind === 'suspend') {
      await moderationApi.suspend(user.userId, report)
      setNotice(`${name} is suspended and has been signed out everywhere. Your report is on file.`)
    } else {
      await moderationApi.deleteUser(user.userId, report)
      setNotice(`${name}'s account was deleted. Your report is on file.`)
    }
    reload()
  }

  async function runPending() {
    if (!pending) return
    const { kind, user } = pending
    const name = `${user.firstName} ${user.lastName}`
    if (kind === 'reinstate') {
      await moderationApi.reinstate(user.userId)
      setNotice(`${name} can sign in again.`)
    } else if (kind === 'reset') {
      await moderationApi.resetPassword(user.userId)
      setNotice(`A temporary password was emailed to ${user.email}.`)
    }
    reload()
  }

  const lastPage = data ? Math.max(0, Math.ceil(data.total / PAGE_SIZE) - 1) : 0

  return (
    <div className="space-y-4">
      <form role="search" onSubmit={search} className="grid gap-3 sm:grid-cols-[1fr_12rem_auto] sm:items-end">
        <TextField
          label="Search users"
          placeholder="Name, email or user id"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
        />
        <Select
          id="user-status"
          label="Status"
          value={status}
          onChange={(event) => updateParams({ status: event.target.value })}
        >
          {STATUSES.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
        <Button type="submit" variant="secondary" className="sm:w-auto">
          <MagnifyingGlass aria-hidden="true" className="size-5" />
          Search
        </Button>
      </form>

      {notice && <Alert tone="success">{notice}</Alert>}
      {error && <Alert>{error}</Alert>}
      {loading && !data && <ListSkeleton />}

      {data && data.items.length === 0 && (
        <EmptyState title="No users found" description="Try a different name, email or status." />
      )}

      {data && data.items.length > 0 && (
        <>
          <p className="text-sm text-fg-muted">
            {data.total} {data.total === 1 ? 'account' : 'accounts'}
          </p>
          <ListCard>
            {data.items.map((user) => {
              const locked = lockReason(user)
              const fullName = `${user.firstName} ${user.lastName}`
              return (
                <li key={user.userId} className="flex items-center gap-3 p-4">
                  <Avatar name={fullName} className="size-10" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-fg">{fullName}</p>
                    <p className="truncate text-sm text-fg-muted">{user.email}</p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      <AccountStatusBadge status={user.accountStatus} />
                      <AffiliationBadge affiliation={user.affiliation} />
                      <StaffRoleBadges roles={user.roles} />
                    </div>
                    {locked && <p className="mt-1.5 text-xs text-fg-subtle">{locked}</p>}
                  </div>
                  <Menu
                    label={`Actions for ${fullName}`}
                    align="end"
                    triggerClassName="grid size-11 place-items-center text-fg-muted hover:bg-surface-muted hover:text-fg"
                    trigger={<DotsThree aria-hidden="true" weight="bold" className="size-6" />}
                  >
                    <MenuItem icon={<UserCircle />} to={`/profile/${user.userId}`}>
                      View profile
                    </MenuItem>
                    {!locked && (
                      <>
                        <MenuItem icon={<PencilSimple />} onSelect={() => setEditing(user)}>
                          Edit details
                        </MenuItem>
                        <MenuItem icon={<Key />} onSelect={() => setPending({ kind: 'reset', user })}>
                          Reset password
                        </MenuItem>
                        <MenuSeparator />
                        {user.accountStatus === 'SUSPENDED' ? (
                          <MenuItem
                            icon={<ArrowCounterClockwise />}
                            onSelect={() => setPending({ kind: 'reinstate', user })}
                          >
                            Reinstate account
                          </MenuItem>
                        ) : (
                          <MenuItem icon={<Prohibit />} tone="danger" onSelect={() => setPending({ kind: 'suspend', user })}>
                            Suspend account
                          </MenuItem>
                        )}
                        <MenuItem icon={<Trash />} tone="danger" onSelect={() => setPending({ kind: 'delete', user })}>
                          Delete account
                        </MenuItem>
                      </>
                    )}
                  </Menu>
                </li>
              )
            })}
          </ListCard>
        </>
      )}

      {data && data.total > PAGE_SIZE && (
        <div className="flex items-center justify-between gap-3">
          <Button variant="secondary" size="sm" className="w-auto" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
            Previous
          </Button>
          <span className="text-sm text-fg-muted">
            Page {page + 1} of {lastPage + 1}
          </span>
          <Button variant="secondary" size="sm" className="w-auto" disabled={page >= lastPage} onClick={() => setPage((p) => p + 1)}>
            Next
          </Button>
        </div>
      )}

      <EditUserSheet
        user={editing}
        onClose={() => setEditing(null)}
        onSaved={(saved) => {
          setEditing(null)
          setNotice(`Saved ${saved.firstName} ${saved.lastName}'s details.`)
          reload()
        }}
      />

      <ActionReportDialog
        open={pending?.kind === 'suspend'}
        action="ACCOUNT_SUSPENDED"
        title="Suspend this account?"
        description={
          <>
            <strong>{pending?.user.firstName} {pending?.user.lastName}</strong> will be signed out everywhere
            and cannot sign in until a moderator reinstates them. Their listings stay up.
          </>
        }
        confirmLabel="Suspend account"
        onClose={() => setPending(null)}
        onConfirm={runReported}
      />
      <ConfirmDialog
        open={pending?.kind === 'reinstate'}
        tone="primary"
        title="Reinstate this account?"
        description={`${pending?.user.firstName ?? ''} will be able to sign in again.`}
        confirmLabel="Reinstate"
        onClose={() => setPending(null)}
        onConfirm={runPending}
      />
      <ConfirmDialog
        open={pending?.kind === 'reset'}
        tone="primary"
        title="Reset their password?"
        description={
          <>
            A temporary password will be emailed to <strong>{pending?.user.email}</strong>. You will not see it.
            They will be signed out everywhere.
          </>
        }
        confirmLabel="Email temporary password"
        onClose={() => setPending(null)}
        onConfirm={runPending}
      />
      <ActionReportDialog
        open={pending?.kind === 'delete'}
        action="ACCOUNT_DELETED"
        title="Delete this account?"
        description={
          <>
            The account is closed and its name, email and phone are wiped. Their live listings and posts are
            taken down. Purchases, wallet history and reviews are kept. <strong>This cannot be undone.</strong>
          </>
        }
        confirmLabel="Delete account"
        onClose={() => setPending(null)}
        onConfirm={runReported}
      />
    </div>
  )
}
