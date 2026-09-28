/*
  Moderator actions on someone else's profile: suspend or reinstate, email a
  temporary password, or jump to them on the moderation Users tab. Only
  rendered in a moderator or admin session. The backend decides whether this
  account may be touched (staff accounts need an admin) and the dialog shows
  its answer.

  Author: Mogamat Yaseen Kannemeyer 240453182
*/

import { ArrowCounterClockwise, Key, Prohibit, ShieldCheck } from '@phosphor-icons/react'
import { useState } from 'react'

import { ActionReportDialog } from '@/components/moderation/ActionReportDialog'
import { ConfirmDialog } from '@/components/moderation/ModerationUi'
import { Menu, MenuItem, MenuSeparator } from '@/components/ui/Menu'
import { moderationApi } from '@/lib/api/moderation'
import type { ActionReport, User } from '@/lib/api/types'

type ProfileModeratorMenuProps = {
  user: User
  onChanged: (message: string) => void
}

export function ProfileModeratorMenu({ user, onChanged }: ProfileModeratorMenuProps) {
  const [pending, setPending] = useState<'suspend' | 'reinstate' | 'reset' | null>(null)
  const fullName = `${user.firstName} ${user.lastName}`

  async function suspend(report: ActionReport) {
    await moderationApi.suspend(user.userId, report)
    onChanged(`${fullName} is suspended and has been signed out everywhere. Your report is on file.`)
  }

  async function run() {
    if (pending === 'reinstate') {
      await moderationApi.reinstate(user.userId)
      onChanged(`${fullName} can sign in again.`)
    } else if (pending === 'reset') {
      await moderationApi.resetPassword(user.userId)
      onChanged(`A temporary password was emailed to ${user.email ?? `${fullName}'s CPUT address`}.`)
    }
  }

  return (
    <>
      <Menu
        label={`Moderate ${fullName}`}
        align="end"
        triggerClassName={
          'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl! border border-line bg-surface-muted/80 px-4 ' +
          'text-sm font-semibold text-fg hover:border-line-strong hover:bg-surface-muted'
        }
        trigger={
          <>
            <ShieldCheck aria-hidden="true" weight="duotone" className="size-5" />
            Moderate
          </>
        }
      >
        {user.accountStatus === 'SUSPENDED' ? (
          <MenuItem icon={<ArrowCounterClockwise />} onSelect={() => setPending('reinstate')}>
            Reinstate account
          </MenuItem>
        ) : (
          <MenuItem icon={<Prohibit />} tone="danger" onSelect={() => setPending('suspend')}>
            Suspend account
          </MenuItem>
        )}
        <MenuItem icon={<Key />} onSelect={() => setPending('reset')}>
          Reset password
        </MenuItem>
        <MenuSeparator />
        <MenuItem icon={<ShieldCheck />} to={`/moderation/users?q=${user.userId}`}>
          Open in moderation
        </MenuItem>
      </Menu>

      <ActionReportDialog
        open={pending === 'suspend'}
        action="ACCOUNT_SUSPENDED"
        title="Suspend this account?"
        description={
          <>
            <strong>{fullName}</strong> will be signed out everywhere and cannot sign in until a moderator
            reinstates them. Their listings stay up.
          </>
        }
        confirmLabel="Suspend account"
        onClose={() => setPending(null)}
        onConfirm={suspend}
      />
      <ConfirmDialog
        open={pending === 'reinstate'}
        tone="primary"
        title="Reinstate this account?"
        description={`${user.firstName} will be able to sign in again.`}
        confirmLabel="Reinstate"
        onClose={() => setPending(null)}
        onConfirm={run}
      />
      <ConfirmDialog
        open={pending === 'reset'}
        tone="primary"
        title="Reset their password?"
        description={
          <>
            A temporary password will be emailed to <strong>{user.email ?? 'their CPUT address'}</strong>. You will not see it. They will be
            signed out everywhere.
          </>
        }
        confirmLabel="Email temporary password"
        onClose={() => setPending(null)}
        onConfirm={run}
      />
    </>
  )
}
