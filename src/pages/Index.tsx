import { useState } from "react";
import { AppSidebar } from "@/components/AppSidebar";
import { InboxPage } from "@/components/inbox/InboxPage";
import { DashboardPage } from "@/components/dashboard/DashboardPage";
import { ContactsPage } from "@/components/contacts/ContactsPage";
import { CampaignsPage } from "@/components/campaigns/CampaignsPage";
import { BroadcastsPage } from "@/components/broadcasts/BroadcastsPage";
import { FollowupsPage } from "@/components/followups/FollowupsPage";
import { SettingsPage } from "@/components/settings/SettingsPage";
import { DealsPage } from "@/components/deals/DealsPage";
import { AnalyticsPage } from "@/components/analytics/AnalyticsPage";
import { AITrainingPage } from "@/components/ai/AITrainingPage";
import { AIAssistantPage } from "@/components/ai/AIAssistantPage";
import { WorkflowsPage } from "@/components/automation/WorkflowsPage";
import { TemplatesPage } from "@/components/templates/TemplatesPage";
import { TeamPage } from "@/components/team/TeamPage";
import { ActivityPage } from "@/components/activity/ActivityPage";
import { IntegrationsPage } from "@/components/integrations/IntegrationsPage";
import { GlobalTopbar } from "@/components/global/GlobalTopbar";
import { QuickActionFAB } from "@/components/global/QuickActionFAB";
import { OnboardingFlow } from "@/components/global/OnboardingFlow";
import { Menu } from "lucide-react";
import { AddisonLogo } from "@/components/brand/AddisonLogo";

const Index = () => {
  const [page, setPage] = useState("dashboard");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Inbox & AI Training have their own internal headers — skip the global topbar there
  const showTopbar = page !== "inbox" && page !== "ai-training";

  const handleNavigate = (next: string) => {
    setPage(next);
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
        {/* Mobile-only top bar (always visible, even on screens with internal headers like Inbox) */}
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
          {page === "inbox" && <InboxPage />}
          {page === "dashboard" && <DashboardPage onNavigate={handleNavigate} />}
          {page === "contacts" && <ContactsPage />}
          {page === "deals" && <DealsPage />}
          {page === "analytics" && <AnalyticsPage />}
          {page === "campaigns" && <CampaignsPage />}
          {page === "broadcasts" && <BroadcastsPage />}
          {page === "templates" && <TemplatesPage />}
          {page === "followups" && <FollowupsPage />}
          {page === "ai-training" && <AITrainingPage />}
          {page === "ai-assistant" && <AIAssistantPage />}
          {page === "workflows" && <WorkflowsPage />}
          {page === "activity" && <ActivityPage />}
          {page === "team" && <TeamPage />}
          {page === "integrations" && <IntegrationsPage />}
          {page === "settings" && <SettingsPage />}
        </div>
      </div>
      <QuickActionFAB onNavigate={handleNavigate} />
    </div>
  );
};

export default Index;
