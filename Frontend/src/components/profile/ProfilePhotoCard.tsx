/*
  Profile picture: upload, replace or remove your own. Shown on the Account tab.

  The file is checked here for type and size so a wrong file fails instantly,
  but the backend is what decides - it reads the actual bytes, not the name or
  the declared type. A preview shows before anything is uploaded.

  Author: Mogamat Yaseen Kannemeyer 240453182
*/

import { Camera, Trash } from '@phosphor-icons/react'
import { useEffect, useId, useMemo, useRef, useState } from 'react'

import { useAuth } from '@/auth/useAuth'
import { errorMessage } from '@/components/moderation/useLoad'
import { Alert } from '@/components/ui/Alert'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { photoSrc, profilePhotosApi } from '@/lib/api/profilePhotos'

const MAX_BYTES = 5 * 1024 * 1024
const ACCEPT = 'image/jpeg,image/png,image/webp,image/gif'

export function ProfilePhotoCard() {
  const { user, updateUser } = useAuth()
  const inputId = useId()
  const input = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  // Object URLs hold the file in memory until revoked.
  const preview = useMemo(() => (file ? URL.createObjectURL(file) : null), [file])
  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview)
  }, [preview])

  if (!user) return null
  const fullName = `${user.firstName} ${user.lastName}`
  const hasPhoto = !!user.profilePhotoUrl

  function choose(picked: File | undefined) {
    setError(null)
    setNotice(null)
    if (!picked) return
    if (!ACCEPT.split(',').includes(picked.type)) {
      setError('Use a JPEG, PNG, WebP or GIF image.')
      return
    }
    if (picked.size > MAX_BYTES) {
      setError('Your photo must be 5 MB or smaller.')
      return
    }
    setFile(picked)
  }

  function clearPick() {
    setFile(null)
    if (input.current) input.current.value = ''
  }

  async function save() {
    if (!file) return
    setBusy(true)
    setError(null)
    try {
      updateUser(await profilePhotosApi.upload(file))
      clearPick()
      setNotice('Your new photo is up.')
    } catch (caught) {
      setError(errorMessage(caught))
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    setBusy(true)
    setError(null)
    try {
      updateUser(await profilePhotosApi.remove())
      setNotice('Your photo was removed.')
    } catch (caught) {
      setError(errorMessage(caught))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card className="mb-4">
      <h3 className="text-base font-semibold text-fg">Profile photo</h3>
      <p className="mt-0.5 text-sm text-fg-muted">Shown on your profile, your listings and in chats.</p>

      <div className="mt-4 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
        {preview ? (
          <img src={preview} alt="Preview of your new photo" className="size-24 rounded-full object-cover shadow-sm" />
        ) : (
          <Avatar name={fullName} src={photoSrc(user)} className="size-24" />
        )}

        <div className="min-w-0 flex-1 space-y-3">
          {error && <Alert>{error}</Alert>}
          {notice && <Alert tone="success">{notice}</Alert>}

          <input
            ref={input}
            id={inputId}
            type="file"
            accept={ACCEPT}
            className="sr-only"
            onChange={(event) => choose(event.target.files?.[0])}
          />

          {file ? (
            <div className="flex flex-wrap gap-2">
              <Button size="sm" loading={busy} onClick={save}>
                Save photo
              </Button>
              <Button size="sm" variant="secondary" disabled={busy} onClick={clearPick}>
                Cancel
              </Button>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              <label
                htmlFor={inputId}
                className={
                  'inline-flex min-h-9 cursor-pointer items-center gap-2 rounded-xl border border-line-strong ' +
                  'bg-surface px-3 py-1.5 text-sm font-semibold text-fg shadow-sm transition hover:bg-surface-muted ' +
                  'focus-within:outline-2 focus-within:outline-brand-500'
                }
              >
                <Camera aria-hidden="true" className="size-4" />
                {hasPhoto ? 'Change photo' : 'Upload a photo'}
              </label>
              {hasPhoto && (
                <Button size="sm" variant="ghost" loading={busy} onClick={remove}>
                  <Trash aria-hidden="true" className="size-4" />
                  Remove
                </Button>
              )}
            </div>
          )}
          <p className="text-xs text-fg-muted">JPEG, PNG, WebP or GIF, up to 5 MB.</p>
        </div>
      </div>
    </Card>
  )
}
