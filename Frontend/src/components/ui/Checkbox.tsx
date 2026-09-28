/*
  Checkbox matching TextField and Select. Use this instead of hand-writing an
  <input type="checkbox"> and copying the class string.

  The label sits beside the box rather than above it, which is the one place this
  differs from the other inputs - a stacked label reads as a section heading and
  makes the control harder to hit on a phone.

    <Checkbox
      label="Remember me on this device"
      hint="Skip the emailed code next time."
      {...register('rememberMe')}
    />

  Author: Mogamat Yaseen Kannemeyer 240453182
*/

type CheckboxProps = Omit<React.ComponentProps<'input'>, 'type'> & {
  label: string
  error?: string
  hint?: string
}

export function Checkbox({ label, error, hint, id, className = '', ref, ...rest }: CheckboxProps) {
  const inputId = id ?? rest.name
  const describedBy = error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined

  return (
    <div className="space-y-1.5">
      {/* The whole row is the label, so tapping the text toggles the box too. */}
      <label htmlFor={inputId} className="flex min-h-6 cursor-pointer items-start gap-2.5">
        <input
          {...rest}
          type="checkbox"
          id={inputId}
          ref={ref}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={
            'mt-0.5 size-4 shrink-0 rounded border-line-strong accent-[var(--ux-primary)] ' +
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 ' +
            className
          }
        />
        <span className="text-sm text-fg select-none">{label}</span>
      </label>

      {error ? (
        <p id={`${inputId}-error`} className="text-xs text-red-600">
          {error}
        </p>
      ) : hint ? (
        // Indented to line up with the label text, not the box.
        <p id={`${inputId}-hint`} className="pl-[26px] text-xs text-fg-subtle">
          {hint}
        </p>
      ) : null}
    </div>
  )
}
