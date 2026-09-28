/*
  A single listing.

  OWNER: Aidan Barends (230255639)
  ROUTE: /listings/:listingId

  NOTE: images come back with `primary`, not `isPrimary` - see the comment at the
  top of src/lib/api/types.ts for why.

  Your own components go in src/components/listings/.

  LAYOUT: a centred post-width column (Columns narrow) - gallery, then the
  price/title block, description, seller card, owner controls and "More like
  this". At xl the SellerCard and RelatedListings move to the right rail.
  Below md a sticky action bar (Message seller / Buy) sits flush on top of
  the BottomNav (via --ux-bottom-nav in index.css, which also follows the
  bar when it slides away on scroll); from md the same
  buttons sit inline in the price block.
*/

import { ChatCircleDots, Clock, MapPin, ShieldCheck, Wallet } from '@phosphor-icons/react'
import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { useIsModerator } from '@/auth/roles'
import { useAuth } from '@/auth/useAuth'
import { Columns } from '@/components/layout/Columns'
import { PageHeader } from '@/components/layout/PageHeader'
import { Seo } from '@/components/seo/Seo'
import { ListingGallery } from '@/components/listings/ListingGallery'
import { ListingModeratorActions } from '@/components/listings/ListingModeratorActions'
import { ListingOwnerActions } from '@/components/listings/ListingOwnerActions'
import { RelatedListings } from '@/components/listings/RelatedListings'
import { SellerCard } from '@/components/listings/SellerCard'
import { ReportButton } from '@/components/reports/ReportDialog'
import { Alert } from '@/components/ui/Alert'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { chatApi } from '@/lib/api/chat'
import { ApiError, authedRequest } from '@/lib/api/client'
import { listingsApi } from '@/lib/api/listings'
import { purchasesApi } from '@/lib/api/wallet'
import type { Campus, Category, Listing, ListingImage, ListingStatus, User } from '@/lib/api/types'
import { usersApi } from '@/lib/api/users'

const currencyFormatter = new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' })
const absoluteDateFormatter = new Intl.DateTimeFormat('en-ZA', { dateStyle: 'medium' })

const STATUS_TONE: Record<ListingStatus, 'success' | 'neutral' | 'warning' | 'danger'> = {
  ACTIVE: 'success',
  SOLD: 'neutral',
  REMOVED: 'warning',
  DELETED: 'danger',
}

function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const diffMin = Math.floor(diffMs / 60_000)

  if (diffMin < 1) return 'Just now'
  if (diffMin < 60) return `${diffMin} minute${diffMin === 1 ? '' : 's'} ago`

  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr} hour${diffHr === 1 ? '' : 's'} ago`

  const diffDay = Math.floor(diffHr / 24)
  if (diffDay < 7) return `${diffDay} day${diffDay === 1 ? '' : 's'} ago`

  return absoluteDateFormatter.format(new Date(iso))
}

/*
  True at Tailwind's xl breakpoint, where Columns shows the right rail. Used
  so SellerCard/RelatedListings render in exactly one place (RelatedListings
  fetches, so rendering it twice and hiding one would double the requests).
*/
const XL_QUERY = '(min-width: 80rem)'
function subscribeToXl(onChange: () => void) {
  const query = window.matchMedia(XL_QUERY)
  query.addEventListener('change', onChange)
  return () => query.removeEventListener('change', onChange)
}
function useIsXl() {
  return useSyncExternalStore(
    subscribeToXl,
    () => window.matchMedia(XL_QUERY).matches,
    () => false,
  )
}

/* Loading placeholder in the shape of the real page. */
function ListingSkeleton() {
  return (
    <div aria-hidden="true" className="mx-auto max-w-2xl space-y-4">
      <div className="h-8 w-2/3 animate-pulse rounded-lg bg-surface-muted" />
      <div className="aspect-4/3 animate-pulse rounded-2xl bg-surface-muted" />
      <div className="glass-card space-y-3 rounded-2xl border p-4">
        <div className="h-8 w-1/3 animate-pulse rounded-lg bg-surface-muted" />
        <div className="h-4 w-1/2 animate-pulse rounded-md bg-surface-muted" />
        <div className="h-11 animate-pulse rounded-xl bg-surface-muted" />
      </div>
    </div>
  )
}

type TrustedSellerBadgeResponse = { revokedAt: string | null }

const FEED_CRUMB = { label: 'Feed', to: '/feed' }

/** Meta description for a listing: its price, then the start of its description. */
function describeListing(listing: Listing): string {
  const price = currencyFormatter.format(listing.price)
  const text = listing.description?.replace(/\s+/g, ' ').trim()
  const summary = text ? (text.length > 140 ? `${text.slice(0, 137)}…` : text) : 'For sale on UniExchange.'
  return `${price} · ${summary}`
}

type LoadState =
  | { status: 'loading' }
  | { status: 'not-found' }
  | { status: 'error'; message: string }
  | { status: 'ready'; listing: Listing }

export function ListingDetailsPage() {
  const { listingId } = useParams<{ listingId: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const isModerator = useIsModerator()

  const numericId = listingId !== undefined && /^\d+$/.test(listingId) ? Number(listingId) : null

  const [state, setState] = useState<LoadState>({ status: 'loading' })
  const [category, setCategory] = useState<Category | null>(null)
  const [campus, setCampus] = useState<Campus | null>(null)
  const [images, setImages] = useState<ListingImage[]>([])
  const [seller, setSeller] = useState<User | null>(null)
  const [sellerLoading, setSellerLoading] = useState(true)
  const [rating, setRating] = useState<number | null>(null)
  const [reviewCount, setReviewCount] = useState<number | null>(null)
  const [trusted, setTrusted] = useState<boolean | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  // Which buyer action is in flight, for button spinners.
  const [pendingAction, setPendingAction] = useState<'buy' | 'message' | null>(null)
  const isXl = useIsXl()

  const load = useCallback(async (id: number) => {
    setState({ status: 'loading' })
    setActionError(null)

    setCategory(null)
    setCampus(null)
    setImages([])
    setSeller(null)
    setSellerLoading(true)
    setRating(null)
    setReviewCount(null)
    setTrusted(null)

    let listing: Listing
    try {
      listing = await listingsApi.byId(id)
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        setState({ status: 'not-found' })
      } else {
        setState({
          status: 'error',
          message: error instanceof ApiError ? error.message : 'Something went wrong.',
        })
      }
      return
    }

    setState({ status: 'ready', listing })

    void listingsApi
      .categoryById(listing.categoryId)
      .then(setCategory)
      .catch(() => setCategory(null))

    void usersApi
      .campusById(listing.campusId)
      .then(setCampus)
      .catch(() => setCampus(null))

    void listingsApi
      .imagesFor(id)
      .then(setImages)
      .catch(() => setImages([]))

    void usersApi
      .byId(listing.sellerId)
      .then(setSeller)
      .catch(() => setSeller(null))
      .finally(() => setSellerLoading(false))

    void usersApi
      .averageRating(listing.sellerId)
      .then(setRating)
      .catch(() => setRating(null))

    void usersApi
      .reviewsAbout(listing.sellerId)
      .then((reviews) => setReviewCount(reviews.length))
      .catch(() => setReviewCount(null))

    void authedRequest<TrustedSellerBadgeResponse>(`/api/trusted-seller-badges/user/${listing.sellerId}`)
      .then((badge) => setTrusted(badge.revokedAt === null))
      .catch(() => setTrusted(false))
  }, [])

  useEffect(() => {
    if (numericId === null) return
    Promise.resolve().then(() => load(numericId))
  }, [numericId, load])

  if (numericId === null) {
    return (
      <>
        <Seo title="Listing not found" description="That link does not point to a UniExchange listing." noindex />
        <PageHeader
          title="Listing"
          backTo="/feed"
          backLabel="Back to feed"
          breadcrumbs={[FEED_CRUMB, { label: 'Listing' }]}
        />
        <EmptyState
          title="That doesn't look like a listing"
          description={`"${listingId}" isn't a valid listing ID.`}
        />
      </>
    )
  }

  if (state.status === 'loading') {
    return (
      <div role="status" aria-label="Loading listing">
        <Seo title="Listing" description="Loading this listing." noindex />
        <h1 className="sr-only">Loading listing</h1>
        <ListingSkeleton />
      </div>
    )
  }

  if (state.status === 'not-found') {
    return (
      <>
        <Seo title="Listing not found" description="This listing may have been removed or the link is out of date." noindex />
        <PageHeader
          title="Listing"
          subtitle={`Listing #${numericId}`}
          backTo="/feed"
          backLabel="Back to feed"
          breadcrumbs={[FEED_CRUMB, { label: 'Listing not found' }]}
        />
        <EmptyState
          title="Listing not found"
          description="This listing may have been removed or the link is out of date."
        />
      </>
    )
  }

  if (state.status === 'error') {
    return (
      <>
        <Seo title="Listing" description="This listing could not be loaded." noindex />
        <PageHeader
          title="Listing"
          subtitle={`Listing #${numericId}`}
          backTo="/feed"
          backLabel="Back to feed"
          breadcrumbs={[FEED_CRUMB, { label: `Listing #${numericId}` }]}
        />
        <EmptyState
          title="Couldn't load this listing"
          description={state.message}
          action={
            <Button variant="secondary" className="w-auto" onClick={() => void load(numericId)}>
              Try again
            </Button>
          }
        />
      </>
    )
  }

  const { listing } = state
  const isOwner = user?.userId === listing.sellerId

  const handleMarkSold = async () => {
    if (!isOwner) {
      setActionError('Only the seller can mark this listing as sold.')
      return
    }
    try {
      const updated = await listingsApi.markSold(listing.listingId)
      setState({ status: 'ready', listing: updated })
    } catch (error) {
      setActionError(error instanceof ApiError ? error.message : 'Could not mark this as sold.')
    }
  }

  const handleDelete = async () => {
    if (!isOwner) {
      setActionError('Only the seller can delete this listing.')
      return
    }
    try {
      await listingsApi.remove(listing.listingId)
      navigate('/feed')
    } catch (error) {
      setActionError(error instanceof ApiError ? error.message : 'Could not delete this listing.')
    }
  }

  /*
   Opens the thread with this seller about this listing.

   This used to be navigate('/messages'), which dropped the student on an empty
   inbox with no idea who they had been trying to contact. startThread is
   find-or-create, so tapping it twice reuses the same conversation rather than
   splitting the discussion across two threads.
  */
  const handleMessageSeller = async () => {
    setPendingAction('message')
    try {
      const thread = await chatApi.startThread({
        otherUserId: listing.sellerId,
        listingId: listing.listingId,
      })
      navigate(`/messages/${thread.conversationId}`)
    } catch (error) {
      setActionError(
        error instanceof ApiError ? error.message : 'Could not open a conversation with the seller.',
      )
    } finally {
      setPendingAction(null)
    }
  }

  /*
   Buys the listing with wallet money, held in escrow until the buyer confirms
   the item arrived. expectedAmount is the price shown on this page, which the
   backend re-checks so a seller cannot change it mid-purchase.
  */
  const handleBuy = async () => {
    setActionError(null)
    setPendingAction('buy')
    try {
      await purchasesApi.buy(listing.listingId, listing.price)
      navigate('/purchases')
    } catch (error) {
      if (error instanceof ApiError && error.code === 'INSUFFICIENT_FUNDS') {
        setActionError('You do not have enough in your wallet. Top up and try again.')
        return
      }
      setActionError(error instanceof ApiError ? error.message : 'Could not complete that purchase.')
    } finally {
      setPendingAction(null)
    }
  }

  const handleShare = async (): Promise<'shared' | 'copied' | 'cancelled'> => {
    const url = window.location.href
    if (navigator.share) {
      try {
        await navigator.share({ title: listing.title, url })
        return 'shared'
      } catch {
        return 'cancelled'
      }
    }
    await navigator.clipboard.writeText(url)
    return 'copied'
  }

  // Buyer actions: shown to anyone who isn't the seller; Buy only while on sale.
  const showBuyerActions = !isOwner
  const canBuy = !isOwner && listing.status === 'ACTIVE'

  const buyerButtons = (
    <>
      <Button
        variant={canBuy ? 'secondary' : 'primary'}
        className={canBuy ? 'flex-1 md:w-auto md:flex-none' : 'flex-1'}
        loading={pendingAction === 'message'}
        disabled={pendingAction !== null}
        onClick={handleMessageSeller}
      >
        <ChatCircleDots aria-hidden="true" weight="fill" className="size-5" />
        <span className="whitespace-nowrap">
          Message<span className="hidden min-[400px]:inline"> seller</span>
        </span>
      </Button>
      {canBuy && (
        <Button
          className="flex-[1.4]"
          loading={pendingAction === 'buy'}
          disabled={pendingAction !== null}
          onClick={handleBuy}
        >
          <Wallet aria-hidden="true" weight="fill" className="size-5" />
          <span className="whitespace-nowrap tabular-nums">Buy {currencyFormatter.format(listing.price)}</span>
        </Button>
      )}
    </>
  )

  const sellerCard = (
    <SellerCard
      seller={seller}
      loading={sellerLoading}
      rating={rating}
      reviewCount={reviewCount}
      trusted={trusted}
      showMessageAction={false}
      onMessage={handleMessageSeller}
      onShare={handleShare}
    />
  )

  const related = (layout: 'row' | 'list') => (
    <RelatedListings
      currentListingId={listing.listingId}
      categoryId={listing.categoryId}
      campusId={listing.campusId}
      layout={layout}
    />
  )

  return (
    <Columns
      narrow
      asideLabel="Seller and similar listings"
      aside={
        isXl ? (
          <>
            {sellerCard}
            {related('list')}
          </>
        ) : undefined
      }
    >
      <Seo title={listing.title} description={describeListing(listing)} noindex />
      <PageHeader
        title={listing.title}
        subtitle={category ? category.name : `Listing #${listing.listingId}`}
        backTo="/feed"
        backLabel="Back to feed"
        breadcrumbs={[
          FEED_CRUMB,
          ...(category ? [{ label: category.name, to: `/feed?category=${category.categoryId}` }] : []),
          { label: listing.title },
        ]}
      />

      {actionError && (
        <div className={`mb-4 ${showBuyerActions ? 'hidden md:block' : ''}`}>
          <Alert>{actionError}</Alert>
        </div>
      )}

      <div className="space-y-4">
        <ListingGallery images={images} title={listing.title} />

        <Card>
          <div className="flex flex-wrap items-center gap-2">
            {category && <Badge tone="brand">{category.name}</Badge>}
            <Badge tone={STATUS_TONE[listing.status]}>{listing.status}</Badge>
          </div>

          <p
            className={`mt-3 text-3xl font-bold tracking-tight tabular-nums ${
              listing.status === 'ACTIVE' ? 'text-fg' : 'text-fg-muted line-through'
            }`}
          >
            {currencyFormatter.format(listing.price)}
          </p>

          <ul className="mt-3 space-y-1.5 text-sm text-fg-muted">
            <li className="flex items-center gap-2">
              <Clock aria-hidden="true" className="size-4 shrink-0" />
              Listed {formatRelativeTime(listing.createdAt)}
            </li>
            {campus && (
              <li className="flex items-center gap-2">
                <MapPin aria-hidden="true" className="size-4 shrink-0" />
                <span>
                  <span className="font-medium text-fg">{campus.name}</span>
                  {campus.city && <> · {campus.city}</>}
                </span>
              </li>
            )}
          </ul>

          {/* md and up: actions inline. Phones use the sticky bar below. */}
          {showBuyerActions && <div className="mt-4 hidden gap-2 md:flex">{buyerButtons}</div>}

          {canBuy && (
            <p className="mt-4 flex items-start gap-2 rounded-xl bg-emerald-50 p-3 text-xs text-emerald-800">
              <ShieldCheck aria-hidden="true" weight="fill" className="size-4 shrink-0" />
              Your money is held until you confirm the item arrived, then released to the seller.
            </p>
          )}
        </Card>

        <Card>
          <h2 className="mb-2 text-sm font-semibold text-fg">Description</h2>
          {listing.description ? (
            <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-fg">{listing.description}</p>
          ) : (
            <p className="text-sm text-fg-muted italic">No description provided.</p>
          )}
        </Card>

        {!isXl && sellerCard}

        {isOwner && (
          <ListingOwnerActions listing={listing} onMarkSold={handleMarkSold} onDelete={handleDelete} />
        )}

        {isModerator && !isOwner && (
          <ListingModeratorActions
            listing={listing}
            onChanged={(updated) => setState({ status: 'ready', listing: updated })}
          />
        )}

        {user && !isOwner && listing.status !== 'REMOVED' && (
          <div className="flex justify-end">
            <ReportButton targetType="LISTING" targetId={listing.listingId} targetName={listing.title} />
          </div>
        )}

        {!isXl && <div className="pt-2">{related('row')}</div>}
      </div>

      {showBuyerActions && (
        <>
          {/* Spacer so the last content can scroll clear of the action bar. */}
          <div aria-hidden="true" className="h-20 md:hidden" />

          <div className="glass-strong fixed inset-x-0 bottom-(--ux-bottom-nav) transition-[bottom] duration-300 z-20 border-t px-3 py-2.5 shadow-float md:hidden">
            {actionError && (
              <div className="mb-2">
                <Alert>{actionError}</Alert>
              </div>
            )}
            <div className="mx-auto flex max-w-lg gap-2">{buyerButtons}</div>
          </div>
        </>
      )}
    </Columns>
  )
}
