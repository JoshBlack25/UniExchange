type TextFieldProps = React.ComponentProps<'input'> & {
  label: string
  error?: string
  hint?: string
}

export function TextField({ label, error, hint, id, className = '', ref, ...rest }: TextFieldProps) {
  const inputId = id ?? rest.name
  const describedBy = error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined

  return (
    <div className="space-y-1.5">
      <label htmlFor={inputId} className="block text-sm font-medium text-fg">
        {label}
      </label>

      <input
        {...rest}
        id={inputId}
        ref={ref}
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
        <p id={`${inputId}-error`} className="text-xs text-red-600">
          {error}
        </p>
      ) : hint ? (
        <p id={`${inputId}-hint`} className="text-xs text-fg-subtle">
          {hint}
        </p>
      ) : null}
    </div>
  )
}
