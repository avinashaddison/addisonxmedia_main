import { lazy, Suspense, useEffect, useState, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Loader2, Menu } from "lucide-react";
import { AppSidebar } from "@/components/AppSidebar";
import { GlobalTopbar } from "@/components/global/GlobalTopbar";
import { MobileBottomNav } from "@/components/global/MobileBottomNav";
import { AddisonLogo } from "@/components/brand/AddisonLogo";
import { ImpersonationBanner } from "@/components/admin/ImpersonationBanner";
import { useConversations } from "@/hooks/useInboxData";
import { useNotificationSound } from "@/hooks/useNotificationSound";

// Each sub-page becomes its own bundle. The user's first /app/dashboard
// load only ships dashboard + sidebar code; other pages load on demand.
const InboxPage = lazy(() => import("@/components/inbox/InboxPage").then((m) => ({ default: m.InboxPage })));
const DashboardPage = lazy(() => import("@/components/dashboard/DashboardPage").then((m) => ({ default: m.DashboardPage })));
const ContactsPage = lazy(() => import("@/components/contacts/ContactsPage").then((m) => ({ default: m.ContactsPage })));
const CampaignsPage = lazy(() => import("@/components/campaigns/CampaignsPage").then((m) => ({ default: m.CampaignsPage })));
const BroadcastsPage = lazy(() => import("@/components/broadcasts/BroadcastsPage").then((m) => ({ default: m.BroadcastsPage })));
const FollowupsPage = lazy(() => import("@/components/followups/FollowupsPage").then((m) => ({ default: m.FollowupsPage })));
const SettingsPage = lazy(() => import("@/components/settings/SettingsPage").then((m) => ({ default: m.SettingsPage })));
const DealsPage = lazy(() => import("@/components/deals/DealsPage").then((m) => ({ default: m.DealsPage })));
const AnalyticsPage = lazy(() => import("@/components/analytics/AnalyticsPage").then((m) => ({ default: m.AnalyticsPage })));
const TemplatesPage = lazy(() => import("@/components/templates/TemplatesPage").then((m) => ({ default: m.TemplatesPage })));
const ActivityPage = lazy(() => import("@/components/activity/ActivityPage").then((m) => ({ default: m.ActivityPage })));
const IntegrationsPage = lazy(() => import("@/components/integrations/IntegrationsPage").then((m) => ({ default: m.IntegrationsPage })));
const AdsMarketingPage = lazy(() => import("@/components/ads/AdsMarketingPage").then((m) => ({ default: m.AdsMarketingPage })));
const CreateCampaignPage = lazy(() => import("@/components/ads/CreateCampaignPage").then((m) => ({ default: m.CreateCampaignPage })));
const CampaignAnalyticsPage = lazy(() => import("@/components/ads/CampaignAnalyticsPage").then((m) => ({ default: m.CampaignAnalyticsPage })));
const AITrainingPage = lazy(() => import("@/components/ai/AITrainingPage").then((m) => ({ default: m.AITrainingPage })));
const UpgradePage = lazy(() => import("@/components/billing/UpgradePage").then((m) => ({ default: m.UpgradePage })));

// Customer Dashboard build-out — CRM, Finance, Reports & Settings pages.
const LeadsPage = lazy(() => import("@/components/leads/LeadsPage").then((m) => ({ default: m.LeadsPage })));
const TasksPage = lazy(() => import("@/components/tasks/TasksPage").then((m) => ({ default: m.TasksPage })));
const NotesPage = lazy(() => import("@/components/notes/NotesPage").then((m) => ({ default: m.NotesPage })));
const InvoicesPage = lazy(() => import("@/components/finance/InvoicesPage").then((m) => ({ default: m.InvoicesPage })));
const PaymentsPage = lazy(() => import("@/components/finance/PaymentsPage").then((m) => ({ default: m.PaymentsPage })));
const RevenuePage = lazy(() => import("@/components/finance/RevenuePage").then((m) => ({ default: m.RevenuePage })));
const ExpensesPage = lazy(() => import("@/components/finance/ExpensesPage").then((m) => ({ default: m.ExpensesPage })));
const LeadsReportPage = lazy(() => import("@/components/reports/LeadsReportPage").then((m) => ({ default: m.LeadsReportPage })));
const CustomerReportPage = lazy(() => import("@/components/reports/CustomerReportPage").then((m) => ({ default: m.CustomerReportPage })));
const RevenueReportPage = lazy(() => import("@/components/reports/RevenueReportPage").then((m) => ({ default: m.RevenueReportPage })));
const PerformanceReportPage = lazy(() => import("@/components/reports/PerformanceReportPage").then((m) => ({ default: m.PerformanceReportPage })));
const TeamPage = lazy(() => import("@/components/settings/TeamPage").then((m) => ({ default: m.TeamPage })));
const RolesPage = lazy(() => import("@/components/settings/RolesPage").then((m) => ({ default: m.RolesPage })));

type NavFn = (page: string) => void;

// Full-subpath route registry. The key is the path after `/app/` and matches the
// sidebar item id, so nested ids (e.g. `reports/leads`, `settings/profile`)
// resolve directly. Items without a real page yet render a titled placeholder;
// they are built out in the Customer Dashboard task.
const PAGES: Record<string, (nav: NavFn) => ReactNode> = {
  // Overview
  dashboard: (nav) => <DashboardPage onNavigate={nav} />,

  // CRM
  leads: () => <LeadsPage />,
  customers: () => <ContactsPage />,
  followups: () => <FollowupsPage />,
  tasks: () => <TasksPage />,
  notes: () => <NotesPage />,

  // Communications
  inbox: () => <InboxPage />,
  broadcasts: () => <BroadcastsPage />,
  templates: () => <TemplatesPage />,
  campaigns: () => <CampaignsPage />,

  // Finance
  invoices: () => <InvoicesPage />,
  payments: () => <PaymentsPage />,
  revenue: () => <RevenuePage />,
  expenses: () => <ExpensesPage />,

  // Reports
  "reports/leads": () => <LeadsReportPage />,
  "reports/customers": () => <CustomerReportPage />,
  "reports/revenue": () => <RevenueReportPage />,
  "reports/performance": () => <PerformanceReportPage />,

  // Settings
  "settings/profile": () => <SettingsPage initialSection="profile" />,
  "settings/team": () => <TeamPage />,
  "settings/roles": () => <RolesPage />,
  "settings/security": () => <SettingsPage initialSection="account" />,

  // ── Legacy / deep-link-only routes (not in the sidebar, kept resolvable so
  // existing internal links, the topbar, dashboard quick-actions and old
  // bookmarks keep working). ──
  contacts: () => <ContactsPage />,
  deals: () => <DealsPage />,
  analytics: () => <AnalyticsPage />,
  activity: () => <ActivityPage />,
  integrations: () => <IntegrationsPage />,
  settings: () => <SettingsPage />,
  "ai-training": () => <AITrainingPage />,
  upgrade: () => <UpgradePage />,
};

const PageFallback = () => (
  <div className="flex-1 flex items-center justify-center">
    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
  </div>
);

const Index = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const rest = location.pathname.replace(/^\/app\/?/, "").replace(/\/$/, "");
  const segment = rest.split("/")[0] || "dashboard";
  const subSegment = rest.split("/")[1] ?? "";

  // Ads keeps its own nested wizard/detail routing.
  const isAds = segment === "ads";
  const isAdsCreate = isAds && subSegment === "new";
  const isAdsDetail = isAds && !!subSegment && subSegment !== "new";

  // Resolve the active route: prefer an exact full-path match, then the first
  // segment, otherwise fall back to the dashboard.
  const resolvedKey = isAds
    ? "ads"
    : PAGES[rest]
      ? rest
      : PAGES[segment]
        ? segment
        : "dashboard";

  useEffect(() => {
    if (location.pathname === "/app" || location.pathname === "/app/") {
      navigate("/app/dashboard", { replace: true });
    }
  }, [location.pathname, navigate]);

  // Mount the conversations poll + notification chime at the app-shell level
  // (not inside InboxPage) so a new WhatsApp message dings + bumps the sidebar
  // badge from ANY page — Dashboard, Contacts, Ads, etc.  React Query dedupes
  // by key, so InboxPage's own useConversations() call shares this cache.
  const { data: conversations = [] } = useConversations();
  useNotificationSound(conversations);

  const handleNavigate = (next: string) => {
    navigate(`/app/${next}`);
    setMobileNavOpen(false);
  };

  // Hide the global topbar for full-page wizards (inbox + ads create/detail) —
  // they have their own dedicated top bar so the global one would just clutter.
  const showTopbar = resolvedKey !== "inbox" && !isAdsCreate && !isAdsDetail;

  // The id reported to the sidebar / mobile nav for active highlighting.
  const activeId = isAds ? "ads" : resolvedKey;

  let content: ReactNode;
  if (isAdsCreate) content = <CreateCampaignPage />;
  else if (isAdsDetail) content = <CampaignAnalyticsPage />;
  else if (isAds) content = <AdsMarketingPage />;
  else content = (PAGES[resolvedKey] ?? PAGES.dashboard)(handleNavigate);

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden">
      <ImpersonationBanner />
      <div className="flex flex-1 overflow-hidden">
      <AppSidebar
        active={activeId}
        onNavigate={handleNavigate}
        mobileOpen={mobileNavOpen}
        onMobileClose={() => setMobileNavOpen(false)}
      />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {!showTopbar && (
          <header className="lg:hidden h-14 px-3 border-b border-border bg-card flex items-center gap-3 flex-shrink-0 z-30">
            <button
              onClick={() => setMobileNavOpen(true)}
              className="w-10 h-10 rounded-lg hover:bg-muted flex items-center justify-center text-foreground flex-shrink-0"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <AddisonLogo size={32} />
          </header>
        )}
        {showTopbar && <GlobalTopbar onNavigate={handleNavigate} onMenuClick={() => setMobileNavOpen(true)} />}
        <div className="flex-1 flex overflow-hidden min-w-0">
          <Suspense fallback={<PageFallback />}>
            {content}
          </Suspense>
        </div>

        {/* Mobile bottom navigation — key destinations. Hidden on md+
            (sidebar visible) and on inbox (which manages its own mobile
            layout and needs full vertical space). */}
        <MobileBottomNav
          active={activeId}
          onNavigate={handleNavigate}
          onOpenMore={() => setMobileNavOpen(true)}
          hidden={resolvedKey === "inbox"}
        />
      </div>
      </div>
    </div>
  );
};

export default Index;
