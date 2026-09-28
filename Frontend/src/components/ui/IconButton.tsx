/*
  Round icon-only button - top bar actions, close buttons, card overflow.
  `label` is required and becomes the accessible name, so an icon button can
  never ship unlabelled.

    <IconButton label="Close" onClick={onClose}><X className="size-5" /></IconButton>
*/

type IconButtonProps = Omit<React.ComponentProps<'button'>, 'aria-label'> & {
  label: string
  tone?: 'plain' | 'soft'
  size?: 'sm' | 'md'
}

const TONES = {
  plain: 'text-fg-muted hover:bg-surface-muted hover:text-fg',
  soft: 'bg-surface-muted text-fg hover:bg-gray-200',
} as const

const SIZES = {
  sm: 'size-9',
  md: 'size-11',
} as const

export function IconButton({
  label,
  tone = 'soft',
  size = 'md',
  className = '',
  children,
  type = 'button',
  ...rest
}: IconButtonProps) {
  return (
    <button
      {...rest}
      type={type}
      aria-label={label}
      title={label}
      className={
        'inline-grid shrink-0 place-items-center rounded-full transition duration-150 active:scale-95 ' +
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 ' +
        'disabled:pointer-events-none disabled:opacity-50 ' +
        `${SIZES[size]} ${TONES[tone]} ${className}`
      }
    >
      {children}
    </button>
  )
}
