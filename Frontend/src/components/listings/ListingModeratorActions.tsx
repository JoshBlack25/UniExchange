/*
  Moderator controls on someone else's listing: take it down (with a written
  report the seller is sent) or restore a removed one. Only rendered in a
  moderator or admin session. Sibling of ListingOwnerActions, same card.

  Author: Mogamat Yaseen Kannemeyer 240453182
*/

import { ArrowCounterClockwise, ShieldWarning } from '@phosphor-icons/react'
import { useState } from 'react'

import { ActionReportDialog } from '@/components/moderation/ActionReportDialog'
import { errorMessage } from '@/components/moderation/useLoad'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { moderationApi } from '@/lib/api/moderation'
import type { Listing } from '@/lib/api/types'

type ListingModeratorActionsProps = {
  listing: Listing
  onChanged: (listing: Listing) => void
}

export function ListingModeratorActions({ listing, onChanged }: ListingModeratorActionsProps) {
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function run(action: () => Promise<Listing>) {
    setBusy(true)
    setError(null)
    try {
      const updated = await action()
      onChanged(updated)
    } catch (caught) {
      setError(errorMessage(caught))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card>
      <h2 className="text-sm font-semibold text-fg">Moderation</h2>
      <p className="mt-0.5 text-sm text-fg-muted">You can see this because you are in moderator mode.</p>

      {error && (
        <div className="mt-3">
          <Alert>{error}</Alert>
        </div>
      )}

      {listing.status === 'SOLD' && (
        <p className="mt-3 text-sm text-fg-muted">Sold listings are part of a completed trade and cannot be removed.</p>
      )}

      {listing.status === 'DELETED' && (
        <p className="mt-3 text-sm text-fg-muted">The seller deleted this listing.</p>
      )}

      {listing.status === 'REMOVED' && (
        <Button
          variant="secondary"
          className="mt-3 sm:w-auto"
          loading={busy}
          onClick={() => run(() => moderationApi.restoreListing(listing.listingId))}
        >
          <ArrowCounterClockwise aria-hidden="true" className="size-5" />
          Restore listing
        </Button>
      )}

      {listing.status === 'ACTIVE' && (
        <Button variant="danger" className="mt-3 sm:w-auto" onClick={() => setConfirming(true)}>
          <ShieldWarning aria-hidden="true" className="size-5" />
          Remove listing
        </Button>
      )}

      <ActionReportDialog
        open={confirming}
        action="LISTING_REMOVED"
        title="Remove this listing?"
        description={
          <>
            <strong>{listing.title}</strong> comes off the marketplace. The seller gets your report by notification
            and email. You can restore it later.
          </>
        }
        confirmLabel="Remove listing"
        onClose={() => setConfirming(false)}
        onConfirm={async (report) => {
          const updated = await moderationApi.removeListing(listing.listingId, report)
          onChanged(updated)
        }}
      />
    </Card>
  )
}
