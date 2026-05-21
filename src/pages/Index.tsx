import { lazy, Suspense, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Loader2, Menu } from "lucide-react";
import { AppSidebar } from "@/components/AppSidebar";
import { GlobalTopbar } from "@/components/global/GlobalTopbar";
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

const VALID_PAGES = new Set([
  "dashboard", "inbox", "contacts", "deals", "analytics",
  "campaigns", "broadcasts", "templates", "followups",
  "ads", "activity", "integrations", "settings",
  "ai-training", "upgrade",
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

  const rest = location.pathname.replace(/^\/app\/?/, "");
  const segment = rest.split("/")[0] || "dashboard";
  const subSegment = rest.split("/")[1] ?? "";
  const page = VALID_PAGES.has(segment) ? segment : "dashboard";
  const isAdsCreate = page === "ads" && subSegment === "new";
  // Any other non-empty sub-segment on /app/ads/X is treated as a campaign ID
  // and routes to the analytics page.
  const isAdsDetail = page === "ads" && !!subSegment && subSegment !== "new";

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

  // Hide the global topbar for full-page wizards (inbox + ads create) — they
  // have their own dedicated top bar so the global one would just clutter.
  const showTopbar = page !== "inbox" && !isAdsCreate && !isAdsDetail;

  const handleNavigate = (next: string) => {
    navigate(`/app/${next}`);
    setMobileNavOpen(false);
  };

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden">
      <ImpersonationBanner />
      <div className="flex flex-1 overflow-hidden">
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
            {page === "ads" && !isAdsCreate && !isAdsDetail && <AdsMarketingPage />}
            {page === "ads" && isAdsCreate && <CreateCampaignPage />}
            {page === "ads" && isAdsDetail && <CampaignAnalyticsPage />}
            {page === "campaigns" && <CampaignsPage />}
            {page === "broadcasts" && <BroadcastsPage />}
            {page === "templates" && <TemplatesPage />}
            {page === "followups" && <FollowupsPage />}
            {page === "activity" && <ActivityPage />}
            {page === "integrations" && <IntegrationsPage />}
            {page === "settings" && <SettingsPage />}
            {page === "ai-training" && <AITrainingPage />}
            {page === "upgrade" && <UpgradePage />}
          </Suspense>
        </div>
      </div>
      </div>
    </div>
  );
};

export default Index;
