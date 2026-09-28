/*
  The title block at the top of every page inside AppLayout. Use this rather
  than a bare <h1> so all pages line up.

    <PageHeader title="Feed" subtitle="What's for sale on your campus" />
    <PageHeader title="My listings" action={<Button>New</Button>} />
    <PageHeader title={<span className="flex items-center gap-2">Notifications <Badge>3</Badge></span>} />
    <PageHeader title="Chat" backTo="/messages" />     back arrow (phones + tablets)
    <PageHeader title="Reports" breadcrumbs={[{ label: 'Moderation', to: '/moderation' }, { label: 'Reports' }]} />
*/

import { ArrowLeft } from "@phosphor-icons/react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";

import { Breadcrumbs, type Crumb } from "@/components/layout/Breadcrumbs";

type PageHeaderProps = {
  /** Usually a plain string; can be a node when a badge/icon sits next to it. */
  title: ReactNode;
  subtitle?: ReactNode;
  /** Usually a Button; sits to the right of the title on wider screens. */
  action?: ReactNode;
  /** Shows a back arrow to this path below lg, where there is no sidebar. */
  backTo?: string;
  backLabel?: string;
  /** Trail shown above the title; the last crumb is this page. */
  breadcrumbs?: Crumb[];
};

export function PageHeader({ title, subtitle, action, backTo, backLabel = "Back", breadcrumbs }: PageHeaderProps) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3 sm:mb-6">
      <div className="flex min-w-0 items-start gap-2">
        {backTo && (
          <Link
            to={backTo}
            aria-label={backLabel}
            className="-ml-1 mt-0.5 grid size-10 shrink-0 place-items-center rounded-full text-fg-muted transition hover:bg-surface-muted hover:text-fg focus-visible:outline-2 focus-visible:outline-brand-500 lg:hidden"
          >
            <ArrowLeft aria-hidden="true" className="size-5" />
          </Link>
        )}
        <div className="min-w-0">
          {breadcrumbs && <Breadcrumbs items={breadcrumbs} />}
          <h1 className="text-2xl font-bold tracking-tight text-balance text-fg sm:text-[1.75rem]">
            {title}
          </h1>
          {subtitle && <p className="mt-1 text-sm text-fg-muted">{subtitle}</p>}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
