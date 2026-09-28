/*
  NotificationsSafetyCallout - the footer card from the wireframe ("Campus
  Safety Commitment"), rebuilt with the same card language already
  established in components/feed/TrustCallout.tsx and SafeExchangeCard.tsx
  (icon + heading + one line + a small action) rather than the mock's own
  styling, so it reads as part of the same app.

  Static copy for now, same as its feed counterparts - there's no backend
  concept of "safe zones" to source real numbers from yet.

  Stacked (icon + copy, then the link) so the same card works in both places
  NotificationsPage puts it: the narrow xl right rail, and inline under the
  list on smaller screens.

  OWNER: Joshua Reid Adams (230317693)
*/

import { ArrowRight, ShieldCheck } from "@phosphor-icons/react";
import { Link } from "react-router-dom";

import { Card } from "@/components/ui/Card";

export function NotificationsSafetyCallout() {
  return (
    <Card>
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-700">
          <ShieldCheck aria-hidden="true" weight="fill" className="size-5" />
        </span>
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-fg">
            Campus Safety Commitment
          </h2>
          <p className="mt-0.5 text-sm text-fg-muted">
            All buyers and sellers in your notification log are verified with
            university registration emails.
          </p>
        </div>
      </div>

      <Link
        to="/bulletin"
        className="mt-3 inline-flex min-h-11 items-center gap-1.5 rounded-xl px-2 text-sm font-semibold text-brand-700 transition hover:bg-brand-50 focus-visible:outline-2 focus-visible:outline-brand-500 -ml-2 sm:ml-11"
      >
        View Safe Zones
        <ArrowRight aria-hidden="true" className="size-4" />
      </Link>
    </Card>
  );
}
