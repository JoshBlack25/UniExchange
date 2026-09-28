/*
  Modal surface that adapts to the screen: a bottom sheet on a phone (thumb
  reach, swipe-feel), and either a right-hand panel or a centred dialog from
  sm up.

    <Sheet open={open} onClose={close} title="Filters">…</Sheet>
    <Sheet open={open} onClose={close} title="Confirm" variant="dialog" footer={<Button>Send</Button>}>…</Sheet>

  Handles the accessibility plumbing so callers don't: role="dialog" +
  aria-modal, labelled by the title, focus moves in on open and back to the
  trigger on close, Tab is trapped inside, Esc and the scrim close it, and the
  page behind stops scrolling.
*/

import { X } from '@phosphor-icons/react'
import { useEffect, useId, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

import { IconButton } from './IconButton'

type SheetProps = {
  open: boolean
  onClose: () => void
  title: ReactNode
  description?: ReactNode
  children: ReactNode
  /** Sticky action row at the bottom - usually one or two Buttons. */
  footer?: ReactNode
  /** "panel" slides in from the right on desktop; "dialog" is centred. */
  variant?: 'panel' | 'dialog'
  /** Block Esc / scrim close, e.g. while a request is in flight. */
  dismissible?: boolean
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

export function Sheet({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  variant = 'panel',
  dismissible = true,
}: SheetProps) {
  const titleId = useId()
  const descriptionId = useId()
  const panel = useRef<HTMLDivElement>(null)
  const onCloseRef = useRef(onClose)
  const dismissibleRef = useRef(dismissible)

  useEffect(() => {
    onCloseRef.current = onClose
    dismissibleRef.current = dismissible
  })

  useEffect(() => {
    if (!open) return

    const previouslyFocused = document.activeElement as HTMLElement | null
    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'

    const first = panel.current?.querySelector<HTMLElement>('[data-autofocus]') ??
      panel.current?.querySelector<HTMLElement>(FOCUSABLE)
    ;(first ?? panel.current)?.focus()

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && dismissibleRef.current) {
        event.stopPropagation()
        onCloseRef.current()
        return
      }
      if (event.key !== 'Tab' || !panel.current) return

      const nodes = Array.from(panel.current.querySelectorAll<HTMLElement>(FOCUSABLE))
      if (nodes.length === 0) return
      const firstNode = nodes[0]
      const lastNode = nodes[nodes.length - 1]
      if (event.shiftKey && document.activeElement === firstNode) {
        event.preventDefault()
        lastNode.focus()
      } else if (!event.shiftKey && document.activeElement === lastNode) {
        event.preventDefault()
        firstNode.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = overflow
      previouslyFocused?.focus?.()
    }
  }, [open])

  if (!open) return null

  const position =
    variant === 'dialog'
      ? 'sm:inset-auto sm:left-1/2 sm:top-1/2 sm:w-full sm:max-w-lg sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl sm:animate-pop-in'
      : 'sm:inset-y-3 sm:left-auto sm:right-3 sm:top-3 sm:w-full sm:max-w-md sm:rounded-3xl sm:animate-sheet-left'

  return createPortal(
    <div className="fixed inset-0 z-50">
      <div
        aria-hidden="true"
        className="absolute inset-0 animate-fade-in bg-slate-950/45 backdrop-blur-[2px]"
        onClick={() => dismissible && onClose()}
      />

      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        className={
          'glass-strong absolute inset-x-0 bottom-0 flex max-h-[88dvh] animate-sheet-up flex-col ' +
          'rounded-t-3xl border shadow-float outline-none ' +
          position
        }
      >
        {/* Grab handle - a visual cue on phones that this is a sheet. */}
        <div aria-hidden="true" className="mx-auto mt-2.5 h-1.5 w-10 rounded-full bg-line-strong sm:hidden" />

        <div className="flex items-start gap-3 px-5 pb-3 pt-3 sm:pt-5">
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="text-lg font-semibold tracking-tight text-fg">
              {title}
            </h2>
            {description && (
              <p id={descriptionId} className="mt-0.5 text-sm text-fg-muted">
                {description}
              </p>
            )}
          </div>
          {dismissible && (
            <IconButton label="Close" size="sm" onClick={onClose}>
              <X className="size-5" />
            </IconButton>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-5">{children}</div>

        {footer && (
          <div className="pb-safe border-t border-line px-5 pt-3">
            <div className="flex flex-col-reverse gap-2 pb-3 sm:flex-row sm:justify-end">{footer}</div>
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}
