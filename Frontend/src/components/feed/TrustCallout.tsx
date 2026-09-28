/*
  TrustCallout - the small highlighted "Verified Student Network" card from
  the desktop mockup. It used to close the feed's own left rail; that rail is
  gone, so it now sits at the bottom of the feed's right rail (xl). Static
  content for now; swap the copy for whatever verification claim is
  actually true.

  Owner: Joshua Reid Adams (230317693)
*/

import { ShieldCheck } from "@phosphor-icons/react";

export function TrustCallout() {
  return (
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
      <p className="flex items-center gap-2 text-sm font-semibold text-emerald-800">
        <ShieldCheck aria-hidden="true" weight="fill" className="size-5 shrink-0" />
        Verified Student Network
      </p>
      <p className="mt-1.5 text-xs text-emerald-800">
        All active sellers are verified with university credentials for campus
        safety.
      </p>
    </div>
  );
}
