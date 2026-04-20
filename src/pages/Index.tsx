import { useState } from "react";
import { AppSidebar } from "@/components/AppSidebar";
import { InboxPage } from "@/components/inbox/InboxPage";
import { DashboardPage } from "@/components/dashboard/DashboardPage";

const Index = () => {
  const [page, setPage] = useState("inbox");

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <AppSidebar active={page} onNavigate={setPage} />
      {page === "inbox" && <InboxPage />}
      {page === "dashboard" && <DashboardPage />}
      {!["inbox", "dashboard"].includes(page) && (
        <div className="flex-1 flex items-center justify-center bg-background">
          <div className="text-center">
            <p className="text-lg font-bold text-foreground capitalize mb-1">{page}</p>
            <p className="text-[13px] text-muted-foreground">Coming soon</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Index;
