// Hover-prefetch for /app routes. Each page is React.lazy'd in Index.tsx so the
// chunk only loads when the route is rendered. On `onMouseEnter` over a sidebar
// item, we trigger the same dynamic import early — by the time the user clicks,
// the chunk is already cached and the route renders instantly.
//
// Vite/Rollup automatically emits a <link rel="modulepreload"> per chunk so
// hover firing import() is essentially free if the user doesn't end up clicking.

const PREFETCHERS: Record<string, () => Promise<unknown>> = {
  dashboard: () => import("@/components/dashboard/DashboardPage"),
  inbox: () => import("@/components/inbox/InboxPage"),
  contacts: () => import("@/components/contacts/ContactsPage"),
  deals: () => import("@/components/deals/DealsPage"),
  analytics: () => import("@/components/analytics/AnalyticsPage"),
  ads: () => import("@/components/ads/AdsMarketingPage"),
  // ads: marketing module
  campaigns: () => import("@/components/campaigns/CampaignsPage"),
  broadcasts: () => import("@/components/broadcasts/BroadcastsPage"),
  templates: () => import("@/components/templates/TemplatesPage"),
  followups: () => import("@/components/followups/FollowupsPage"),
  activity: () => import("@/components/activity/ActivityPage"),
  integrations: () => import("@/components/integrations/IntegrationsPage"),
  settings: () => import("@/components/settings/SettingsPage"),
  admin: () => import("@/components/admin/AdminShell"),
};

const prefetched = new Set<string>();

export const prefetchPage = (pageId: string) => {
  if (prefetched.has(pageId)) return;
  const fn = PREFETCHERS[pageId];
  if (!fn) return;
  prefetched.add(pageId);
  // Fire and forget — failures (e.g., offline) are non-fatal; the route will
  // re-attempt when actually navigated to.
  fn().catch(() => prefetched.delete(pageId));
};
