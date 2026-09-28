/*
  NotificationFilters - the All / Unread / Messages / Listings / Transactions
  / Bulletin / System pill row. Same pill visual language as
  components/feed/CategoryChips.tsx and ConditionFilter.tsx, kept local
  here rather than imported across pages per the components-are-page-scoped
  convention (see components/notifications/README.md).

  Filtering itself is client-side in NotificationsPage, same pattern as
  Feed's sort - notificationsApi.forUser already returns everything.

  OWNER: Joshua Reid Adams (230317693)
*/

import type { Notification } from "@/lib/api/types";

export type NotificationFilterKey = "ALL" | "UNREAD" | Notification["type"];

type NotificationFiltersProps = {
  active: NotificationFilterKey;
  unreadCount: number;
  onChange: (key: NotificationFilterKey) => void;
};

const TABS: { key: NotificationFilterKey; label: string }[] = [
  { key: "ALL", label: "All" },
  { key: "UNREAD", label: "Unread" },
  { key: "MESSAGE", label: "Messages" },
  { key: "LISTING", label: "Listings" },
  { key: "TRANSACTION", label: "Transactions" },
  { key: "BULLETIN", label: "Bulletin" },
  { key: "SYSTEM", label: "System" },
];

const PILL_BASE =
  "inline-flex min-h-11 shrink-0 snap-start items-center gap-1.5 whitespace-nowrap rounded-full border px-4 text-sm font-semibold transition active:scale-[0.97] " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500";
const PILL_ACTIVE = "border-transparent bg-primary text-on-primary shadow-sm shadow-primary/25";
const PILL_IDLE = "glass-card text-fg hover:border-brand-300";

export function NotificationFilters({
  active,
  unreadCount,
  onChange,
}: NotificationFiltersProps) {
  return (
    // Toggle buttons (aria-pressed) rather than tabs: they filter one list,
    // they don't swap between panels. The row bleeds to the screen edge on
    // phones so it reads as scrollable.
    <div
      role="group"
      aria-label="Filter notifications"
      className="scroller-x -mx-3 flex gap-2 px-3 py-0.5 sm:mx-0 sm:px-0"
    >
      {TABS.map((tab) => (
        <button
          key={tab.key}
          type="button"
          aria-pressed={active === tab.key}
          onClick={() => onChange(tab.key)}
          className={`${PILL_BASE} ${active === tab.key ? PILL_ACTIVE : PILL_IDLE}`}
        >
          {tab.label}
          {tab.key === "UNREAD" && unreadCount > 0 && (
            <span
              className={
                "grid h-5 min-w-5 place-items-center rounded-full px-1 text-[11px] font-bold tabular-nums " +
                (active === tab.key
                  ? "bg-on-primary/20 text-on-primary"
                  : "bg-primary text-on-primary")
              }
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
