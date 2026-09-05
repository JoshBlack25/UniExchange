/*
  Homepage feed - what is for sale on campus (T2 mockup: "2 Marketplace Feed").

  OWNER: Joshua Reid Adams (230317693)
  ROUTE: /feed   (this is where students land after signing in)

  API used (all public GETs, through lib/api modules - never fetch directly):
   - listingsApi.search({ campusId, categoryId, title })  GET /api/listings/search
     (backend already returns ACTIVE listings only)
   - listingsApi.categories()                             GET /api/categories
   - listingsApi.list()                                   GET /api/listings
     (one-off, powers the sidebar category counts)
   - authApi.campuses()                                   GET /api/campuses

  The signed-in student's campus (useAuth().user?.campusId) is the default
  campus filter - that is the whole "hyper-local" point of the product.

  Components used only by this page live in src/components/feed/.
*/

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { useAuth } from '@/auth/useAuth'
import { CategoryChips } from '@/components/feed/CategoryChips'
import { FeedSidebar } from '@/components/feed/FeedSidebar'
import { ListingGrid } from '@/components/feed/ListingGrid'
import { PageHeader } from '@/components/layout/PageHeader'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { Select } from '@/components/ui/Select'
import { Spinner } from '@/components/ui/Spinner'
import { TextField } from '@/components/ui/TextField'
import { authApi } from '@/lib/api/auth'
import { listingsApi } from '@/lib/api/listings'
import type { Campus, Category, Listing } from '@/lib/api/types'

const SEARCH_DEBOUNCE_MS = 350

export function FeedPage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  // Reference data (loaded once) + per-category ACTIVE counts for the sidebar.
  const [categories, setCategories] = useState<Category[]>([])
  const [campuses, setCampuses] = useState<Campus[]>([])
  const [counts, setCounts] = useState<Record<number, number>>({})

  // Filters. campusId defaults to the student's own campus.
  const [campusId, setCampusId] = useState<number | null>(user?.campusId ?? null)
  const [categoryId, setCategoryId] = useState<number | null>(null)
  const [searchInput, setSearchInput] = useState('')
  const [title, setTitle] = useState('')

  /*
    Results. `listings` stays null until the first successful response arrives;
    while later requests are in flight the previous grid stays up (stale-while-
    revalidate) instead of flashing a spinner on every filter change.
  */
  const [listings, setListings] = useState<Listing[] | null>(null)
  const [firstLoadDone, setFirstLoadDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  // Debounce the search box before it becomes a request parameter.
  useEffect(() => {
    const timer = setTimeout(() => setTitle(searchInput.trim()), SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [searchInput])

  // Categories, campuses and count tallies never change while the page is open.
  useEffect(() => {
    let cancelled = false

    async function loadReferenceData() {
      try {
        const [categoryList, campusList, everyListing] = await Promise.all([
          listingsApi.categories(),
          authApi.campuses(),
          listingsApi.list(),
        ])
        if (cancelled) return

        setCategories(categoryList)
        setCampuses(campusList)

        const tallies: Record<number, number> = {}
        for (const listing of everyListing) {
          if (listing.status === 'ACTIVE') {
            tallies[listing.categoryId] = (tallies[listing.categoryId] ?? 0) + 1
          }
        }
        setCounts(tallies)
      } catch {
        // Counts and pickers are non-critical; the listings effect surfaces
        // errors users actually care about.
      }
    }

    loadReferenceData()
    return () => {
      cancelled = true
    }
  }, [])

  /*
    Listings follow the active filters. StrictMode-safe via the cancelled flag,
    and every setState happens in an async callback - none in the effect body.
  */
  useEffect(() => {
    let cancelled = false

    listingsApi
      .search({
        campusId: campusId ?? undefined,
        categoryId: categoryId ?? undefined,
        title: title || undefined,
      })
      .then((results) => {
        if (cancelled) return
        // The T2 doc promises "the latest listings" - newest first.
        const newestFirst = [...results].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        setListings(newestFirst)
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Something went wrong.')
      })
      .finally(() => {
        if (!cancelled) setFirstLoadDone(true)
      })

    return () => {
      cancelled = true
    }
  }, [campusId, categoryId, title, refreshKey])

  const campusNames: Record<number, string> = {}
  for (const campus of campuses) campusNames[campus.campusId] = campus.name

  const totalActive = Object.values(counts).reduce((sum, count) => sum + count, 0)

  return (
    <>
      <PageHeader title="Recent Listings" subtitle="What's for sale on your campus" />

      {error && (
        <Alert tone="error">
          <div className="flex items-center justify-between gap-3">
            <span>{error}</span>
            <button
              type="button"
              onClick={() => setRefreshKey((key) => key + 1)}
              className="shrink-0 font-semibold underline"
            >
              Retry
            </button>
          </div>
        </Alert>
      )}

      <div className="mt-2 flex items-start gap-6">
        <FeedSidebar
          categories={categories}
          counts={counts}
          totalActive={totalActive}
          activeCategoryId={categoryId}
          onSelectCategory={setCategoryId}
        />

        <div className="min-w-0 flex-1">
          {/* The desktop mockup keeps search in the top bar; that area is the
              shared layout, so ours lives in the page like the mobile mockup. */}
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField
              label="Search"
              name="feedSearch"
              placeholder="Search textbooks, electronics…"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
            />
            <Select
              label="Campus"
              name="feedCampus"
              value={campusId ?? ''}
              onChange={(event) =>
                setCampusId(event.target.value === '' ? null : Number(event.target.value))
              }
            >
              <option value="">All campuses</option>
              {campuses.map((campus) => (
                <option key={campus.campusId} value={campus.campusId}>
                  {campus.name}
                </option>
              ))}
            </Select>
          </div>

          <div className="mt-3">
            <CategoryChips
              categories={categories}
              activeCategoryId={categoryId}
              onSelectCategory={setCategoryId}
            />
          </div>

          <div className="mt-4">
            {!firstLoadDone ? (
              <div className="flex justify-center py-16">
                <Spinner label="Loading listings" />
              </div>
            ) : error ? null : listings === null || listings.length === 0 ? (
              <EmptyState
                title="Nothing for sale here yet"
                description="No active listings match these filters. Try another campus or category - or be the first to sell."
                action={<Button onClick={() => navigate('/listings/new')}>Sell something</Button>}
              />
            ) : (
              <ListingGrid listings={listings} campusNames={campusNames} />
            )}
          </div>
        </div>
      </div>
    </>
  )
}
