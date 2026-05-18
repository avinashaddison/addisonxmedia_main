import { lazy, Suspense, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Loader2, Menu } from "lucide-react";
import { AppSidebar } from "@/components/AppSidebar";
import { GlobalTopbar } from "@/components/global/GlobalTopbar";
import { AddisonLogo } from "@/components/brand/AddisonLogo";

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

const VALID_PAGES = new Set([
  "dashboard", "inbox", "contacts", "deals", "analytics",
  "campaigns", "broadcasts", "templates", "followups",
  "ads", "activity", "integrations", "settings",
]);

const PageFallback = () => (
  <div className="flex-1 flex items-center justify-center">
    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
  </div>
);

const Index = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const segment = location.pathname.replace(/^\/app\/?/, "").split("/")[0] || "dashboard";
  const page = VALID_PAGES.has(segment) ? segment : "dashboard";

  useEffect(() => {
    if (location.pathname === "/app" || location.pathname === "/app/") {
      navigate("/app/dashboard", { replace: true });
    }
  }, [location.pathname, navigate]);

  const showTopbar = page !== "inbox";

  const handleNavigate = (next: string) => {
    navigate(`/app/${next}`);
    setMobileNavOpen(false);
  };

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <AppSidebar
        active={page}
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
            {page === "inbox" && <InboxPage />}
            {page === "dashboard" && <DashboardPage onNavigate={handleNavigate} />}
            {page === "contacts" && <ContactsPage />}
            {page === "deals" && <DealsPage />}
            {page === "analytics" && <AnalyticsPage />}
            {page === "ads" && <AdsMarketingPage />}
            {page === "campaigns" && <CampaignsPage />}
            {page === "broadcasts" && <BroadcastsPage />}
            {page === "templates" && <TemplatesPage />}
            {page === "followups" && <FollowupsPage />}
            {page === "activity" && <ActivityPage />}
            {page === "integrations" && <IntegrationsPage />}
            {page === "settings" && <SettingsPage />}
          </Suspense>
        </div>
      </div>
    </div>
  );
};

export default Index;
