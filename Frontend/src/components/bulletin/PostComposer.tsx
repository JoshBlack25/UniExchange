/*
  The bulletin post form - used both for a new post (BulletinPage, behind the
  collapsed "What's on your mind?" card) and for editing one in place
  (PostCard). It renders a bare <form>; the caller supplies the card around it.

  Photo: one optional image, either uploaded through UploadController or
  pasted as a URL - both end up in the same imageUrl field.
*/

import { zodResolver } from '@hookform/resolvers/zod'
import { ImageSquare, LinkSimple, UploadSimple } from '@phosphor-icons/react'
import { useRef, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'

import { ALL_CATEGORIES, CATEGORY_LABELS } from '@/components/bulletin/categoryLabels'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { TextField } from '@/components/ui/TextField'
import { Textarea } from '@/components/ui/Textarea'
import { ApiError } from '@/lib/api/client'
import { uploadsApi } from '@/lib/api/uploads'
import { safeUrl } from '@/lib/safeUrl'
import type { BulletinPostValues } from '@/lib/schemas'
import { bulletinPostSchema } from '@/lib/schemas'

const ACCEPTED_IMAGE_TYPES = 'image/png,image/jpeg,image/gif,image/webp'

type PostComposerProps = {
  onSubmit: (values: BulletinPostValues) => Promise<void>
  initialValues?: BulletinPostValues
  submitLabel?: string
  onCancel?: () => void
  /** Focus the title as soon as the form mounts - e.g. after "What's on your mind?" is tapped. */
  autoFocus?: boolean
  /** Open with the photo picker already showing (the composer card's Photo shortcut). */
  startWithPhoto?: boolean
}

export function PostComposer({
  onSubmit,
  initialValues,
  submitLabel = 'Post',
  onCancel,
  autoFocus = false,
  startWithPhoto = false,
}: PostComposerProps) {
  const {
    register,
    handleSubmit,
    reset,
    setError,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm<BulletinPostValues>({
    resolver: zodResolver(bulletinPostSchema),
    defaultValues: initialValues ?? { category: 'GENERAL' },
  })
  const [showPhotoInput, setShowPhotoInput] = useState(startWithPhoto || Boolean(initialValues?.imageUrl))
  const [photoMode, setPhotoMode] = useState<'upload' | 'url'>(initialValues?.imageUrl ? 'url' : 'upload')
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const imageUrl = useWatch({ control, name: 'imageUrl' })
  const previewUrl = safeUrl(imageUrl)

  const submit = handleSubmit(async (values) => {
    try {
      await onSubmit(values)
      if (!initialValues) {
        reset()
        setShowPhotoInput(false)
        setPhotoMode('upload')
      }
    } catch {
      setError('root', { message: "Couldn't post that. Please try again." })
    }
  })

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    setUploadError(null)
    setUploading(true)
    try {
      const { url } = await uploadsApi.image(file)
      setValue('imageUrl', url, { shouldValidate: true, shouldDirty: true })
    } catch (error) {
      setUploadError(error instanceof ApiError ? error.message : 'Could not upload that image.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      {errors.root && <Alert>{errors.root.message}</Alert>}

      <TextField
        label="Title"
        placeholder="What's this about?"
        autoFocus={autoFocus}
        error={errors.title?.message}
        {...register('title')}
      />

      <Textarea
        label="What's happening on campus?"
        placeholder="Share an announcement, event, or notice..."
        rows={4}
        error={errors.content?.message}
        {...register('content')}
      />

      <Select label="Category" error={errors.category?.message} {...register('category')}>
        {ALL_CATEGORIES.map((category) => (
          <option key={category} value={category}>
            {CATEGORY_LABELS[category]}
          </option>
        ))}
      </Select>

      {showPhotoInput && (
        <div className="space-y-3 rounded-2xl border border-line bg-surface-muted/60 p-3">
          {/* Segmented control: upload a file, or paste a link. */}
          <div className="grid grid-cols-2 gap-1 rounded-xl bg-surface-muted p-1" role="group" aria-label="Photo source">
            {(
              [
                ['upload', 'Upload', UploadSimple],
                ['url', 'Paste a link', LinkSimple],
              ] as const
            ).map(([mode, label, Icon]) => (
              <button
                key={mode}
                type="button"
                onClick={() => setPhotoMode(mode)}
                aria-pressed={photoMode === mode}
                className={
                  'inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg text-sm font-semibold transition ' +
                  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 ' +
                  (photoMode === mode ? 'bg-surface text-fg shadow-sm' : 'text-fg-muted hover:text-fg')
                }
              >
                <Icon aria-hidden="true" className="size-4" />
                {label}
              </button>
            ))}
          </div>

          {photoMode === 'upload' ? (
            <div className="space-y-1.5">
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED_IMAGE_TYPES}
                className="hidden"
                onChange={handleFileChange}
              />
              <Button
                type="button"
                variant="secondary"
                loading={uploading}
                onClick={() => fileInputRef.current?.click()}
              >
                <ImageSquare aria-hidden="true" className="size-5" />
                {imageUrl ? 'Choose a different photo' : 'Choose a photo'}
              </Button>
              {uploadError && <p className="text-xs text-red-600">{uploadError}</p>}
            </div>
          ) : (
            <TextField
              label="Image URL"
              placeholder="https://..."
              error={errors.imageUrl?.message}
              {...register('imageUrl')}
            />
          )}

          {previewUrl && (
            <img
              src={previewUrl}
              alt="Selected photo preview"
              className="max-h-48 w-full rounded-xl border border-line object-cover"
            />
          )}
        </div>
      )}

      {/* "Add to your post" bar, as on Facebook's composer. */}
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-line px-3 py-1.5">
        <span className="mr-auto text-sm font-medium text-fg">Add to your post</span>
        <button
          type="button"
          onClick={() =>
            setShowPhotoInput((shown) => {
              if (shown) {
                setValue('imageUrl', '')
                setUploadError(null)
                setPhotoMode('upload')
              }
              return !shown
            })
          }
          aria-pressed={showPhotoInput}
          className={
            'inline-flex min-h-11 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold transition active:scale-[0.98] ' +
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 ' +
            (showPhotoInput ? 'bg-emerald-50 text-emerald-700' : 'text-fg-muted hover:bg-surface-muted hover:text-fg')
          }
        >
          <ImageSquare aria-hidden="true" weight={showPhotoInput ? 'fill' : 'regular'} className="size-5 text-emerald-600" />
          {showPhotoInput ? 'Remove photo' : 'Photo'}
        </button>
      </div>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        {onCancel && (
          <Button type="button" variant="secondary" className="sm:w-auto" disabled={isSubmitting} onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" className="sm:w-auto sm:min-w-28" loading={isSubmitting}>
          {submitLabel}
        </Button>
      </div>
    </form>
  )
}
