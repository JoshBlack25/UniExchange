/*
  SafeExchangeCard - the "Campus Safe Exchange Zone" card below the live feed
  in the desktop mockup (feed right rail). Static copy for now; there's no
  "recommended meetup spot" concept in the backend yet.

  Owner: Joshua Reid Adams (230317693)
*/

import { Lightning, MapPinArea } from "@phosphor-icons/react";

import { Card } from "@/components/ui/Card";

export function SafeExchangeCard() {
  return (
    <Card>
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700">
          <MapPinArea aria-hidden="true" weight="duotone" className="size-5" />
        </span>
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-fg">
            Campus Safe Exchange Zone
          </h2>
          <p className="mt-0.5 text-xs text-fg-muted">
            Trade in well-lit, campus-monitored locations. Recommended spots
            are shown here once set.
          </p>
        </div>
      </div>

      <div className="mt-3 rounded-xl border border-dashed border-line-strong bg-surface-muted/60 p-3">
        <p className="text-sm font-medium text-fg">Recommended spot</p>
        <p className="mt-0.5 text-xs text-fg-muted">
          Set per-campus once that data exists.
        </p>
      </div>

      <p className="mt-3 flex items-center gap-1.5 text-xs text-fg-muted">
        <Lightning aria-hidden="true" weight="fill" className="size-3.5 text-amber-600" />
        Always test electronics before payment.
      </p>
    </Card>
  );
}
