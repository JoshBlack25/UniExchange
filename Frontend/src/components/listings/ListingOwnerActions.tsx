/*
  Seller-only controls on the listing page: mark as sold, and delete (with an
  inline confirm step). Delete sits in its own "danger zone" row, separated
  from the everyday action, and uses Button variant="danger".

  Owner: Aidan Barends (230255639)
*/

import { CheckCircle, Trash } from '@phosphor-icons/react'
import { useState } from 'react'

import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import type { Listing } from '@/lib/api/types'

type ListingOwnerActionsProps = {
  listing: Listing
  onMarkSold: () => Promise<void>
  onDelete: () => Promise<void>
}

export function ListingOwnerActions({ listing, onMarkSold, onDelete }: ListingOwnerActionsProps) {
  const [pending, setPending] = useState<'sold' | 'delete' | null>(null)
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  const handleMarkSold = async () => {
    setPending('sold')
    try {
      await onMarkSold()
    } finally {
      setPending(null)
    }
  }

  const handleDelete = async () => {
    setPending('delete')
    try {
      await onDelete()
    } finally {
      setPending(null)
    }
  }

  return (
    <Card>
      <h2 className="text-sm font-semibold text-fg">Manage this listing</h2>
      <p className="mt-0.5 text-sm text-fg-muted">Only you can see these controls.</p>

      {listing.status === 'ACTIVE' && (
        <Button
          variant="secondary"
          className="mt-3 sm:w-auto"
          loading={pending === 'sold'}
          disabled={pending !== null}
          onClick={handleMarkSold}
        >
          <CheckCircle aria-hidden="true" className="size-5" />
          Mark as sold
        </Button>
      )}

      <div className="mt-4 border-t border-line pt-4">
        {!confirmingDelete ? (
          <Button
            variant="danger"
            disabled={pending !== null}
            className="sm:w-auto"
            onClick={() => setConfirmingDelete(true)}
          >
            <Trash aria-hidden="true" className="size-5" />
            Delete listing
          </Button>
        ) : (
          <div role="group" aria-label="Confirm delete" className="rounded-xl bg-red-50 p-3">
            <p className="text-sm font-medium text-red-800">
              Delete this listing? This can't be undone.
            </p>
            <div className="mt-3 flex flex-col-reverse gap-2 sm:flex-row">
              <Button
                variant="secondary"
                className="sm:w-auto"
                disabled={pending !== null}
                onClick={() => setConfirmingDelete(false)}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                className="sm:w-auto"
                loading={pending === 'delete'}
                disabled={pending !== null}
                onClick={handleDelete}
              >
                Confirm delete
              </Button>
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}
