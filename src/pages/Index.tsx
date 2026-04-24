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
import { TemplatesPage } from "@/components/templates/TemplatesPage";
import { TeamPage } from "@/components/team/TeamPage";
import { ActivityPage } from "@/components/activity/ActivityPage";
import { IntegrationsPage } from "@/components/integrations/IntegrationsPage";
import { GlobalTopbar } from "@/components/global/GlobalTopbar";
import { QuickActionFAB } from "@/components/global/QuickActionFAB";

const Index = () => {
  const [page, setPage] = useState("inbox");

  // Inbox & AI Training have their own internal headers — skip the global topbar there
  const showTopbar = page !== "inbox" && page !== "ai-training";

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <AppSidebar active={page} onNavigate={setPage} />
      <div className="flex-1 flex flex-col overflow-hidden">
        {showTopbar && <GlobalTopbar onNavigate={setPage} />}
        <div className="flex-1 flex overflow-hidden">
          {page === "inbox" && <InboxPage />}
          {page === "dashboard" && <DashboardPage onNavigate={setPage} />}
          {page === "contacts" && <ContactsPage />}
          {page === "deals" && <DealsPage />}
          {page === "analytics" && <AnalyticsPage />}
          {page === "campaigns" && <CampaignsPage />}
          {page === "broadcasts" && <BroadcastsPage />}
          {page === "templates" && <TemplatesPage />}
          {page === "followups" && <FollowupsPage />}
          {page === "ai-training" && <AITrainingPage />}
          {page === "activity" && <ActivityPage />}
          {page === "team" && <TeamPage />}
          {page === "integrations" && <IntegrationsPage />}
          {page === "settings" && <SettingsPage />}
        </div>
      </div>
      <QuickActionFAB onNavigate={setPage} />
    </div>
  );
};

export default Index;
