import { Sidebar } from "@/components/dashboard/Sidebar";
import { TopHeader } from "@/components/dashboard/TopHeader";
import { StatsGrid } from "@/components/dashboard/StatsGrid";
import { LiveActivity } from "@/components/dashboard/LiveActivity";
import { AIPanel } from "@/components/dashboard/AIPanel";
import { Pipeline } from "@/components/dashboard/Pipeline";
import { Charts } from "@/components/dashboard/Charts";
import { PriorityQueue } from "@/components/dashboard/PriorityQueue";

const Index = () => {
  return (
    <div className="min-h-screen flex w-full bg-background relative">
      {/* Particle / mesh background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[120px] animate-float" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-[120px] animate-float" style={{ animationDelay: "3s" }} />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `radial-gradient(circle, hsl(var(--foreground)) 1px, transparent 1px)`,
            backgroundSize: "32px 32px",
          }}
        />
      </div>

      <Sidebar />

      <main className="flex-1 p-4 md:p-6 lg:p-8 relative z-10 overflow-x-hidden">
        <TopHeader />
        <StatsGrid />

        {/* Live Activity + Pipeline+Charts + AI Panel */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 mb-4">
          <div className="xl:col-span-3">
            <LiveActivity />
          </div>
          <div className="xl:col-span-6 space-y-4">
            <Pipeline />
            <Charts />
          </div>
          <div className="xl:col-span-3">
            <AIPanel />
          </div>
        </div>

        <PriorityQueue />

        <footer className="mt-8 text-center text-[11px] text-muted-foreground">
          AddisonX Media · Revenue Command Center · <span className="text-success">●</span> Synced 2s ago
        </footer>
      </main>
    </div>
  );
};

export default Index;
