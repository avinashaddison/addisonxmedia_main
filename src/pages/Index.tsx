import { Sidebar } from "@/components/dashboard/Sidebar";
import { TopHeader } from "@/components/dashboard/TopHeader";
import { StatsGrid } from "@/components/dashboard/StatsGrid";
import { Pipeline } from "@/components/dashboard/Pipeline";
import { Charts } from "@/components/dashboard/Charts";
import { LiveActivity } from "@/components/dashboard/LiveActivity";
import { SidePanels } from "@/components/dashboard/SidePanels";
import { PriorityQueue } from "@/components/dashboard/PriorityQueue";

const Index = () => {
  return (
    <div className="min-h-screen flex w-full bg-background">
      <Sidebar />

      <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-x-hidden">
        <TopHeader />
        <StatsGrid />

        <div className="space-y-5">
          <Pipeline />

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
            <div className="xl:col-span-2 space-y-5">
              <Charts />
              <PriorityQueue />
            </div>
            <div className="space-y-5">
              <LiveActivity />
              <SidePanels />
            </div>
          </div>
        </div>

        <footer className="mt-8 pb-4 text-center text-[11px] text-muted-foreground">
          AddisonX Media · Lead Engine
        </footer>
      </main>
    </div>
  );
};

export default Index;
