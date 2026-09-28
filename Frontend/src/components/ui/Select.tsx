/*
  Dropdown matching TextField's look. Use this instead of hand-writing a
  <select> and copying the class string.

  Pass options as children, exactly like a native select:

    <Select label="Campus" {...register('campusId')}>
      <option value="">Choose a campus</option>
      {campuses.map((c) => <option key={c.campusId} value={c.campusId}>{c.name}</option>)}
    </Select>
*/

type SelectProps = React.ComponentProps<'select'> & {
  label: string
  error?: string
  hint?: string
}

export function Select({ label, error, hint, id, className = '', children, ref, ...rest }: SelectProps) {
  const selectId = id ?? rest.name
  const describedBy = error ? `${selectId}-error` : hint ? `${selectId}-hint` : undefined

  return (
    <div className="space-y-1.5">
      <label htmlFor={selectId} className="block text-sm font-medium text-fg">
        {label}
      </label>

      <select
        {...rest}
        id={selectId}
        ref={ref}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={
          'block min-h-11 w-full rounded-xl border bg-surface px-3.5 py-2.5 text-sm text-fg shadow-xs transition ' +
          'hover:border-line-strong focus:border-brand-500 focus:outline-2 focus:outline-offset-0 disabled:bg-surface-muted disabled:text-fg-subtle ' +
          (error
            ? 'border-red-300 focus:outline-red-500/40 '
            : 'border-line-strong focus:outline-brand-500/30 ') +
          className
        }
      >
        {children}
      </select>

      {error ? (
        <p id={`${selectId}-error`} className="text-xs text-red-600">
          {error}
        </p>
      ) : hint ? (
        <p id={`${selectId}-hint`} className="text-xs text-fg-subtle">
          {hint}
        </p>
      ) : null}
    </div>
  )
}
