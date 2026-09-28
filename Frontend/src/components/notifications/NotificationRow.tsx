/*
  NotificationRow - one row in the /notifications list. Facebook-style: a
  rounded row inside the day's card, the type icon in a coloured circle,
  and unread rows tinted brand with a blue dot on the right (plus a
  screen-reader "Unread" so the state is never colour-only).

  OWNER: Joshua Reid Adams (230317693)
*/

import { NotificationIcon } from "./NotificationIcon";
import type { Notification } from "@/lib/api/types";

type NotificationRowProps = {
  notification: Notification;
  onOpen: (notification: Notification) => void;
};

function timeAgo(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-ZA", {
    day: "numeric",
    month: "short",
  });
}

export function NotificationRow({
  notification,
  onOpen,
}: NotificationRowProps) {
  const unread = !notification.read;

  return (
    <li>
      <button
        type="button"
        onClick={() => onOpen(notification)}
        className={
          "flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 text-left transition active:scale-[0.99] " +
          "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand-500 " +
          (unread ? "bg-brand-50 hover:bg-brand-100" : "hover:bg-surface-muted")
        }
      >
        <NotificationIcon type={notification.type} />

        <span className="min-w-0 flex-1">
          <span
            className={`block text-[0.9375rem] leading-snug text-fg ${unread ? "font-semibold" : "font-medium"}`}
          >
            {notification.title}
          </span>
          {notification.content && (
            <span className="mt-0.5 line-clamp-2 text-sm text-fg-muted">
              {notification.content}
            </span>
          )}
          <span
            className={`mt-1 block text-xs ${unread ? "font-semibold text-brand-700" : "text-fg-muted"}`}
          >
            {timeAgo(notification.createdAt)}
          </span>
        </span>

        {unread && (
          <span className="shrink-0 px-1">
            <span aria-hidden="true" className="block size-3 rounded-full bg-primary" />
            <span className="sr-only">Unread</span>
          </span>
        )}
      </button>
    </li>
  );
}
