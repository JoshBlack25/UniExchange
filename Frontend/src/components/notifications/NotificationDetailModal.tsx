/*
  NotificationDetailModal - opens when a row is clicked. Deliberately shows
  only fields that actually exist on Notification (title, content, type,
  createdAt, read) - no fabricated seller handles, meetup locations, or
  escrow copy, since none of that is backed by real data yet (Notification
  has no structured fields for price/location/etc., just a plain `content`
  string). See notificationRoute.ts for the "what can I fit here later"
  path (e.g. enriching LISTING notifications with a real listing lookup).

  Marks the notification read as soon as it's opened (same optimistic
  update NotificationsPage already does for a direct row click) - the
  caller passes an already-updated `notification` in, this component
  doesn't call the API itself.

  Built on the shared Sheet (variant="dialog"): a bottom sheet on phones, a
  centred dialog from sm up, with focus trap, Esc, scrim close and scroll
  lock handled there rather than hand-rolled here.

  OWNER: Joshua Reid Adams (230317693)
*/

import { ArrowRight, Clock } from "@phosphor-icons/react";
import { useNavigate } from "react-router-dom";

import { NotificationIcon } from "./NotificationIcon";
import { NOTIFICATION_TYPE_LABEL } from "./notificationLabels";
import { notificationRoute } from "./notificationRoute";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import type { Notification } from "@/lib/api/types";

type NotificationDetailModalProps = {
  notification: Notification;
  onClose: () => void;
};

function fullTimestamp(iso: string): string {
  const date = new Date(iso);
  const datePart = date.toLocaleDateString("en-ZA", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  const timePart = date.toLocaleTimeString("en-ZA", {
    hour: "numeric",
    minute: "2-digit",
  });
  return `${datePart} at ${timePart}`;
}

export function NotificationDetailModal({
  notification,
  onClose,
}: NotificationDetailModalProps) {
  const navigate = useNavigate();
  const route = notificationRoute(notification);

  return (
    <Sheet
      open
      onClose={onClose}
      variant="dialog"
      title={notification.title}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} className="sm:w-auto">
            Dismiss
          </Button>
          {route && (
            <Button
              onClick={() => navigate(route.path)}
              className="sm:w-auto"
              data-autofocus
            >
              {route.label}
              <ArrowRight aria-hidden="true" className="size-4" />
            </Button>
          )}
        </>
      }
    >
      <div className="flex items-center gap-3">
        <NotificationIcon type={notification.type} className="size-11" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-fg">
            {NOTIFICATION_TYPE_LABEL[notification.type]}
          </p>
          <p className="mt-0.5 flex items-center gap-1.5 text-xs text-fg-muted">
            <Clock aria-hidden="true" className="size-3.5" />
            {fullTimestamp(notification.createdAt)}
          </p>
        </div>
      </div>

      {notification.content && (
        <p className="mt-4 whitespace-pre-line rounded-2xl bg-surface-muted p-4 text-[0.9375rem] leading-relaxed text-fg">
          {notification.content}
        </p>
      )}
    </Sheet>
  );
}
