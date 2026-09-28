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
   - bulletinApi.list()                                    GET /api/bulletin-posts
     (filtered to PUBLISHED, newest LIVE_FEED_LIMIT, powers the right-rail
     live feed - no author name shown yet, see CampusLiveFeed.tsx)

  The signed-in student's campus (useAuth().user?.campusId) is the default
  campus filter - that is the whole "hyper-local" point of the product.

  LAYOUT (Facebook Marketplace style): the global AppLayout already renders
  the LeftSidebar, so this page is just main column + right rail (Columns):
   - main: "What are you selling?" composer strip -> compact toolbar
     (search, campus, sort, Filters button) -> CategoryChips row -> results
     line -> listing grid (2 compact columns on phones, 3 from md)
   - the category list with counts + condition filter (FeedSidebar) live in
     a "Filters" Sheet - bottom sheet on phones, right panel on desktop - so
     they are reachable at every width
   - right rail, xl only: CampusLiveFeed, SafeExchangeCard, TrustCallout.
     Presentational scaffolding for now; nothing essential lives there.

  URL: the TopBar search navigates to /feed?q=<text>. The search box starts
  from `q` and re-syncs whenever `q` changes (a new TopBar search while the
  feed is already open).

  UX details (borrowed patterns: Preline skeleton loading, Origin UI filter
  pills, standard sort control):
   - skeleton grid on first load instead of a spinner
   - previous results stay visible (dimmed) while filters refetch
   - sort control: newest / price up / price down, applied client-side
   - active-filter pills in a result toolbar, each individually removable
   - search box has an inline clear button
   - Filters button shows how many sheet filters are active

  Components used only by this page live in src/components/feed/.
*/

import {
  ArrowRight,
  Camera,
  CaretDown,
  MagnifyingGlass,
  MapPin,
  Package,
  SlidersHorizontal,
  SortAscending,
  X,
} from "@phosphor-icons/react";
import type { Icon } from "@phosphor-icons/react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import { useAuth } from "@/auth/useAuth";
import { ActiveFilters } from "@/components/feed/ActiveFilters";
import { CampusLiveFeed } from "@/components/feed/CampusLiveFeed";
import { CategoryChips } from "@/components/feed/CategoryChips";
import {
  DEFAULT_CONDITION,
  type ConditionValue,
} from "@/components/feed/conditionOptions";
import { FeedSidebar } from "@/components/feed/FeedSidebar";
import { ListingCardSkeleton } from "@/components/feed/ListingCardSkeleton";
import { ListingGrid } from "@/components/feed/ListingGrid";
import { SafeExchangeCard } from "@/components/feed/SafeExchangeCard";
import { TrustCallout } from "@/components/feed/TrustCallout";
import { Columns } from "@/components/layout/Columns";
import { PageHeader } from "@/components/layout/PageHeader";
import { Seo } from "@/components/seo/Seo";
import { Alert } from "@/components/ui/Alert";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Sheet } from "@/components/ui/Sheet";
import { authApi } from "@/lib/api/auth";
import { bulletinApi } from "@/lib/api/bulletin";
import { listingsApi } from "@/lib/api/listings";
import type { BulletinPost, Campus, Category, Listing } from "@/lib/api/types";
import { usersApi } from "@/lib/api/users";

/** How many recent bulletin posts the live-feed card shows. */
const LIVE_FEED_LIMIT = 6;

const SEARCH_DEBOUNCE_MS = 350;

type SortKey = "newest" | "priceAsc" | "priceDesc";

const SORTERS: Record<SortKey, (a: Listing, b: Listing) => number> = {
  newest: (a, b) => b.createdAt.localeCompare(a.createdAt),
  priceAsc: (a, b) => a.price - b.price,
  priceDesc: (a, b) => b.price - a.price,
};

/* Decorative dot-grid backdrop for the empty state (Pattern Craft style). */
const DOT_GRID =
  "bg-[radial-gradient(circle,var(--color-brand-200)_1px,transparent_1px)] [background-size:16px_16px]";

/* Shared look for the toolbar's pill controls (search, selects, Filters). */
const PILL_CONTROL =
  "glass-card min-h-11 rounded-full border text-sm text-fg shadow-glass transition " +
  "hover:border-line-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500";

/** A native <select> dressed as a toolbar pill, with a leading icon. */
function PillSelect({
  label,
  icon: Glyph,
  value,
  onChange,
  children,
}: {
  label: string;
  icon: Icon;
  value: string | number;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <label className="relative block min-w-0">
      <span className="sr-only">{label}</span>
      <Glyph
        aria-hidden="true"
        className="pointer-events-none absolute left-3.5 top-1/2 z-10 size-4 -translate-y-1/2 text-fg-muted"
      />
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`${PILL_CONTROL} w-full cursor-pointer appearance-none truncate pl-9 pr-9 font-medium focus:outline-2 focus:outline-brand-500`}
      >
        {children}
      </select>
      <CaretDown
        aria-hidden="true"
        weight="bold"
        className="pointer-events-none absolute right-3.5 top-1/2 z-10 size-3.5 -translate-y-1/2 text-fg-muted"
      />
    </label>
  );
}

export function FeedPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const urlQuery = searchParams.get("q") ?? "";
  // ?category=ID - the listing page's category breadcrumb links here.
  const rawCategory = searchParams.get("category");
  const urlCategoryId =
    rawCategory && /^\d+$/.test(rawCategory) ? Number(rawCategory) : null;

  // Reference data (loaded once) + per-category ACTIVE counts for the sidebar.
  const [categories, setCategories] = useState<Category[]>([]);
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [counts, setCounts] = useState<Record<number, number>>({});

  // Recent bulletin posts for the right-rail live feed. null = still loading;
  // [] is a real "nothing posted yet" state, not an error.
  const [livePosts, setLivePosts] = useState<BulletinPost[] | null>(null);
  // authorId -> display name, resolved only for the authors of livePosts.
  const [authorNames, setAuthorNames] = useState<Record<number, string>>({});

  // Filters. campusId defaults to the student's own campus.
  const [campusId, setCampusId] = useState<number | null>(
    user?.campusId ?? null,
  );
  const [categoryId, setCategoryId] = useState<number | null>(urlCategoryId);
  const [searchInput, setSearchInput] = useState(urlQuery);
  const [title, setTitle] = useState(urlQuery.trim());
  const [sortKey, setSortKey] = useState<SortKey>("newest");

  // Filters sheet + the (not yet wired) condition picks inside it, kept here
  // so they survive the sheet closing. See ConditionFilter.tsx.
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [condition, setCondition] = useState<ConditionValue>(DEFAULT_CONDITION);

  /*
    Keep the search box in sync with ?q= (a new TopBar search while the feed
    is already open). Adjusting state during render when the URL value
    changes - React's recommended alternative to a syncing effect.
  */
  const [syncedQuery, setSyncedQuery] = useState(urlQuery);
  if (urlQuery !== syncedQuery) {
    setSyncedQuery(urlQuery);
    setSearchInput(urlQuery);
    setTitle(urlQuery.trim());
  }
  const [syncedCategory, setSyncedCategory] = useState(urlCategoryId);
  if (urlCategoryId !== syncedCategory) {
    setSyncedCategory(urlCategoryId);
    setCategoryId(urlCategoryId);
  }

  /*
    Results. `listings` stays null until the first successful response arrives;
    while later requests are in flight the previous grid stays up (stale-while-
    revalidate, dimmed) instead of flashing a spinner on every filter change.
  */
  const [listings, setListings] = useState<Listing[] | null>(null);
  const [firstLoadDone, setFirstLoadDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Debounce the search box before it becomes a request parameter.
  useEffect(() => {
    const timer = setTimeout(
      () => setTitle(searchInput.trim()),
      SEARCH_DEBOUNCE_MS,
    );
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Categories, campuses and count tallies never change while the page is open.
  useEffect(() => {
    let cancelled = false;

    async function loadReferenceData() {
      try {
        const [categoryList, campusList, everyListing] = await Promise.all([
          listingsApi.categories(),
          authApi.campuses(),
          listingsApi.list(),
        ]);
        if (cancelled) return;

        setCategories(categoryList);
        setCampuses(campusList);

        const tallies: Record<number, number> = {};
        for (const listing of everyListing) {
          if (listing.status === "ACTIVE") {
            tallies[listing.categoryId] =
              (tallies[listing.categoryId] ?? 0) + 1;
          }
        }
        setCounts(tallies);
      } catch {
        // Counts and pickers are non-critical; the listings effect surfaces
        // errors users actually care about.
      }
    }

    async function loadLiveFeed() {
      try {
        // bulletinApi.list() has no "recent"/status filter server-side, so
        // filter to PUBLISHED and take the newest few here.
        const allPosts = await bulletinApi.list();
        if (cancelled) return;

        const recent = allPosts
          .filter((post) => post.status === "PUBLISHED")
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
          .slice(0, LIVE_FEED_LIMIT);

        setLivePosts(recent);

        // Resolve just the distinct authors behind these posts (at most
        // LIVE_FEED_LIMIT lookups, usually fewer since students repost).
        // usersApi.byId is authedRequest - fine here, the whole page is
        // behind ProtectedRoute. A failed lookup just leaves that author
        // unresolved; CampusLiveFeed falls back to a generic label for it.
        const uniqueAuthorIds = [
          ...new Set(recent.map((post) => post.authorId)),
        ];
        const authorEntries = await Promise.all(
          uniqueAuthorIds.map(
            async (authorId): Promise<[number, string] | null> => {
              try {
                const author = await usersApi.byId(authorId);
                const name: string = `${author.firstName} ${author.lastName}`;
                return [authorId, name];
              } catch {
                return null;
              }
            },
          ),
        );
        if (cancelled) return;

        const resolved: Record<number, string> = {};
        for (const entry of authorEntries) {
          if (entry !== null) resolved[entry[0]] = entry[1];
        }
        setAuthorNames(resolved);
      } catch {
        // The live feed is non-critical chrome; fail quietly to an empty list
        // rather than surfacing an error banner over the whole page.
        if (!cancelled) setLivePosts([]);
      }
    }

    loadReferenceData();
    loadLiveFeed();
    return () => {
      cancelled = true;
    };
  }, []);

  /*
    Listings follow the active filters. StrictMode-safe via the cancelled flag,
    and every setState happens in an async callback - none in the effect body.
  */
  useEffect(() => {
    let cancelled = false;

    listingsApi
      .search({
        campusId: campusId ?? undefined,
        categoryId: categoryId ?? undefined,
        title: title || undefined,
      })
      .then((results) => {
        if (cancelled) return;
        setListings(results);
      })
      .catch((err: unknown) => {
        if (!cancelled)
          setError(
            err instanceof Error ? err.message : "Something went wrong.",
          );
      })
      .finally(() => {
        if (!cancelled) setFirstLoadDone(true);
      });

    return () => {
      cancelled = true;
    };
  }, [campusId, categoryId, title, refreshKey]);

  const campusNames: Record<number, string> = {};
  for (const campus of campuses) campusNames[campus.campusId] = campus.name;

  const totalActive = useMemo(
    () => Object.values(counts).reduce((sum, count) => sum + count, 0),
    [counts],
  );

  // Sorting is client-side: search already returned every matching ACTIVE row.
  const sortedListings = useMemo(() => {
    if (!listings) return null;
    return [...listings].sort(SORTERS[sortKey]);
  }, [listings, sortKey]);

  const categoryNames: Record<number, string> = {};
  for (const category of categories)
    categoryNames[category.categoryId] = category.name;

  const activeCampusName =
    campusId !== null ? campusNames[campusId] : undefined;
  const activeCategoryName = categories.find(
    (c) => c.categoryId === categoryId,
  )?.name;
  const hasActiveFilters = Boolean(
    activeCampusName || activeCategoryName || title,
  );
  // Only filters that live in the sheet count towards the button badge.
  const sheetFilterCount = categoryId !== null ? 1 : 0;
  const firstName = user?.firstName;

  function clearAllFilters() {
    setCampusId(null);
    setCategoryId(null);
    setSearchInput("");
    setTitle("");
  }

  const rail = (
    <>
      <CampusLiveFeed
        posts={livePosts ?? []}
        authorNames={authorNames}
        loading={livePosts === null}
      />
      <SafeExchangeCard />
      <TrustCallout />
    </>
  );

  return (
    <Columns aside={rail} asideLabel="Campus activity">
      <Seo
        title="Marketplace"
        description="Browse textbooks, tech, stationery and res essentials for sale from verified CPUT students and staff."
        path="/feed"
        noindex
      />
      <PageHeader
        title="Marketplace"
        subtitle="What's for sale on your campus"
      />

      {/* Facebook-style composer strip: the "sell" entry point. */}
      <Card padding="sm" className="flex items-center gap-3">
        <Avatar
          name={user ? `${user.firstName} ${user.lastName}` : null}
          className="size-10"
        />
        <Link
          to="/listings/new"
          className="flex min-h-11 min-w-0 flex-1 items-center rounded-full bg-surface-muted px-4 text-sm text-fg-muted transition hover:bg-gray-200 active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
        >
          <span className="truncate">
            What are you selling{firstName ? `, ${firstName}` : ""}?
          </span>
        </Link>
        <Link
          to="/listings/new"
          aria-label="Sell with a photo"
          title="Sell with a photo"
          className="grid size-11 shrink-0 place-items-center rounded-full text-emerald-600 transition hover:bg-surface-muted active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
        >
          <Camera aria-hidden="true" weight="fill" className="size-6" />
        </Link>
      </Card>

      {error && (
        <div className="mt-4">
          <Alert tone="error">
            <div className="flex items-center justify-between gap-3">
              <span>{error}</span>
              <button
                type="button"
                onClick={() => setRefreshKey((key) => key + 1)}
                className="min-h-9 shrink-0 rounded-lg px-2 font-semibold underline focus-visible:outline-2 focus-visible:outline-brand-500"
              >
                Retry
              </button>
            </div>
          </Alert>
        </div>
      )}

      {/* Toolbar. Phones: search + Filters on one row, campus + sort under
          it. sm and up: everything on one row. */}
      <div
        role="search"
        className="mt-4 grid grid-cols-[minmax(0,1fr)_auto] gap-2 sm:flex sm:items-center"
      >
        <div className="relative min-w-0 sm:flex-1">
          <label htmlFor="feedSearch" className="sr-only">
            Search listings
          </label>
          <MagnifyingGlass
            aria-hidden="true"
            className="pointer-events-none absolute left-3.5 top-1/2 z-10 size-4.5 -translate-y-1/2 text-fg-muted"
          />
          <input
            id="feedSearch"
            name="feedSearch"
            type="search"
            enterKeyHint="search"
            autoComplete="off"
            placeholder="Search textbooks, electronics…"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            className={`${PILL_CONTROL} w-full pl-10 pr-11 placeholder:text-fg-subtle focus:outline-2 focus:outline-brand-500 [&::-webkit-search-cancel-button]:appearance-none`}
          />
          {searchInput && (
            <button
              type="button"
              onClick={() => setSearchInput("")}
              aria-label="Clear search"
              className="absolute right-1 top-1/2 z-10 grid size-9 -translate-y-1/2 place-items-center rounded-full text-fg-muted transition hover:bg-surface-muted hover:text-fg focus-visible:outline-2 focus-visible:outline-brand-500"
            >
              <X aria-hidden="true" weight="bold" className="size-4" />
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={() => setFiltersOpen(true)}
          aria-haspopup="dialog"
          className={`${PILL_CONTROL} inline-flex items-center gap-2 px-4 font-semibold active:scale-[0.97] sm:order-last`}
        >
          <SlidersHorizontal aria-hidden="true" className="size-4.5" />
          Filters
          {sheetFilterCount > 0 && (
            <span className="grid min-w-5 place-items-center rounded-full bg-primary px-1.5 text-xs font-bold tabular-nums text-on-primary">
              {sheetFilterCount}
              <span className="sr-only"> active</span>
            </span>
          )}
        </button>

        <div className="col-span-2 grid grid-cols-2 gap-2 sm:flex sm:w-auto">
          <div className="sm:w-40 2xl:w-44">
            <PillSelect
              label="Campus"
              icon={MapPin}
              value={campusId ?? ""}
              onChange={(value) =>
                setCampusId(value === "" ? null : Number(value))
              }
            >
              <option value="">All campuses</option>
              {campuses.map((campus) => (
                <option key={campus.campusId} value={campus.campusId}>
                  {campus.name}
                </option>
              ))}
            </PillSelect>
          </div>
          <div className="sm:w-40 2xl:w-44">
            <PillSelect
              label="Sort"
              icon={SortAscending}
              value={sortKey}
              onChange={(value) => setSortKey(value as SortKey)}
            >
              <option value="newest">Newest</option>
              <option value="priceAsc">Price: low to high</option>
              <option value="priceDesc">Price: high to low</option>
            </PillSelect>
          </div>
        </div>
      </div>

      <div className="mt-3">
        <CategoryChips
          categories={categories}
          activeCategoryId={categoryId}
          onSelectCategory={setCategoryId}
        />
      </div>

      {/* Status line matching the mockup's "Showing N active items" row,
          with a live indicator on the right. Removable filter pills only
          render once a filter is actually active, same as before. */}
      {firstLoadDone && !error && sortedListings && (
        <div className="mt-3 flex items-center justify-between gap-3">
          {hasActiveFilters ? (
            <ActiveFilters
              resultCount={sortedListings.length}
              campusName={activeCampusName}
              categoryName={activeCategoryName}
              search={title || undefined}
              onClearCampus={() => setCampusId(null)}
              onClearCategory={() => setCategoryId(null)}
              onClearSearch={() => setSearchInput("")}
              onClearAll={clearAllFilters}
            />
          ) : (
            <p className="text-sm font-medium tabular-nums text-fg-muted">
              Showing {sortedListings.length} active{" "}
              {sortedListings.length === 1 ? "item" : "items"} on campus
            </p>
          )}

          <span className="inline-flex shrink-0 items-center gap-1.5 self-start pt-2 text-xs font-medium text-emerald-700">
            <span className="relative flex size-1.5" aria-hidden="true">
              <span className="absolute inset-0 rounded-full bg-emerald-500 motion-safe:animate-ping" />
              <span className="relative size-1.5 rounded-full bg-emerald-500" />
            </span>
            <span className="hidden sm:inline">Real-time feed</span>
            <span className="sm:hidden">Live</span>
          </span>
        </div>
      )}

      <div className="mt-3">
        {!firstLoadDone ? (
          /* First load: skeleton grid, same shape as the real cards
             (keep these grid classes in sync with ListingGrid). */
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3">
            {Array.from({ length: 6 }, (_, index) => (
              <ListingCardSkeleton key={index} />
            ))}
          </div>
        ) : error ? null : sortedListings === null ||
          sortedListings.length === 0 ? (
          <div
            className="glass-card overflow-hidden rounded-2xl border shadow-glass"
          >
            <div className={`${DOT_GRID} px-6 py-10 text-center`}>
              <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-brand-50 text-brand-700">
                <Package aria-hidden="true" weight="duotone" className="size-7" />
              </span>
              <p className="mt-4 text-base font-semibold text-fg">
                Nothing for sale here yet
              </p>
              <p className="mx-auto mt-1.5 max-w-sm text-sm text-fg-muted">
                No active listings match these filters. Try another campus or
                category - or be the first to sell.
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                {hasActiveFilters && (
                  <Button
                    variant="secondary"
                    className="w-auto"
                    onClick={clearAllFilters}
                  >
                    Clear filters
                  </Button>
                )}
                <Button
                  className="w-auto"
                  onClick={() => navigate("/listings/new")}
                >
                  Sell something
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <ListingGrid
            listings={sortedListings}
            campusNames={campusNames}
            categoryNames={categoryNames}
          />
        )}
      </div>

      {/* Footer prompt, matching the mockup's "didn't find it?" card. */}
      <Link
        to="/bulletin"
        className="glass-card mt-6 flex items-center gap-3 rounded-2xl border border-dashed !border-line-strong p-4 transition hover:!border-brand-300 active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 sm:p-5"
      >
        <div className="min-w-0 flex-1">
          <p className="text-sm text-fg-muted">
            Looking for something specific that isn't listed?
          </p>
          <p className="mt-0.5 text-sm font-semibold text-brand-700">
            Post a "Wanted" request on the Campus Bulletin
          </p>
        </div>
        <ArrowRight aria-hidden="true" className="size-5 shrink-0 text-brand-700" />
      </Link>

      <Sheet
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        title="Filters"
        description="Narrow down what's on sale."
        footer={
          <>
            <Button
              variant="secondary"
              className="sm:w-auto"
              onClick={() => {
                setCategoryId(null);
                setCondition(DEFAULT_CONDITION);
              }}
            >
              Reset
            </Button>
            <Button className="sm:w-auto" onClick={() => setFiltersOpen(false)}>
              {sortedListings
                ? `Show ${sortedListings.length} ${sortedListings.length === 1 ? "result" : "results"}`
                : "Done"}
            </Button>
          </>
        }
      >
        <FeedSidebar
          categories={categories}
          counts={counts}
          totalActive={totalActive}
          activeCategoryId={categoryId}
          onSelectCategory={setCategoryId}
          condition={condition}
          onConditionChange={setCondition}
        />
      </Sheet>
    </Columns>
  );
}
