/*
  CampusLiveFeed - the right-rail "Campus Live Feed" card from the desktop
  mockup. Backed by real bulletin posts now (GET /api/bulletin-posts via
  bulletinApi.list(), fetched once in FeedPage alongside the other reference
  data and passed down as `posts`).

  No fake rows: if there are no PUBLISHED posts yet, this renders a plain
  empty state instead of placeholder content, since the whole point is that
  it should only show real student activity.

  Author names: `posts` only carries `authorId`, so FeedPage separately
  resolves the distinct authors behind the visible posts via usersApi.byId
  and passes the result as `authorNames` (authorId -> "First Last"). If a
  particular lookup failed or hasn't resolved yet, that post falls back to
  "A student" rather than blocking the row.

  Owner: Joshua Reid Adams (230317693)
*/

import {
  ArrowRight,
  CalendarBlank,
  ChatsCircle,
  MagnifyingGlass,
  Megaphone,
  UsersThree,
} from "@phosphor-icons/react";
import type { Icon } from "@phosphor-icons/react";
import { Link } from "react-router-dom";

import { Card } from "@/components/ui/Card";
import type { BulletinPost } from "@/lib/api/types";

type CampusLiveFeedProps = {
  /** Recent PUBLISHED bulletin posts, newest first. Pass [] while loading or empty. */
  posts: BulletinPost[];
  /** authorId -> "First Last", for whichever authors FeedPage managed to resolve. */
  authorNames: Record<number, string>;
  loading?: boolean;
};

const CATEGORY_ICON: Record<BulletinPost["category"], Icon> = {
  GENERAL: ChatsCircle,
  EVENT: CalendarBlank,
  STUDY_GROUP: UsersThree,
  LOST_AND_FOUND: MagnifyingGlass,
};

const CATEGORY_LABEL: Record<BulletinPost["category"], string> = {
  GENERAL: "General",
  EVENT: "Event",
  STUDY_GROUP: "Study Group",
  LOST_AND_FOUND: "Lost & Found",
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

export function CampusLiveFeed({
  posts,
  authorNames,
  loading = false,
}: CampusLiveFeedProps) {
  return (
    <Card padding="none">
      <div className="flex items-center justify-between px-4 pt-4">
        <h2 className="text-base font-semibold text-fg">Campus live feed</h2>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
          <span className="relative flex size-1.5" aria-hidden="true">
            <span className="absolute inset-0 rounded-full bg-emerald-500 motion-safe:animate-ping" />
            <span className="relative size-1.5 rounded-full bg-emerald-500" />
          </span>
          Live
        </span>
      </div>

      {loading ? (
        <div className="space-y-3 p-4">
          {Array.from({ length: 3 }, (_, index) => (
            <div key={index} className="flex gap-3">
              <div className="size-9 shrink-0 animate-pulse rounded-full bg-surface-muted" />
              <div className="flex-1 space-y-1.5 pt-0.5">
                <div className="h-3.5 w-11/12 animate-pulse rounded-md bg-surface-muted" />
                <div className="h-3 w-1/3 animate-pulse rounded-md bg-surface-muted" />
              </div>
            </div>
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="m-4 rounded-xl border border-dashed border-line-strong p-4 text-center">
          <p className="text-sm font-medium text-fg">No bulletin activity yet.</p>
          <p className="mt-0.5 text-xs text-fg-muted">
            Posts on the Campus Bulletin will show up here as they happen.
          </p>
        </div>
      ) : (
        <ul className="mt-2 max-h-80 overflow-y-auto px-2 [scrollbar-width:thin]">
          {posts.map((post) => {
            const CategoryGlyph = post.facultyAnnouncement
              ? Megaphone
              : CATEGORY_ICON[post.category];
            return (
              <li key={post.bulletinPostId}>
                <Link
                  to="/bulletin"
                  className="flex gap-3 rounded-xl px-2 py-2.5 transition hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-brand-500"
                >
                  <span
                    className={`grid size-9 shrink-0 place-items-center rounded-full ${
                      post.facultyAnnouncement
                        ? "bg-brand-50 text-brand-700"
                        : "bg-surface-muted text-fg-muted"
                    }`}
                  >
                    <CategoryGlyph aria-hidden="true" className="size-4.5" />
                  </span>
                  <div className="min-w-0">
                    <p className="line-clamp-2 text-sm text-fg-muted">
                      <span className="font-semibold text-fg">
                        {authorNames[post.authorId] ?? "A student"}
                      </span>{" "}
                      posted{" "}
                      <span className="font-medium text-fg">
                        "{post.title}"
                      </span>
                    </p>
                    <p className="mt-0.5 text-xs text-fg-muted">
                      {CATEGORY_LABEL[post.category]}{" "}
                      <span aria-hidden="true">·</span>{" "}
                      {timeAgo(post.createdAt)}
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <div className="border-t border-line p-2">
        <Link
          to="/bulletin"
          className="flex min-h-11 items-center justify-center gap-1.5 rounded-xl text-sm font-semibold text-brand-700 transition hover:bg-brand-50 focus-visible:outline-2 focus-visible:outline-brand-500"
        >
          Open Campus Bulletin
          <ArrowRight aria-hidden="true" className="size-4" />
        </Link>
      </div>
    </Card>
  );
}
