import { useState } from "react";
import { AppSidebar } from "@/components/AppSidebar";
import { InboxPage } from "@/components/inbox/InboxPage";
import { DashboardPage } from "@/components/dashboard/DashboardPage";
import { ContactsPage } from "@/components/contacts/ContactsPage";
import { CampaignsPage } from "@/components/campaigns/CampaignsPage";
import { BroadcastsPage } from "@/components/broadcasts/BroadcastsPage";
import { FollowupsPage } from "@/components/followups/FollowupsPage";
import { SettingsPage } from "@/components/settings/SettingsPage";

const Index = () => {
  const [page, setPage] = useState("inbox");

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <AppSidebar active={page} onNavigate={setPage} />
      {page === "inbox" && <InboxPage />}
      {page === "dashboard" && <DashboardPage />}
      {page === "contacts" && <ContactsPage />}
      {page === "campaigns" && <CampaignsPage />}
      {page === "broadcasts" && <BroadcastsPage />}
      {page === "followups" && <FollowupsPage />}
      {page === "settings" && <SettingsPage />}
    </div>
  );
};

export default Index;
