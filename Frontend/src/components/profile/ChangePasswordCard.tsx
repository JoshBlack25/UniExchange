/*
  Change your own password, including replacing a temporary one a moderator
  had emailed you. The backend signs out every other session and returns a
  fresh token for this one, so the student stays signed in here.

  Author: Mogamat Yaseen Kannemeyer 240453182
*/

import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'

import { useAuth } from '@/auth/useAuth'
import { errorMessage } from '@/components/moderation/useLoad'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { TextField } from '@/components/ui/TextField'
import { authApi } from '@/lib/api/auth'
import { changePasswordSchema } from '@/lib/schemas'
import type { ChangePasswordValues } from '@/lib/schemas'

export function ChangePasswordCard() {
  const { session, signIn } = useAuth()
  const [formError, setFormError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  })

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null)
    setSaved(false)
    const remembered = session?.remembered ?? false
    try {
      const response = await authApi.changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
        rememberMe: remembered,
      })
      signIn(response, remembered)
      reset()
      setSaved(true)
    } catch (caught) {
      setFormError(errorMessage(caught))
    }
  })

  return (
    <Card>
      <h2 className="text-sm font-semibold text-fg">Change password</h2>
      <p className="mt-0.5 text-sm text-fg-muted">
        You stay signed in here. Every other device is signed out.
      </p>

      <form onSubmit={onSubmit} noValidate className="mt-4 space-y-4">
        {saved && <Alert tone="success">Your password was changed.</Alert>}
        {formError && <Alert>{formError}</Alert>}
        <TextField
          label="Current password"
          type="password"
          autoComplete="current-password"
          error={errors.currentPassword?.message}
          {...register('currentPassword')}
        />
        <TextField
          label="New password"
          type="password"
          autoComplete="new-password"
          error={errors.newPassword?.message}
          {...register('newPassword')}
        />
        <TextField
          label="Confirm new password"
          type="password"
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />
        <Button type="submit" className="sm:w-auto" loading={isSubmitting}>
          Change password
        </Button>
      </form>
    </Card>
  )
}
