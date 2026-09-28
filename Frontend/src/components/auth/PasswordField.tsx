/*
  TextField for passwords, plus a show/hide toggle - mistyped passwords are
  the most common sign-in failure on a phone keyboard.

  A thin wrapper so it keeps TextField's label, hint and error markup: the
  toggle is positioned over the right end of the input (offset past the
  label), and the input gets right padding so text never runs under it.
  Drop-in for react-hook-form: {...register('password')} works as before.
*/

import { Eye, EyeSlash } from '@phosphor-icons/react'
import { useState } from 'react'

import { TextField } from '@/components/ui/TextField'

type PasswordFieldProps = Omit<React.ComponentProps<typeof TextField>, 'type'>

export function PasswordField({ className = '', ref, ...rest }: PasswordFieldProps) {
  const [visible, setVisible] = useState(false)

  return (
    <div className="relative">
      <TextField {...rest} ref={ref} type={visible ? 'text' : 'password'} className={`pr-12 ${className}`} />
      {/* top = label line (20px) + TextField's space-y-1.5 gap (6px) + (44px input - 40px button) / 2 */}
      <button
        type="button"
        onClick={() => setVisible((shown) => !shown)}
        aria-pressed={visible}
        aria-label={visible ? 'Hide password' : 'Show password'}
        title={visible ? 'Hide password' : 'Show password'}
        className={
          'absolute right-1 top-7 grid size-10 place-items-center rounded-lg text-fg-muted transition ' +
          'hover:bg-surface-muted hover:text-fg active:scale-95 ' +
          'focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-brand-500'
        }
      >
        {visible ? (
          <EyeSlash aria-hidden="true" className="size-5" />
        ) : (
          <Eye aria-hidden="true" className="size-5" />
        )}
      </button>
    </div>
  )
}
