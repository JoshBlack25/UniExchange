/*
  A moderator editing someone's profile details. Password and account status
  are deliberately not here - they have their own audited actions (reset
  password, suspend) so they can never be changed as a side effect of an edit.

  Author: Mogamat Yaseen Kannemeyer 240453182
*/

import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'

import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { Sheet } from '@/components/ui/Sheet'
import { TextField } from '@/components/ui/TextField'
import { authApi } from '@/lib/api/auth'
import { moderationApi } from '@/lib/api/moderation'
import type { Campus, ModeratedUser } from '@/lib/api/types'
import { moderatorUserSchema } from '@/lib/schemas'
import type { ModeratorUserValues } from '@/lib/schemas'

import { errorMessage } from './useLoad'

type EditUserSheetProps = {
  user: ModeratedUser | null
  onClose: () => void
  onSaved: (user: ModeratedUser) => void
}

function valuesFor(user: ModeratedUser): ModeratorUserValues {
  return {
    firstName: user.firstName,
    middleName: user.middleName ?? '',
    lastName: user.lastName,
    email: user.email,
    cellPhone: user.cellPhone ?? '',
    campusId: user.campusId ? String(user.campusId) : '',
  }
}

export function EditUserSheet({ user, onClose, onSaved }: EditUserSheetProps) {
  const [campuses, setCampuses] = useState<Campus[]>([])
  const [formError, setFormError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ModeratorUserValues>({ resolver: zodResolver(moderatorUserSchema) })

  // Clear the last attempt's error whenever a different user is opened.
  const [openedFor, setOpenedFor] = useState(user)
  if (user !== openedFor) {
    setOpenedFor(user)
    if (user) setFormError(null)
  }

  useEffect(() => {
    if (user) reset(valuesFor(user))
  }, [user, reset])

  useEffect(() => {
    let cancelled = false
    authApi
      .campuses()
      .then((list) => {
        if (!cancelled) setCampuses(list)
      })
      .catch(() => {
        // The campus picker is optional; the rest of the form still works.
      })
    return () => {
      cancelled = true
    }
  }, [])

  const onSubmit = handleSubmit(async (values) => {
    if (!user) return
    setFormError(null)
    try {
      const saved = await moderationApi.updateUser(user.userId, {
        firstName: values.firstName,
        middleName: values.middleName,
        lastName: values.lastName,
        email: values.email,
        cellPhone: values.cellPhone,
        campusId: values.campusId ? Number(values.campusId) : null,
      })
      onSaved(saved)
    } catch (caught) {
      setFormError(errorMessage(caught))
    }
  })

  return (
    <Sheet
      open={user !== null}
      onClose={onClose}
      dismissible={!isSubmitting}
      title="Edit user details"
      description={user ? `${user.firstName} ${user.lastName} · #${user.userId}` : undefined}
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" className="sm:w-auto" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" form="edit-user-form" className="sm:w-auto" loading={isSubmitting}>
            Save changes
          </Button>
        </div>
      }
    >
      <form id="edit-user-form" onSubmit={onSubmit} noValidate className="space-y-4">
        {formError && <Alert>{formError}</Alert>}
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="First name" error={errors.firstName?.message} {...register('firstName')} />
          <TextField label="Last name" error={errors.lastName?.message} {...register('lastName')} />
        </div>
        <TextField label="Middle name (optional)" error={errors.middleName?.message} {...register('middleName')} />
        <TextField
          label="CPUT email"
          type="email"
          hint="Changing this changes how they sign in."
          error={errors.email?.message}
          {...register('email')}
        />
        <TextField
          label="Cell phone (optional)"
          inputMode="tel"
          error={errors.cellPhone?.message}
          {...register('cellPhone')}
        />
        {campuses.length > 0 && (
          <Select id="moderate-campus" label="Campus" {...register('campusId')}>
            <option value="">No campus</option>
            {campuses.map((campus) => (
              <option key={campus.campusId} value={campus.campusId}>
                {campus.name}
              </option>
            ))}
          </Select>
        )}
      </form>
    </Sheet>
  )
}
