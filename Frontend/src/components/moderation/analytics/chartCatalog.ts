/*
  Every chart the dashboard can show, and which backend series feed it.

  Form follows the data's job: change over time is a line; counts of discrete
  events per bucket (suspensions, removals, new accounts by type) are bars. Each
  chart has one y-axis and at most three series, so the three validated colour
  slots always suffice. A series keeps its slot (colour) no matter which charts
  are showing.

  `higherIsBetter` decides the colour of the "vs previous period" delta: more
  signups is good news, more suspensions is not.

  Author: Mogamat Yaseen Kannemeyer 240453182
*/

export type ChartKind = 'line' | 'bar' | 'stackedBar'
export type ValueFormat = 'count' | 'rand' | 'rating' | 'rate'

export type ChartSeries = {
  key: string
  label: string
  /** 1-3: the --ux-series-N colour. */
  slot: 1 | 2 | 3
}

export type ChartDef = {
  id: string
  title: string
  description: string
  kind: ChartKind
  series: ChartSeries[]
  format: ValueFormat
  higherIsBetter: boolean | null
  /** Shown only in an admin session. The backend omits the data otherwise. */
  adminOnly?: boolean
  /** Which series the headline total and delta come from. Defaults to the first. */
  headline?: string
  /** For running totals, the headline is the latest value, not a sum. */
  headlineIsLatest?: boolean
}

export const CHARTS: ChartDef[] = [
  {
    id: 'growth',
    title: 'User growth',
    description: 'Accounts on UniExchange over time (closed accounts excluded).',
    kind: 'line',
    series: [{ key: 'usersTotal', label: 'Accounts', slot: 1 }],
    format: 'count',
    higherIsBetter: true,
    headlineIsLatest: true,
  },
  {
    id: 'signups',
    title: 'New accounts',
    description: 'Sign-ups per period, students and CPUT staff.',
    kind: 'stackedBar',
    series: [
      { key: 'signupsStudent', label: 'Students', slot: 1 },
      { key: 'signupsStaff', label: 'Staff', slot: 2 },
    ],
    format: 'count',
    higherIsBetter: true,
    headline: 'signups',
  },
  {
    id: 'listings',
    title: 'Listings created vs sold',
    description: 'New listings against completed sales.',
    kind: 'line',
    series: [
      { key: 'listingsCreated', label: 'Created', slot: 1 },
      { key: 'listingsSold', label: 'Sold', slot: 2 },
    ],
    format: 'count',
    higherIsBetter: true,
  },
  {
    id: 'posts',
    title: 'Bulletin activity',
    description: 'Student posts on the bulletin board (announcements excluded).',
    kind: 'line',
    series: [{ key: 'postsCreated', label: 'Posts', slot: 1 }],
    format: 'count',
    higherIsBetter: true,
  },
  {
    id: 'messages',
    title: 'Messages sent',
    description: 'Chat messages between buyers and sellers.',
    kind: 'line',
    series: [{ key: 'messagesSent', label: 'Messages', slot: 1 }],
    format: 'count',
    higherIsBetter: true,
  },
  {
    id: 'reviews',
    title: 'Reviews and bad reviews',
    description: 'All reviews, and those at or below the flag threshold.',
    kind: 'bar',
    series: [
      { key: 'reviews', label: 'All reviews', slot: 1 },
      { key: 'badReviews', label: 'Bad reviews', slot: 2 },
    ],
    format: 'count',
    higherIsBetter: null,
    headline: 'badReviews',
  },
  {
    id: 'rating',
    title: 'Average rating',
    description: 'Mean star rating of reviews left in each period.',
    kind: 'line',
    series: [{ key: 'avgRating', label: 'Average rating', slot: 1 }],
    format: 'rating',
    higherIsBetter: true,
  },
  {
    id: 'suspensions',
    title: 'Suspensions',
    description: 'Accounts suspended by moderators.',
    kind: 'bar',
    series: [{ key: 'suspensions', label: 'Suspensions', slot: 1 }],
    format: 'count',
    higherIsBetter: false,
  },
  {
    id: 'banRate',
    title: 'Ban rate',
    description: 'Suspensions per 1,000 accounts.',
    kind: 'line',
    series: [{ key: 'banRate', label: 'Per 1,000 accounts', slot: 1 }],
    format: 'rate',
    higherIsBetter: false,
  },
  {
    id: 'removals',
    title: 'Content removed',
    description: 'Listings, posts and reviews taken down by moderators.',
    kind: 'stackedBar',
    series: [
      { key: 'removedListings', label: 'Listings', slot: 1 },
      { key: 'removedPosts', label: 'Posts', slot: 2 },
      { key: 'removedReviews', label: 'Reviews', slot: 3 },
    ],
    format: 'count',
    higherIsBetter: false,
  },
  {
    id: 'reports',
    title: 'Reports filed vs resolved',
    description: 'User reports coming in, and reports closed.',
    kind: 'line',
    series: [
      { key: 'reportsFiled', label: 'Filed', slot: 1 },
      { key: 'reportsResolved', label: 'Resolved', slot: 2 },
    ],
    format: 'count',
    higherIsBetter: null,
  },
  {
    id: 'sales',
    title: 'Sales volume',
    description: 'Value of completed purchases.',
    kind: 'line',
    series: [{ key: 'salesVolume', label: 'Sales', slot: 1 }],
    format: 'rand',
    higherIsBetter: true,
    adminOnly: true,
  },
  {
    id: 'topups',
    title: 'Wallet top-ups',
    description: 'Money added to wallets through PayFast.',
    kind: 'bar',
    series: [{ key: 'topUpVolume', label: 'Top-ups', slot: 1 }],
    format: 'rand',
    higherIsBetter: true,
    adminOnly: true,
  },
]

export const DEFAULT_CHARTS = ['growth', 'listings', 'reviews', 'suspensions', 'banRate']

const count = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 })
const rate = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 })
const rand = new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', maximumFractionDigits: 0 })

export function formatValue(value: number | null | undefined, format: ValueFormat): string {
  if (value == null) return '–'
  switch (format) {
    case 'rand':
      return rand.format(value)
    case 'rating':
      return `${rate.format(value)} ★`
    case 'rate':
      return rate.format(value)
    default:
      return count.format(value)
  }
}
