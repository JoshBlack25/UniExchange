/*
  NotificationIcon - the tinted icon circle used on each notification row and
  in the detail sheet. One place for the type -> icon/color mapping so the
  row and the sheet can never drift apart.

  OWNER: Joshua Reid Adams (230317693)
*/

import {
  ChatCircleText,
  Megaphone,
  ShieldCheck,
  Tag,
  Wallet,
  type Icon,
} from "@phosphor-icons/react";

import type { Notification } from "@/lib/api/types";

type NotificationIconProps = {
  type: Notification["type"];
  className?: string;
};

/* Tinted-circle background/foreground per type - same palette family as
   Badge's tones (brand/emerald/amber/neutral), just applied to a circle
   instead of a pill so it reads as an icon slot, not a status label. The
   palette scales re-tone in dark mode, so these stay readable in both. */
const TONE: Record<Notification["type"], string> = {
  MESSAGE: "bg-brand-100 text-brand-700",
  LISTING: "bg-amber-100 text-amber-700",
  TRANSACTION: "bg-emerald-100 text-emerald-700",
  BULLETIN: "bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300",
  SYSTEM: "bg-surface-muted text-fg-muted ring-1 ring-inset ring-line",
};

const ICON: Record<Notification["type"], Icon> = {
  MESSAGE: ChatCircleText,
  LISTING: Tag,
  TRANSACTION: Wallet,
  BULLETIN: Megaphone,
  SYSTEM: ShieldCheck,
};

export function NotificationIcon({
  type,
  className = "size-12",
}: NotificationIconProps) {
  const Glyph = ICON[type];

  return (
    <span
      aria-hidden="true"
      className={`grid shrink-0 place-items-center rounded-full ${TONE[type]} ${className}`}
    >
      <Glyph weight="fill" className="size-[50%]" />
    </span>
  );
}
