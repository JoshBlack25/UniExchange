/*
  Seller summary on the listing page: avatar, name (links to their profile),
  trusted badge, rating, and Message / Share actions.

  The listing page shows this in the main column below xl and in the right
  rail at xl. The page's own action bar already carries "Message seller",
  so it passes showMessageAction={false}; the prop stays for other callers.

  Owner: Aidan Barends (230255639)
*/

import { CaretRight, ChatCircleDots, Check, ShareNetwork, ShieldCheck, Star } from '@phosphor-icons/react'
import { useState } from 'react'
import { Link } from 'react-router-dom'

import { Avatar } from '@/components/ui/Avatar'
import { photoSrc } from '@/lib/api/profilePhotos'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import type { User } from '@/lib/api/types'

type SellerCardProps = {
  seller: User | null
  loading: boolean
  reviewCount: number | null
  rating: number | null
  trusted: boolean | null
  showMessageAction: boolean
  onMessage: () => void
  onShare: () => Promise<'shared' | 'copied' | 'cancelled'>
}

export function SellerCard({
  seller,
  loading,
  reviewCount,
  rating,
  trusted,
  showMessageAction,
  onMessage,
  onShare,
}: SellerCardProps) {
  const fullName = seller ? `${seller.firstName} ${seller.lastName}` : null
  const [copied, setCopied] = useState(false)

  const handleShare = async () => {
    const result = await onShare()
    if (result === 'copied') {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <Card>
      <h2 className="text-sm font-semibold text-fg">Seller information</h2>

      {loading ? (
        <div aria-busy="true" aria-label="Loading seller" className="mt-3 flex items-center gap-3">
          <div className="size-12 animate-pulse rounded-full bg-surface-muted" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-1/2 animate-pulse rounded-md bg-surface-muted" />
            <div className="h-3 w-1/3 animate-pulse rounded-md bg-surface-muted" />
          </div>
        </div>
      ) : seller ? (
        <Link
          to={`/profile/${seller.userId}`}
          className="-mx-2 mt-2 flex items-center gap-3 rounded-xl p-2 transition hover:bg-surface-muted active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-brand-500"
        >
          <Avatar name={fullName} src={photoSrc(seller)} className="size-12" />
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5">
              <span className="truncate text-base font-semibold text-fg">{fullName}</span>
              {trusted && (
                <ShieldCheck
                  weight="fill"
                  role="img"
                  aria-label="Trusted Seller"
                  className="size-4.5 shrink-0 text-brand-600"
                />
              )}
              {seller.affiliation === 'STAFF' && <Badge tone="brand">CPUT Staff</Badge>}
            </p>
            <p className="mt-0.5 flex items-center gap-1 text-sm text-fg-muted">
              {reviewCount !== null && reviewCount > 0 && rating !== null ? (
                <>
                  <Star aria-hidden="true" weight="fill" className="size-4 text-amber-500" />
                  <span className="font-semibold tabular-nums text-fg">{rating.toFixed(1)}</span>
                  <span className="tabular-nums">
                    ({reviewCount} review{reviewCount === 1 ? '' : 's'})
                  </span>
                </>
              ) : (
                'No ratings yet'
              )}
            </p>
            {trusted && <p className="mt-0.5 text-xs font-medium text-brand-700">Trusted Seller</p>}
          </div>
          <CaretRight aria-hidden="true" className="size-5 shrink-0 text-fg-muted" />
        </Link>
      ) : (
        <p className="mt-3 text-sm font-medium text-fg-muted">Seller unavailable</p>
      )}

      <div className="mt-3 flex gap-2">
        {showMessageAction && (
          <Button variant="primary" className="flex-1" onClick={onMessage}>
            <ChatCircleDots aria-hidden="true" weight="fill" className="size-5" />
            Message seller
          </Button>
        )}
        <Button
          variant="secondary"
          className={showMessageAction ? 'w-auto' : 'flex-1'}
          onClick={() => void handleShare()}
        >
          {copied ? (
            <Check aria-hidden="true" weight="bold" className="size-4.5" />
          ) : (
            <ShareNetwork aria-hidden="true" className="size-4.5" />
          )}
          <span aria-live="polite">{copied ? 'Link copied!' : 'Share listing'}</span>
        </Button>
      </div>
    </Card>
  )
}
