/*
  Wordmark. The project has no brand asset yet, so this is type plus a simple
  exchange glyph rather than a placeholder image.

  `compact` drops the wordmark and keeps the glyph - the phone top bar uses it
  when the search field needs the room.
*/

export function Logo({ className = '', compact = false }: { className?: string; compact?: boolean }) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <span
        aria-hidden="true"
        className="grid size-10 place-items-center rounded-full bg-gradient-to-br from-brand-400 to-brand-500 text-white shadow-md shadow-brand-500/30"
      >
        <svg viewBox="0 0 24 24" fill="none" className="size-5">
          <path
            d="M4 8h13l-3-3M20 16H7l3 3"
            stroke="currentColor"
            strokeWidth="2.25"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      {!compact && (
        <span className="text-lg font-bold tracking-tight text-fg">
          Uni<span className="text-brand-600">Exchange</span>
        </span>
      )}
    </div>
  )
}
