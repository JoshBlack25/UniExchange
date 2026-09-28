/*
  Every listing on the marketplace, filtered by status and searched by title.
  A moderator can take a listing down (it becomes REMOVED and the seller is
  told why) or put a removed one back. Sold listings are part of a completed
  trade, so they cannot be removed.

  Author: Mogamat Yaseen Kannemeyer 240453182
*/

import { ArrowCounterClockwise, MagnifyingGlass, Trash } from '@phosphor-icons/react'
import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'

import { formatRelativeTime } from '@/components/bulletin/relativeTime'
import { ActionReportDialog } from '@/components/moderation/ActionReportDialog'
import { ConfirmDialog, ListCard, ListSkeleton } from '@/components/moderation/ModerationUi'
import { useLoad } from '@/components/moderation/useLoad'
import { Alert } from '@/components/ui/Alert'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { Select } from '@/components/ui/Select'
import { TextField } from '@/components/ui/TextField'
import { moderationApi } from '@/lib/api/moderation'
import type { ActionReport, Listing, ListingStatus } from '@/lib/api/types'

const zar = new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' })

const STATUSES: Array<{ value: ListingStatus | ''; label: string }> = [
  { value: '', label: 'Any status' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'SOLD', label: 'Sold' },
  { value: 'REMOVED', label: 'Removed' },
  { value: 'DELETED', label: 'Deleted by seller' },
]

const STATUS_BADGE: Record<ListingStatus, { tone: 'success' | 'danger' | 'neutral' | 'brand'; label: string }> = {
  ACTIVE: { tone: 'success', label: 'Active' },
  SOLD: { tone: 'brand', label: 'Sold' },
  REMOVED: { tone: 'danger', label: 'Removed' },
  DELETED: { tone: 'neutral', label: 'Deleted' },
}

type Pending = { kind: 'remove' | 'restore'; listing: Listing } | null

export function ModerationListingsPage() {
  const [params, setParams] = useSearchParams()
  const query = params.get('q') ?? ''
  const status = (params.get('status') ?? '') as ListingStatus | ''
  const [draft, setDraft] = useState(query)
  const [pending, setPending] = useState<Pending>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const { data, error, loading, reload } = useLoad(() => moderationApi.listings({ q: query, status }), [query, status])

  // Keep the search box in step when the URL changes (back button, a stat link).
  const [syncedQuery, setSyncedQuery] = useState(query)
  if (query !== syncedQuery) {
    setSyncedQuery(query)
    setDraft(query)
  }

  function updateParams(next: { q?: string; status?: string }) {
    const merged = new URLSearchParams(params)
    for (const [key, value] of Object.entries(next)) {
      if (value) merged.set(key, value)
      else merged.delete(key)
    }
    setParams(merged, { replace: true })
  }

  function search(event: FormEvent) {
    event.preventDefault()
    updateParams({ q: draft.trim() })
  }

  async function runRemove(report: ActionReport) {
    if (!pending) return
    await moderationApi.removeListing(pending.listing.listingId, report)
    setNotice(`"${pending.listing.title}" was taken down. Your report was sent to the seller.`)
    reload()
  }

  async function runPending() {
    if (!pending) return
    const { kind, listing } = pending
    if (kind === 'restore') {
      await moderationApi.restoreListing(listing.listingId)
      setNotice(`"${listing.title}" is live again.`)
    }
    reload()
  }

  return (
    <div className="space-y-4">
      <form role="search" onSubmit={search} className="grid gap-3 sm:grid-cols-[1fr_12rem_auto] sm:items-end">
        <TextField
          label="Search listings"
          placeholder="Title"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
        />
        <Select
          id="listing-status"
          label="Status"
          value={status}
          onChange={(event) => updateParams({ status: event.target.value })}
        >
          {STATUSES.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
        <Button type="submit" variant="secondary" className="sm:w-auto">
          <MagnifyingGlass aria-hidden="true" className="size-5" />
          Search
        </Button>
      </form>

      {notice && <Alert tone="success">{notice}</Alert>}
      {error && <Alert>{error}</Alert>}
      {loading && !data && <ListSkeleton />}

      {data && data.length === 0 && (
        <EmptyState title="No listings found" description="Try a different title or status." />
      )}

      {data && data.length > 0 && (
        <>
          <p className="text-sm text-fg-muted">
            {data.length} {data.length === 1 ? 'listing' : 'listings'}
          </p>
          <ListCard>
            {data.map((listing) => {
              const badge = STATUS_BADGE[listing.status]
              return (
                <li key={listing.listingId} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1">
                    <Link
                      to={`/listings/${listing.listingId}`}
                      className="block truncate text-sm font-semibold text-fg hover:text-brand-700 hover:underline"
                    >
                      {listing.title}
                    </Link>
                    <p className="mt-0.5 truncate text-sm text-fg-muted">
                      {zar.format(listing.price)} ·{' '}
                      <Link to={`/profile/${listing.sellerId}`} className="hover:underline">
                        {listing.sellerName ?? `User #${listing.sellerId}`}
                      </Link>
                      {' · '}
                      <time dateTime={listing.createdAt}>{formatRelativeTime(listing.createdAt)}</time>
                    </p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      <Badge tone={badge.tone}>{badge.label}</Badge>
                      {listing.sellerAffiliation === 'STAFF' && <Badge tone="brand">CPUT Staff</Badge>}
                    </div>
                  </div>
                  {listing.status === 'ACTIVE' && (
                    <Button
                      variant="secondary"
                      size="sm"
                      className="sm:w-auto"
                      onClick={() => setPending({ kind: 'remove', listing })}
                    >
                      <Trash aria-hidden="true" className="size-4" />
                      Remove
                    </Button>
                  )}
                  {listing.status === 'REMOVED' && (
                    <Button
                      variant="secondary"
                      size="sm"
                      className="sm:w-auto"
                      onClick={() => setPending({ kind: 'restore', listing })}
                    >
                      <ArrowCounterClockwise aria-hidden="true" className="size-4" />
                      Restore
                    </Button>
                  )}
                </li>
              )
            })}
          </ListCard>
        </>
      )}

      <ActionReportDialog
        open={pending?.kind === 'remove'}
        action="LISTING_REMOVED"
        title="Remove this listing?"
        description={
          <>
            <strong>{pending?.listing.title}</strong> will disappear from the marketplace. The seller keeps
            seeing it, marked as removed, and gets your report by notification and email. You can restore it
            later.
          </>
        }
        confirmLabel="Remove listing"
        onClose={() => setPending(null)}
        onConfirm={runRemove}
      />
      <ConfirmDialog
        open={pending?.kind === 'restore'}
        tone="primary"
        title="Restore this listing?"
        description={`"${pending?.listing.title ?? ''}" will be back on the marketplace.`}
        confirmLabel="Restore listing"
        onClose={() => setPending(null)}
        onConfirm={runPending}
      />
    </div>
  )
}
