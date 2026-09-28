/*
  Notification inbox.

  OWNER: Joshua Reid Adams (230317693)
  ROUTE: /notifications

  API (through lib/api/notifications.ts - never fetch directly):
   - notificationsApi.forUser(userId)          GET /api/notifications/user/:id
                                                (already newest-first)
   - notificationsApi.markRead(notificationId) PATCH /api/notifications/:id/read

  Filtering (All/Unread/type) and day-grouping (Today/Yesterday/Earlier This
  Week/Earlier) are client-side, same "fetch once, slice locally" pattern as
  FeedPage's sort - forUser() already returns everything for this student.

  Marking read is optimistic: the row/modal update local state immediately,
  the PATCH fires in the background, and emitNotificationsChanged() tells
  TopBar's bell to refetch its count right away instead of waiting on its
  poll interval. See lib/notificationEvents.ts and TopBar.tsx.

  Routing off a notification (row click already marks read; the modal's
  primary button navigates) is centralized in notificationRoute.ts so the
  row and the modal can't disagree about where something goes.

  Components used only by this page live in src/components/notifications/.

  Layout: a centred feed-width column (Columns narrow) - filter chips, then
  one glass card per day group. The safety callout sits in the right rail
  at xl and inline under the list below that, so it is never lost.
*/

import { Checks } from "@phosphor-icons/react";
import { useEffect, useMemo, useState } from "react";

import { useAuth } from "@/auth/useAuth";
import { groupByDay } from "@/components/notifications/groupByDay";
import { NotificationDetailModal } from "@/components/notifications/NotificationDetailModal";
import {
  NotificationFilters,
  type NotificationFilterKey,
} from "@/components/notifications/NotificationFilters";
import { NotificationRow } from "@/components/notifications/NotificationRow";
import { NotificationsSafetyCallout } from "@/components/notifications/NotificationsSafetyCallout";
import { Columns } from "@/components/layout/Columns";
import { PageHeader } from "@/components/layout/PageHeader";
import { Seo } from "@/components/seo/Seo";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { notificationsApi } from "@/lib/api/notifications";
import type { Notification } from "@/lib/api/types";
import { emitNotificationsChanged } from "@/lib/notificationEvents";

export function NotificationsPage() {
  const { session } = useAuth();
  const userId = session?.userId;

  const [notifications, setNotifications] = useState<Notification[] | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [filter, setFilter] = useState<NotificationFilterKey>("ALL");
  const [openNotification, setOpenNotification] = useState<Notification | null>(
    null,
  );

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    notificationsApi
      .forUser(userId)
      .then((results) => {
        if (!cancelled) setNotifications(results);
      })
      .catch((err: unknown) => {
        if (!cancelled)
          setError(
            err instanceof Error ? err.message : "Something went wrong.",
          );
      });

    return () => {
      cancelled = true;
    };
  }, [userId, refreshKey]);

  const unreadCount = useMemo(
    () =>
      notifications?.filter((notification) => !notification.read).length ?? 0,
    [notifications],
  );

  const filtered = useMemo(() => {
    if (!notifications) return null;
    if (filter === "ALL") return notifications;
    if (filter === "UNREAD")
      return notifications.filter((notification) => !notification.read);
    return notifications.filter((notification) => notification.type === filter);
  }, [notifications, filter]);

  const groups = useMemo(
    () => (filtered ? groupByDay(filtered) : []),
    [filtered],
  );

  function markReadLocally(notificationId: number) {
    setNotifications(
      (current) =>
        current?.map((notification) =>
          notification.notificationId === notificationId
            ? { ...notification, read: true }
            : notification,
        ) ?? current,
    );
  }

  function openRow(notification: Notification) {
    setOpenNotification(notification);
    if (!notification.read) {
      markReadLocally(notification.notificationId);
      notificationsApi
        .markRead(notification.notificationId)
        .then(() => emitNotificationsChanged())
        .catch(() => {
          // Non-critical: worst case the row shows read but the backend
          // still has it unread, which a refresh will reconcile.
        });
    }
  }

  function markAllAsRead() {
    const unread =
      notifications?.filter((notification) => !notification.read) ?? [];
    if (unread.length === 0) return;

    setNotifications(
      (current) =>
        current?.map((notification) => ({ ...notification, read: true })) ??
        current,
    );

    Promise.allSettled(
      unread.map((notification) =>
        notificationsApi.markRead(notification.notificationId),
      ),
    ).then(() => emitNotificationsChanged());
  }

  return (
    <Columns
      narrow
      aside={<NotificationsSafetyCallout />}
      asideLabel="Safety"
    >
      <Seo
        title="Notifications"
        description="Messages, purchases, reviews and announcements on your UniExchange account."
        path="/notifications"
        noindex
      />
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-2">
            Notifications
            {unreadCount > 0 && (
              <Badge tone="brand">
                <span className="tabular-nums">{unreadCount}</span> unread
              </Badge>
            )}
          </span>
        }
        subtitle="Messages, sales and campus news"
        action={
          unreadCount > 0 ? (
            <Button
              variant="ghost"
              onClick={markAllAsRead}
              className="w-auto -mx-2 whitespace-nowrap"
            >
              <Checks aria-hidden="true" className="size-5 shrink-0" />
              <span className="hidden sm:inline">Mark all as read</span>
              <span className="sm:hidden">Mark all read</span>
            </Button>
          ) : undefined
        }
      />

      {error && (
        <div className="mb-4">
          <Alert tone="error">
            <div className="flex items-center justify-between gap-3">
              <span>{error}</span>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setError(null);
                  setRefreshKey((key) => key + 1);
                }}
                className="w-auto shrink-0"
              >
                Retry
              </Button>
            </div>
          </Alert>
        </div>
      )}

      <NotificationFilters
        active={filter}
        unreadCount={unreadCount}
        onChange={setFilter}
      />

      <div className="mt-4">
        {notifications === null && !error ? (
          <div
            aria-hidden="true"
            className="glass-card space-y-1 rounded-2xl border p-2 shadow-glass"
          >
            {Array.from({ length: 5 }, (_, index) => (
              <div key={index} className="flex items-center gap-3 px-2.5 py-2.5">
                <span className="size-12 shrink-0 animate-pulse rounded-full bg-surface-muted" />
                <span className="flex-1 space-y-2">
                  <span className="block h-3.5 w-3/5 animate-pulse rounded-full bg-surface-muted" />
                  <span className="block h-3 w-4/5 animate-pulse rounded-full bg-surface-muted" />
                </span>
              </div>
            ))}
          </div>
        ) : error ? null : groups.length === 0 ? (
          <EmptyState
            title={
              filter === "ALL"
                ? "You're all caught up"
                : "No notifications match this filter"
            }
            description={
              filter === "ALL"
                ? "Messages, offers and campus news will show up here as they happen."
                : "Try a different filter, or switch back to All."
            }
          />
        ) : (
          <div className="space-y-4">
            {groups.map((group) => (
              <section
                key={group.label}
                aria-labelledby={`notifications-${group.label.replace(/\s+/g, "-")}`}
                className="glass-card rounded-2xl border p-2 shadow-glass"
              >
                <div className="flex items-baseline justify-between px-2.5 pb-1 pt-2">
                  <h2
                    id={`notifications-${group.label.replace(/\s+/g, "-")}`}
                    className="text-base font-semibold text-fg"
                  >
                    {group.label}
                  </h2>
                  <p className="text-xs tabular-nums text-fg-muted">
                    {group.items.length}{" "}
                    {group.items.length === 1 ? "item" : "items"}
                  </p>
                </div>
                <ul className="space-y-0.5">
                  {group.items.map((notification) => (
                    <NotificationRow
                      key={notification.notificationId}
                      notification={notification}
                      onOpen={openRow}
                    />
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>

      <div className="mt-6 xl:hidden">
        <NotificationsSafetyCallout />
      </div>

      {openNotification && (
        <NotificationDetailModal
          notification={openNotification}
          onClose={() => setOpenNotification(null)}
        />
      )}
    </Columns>
  );
}
