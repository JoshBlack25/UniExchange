/*
  ListingCard - one item in the feed grid (T2 mockup: "2 Marketplace Feed").

  Marketplace-style anatomy (Facebook Marketplace / the desktop mockup):
    square image tile -> [status badge top-left] [favorite heart top-right]
    price (big, first - it's what people scan for)
    title (2 lines)
    description snippet (2 lines, sm and up only - phones get 2 compact columns)
    campus + time-ago line
    seller row: avatar + name

  SOLD listings stay visible but dimmed (greyed image, struck-through price).

  The seller row uses `sellerName` and `sellerAffiliation`, which the listing
  endpoints fill in from the seller's account. CPUT staff sellers read
  "Sold by CPUT staff member" under their name.

  The image tile shows `coverImageUrl` (the primary photo, picked by the backend
  for the whole page in one query). Listings with no photo - or a photo that
  fails to load - fall back to a tinted tile with the category icon.

  Owner: Joshua Reid Adams (230317693)
*/

import { Heart, MapPin, UserCircle } from "@phosphor-icons/react";
import { useState } from "react";

import { CategoryIcon } from "./CategoryIcon";
import { Avatar } from "@/components/ui/Avatar";
import { Card } from "@/components/ui/Card";
import type { Listing } from "@/lib/api/types";
import { safeUrl } from "@/lib/safeUrl";

type ListingCardProps = {
  listing: Listing;
  /** Resolved campus name for the location line; falls back to a generic label. */
  campusName?: string;
  /** Resolved category name - picks the placeholder icon on the image tile. */
  categoryName?: string;
};

const zar = new Intl.NumberFormat("en-ZA", {
  style: "currency",
  currency: "ZAR",
  maximumFractionDigits: 2,
  minimumFractionDigits: 0,
});
const DAY_MS = 24 * 60 * 60 * 1000;
/* Evaluated once per page load - render stays pure (react-hooks/purity). */
const NOW_MS = Date.now();

function timeAgo(iso: string): string {
  const seconds = Math.floor((NOW_MS - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w ago`;
  return new Date(iso).toLocaleDateString("en-ZA", {
    day: "numeric",
    month: "short",
  });
}

export function ListingCard({
  listing,
  campusName,
  categoryName,
}: ListingCardProps) {
  const isNew = NOW_MS - new Date(listing.createdAt).getTime() < DAY_MS;
  const isSold = listing.status === "SOLD";
  const [favorited, setFavorited] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const cover = imageFailed ? null : (safeUrl(listing.coverImageUrl) ?? null);

  const description = listing.description;
  const sellerName = listing.sellerName ?? null;
  const isStaffSeller = listing.sellerAffiliation === "STAFF";

  return (
    <Card
      to={`/listings/${listing.listingId}`}
      padding="none"
      className="group flex h-full flex-col overflow-hidden active:scale-[0.98]"
    >
      <div className="relative overflow-hidden bg-linear-to-br from-brand-50 via-surface-muted to-brand-100">
        <div
          className={`grid aspect-square place-items-center text-brand-600 transition duration-300 motion-safe:group-hover:scale-105 ${
            isSold ? "opacity-50 grayscale" : ""
          }`}
        >
          {cover ? (
            <img
              src={cover}
              alt={listing.title}
              loading="lazy"
              decoding="async"
              onError={() => setImageFailed(true)}
              className="size-full object-cover"
            />
          ) : (
            <CategoryIcon
              name={categoryName ?? ""}
              weight="duotone"
              className="size-12 opacity-70 sm:size-14"
            />
          )}
        </div>

        {/* Top-left status badge. */}
        {(isSold || isNew) && (
          <span
            className={`absolute left-2 top-2 rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide shadow-sm ${
              isSold
                ? "bg-slate-950/70 text-white"
                : "bg-emerald-50 text-emerald-700"
            }`}
          >
            {isSold ? "Sold" : "New"}
          </span>
        )}

        {/* Top-right favorite toggle, visual only for now. The button is a
            40px hit area around a 32px glass disc. */}
        <button
          type="button"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            setFavorited((value) => !value);
          }}
          aria-pressed={favorited}
          aria-label={favorited ? "Remove from favorites" : "Add to favorites"}
          className="absolute right-1 top-1 grid size-10 place-items-center rounded-full focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand-500"
        >
          <span
            className={`glass-strong grid size-8 place-items-center rounded-full border shadow-sm transition active:scale-90 ${
              favorited ? "text-red-600" : "text-fg-muted hover:text-red-600"
            }`}
          >
            <Heart
              aria-hidden="true"
              weight={favorited ? "fill" : "bold"}
              className="size-4"
            />
          </span>
        </button>
      </div>

      <div className="flex flex-1 flex-col p-2.5 sm:p-3">
        <p
          className={`text-base font-bold tabular-nums sm:text-lg ${
            isSold ? "text-fg-muted line-through" : "text-fg"
          }`}
        >
          {zar.format(listing.price)}
        </p>

        <h3 className="mt-0.5 line-clamp-2 text-sm leading-snug font-medium text-fg">
          {listing.title}
        </h3>

        {description && (
          <p className="mt-1 hidden text-xs text-fg-muted sm:line-clamp-2">
            {description}
          </p>
        )}

        <p className="mt-1.5 flex min-w-0 items-center gap-1 text-xs text-fg-muted">
          <MapPin aria-hidden="true" className="size-3.5 shrink-0" />
          <span className="truncate">
            {campusName ?? "On campus"}{" "}
            <span aria-hidden="true">·</span> {timeAgo(listing.createdAt)}
          </span>
        </p>

        <div className="mt-auto flex items-center gap-1.5 pt-2.5">
          {sellerName ? (
            <Avatar name={sellerName} className="size-5 text-[9px]" />
          ) : (
            <UserCircle
              aria-hidden="true"
              weight="fill"
              className="size-5 shrink-0 text-fg-subtle"
            />
          )}
          <span className="min-w-0">
            <span className="block truncate text-xs font-medium text-fg-muted">
              {sellerName ?? "Student seller"}
            </span>
            {isStaffSeller && (
              <span className="block truncate text-[11px] font-semibold text-brand-700">
                Sold by CPUT staff member
              </span>
            )}
          </span>
        </div>
      </div>
    </Card>
  );
}
