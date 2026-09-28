/*
  App header, Facebook-style: logo + search on the left, the five
  destinations as icon tabs in the centre (md+), and wallet, notifications
  and the account menu on the right. Frosted glass, sticky.

  On a phone the tabs move to BottomNav and search collapses to an icon that
  opens a full-width search row under the bar. Search sends the student to
  /feed?q=..., which FeedPage reads into its search box.

  Unread count: fetches notificationsApi.unreadForUser(userId) on mount, then
  keeps it current three ways -
   - polls every UNREAD_POLL_MS while the tab is open
   - refetches on window focus (switching back to the tab updates it without
     waiting for the interval)
   - refetches immediately when the /notifications page marks something
     read, via the tiny pub/sub in lib/notificationEvents.ts, so the badge
     clears live instead of lagging behind by up to a full poll interval

  No websocket/SSE anywhere else in this stack, so polling is the
  pragmatic choice here rather than introducing a new transport for one
  badge.
*/

import { ArrowLeft, Moon, Sun } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { useSessionMode } from "@/auth/roles";
import { useAuth } from "@/auth/useAuth";
import { Avatar } from "@/components/ui/Avatar";
import { photoSrc } from "@/lib/api/profilePhotos";
import { IconButton } from "@/components/ui/IconButton";
import { Menu, MenuHeader, MenuItem, MenuSeparator } from "@/components/ui/Menu";
import { notificationsApi } from "@/lib/api/notifications";
import { onNotificationsChanged } from "@/lib/notificationEvents";
import { useTheme } from "@/lib/theme";

import { Logo } from "./Logo";
import {
  BellIcon,
  ProfileIcon,
  PurchasesIcon,
  SearchIcon,
  SignOutIcon,
  WalletIcon,
} from "./NavIcons";
import { NAV_ITEMS, staffItemsFor } from "./navigation";

const UNREAD_POLL_MS = 45_000;

export function TopBar() {
  const { signOut, session, user } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const theme = useTheme();
  const onNotifications = pathname.startsWith("/notifications");
  const onWallet = pathname.startsWith("/wallet") || pathname.startsWith("/purchases");
  const userId = session?.userId;
  const fullName = user ? `${user.firstName} ${user.lastName}` : null;
  const staffItems = staffItemsFor(useSessionMode());

  const [unreadCount, setUnreadCount] = useState(0);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const mobileSearch = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!userId) return;

    let cancelled = false;

    function refetch() {
      notificationsApi
        .unreadForUser(userId as number)
        .then((unread) => {
          if (!cancelled) setUnreadCount(unread.length);
        })
        .catch(() => {
          // Non-critical chrome; leave the badge as it was on a failed check.
        });
    }

    refetch();
    const interval = setInterval(refetch, UNREAD_POLL_MS);
    window.addEventListener("focus", refetch);
    const unsubscribe = onNotificationsChanged(refetch);

    return () => {
      cancelled = true;
      clearInterval(interval);
      window.removeEventListener("focus", refetch);
      unsubscribe();
    };
  }, [userId]);

  useEffect(() => {
    if (searchOpen) mobileSearch.current?.focus();
  }, [searchOpen]);

  function submitSearch(event: React.FormEvent) {
    event.preventDefault();
    const q = query.trim();
    setSearchOpen(false);
    navigate(q ? `/feed?q=${encodeURIComponent(q)}` : "/feed");
  }

  const iconLink = (active: boolean) =>
    "relative grid size-10 place-items-center rounded-full transition active:scale-95 sm:size-11 " +
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 " +
    (active
      ? "bg-brand-100 text-brand-700"
      : "bg-surface-muted text-fg hover:bg-gray-200");

  const searchInput = (id: string, ref?: React.Ref<HTMLInputElement>) => (
    <div className="relative w-full">
      <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 size-4.5 -translate-y-1/2 text-fg-subtle" />
      <label htmlFor={id} className="sr-only">
        Search UniExchange
      </label>
      <input
        ref={ref}
        id={id}
        type="search"
        enterKeyHint="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search UniExchange"
        className={
          "h-10 w-full rounded-full border border-transparent bg-surface-muted pl-10 pr-4 text-sm text-fg " +
          "placeholder:text-fg-subtle transition focus:border-brand-400 focus:bg-surface focus:outline-none " +
          "focus:ring-4 focus:ring-brand-500/15"
        }
      />
    </div>
  );

  return (
    <header className="glass sticky top-0 z-30 border-b">
      <div className="mx-auto flex h-14 max-w-360 items-center gap-2 px-3 sm:h-16 sm:px-4">
        {/* Left: logo + search */}
        <div className="flex min-w-0 flex-1 items-center gap-2 md:flex-none lg:w-80 xl:w-88">
          <Link
            to="/feed"
            aria-label="UniExchange home"
            className="shrink-0 rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
          >
            {/* Full wordmark, except at lg where the search field needs the room. */}
            <Logo className="lg:hidden xl:flex" />
            <Logo compact className="hidden lg:flex xl:hidden" />
          </Link>

          <form role="search" onSubmit={submitSearch} className="hidden min-w-0 flex-1 lg:block">
            {searchInput("top-search")}
          </form>
        </div>

        {/* Centre: destination tabs (md+). The phone gets BottomNav instead. */}
        <nav aria-label="Primary" className="hidden h-full flex-1 justify-center md:flex">
          <ul className="flex h-full w-full max-w-xl items-stretch">
            {NAV_ITEMS.map(({ to, label, Icon, match }) => {
              const active = match(pathname);
              return (
                <li key={to} className="flex-1">
                  <Link
                    to={to}
                    aria-label={label}
                    title={label}
                    aria-current={active ? "page" : undefined}
                    className={
                      "group relative flex h-full items-center justify-center px-2 transition " +
                      "focus-visible:outline-none " +
                      (active ? "text-brand-600" : "text-fg-muted hover:text-fg")
                    }
                  >
                    <span
                      className={
                        "grid h-11 w-full max-w-28 place-items-center rounded-xl transition " +
                        "group-focus-visible:outline-2 group-focus-visible:outline-brand-500 " +
                        (active ? "" : "group-hover:bg-surface-muted")
                      }
                    >
                      <Icon className="size-6" active={active} />
                    </span>
                    {active && (
                      <span
                        aria-hidden="true"
                        className="absolute inset-x-2 bottom-0 h-0.75 rounded-t-full bg-brand-500"
                      />
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Right: actions + account */}
        <div className="flex shrink-0 items-center justify-end gap-1.5 sm:gap-2 lg:w-80 xl:w-88">
          <IconButton
            label="Search"
            className="lg:hidden"
            size="md"
            onClick={() => setSearchOpen(true)}
          >
            <SearchIcon className="size-5" />
          </IconButton>

          {/* Wallet lives here rather than in NAV_ITEMS: the mobile tab bar
              already holds five destinations and a sixth makes each one too
              narrow to hit reliably. */}
          <Link
            to="/wallet"
            aria-label="Wallet"
            title="Wallet"
            aria-current={onWallet ? "page" : undefined}
            className={`${iconLink(onWallet)} hidden sm:grid`}
          >
            <WalletIcon className="size-5" active={onWallet} />
          </Link>

          <Link
            to="/notifications"
            aria-label={
              unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"
            }
            title="Notifications"
            aria-current={onNotifications ? "page" : undefined}
            className={iconLink(onNotifications)}
          >
            <BellIcon className="size-5" active={onNotifications} />
            {unreadCount > 0 && (
              <span
                aria-hidden="true"
                className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-danger px-1 text-[11px] font-bold leading-none text-white ring-2 ring-surface"
              >
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </Link>

          <Menu
            label="Account menu"
            trigger={<Avatar name={fullName} src={photoSrc(user)} className="size-10 sm:size-11" />}
          >
            <MenuHeader>
              <Link
                to="/profile"
                className="-mx-1.5 -my-1 flex items-center gap-3 rounded-xl p-1.5 hover:bg-surface-muted"
              >
                <Avatar name={fullName} src={photoSrc(user)} className="size-10" />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-fg">
                    {fullName ?? "Your profile"}
                  </span>
                  <span className="block truncate text-xs text-fg-subtle">
                    {user?.email ?? "View your profile"}
                  </span>
                </span>
              </Link>
            </MenuHeader>
            <MenuSeparator />
            <MenuItem to="/profile" icon={<ProfileIcon />}>
              Profile
            </MenuItem>
            <MenuItem to="/wallet" icon={<WalletIcon />}>
              Wallet
            </MenuItem>
            <MenuItem to="/purchases" icon={<PurchasesIcon />}>
              Purchases
            </MenuItem>
            {staffItems.map(({ to, label, Icon }) => (
              <MenuItem key={to} to={to} icon={<Icon />}>
                {label}
              </MenuItem>
            ))}
            <MenuItem
              icon={theme.resolved === "dark" ? <Sun /> : <Moon />}
              onSelect={theme.toggle}
              meta={theme.preference === "system" ? "Auto" : undefined}
            >
              {theme.resolved === "dark" ? "Light mode" : "Dark mode"}
            </MenuItem>
            <MenuSeparator />
            <MenuItem icon={<SignOutIcon />} onSelect={signOut} tone="danger">
              Sign out
            </MenuItem>
          </Menu>
        </div>
      </div>

      {/* Phone / tablet search row. */}
      {searchOpen && (
        <form
          role="search"
          onSubmit={submitSearch}
          className="flex animate-pop-in items-center gap-2 border-t border-line px-3 py-2 lg:hidden"
          onKeyDown={(event) => {
            if (event.key === "Escape") setSearchOpen(false);
          }}
        >
          <IconButton label="Close search" tone="plain" onClick={() => setSearchOpen(false)}>
            <ArrowLeft className="size-5" />
          </IconButton>
          {searchInput("mobile-search", mobileSearch)}
        </form>
      )}
    </header>
  );
}
