/*
  A student's profile and reputation.

  OWNER: Raul Ja'aim Everts (230270565)
  ROUTES: /profile            -> the signed-in student (no param needed)
          /profile/:userId    -> somebody else's profile

  One component serves both routes. When useParams().userId is undefined you are
  looking at yourself, and useAuth().user already holds that data — no extra
  request needed for the header. The reputation data (listings, reviews, badge)
  always has to be fetched regardless of whose profile it is.

  LAYOUT (Facebook style): ProfileHeader - cover band, overlapping avatar,
  stats and the Listings / Reviews tabs - then the selected tab's panel.
  Header pieces live in src/components/profile/; the listing tiles reuse the
  feed's ListingCard so a listing looks the same everywhere.
*/

import { ChatCircleText, Plus, Trash, User as UserIcon } from '@phosphor-icons/react'
import { useEffect, useId, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import { useIsModerator } from '@/auth/roles'
import { useAuth } from '@/auth/useAuth'
import { ListingCard } from '@/components/feed/ListingCard'
import { ListingCardSkeleton } from '@/components/feed/ListingCardSkeleton'
import { Breadcrumbs } from '@/components/layout/Breadcrumbs'
import { ConfirmDialog } from '@/components/moderation/ModerationUi'
import { ChangePasswordCard } from '@/components/profile/ChangePasswordCard'
import { ProfileHeader } from '@/components/profile/ProfileHeader'
import { ProfileModeratorMenu } from '@/components/profile/ProfileModeratorMenu'
import { ProfilePhotoCard } from '@/components/profile/ProfilePhotoCard'
import { ReportButton } from '@/components/reports/ReportDialog'
import { Seo } from '@/components/seo/Seo'
import { ProfileTabs } from '@/components/profile/ProfileTabs'
import { StarRating } from '@/components/reviews/StarRating'
import { Alert } from '@/components/ui/Alert'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { IconButton } from '@/components/ui/IconButton'
import { listingsApi } from '@/lib/api/listings'
import { moderationApi } from '@/lib/api/moderation'
import type { Listing, Review, TrustedSellerBadge, User } from '@/lib/api/types'
import { usersApi } from '@/lib/api/users'

/* Link styled as the primary Button - Button itself only renders a <button>. */
const PRIMARY_LINK =
  'inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold ' +
  'text-on-primary shadow-sm shadow-primary/25 transition hover:bg-primary-hover active:scale-[0.98] ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 sm:w-auto'

type TabKey = 'listings' | 'reviews' | 'account'

/* ── review row ───────────────────────────────────────────────────────────── */

/*
  Reviews carry only a reviewerId - no name - so every row reads "A student".
  Fetching each reviewer would be one request per review; not worth it yet.

  `onRemove` is only passed in a moderator session.
*/
function ReviewRow({ review, onRemove }: { review: Review; onRemove?: () => void }) {
  const date = new Date(review.createdAt).toLocaleDateString('en-ZA', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })

  return (
    <li className="flex gap-3 border-b border-line py-4 first:pt-0 last:border-0 last:pb-0">
      <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-full bg-surface-muted text-fg-muted">
        <UserIcon className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <p className="text-sm font-semibold text-fg">A UniExchange student</p>
          <time dateTime={review.createdAt} className="ml-auto text-xs text-fg-muted">
            {date}
          </time>
          {onRemove && (
            <IconButton tone="plain" size="sm" label="Remove review (moderator)" onClick={onRemove}>
              <Trash aria-hidden="true" className="size-4" />
            </IconButton>
          )}
        </div>
        <StarRating value={review.rating} className="mt-1 [&_svg]:size-4" />
        {review.comment && <p className="mt-1.5 text-sm leading-relaxed text-fg">{review.comment}</p>}
      </div>
    </li>
  )
}

function ProfileSkeleton() {
  return (
    <div aria-hidden="true" className="glass-card mb-4 rounded-2xl border shadow-glass">
      <div className="h-32 animate-pulse rounded-t-2xl bg-surface-muted sm:h-44" />
      <div className="flex flex-col items-center px-4 pb-6 sm:flex-row sm:items-end sm:gap-5 sm:px-6">
        <div className="-mt-14 size-28 rounded-full bg-surface-muted ring-4 ring-canvas sm:-mt-12 sm:size-36" />
        <div className="mt-3 w-full max-w-xs space-y-2 sm:mt-0">
          <div className="mx-auto h-6 w-48 animate-pulse rounded bg-surface-muted sm:mx-0" />
          <div className="mx-auto h-4 w-64 animate-pulse rounded bg-surface-muted sm:mx-0" />
        </div>
      </div>
    </div>
  )
}

/* ── page ─────────────────────────────────────────────────────────────────── */

export function ProfilePage() {
  const { userId: userIdParam } = useParams<{ userId?: string }>()
  const { user: authUser, session, loadingUser } = useAuth()
  const isModerator = useIsModerator()

  const isOwnProfile = userIdParam === undefined

  /*
    Another student's profile, keyed by the id it was fetched for. Deriving
    "loading" from a key mismatch (rather than setting a flag inside the
    effect) means switching between /profile/1 and /profile/2 never shows the
    previous student for a frame, and no setState runs synchronously in an
    effect.
  */
  const [fetched, setFetched] = useState<{ id: string; user: User | null; error: string | null } | null>(null)
  const fetchedCurrent = fetched !== null && fetched.id === userIdParam
  const profileUser: User | null = isOwnProfile ? authUser : fetchedCurrent ? fetched.user : null
  const profileLoading = !isOwnProfile && !fetchedCurrent
  const profileError = !isOwnProfile && fetchedCurrent ? fetched.error : null

  /* reputation - keyed the same way, by the user id it belongs to */
  const resolvedId = isOwnProfile ? session?.userId : userIdParam ? Number(userIdParam) : undefined
  const [rep, setRep] = useState<{
    id: number
    listings: Listing[]
    reviews: Review[]
    avgRating: number | null
    badge: TrustedSellerBadge | null
  } | null>(null)
  const repCurrent = rep !== null && rep.id === resolvedId
  const repLoading = !repCurrent
  const listings = repCurrent ? rep.listings : []
  const reviews = repCurrent ? rep.reviews : []
  const avgRating = repCurrent ? rep.avgRating : null
  const badge = repCurrent ? rep.badge : null

  /* which tab below the header is showing */
  const [tab, setTab] = useState<TabKey>('listings')
  const tabsId = useId()

  /* moderator session only */
  const [removingReview, setRemovingReview] = useState<Review | null>(null)
  const [modNotice, setModNotice] = useState<string | null>(null)

  /* fetch other user */
  useEffect(() => {
    if (isOwnProfile || !userIdParam) return
    let cancelled = false

    usersApi
      .byId(userIdParam)
      .then((u) => {
        if (!cancelled) setFetched({ id: userIdParam, user: u, error: null })
      })
      .catch(() => {
        if (!cancelled) setFetched({ id: userIdParam, user: null, error: 'Could not load this profile.' })
      })

    return () => {
      cancelled = true
    }
  }, [isOwnProfile, userIdParam])

  /* fetch reputation data once we know the userId */
  useEffect(() => {
    if (resolvedId === undefined) return
    let cancelled = false

    Promise.allSettled([
      listingsApi.bySeller(resolvedId),
      usersApi.reviewsAbout(resolvedId),
      usersApi.averageRating(resolvedId),
      usersApi.trustedSellerBadge(resolvedId),
    ]).then(([listingsRes, reviewsRes, ratingRes, badgeRes]) => {
      if (cancelled) return
      // A 404 on the badge just means "no badge" - normal, not an error.
      setRep({
        id: resolvedId,
        listings: listingsRes.status === 'fulfilled' ? listingsRes.value : [],
        reviews: reviewsRes.status === 'fulfilled' ? reviewsRes.value : [],
        avgRating: ratingRes.status === 'fulfilled' ? ratingRes.value : null,
        badge: badgeRes.status === 'fulfilled' ? badgeRes.value : null,
      })
    })

    return () => {
      cancelled = true
    }
  }, [resolvedId])

  /* ── loading / error states ── */

  if (profileLoading || (isOwnProfile && loadingUser)) {
    return (
      <div role="status" aria-label="Loading profile" className="mx-auto max-w-5xl">
        <Seo title={isOwnProfile ? 'Your profile' : 'Profile'} description="Loading this UniExchange profile." noindex />
        <h1 className="sr-only">Loading profile</h1>
        <ProfileSkeleton />
      </div>
    )
  }

  if (profileError || !profileUser) {
    return (
      <div className="mx-auto max-w-2xl pt-6">
        <Seo title="Profile not found" description="This UniExchange profile does not exist or could not be loaded." noindex />
        <h1 className="sr-only">Profile not found</h1>
        <EmptyState
          title="Profile not found"
          description={profileError ?? 'This user does not exist or could not be loaded.'}
          action={
            <Link to="/feed" className={PRIMARY_LINK}>
              Back to the feed
            </Link>
          }
        />
      </div>
    )
  }

  /* ── derived values ── */

  const roles = isOwnProfile ? (session?.roles ?? []) : []
  const fullName = `${profileUser.firstName} ${profileUser.lastName}`
  const canModerate = isModerator && !isOwnProfile
  const activeListings = listings.filter((l) => l.status === 'ACTIVE')
  const soldListings = listings.filter((l) => l.status === 'SOLD')

  /* ── render ── */

  return (
    <div className="mx-auto max-w-5xl">
      <Seo
        title={isOwnProfile ? 'Your profile' : fullName}
        description={
          isOwnProfile
            ? 'Your UniExchange listings, reviews and account settings.'
            : `${fullName}'s listings and reviews on UniExchange.`
        }
        noindex
      />
      <div className="mb-3 px-1">
        <Breadcrumbs items={[{ label: 'Feed', to: '/feed' }, { label: isOwnProfile ? 'Your profile' : fullName }]} />
      </div>
      {modNotice && (
        <div className="mb-4">
          <Alert tone="success">{modNotice}</Alert>
        </div>
      )}

      <ProfileHeader
        user={profileUser}
        roles={roles}
        badge={badge}
        avgRating={avgRating}
        reviewCount={reviews.length}
        activeListings={activeListings.length}
        soldListings={soldListings.length}
        statsLoading={repLoading}
        action={
          isOwnProfile ? (
            <Link to="/listings/new" className={PRIMARY_LINK}>
              <Plus aria-hidden="true" weight="bold" className="size-4" />
              New listing
            </Link>
          ) : (
            <div className="flex items-center gap-2">
              <ReportButton
                targetType="USER"
                targetId={profileUser.userId}
                targetName={`${profileUser.firstName} ${profileUser.lastName}`}
              />
              {canModerate && (
                <ProfileModeratorMenu
                  user={profileUser}
                  onChanged={(message) => {
                    setModNotice(message)
                    // Quiet refetch so the status badge updates without the page skeleton flashing.
                    usersApi
                      .byId(profileUser.userId)
                      .then((u) => setFetched({ id: userIdParam ?? String(u.userId), user: u, error: null }))
                      .catch(() => {})
                  }}
                />
              )}
            </div>
          )
        }
        tabs={
          <ProfileTabs
            label={isOwnProfile ? 'Your profile' : 'Profile sections'}
            idBase={tabsId}
            selected={tab}
            onSelect={(key) => setTab(key as TabKey)}
            tabs={[
              { key: 'listings', label: 'Listings', count: repLoading ? undefined : listings.length },
              { key: 'reviews', label: 'Reviews', count: repLoading ? undefined : reviews.length },
              ...(isOwnProfile ? [{ key: 'account', label: 'Account' }] : []),
            ]}
          />
        }
      />

      {/* listings */}
      <section
        role="tabpanel"
        id={`${tabsId}-panel-listings`}
        aria-labelledby={`${tabsId}-tab-listings`}
        hidden={tab !== 'listings'}
      >
        <h2 className="sr-only">{isOwnProfile ? 'Your listings' : 'Listings'}</h2>

        {repLoading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 xl:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <ListingCardSkeleton key={i} />
            ))}
          </div>
        ) : listings.length === 0 ? (
          <EmptyState
            title="No listings yet"
            description={
              isOwnProfile
                ? 'Post something to start selling on campus.'
                : 'This student has not listed anything yet.'
            }
          />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 xl:grid-cols-4">
            {listings.map((listing) => (
              <ListingCard key={listing.listingId} listing={listing} />
            ))}
          </div>
        )}
      </section>

      {/* reviews */}
      <section
        role="tabpanel"
        id={`${tabsId}-panel-reviews`}
        aria-labelledby={`${tabsId}-tab-reviews`}
        hidden={tab !== 'reviews'}
        className="mx-auto max-w-2xl space-y-4"
      >
        <h2 className="sr-only">Reviews</h2>

        {repLoading ? (
          <div aria-hidden="true" className="glass-card rounded-2xl border p-4 shadow-glass">
            <div className="h-5 w-40 animate-pulse rounded bg-surface-muted" />
            <div className="mt-3 h-4 w-full animate-pulse rounded bg-surface-muted" />
          </div>
        ) : reviews.length === 0 ? (
          <EmptyState
            title="No reviews yet"
            description={
              isOwnProfile
                ? 'Complete a transaction and buyers can leave you a review.'
                : 'This student has not received any reviews yet.'
            }
          />
        ) : (
          <>
            {/* rating summary */}
            {avgRating !== null && (
              <Card className="flex items-center gap-4">
                <p className="text-4xl font-bold tabular-nums text-fg">{avgRating.toFixed(1)}</p>
                <div>
                  <StarRating value={avgRating} />
                  <p className="mt-0.5 text-sm text-fg-muted">
                    Based on <span className="tabular-nums">{reviews.length}</span>{' '}
                    {reviews.length === 1 ? 'review' : 'reviews'}
                  </p>
                </div>
                <ChatCircleText aria-hidden="true" className="ml-auto hidden size-10 text-brand-300 sm:block" />
              </Card>
            )}

            <Card>
              <ul>
                {reviews.map((review) => (
                  <ReviewRow
                    key={review.reviewId}
                    review={review}
                    onRemove={canModerate ? () => setRemovingReview(review) : undefined}
                  />
                ))}
              </ul>
            </Card>
          </>
        )}
      </section>

      {/* account - own profile only */}
      {isOwnProfile && (
        <section
          role="tabpanel"
          id={`${tabsId}-panel-account`}
          aria-labelledby={`${tabsId}-tab-account`}
          hidden={tab !== 'account'}
          className="mx-auto max-w-2xl"
        >
          <h2 className="sr-only">Account</h2>
          <ProfilePhotoCard />
          <ChangePasswordCard />
        </section>
      )}

      {canModerate && (
        <ConfirmDialog
          open={removingReview !== null}
          title="Remove this review?"
          description={
            <>
              The review is deleted and no longer counts towards this seller's rating.{' '}
              <strong>This cannot be undone.</strong>
            </>
          }
          askReason
          reasonLabel="Why are you removing it?"
          confirmLabel="Remove review"
          onClose={() => setRemovingReview(null)}
          onConfirm={async (reason) => {
            if (!removingReview) return
            await moderationApi.removeReview(removingReview.reviewId, reason)
            const remaining = reviews.filter((r) => r.reviewId !== removingReview.reviewId)
            setRep((prev) =>
              prev
                ? {
                    ...prev,
                    reviews: remaining,
                    avgRating:
                      remaining.length > 0
                        ? remaining.reduce((sum, r) => sum + r.rating, 0) / remaining.length
                        : null,
                  }
                : prev,
            )
            setModNotice('The review was removed.')
          }}
        />
      )}
    </div>
  )
}
