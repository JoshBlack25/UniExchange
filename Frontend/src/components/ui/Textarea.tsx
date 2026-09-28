/* Multi-line input matching TextField. Needed by create-listing and bulletin. */

type TextareaProps = React.ComponentProps<'textarea'> & {
  label: string
  error?: string
  hint?: string
}

export function Textarea({ label, error, hint, id, className = '', rows = 4, ref, ...rest }: TextareaProps) {
  const fieldId = id ?? rest.name
  const describedBy = error ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined

  return (
    <div className="space-y-1.5">
      <label htmlFor={fieldId} className="block text-sm font-medium text-fg">
        {label}
      </label>

      <textarea
        {...rest}
        id={fieldId}
        ref={ref}
        rows={rows}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={
          'block min-h-11 w-full rounded-xl border bg-surface px-3.5 py-2.5 text-sm text-fg shadow-xs transition ' +
          'placeholder:text-fg-subtle hover:border-line-strong focus:border-brand-500 focus:outline-2 focus:outline-offset-0 disabled:bg-surface-muted disabled:text-fg-subtle ' +
          (error
            ? 'border-red-300 focus:outline-red-500/40 '
            : 'border-line-strong focus:outline-brand-500/30 ') +
          className
        }
      />

      {error ? (
        <p id={`${fieldId}-error`} className="text-xs text-red-600">
          {error}
        </p>
      ) : hint ? (
        <p id={`${fieldId}-hint`} className="text-xs text-fg-subtle">
          {hint}
        </p>
      ) : null}
    </div>
  )
}
