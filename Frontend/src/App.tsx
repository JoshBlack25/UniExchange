/*
  Every route in the app.

  Structure, outside in:
    <ProtectedRoute>   redirects to /login when there is no session
      <AppLayout>      top bar, nav and mobile tab bar - pages render inside it
        the page

  So a new signed-in page is ONE line inside the AppLayout block, and it gets the
  chrome for free. Public routes (auth screens, 404) sit outside both.

  Keep the "*" catch-all last.

  "/" is the public landing page for visitors and a redirect to /feed for a
  signed-in student.

  Author: Mogamat Yaseen Kannemeyer 240453182
*/

import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'

import { GuestRoute } from '@/auth/GuestRoute'
import { ModeRoute } from '@/auth/ModeRoute'
import { ProtectedRoute } from '@/auth/ProtectedRoute'
import { useAuth } from '@/auth/useAuth'
import { AppLayout } from '@/components/layout/AppLayout'
import { RouteFallback } from '@/components/layout/RouteFallback'
import { LandingPage } from '@/pages/LandingPage'
import { LoginPage } from '@/pages/LoginPage'

/*
  Every other page is its own lazy chunk, so the first visit only downloads the
  landing page or the login form. Landing and Login stay eager: they are the
  two pages people arrive on cold. The moderation pages share one chunk (see
  pages/moderation/index.ts) - students never download it at all.
*/
const BulletinPage = lazy(() => import('@/pages/BulletinPage').then((m) => ({ default: m.BulletinPage })))
const ChatPage = lazy(() => import('@/pages/ChatPage').then((m) => ({ default: m.ChatPage })))
const CreateListingPage = lazy(() =>
  import('@/pages/CreateListingPage').then((m) => ({ default: m.CreateListingPage })),
)
const FeedPage = lazy(() => import('@/pages/FeedPage').then((m) => ({ default: m.FeedPage })))
const ListingDetailsPage = lazy(() =>
  import('@/pages/ListingDetailsPage').then((m) => ({ default: m.ListingDetailsPage })),
)
const MessagesPage = lazy(() => import('@/pages/MessagesPage').then((m) => ({ default: m.MessagesPage })))
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage })))
const NotificationsPage = lazy(() =>
  import('@/pages/NotificationsPage').then((m) => ({ default: m.NotificationsPage })),
)
const ProfilePage = lazy(() => import('@/pages/ProfilePage').then((m) => ({ default: m.ProfilePage })))
const PurchasesPage = lazy(() => import('@/pages/PurchasesPage').then((m) => ({ default: m.PurchasesPage })))
const SignUpPage = lazy(() => import('@/pages/SignUpPage').then((m) => ({ default: m.SignUpPage })))
const VerifyOtpPage = lazy(() => import('@/pages/VerifyOtpPage').then((m) => ({ default: m.VerifyOtpPage })))
const WalletPage = lazy(() => import('@/pages/WalletPage').then((m) => ({ default: m.WalletPage })))

const moderation = () => import('@/pages/moderation')
const AdminStaffPage = lazy(() => moderation().then((m) => ({ default: m.AdminStaffPage })))
const ModerationActivityPage = lazy(() => moderation().then((m) => ({ default: m.ModerationActivityPage })))
const ModerationAnnouncementsPage = lazy(() =>
  moderation().then((m) => ({ default: m.ModerationAnnouncementsPage })),
)
const ModerationCaseFilesPage = lazy(() => moderation().then((m) => ({ default: m.ModerationCaseFilesPage })))
const ModerationLayout = lazy(() => moderation().then((m) => ({ default: m.ModerationLayout })))
const ModerationListingsPage = lazy(() => moderation().then((m) => ({ default: m.ModerationListingsPage })))
const ModerationOverviewPage = lazy(() => moderation().then((m) => ({ default: m.ModerationOverviewPage })))
const ModerationPostsPage = lazy(() => moderation().then((m) => ({ default: m.ModerationPostsPage })))
const ModerationReportsPage = lazy(() => moderation().then((m) => ({ default: m.ModerationReportsPage })))
const ModerationReviewsPage = lazy(() => moderation().then((m) => ({ default: m.ModerationReviewsPage })))
const ModerationUsersPage = lazy(() => moderation().then((m) => ({ default: m.ModerationUsersPage })))

export default function App() {
  const { isAuthenticated } = useAuth()

  return (
    // Public lazy pages (sign-up, verify, 404) have no shell, so their fallback fills the screen.
    <Suspense fallback={<RouteFallback fullScreen />}>
      <Routes>
        {/* The public landing page; a signed-in student goes straight to the feed. */}
        <Route index element={isAuthenticated ? <Navigate to="/feed" replace /> : <LandingPage />} />

        {/* Public - auth screens use AuthLayout, not AppLayout.
            GuestRoute keeps a signed-in student out of them, so the browser back
            button cannot land them on a login form they no longer need. */}
        <Route element={<GuestRoute />}>
          <Route path="/signup" element={<SignUpPage />} />
          <Route path="/verify" element={<VerifyOtpPage />} />
          <Route path="/login" element={<LoginPage />} />
        </Route>

        {/* Signed in. Everything here gets the app shell automatically. */}
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            {/* Joshua Reid Adams (230317693) */}
            <Route path="/feed" element={<FeedPage />} />

            {/* Mogamat Wazeer Gilbert (221374698) - static path, so it wins over
                /listings/:listingId regardless of the order here. */}
            <Route path="/listings/new" element={<CreateListingPage />} />

            {/* Aidan Barends (230255639) */}
            <Route path="/listings/:listingId" element={<ListingDetailsPage />} />

            {/* Raul Ja'aim Everts (230270565) - one component, both routes. */}
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/profile/:userId" element={<ProfilePage />} />

            {/* unassigned */}
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/messages" element={<MessagesPage />} />
            <Route path="/messages/:conversationId" element={<ChatPage />} />
            <Route path="/bulletin" element={<BulletinPage />} />

            {/* Wallet and escrow. Reached from the top bar and the profile rather
                than the five-tab nav, which is already full. */}
            <Route path="/wallet" element={<WalletPage />} />
            <Route path="/purchases" element={<PurchasesPage />} />

            {/* Moderation - only in a session opened with the hidden sign-in
                (Ctrl+Alt+M / Ctrl+Alt+A). ModeRoute sends anyone else to the feed. */}
            <Route element={<ModeRoute require="MODERATOR" />}>
              <Route path="/moderation" element={<ModerationLayout />}>
                <Route index element={<Navigate to="overview" replace />} />
                <Route path="overview" element={<ModerationOverviewPage />} />
                <Route path="users" element={<ModerationUsersPage />} />
                <Route path="listings" element={<ModerationListingsPage />} />
                <Route path="posts" element={<ModerationPostsPage />} />
                <Route path="announcements" element={<ModerationAnnouncementsPage />} />
                <Route path="reviews" element={<ModerationReviewsPage />} />
                <Route path="reports" element={<ModerationReportsPage />} />
                <Route path="case-files" element={<ModerationCaseFilesPage />} />
                <Route path="activity" element={<ModerationActivityPage />} />
              </Route>
            </Route>
            <Route element={<ModeRoute require="ADMIN" />}>
              {/* Inside ModerationLayout so it keeps the section tabs. */}
              <Route path="/admin" element={<ModerationLayout />}>
                <Route index element={<Navigate to="staff" replace />} />
                <Route path="staff" element={<AdminStaffPage />} />
              </Route>
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  )
}
