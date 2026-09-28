/*
  The one button. Full width by default because most buttons live at the
  bottom of a form on a phone; pass className="w-auto" for inline ones.

    <Button>Save</Button>
    <Button variant="secondary">Cancel</Button>
    <Button variant="danger" loading={deleting}>Delete</Button>
    <Button variant="ghost" size="sm" className="w-auto">Edit</Button>

  For an icon-only control use IconButton instead - it forces an aria-label.
*/

type ButtonProps = React.ComponentProps<'button'> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md'
  loading?: boolean
}

const TONES = {
  primary:
    'bg-primary text-on-primary shadow-sm shadow-primary/25 hover:bg-primary-hover',
  secondary:
    'border border-line bg-surface-muted/80 text-fg hover:bg-surface-muted hover:border-line-strong',
  ghost: 'bg-transparent text-brand-700 hover:bg-brand-50',
  danger: 'bg-danger text-white shadow-sm shadow-danger/25 hover:bg-danger-hover',
} as const

const SIZES = {
  sm: 'min-h-9 px-3 py-1.5 text-sm',
  // 44px tall: comfortable tap target on a phone.
  md: 'min-h-11 px-4 py-2.5 text-sm',
} as const

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  className = '',
  children,
  ...rest
}: ButtonProps) {
  const base =
    'inline-flex w-full items-center justify-center gap-2 rounded-xl font-semibold ' +
    'transition-[background-color,border-color,color,transform,box-shadow] duration-150 ' +
    'active:scale-[0.98] ' +
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 ' +
    'disabled:pointer-events-none disabled:opacity-50'

  return (
    <button
      {...rest}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`${base} ${SIZES[size]} ${TONES[variant]} ${className}`}
    >
      {loading && (
        <svg aria-hidden="true" viewBox="0 0 24 24" className="size-4 animate-spin">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" opacity="0.25" />
          <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="4" fill="none" strokeLinecap="round" />
        </svg>
      )}
      {children}
    </button>
  )
}
