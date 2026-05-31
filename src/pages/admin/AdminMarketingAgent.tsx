import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { adminApi, SystemSetting } from "@/lib/admin-api";
import {
  Sparkles,
  Bot,
  Zap,
  ShieldCheck,
  Building2,
  Users,
  Search,
  MessageSquare,
  AlertTriangle,
  Play,
  CheckCircle2,
  X,
  Server,
  Workflow,
  ArrowRight,
  Loader2,
  HelpCircle,
  Copy,
  Check,
  Maximize2,
  Minimize2,
  RefreshCw,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

// Node definition type
interface AgentNode {
  id: string;
  title: string;
  subtitle: string;
  type: "trigger" | "agent" | "guardrail" | "tool";
  icon: any;
  color: string;
  x: number; // percentage or fixed relative positioning
  y: number;
  status?: string;
  statusColor?: string;
}

const AdminMarketingAgent = () => {
  const qc = useQueryClient();
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [zoom, setZoom] = useState(1);

  // Fetch system settings
  const { data: rows = [], isLoading, isRefetching, refetch } = useQuery({
    queryKey: ["admin-settings"],
    queryFn: () => adminApi.settings(),
  });

  // Fetch recent audits
  const { data: audits = [], isLoading: auditsLoading } = useQuery({
    queryKey: ["admin-audits-marketing"],
    queryFn: () => adminApi.audit({ limit: 40 }),
  });

  // Extract settings for marketing agent
  const getSetting = (key: string) => rows.find((r) => r.key === key);

  const isEnabled = getSetting("marketing_agent_enabled")?.value !== "false";
  const systemPrompt = getSetting("marketing_agent_system_prompt")?.value || "";
  const maxBudget = getSetting("marketing_agent_max_budget_limit")?.value || "10000";

  // Filter audits to show only marketing agent configuration updates
  const marketingAudits = audits.filter((a) => {
    if (a.action !== "change_setting" || !a.payload) return false;
    try {
      const parsed = JSON.parse(a.payload);
      return (
        parsed &&
        typeof parsed === "object" &&
        typeof parsed.key === "string" &&
        parsed.key.startsWith("marketing_agent_")
      );
    } catch {
      return false;
    }
  });

  const handleUpdateSetting = async (key: string, value: string) => {
    try {
      await adminApi.updateSetting(key, value);
      toast.success("Settings updated");
      qc.invalidateQueries({ queryKey: ["admin-settings"] });
      qc.invalidateQueries({ queryKey: ["admin-audits-marketing"] });
    } catch (e) {
      toast.error(String(e));
    }
  };

  const handleCopyNumber = () => {
    navigator.clipboard.writeText("system_marketing");
    setIsCopied(true);
    toast.success("Phone ID copied");
    setTimeout(() => setIsCopied(false), 2000);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-[#8B5CF6]" />
      </div>
    );
  }

  // Nodes metadata for display
  const nodes: AgentNode[] = [
    {
      id: "trigger",
      title: "WhatsApp Trigger",
      subtitle: "Inbound Message to system",
      type: "trigger",
      icon: MessageSquare,
      color: "bg-[#0E8A4B] text-white border-[#0E8A4B]",
      x: 10,
      y: 50,
      status: "Listening",
      statusColor: "bg-[#0E8A4B] text-white animate-pulse",
    },
    {
      id: "agent",
      title: "Addison Marketing AI",
      subtitle: "OpenAI GPT-4o-mini Core",
      type: "agent",
      icon: Bot,
      color: "bg-[#8B5CF6] text-white border-[#8B5CF6] shadow-[0_0_20px_rgba(139,92,246,0.25)]",
      x: 40,
      y: 30,
      status: isEnabled ? "Active" : "Offline",
      statusColor: isEnabled
        ? "bg-purple-600 text-white animate-pulse"
        : "bg-red-500 text-white",
    },
    {
      id: "guardrail",
      title: "Safety Guardrails",
      subtitle: `Budget limit: ₹${Number(maxBudget).toLocaleString("en-IN")}`,
      type: "guardrail",
      icon: ShieldCheck,
      color: "bg-[#D4308E] text-white border-[#D4308E]",
      x: 40,
      y: 70,
      status: "Active",
      statusColor: "bg-[#D4308E] text-white",
    },
    {
      id: "tool_meta",
      title: "Meta Ads Tool",
      subtitle: "Budget & status updates",
      type: "tool",
      icon: Workflow,
      color: "bg-[#FF6A1F] text-white border-[#FF6A1F]",
      x: 75,
      y: 25,
      status: "Linked",
      statusColor: "bg-[#FF6A1F] text-white",
    },
    {
      id: "tool_crm",
      title: "CRM Chat Insights",
      subtitle: "WhatsApp history access",
      type: "tool",
      icon: Users,
      color: "bg-[#0E8A4B] text-white border-[#0E8A4B]",
      x: 75,
      y: 65,
      status: "Linked",
      statusColor: "bg-[#0E8A4B] text-white",
    },
  ];

  const activeNodeData = nodes.find((n) => n.id === selectedNode);

  return (
    <div className="relative flex flex-col h-[calc(100vh-72px)] w-full overflow-hidden">
      {/* Dynamic flowing lines styling */}
      <style>{`
        @keyframes flowDash {
          to {
            stroke-dashoffset: -20;
          }
        }
        .flowing-line-active {
          stroke-dasharray: 6, 6;
          animation: flowDash 0.8s linear infinite;
        }
      `}</style>

      {/* Top action header */}
      <div className="flex items-center justify-between border-b border-[#E8B968]/60 bg-white px-6 py-4 flex-shrink-0 relative z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#8B5CF6] to-[#6D28D9] text-white flex items-center justify-center shadow-md">
            <Workflow className="w-5 h-5" strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-[20px] font-black tracking-tight flex items-center gap-2">
              Marketing Agent Workflow
              <span className="text-[9px] uppercase tracking-wider bg-[#8B5CF6]/15 text-[#8B5CF6] px-2 py-0.5 rounded-full font-black">
                n8n Engine v1.0
              </span>
            </h1>
            <p className="text-[11px] text-foreground/70 font-medium">
              Configure trigger rules, custom AI prompts, guardrails, and Meta Ads action tools.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => refetch()}
            className="border-2 border-[#E8B968] bg-[#FFF1D6] hover:bg-[#FFE8C7] text-foreground/80 text-[12px] font-bold"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isRefetching ? "animate-spin" : ""}`} />
            Refresh Engine
          </Button>
          <div className="h-4 w-[1px] bg-slate-300 mx-1" />
          <span className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-[#0E8A4B]">
            <span className="w-2.5 h-2.5 rounded-full bg-[#0E8A4B] animate-ping" />
            Engine Online
          </span>
        </div>
      </div>

      {/* Workspace Area: Canvas + Drawer */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* Visual Workflow Canvas */}
        <div className="flex-1 overflow-auto relative p-6 select-none bg-[#FFF8EE]" style={{
          backgroundImage: "radial-gradient(#E8B968 1.5px, transparent 1.5px)",
          backgroundSize: "24px 24px"
        }}>
          {/* Zoomable Inner Canvas Container */}
          <div
            className="w-full h-full min-h-[500px] relative transition-transform duration-200"
            style={{ transform: `scale(${zoom})`, transformOrigin: "center center" }}
          >
            {/* SVG Connector Lines Layer */}
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none z-0"
              style={{ minHeight: "500px" }}
            >
              {/* Trigger (1) -> Agent Core (2) */}
              <path
                d="M 240 270 C 320 270, 320 180, 420 180"
                fill="none"
                stroke={isEnabled ? "#8B5CF6" : "#cbd5e1"}
                strokeWidth="3.5"
                className={isEnabled ? "flowing-line-active" : ""}
              />
              {/* Trigger (1) -> Guardrail (3) */}
              <path
                d="M 240 270 C 320 270, 320 360, 420 360"
                fill="none"
                stroke={isEnabled ? "#D4308E" : "#cbd5e1"}
                strokeWidth="3.5"
                className={isEnabled ? "flowing-line-active" : ""}
              />
              {/* Agent Core (2) -> Meta Ads Tool (4) */}
              <path
                d="M 580 180 C 650 180, 650 150, 750 150"
                fill="none"
                stroke={isEnabled ? "#FF6A1F" : "#cbd5e1"}
                strokeWidth="3.5"
                className={isEnabled ? "flowing-line-active" : ""}
              />
              {/* Agent Core (2) -> CRM Chats Tool (5) */}
              <path
                d="M 580 180 C 650 180, 650 330, 750 330"
                fill="none"
                stroke={isEnabled ? "#0E8A4B" : "#cbd5e1"}
                strokeWidth="3.5"
                className={isEnabled ? "flowing-line-active" : ""}
              />
            </svg>

            {/* Nodes Elements */}
            {nodes.map((node) => {
              const NodeIcon = node.icon;
              const isSelected = selectedNode === node.id;
              
              // Absolute positions based on nodes layout coordinates
              // We map x and y coordinate grids directly to percentage style
              let positionStyle = {};
              if (node.id === "trigger") {
                positionStyle = { left: "40px", top: "220px" };
              } else if (node.id === "agent") {
                positionStyle = { left: "400px", top: "130px" };
              } else if (node.id === "guardrail") {
                positionStyle = { left: "400px", top: "310px" };
              } else if (node.id === "tool_meta") {
                positionStyle = { left: "760px", top: "100px" };
              } else if (node.id === "tool_crm") {
                positionStyle = { left: "760px", top: "280px" };
              }

              return (
                <div
                  key={node.id}
                  onClick={() => setSelectedNode(node.id)}
                  style={positionStyle}
                  className={`absolute z-10 w-[240px] bg-white border-2 rounded-2xl p-4 cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:shadow-lg ${
                    isSelected
                      ? "border-[#8B5CF6] ring-4 ring-[#8B5CF6]/20 shadow-[0_8px_24px_rgba(139,92,246,0.15)]"
                      : "border-[#E8B968] shadow-md"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md ${node.color}`}>
                      <NodeIcon className="w-5 h-5" strokeWidth={2.5} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-black tracking-tight text-foreground truncate">{node.title}</p>
                      <p className="text-[10px] text-foreground/60 font-semibold truncate leading-tight mt-0.5">{node.subtitle}</p>
                    </div>
                  </div>

                  {/* Node port connectors */}
                  {node.id !== "trigger" && (
                    <div className="absolute top-[30px] -left-2 w-4 h-4 bg-white border-2 border-[#E8B968] rounded-full flex items-center justify-center">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#E8B968]" />
                    </div>
                  )}
                  {node.id !== "tool_meta" && node.id !== "tool_crm" && node.id !== "guardrail" && (
                    <div className="absolute top-[30px] -right-2 w-4 h-4 bg-white border-2 border-[#E8B968] rounded-full flex items-center justify-center">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#E8B968]" />
                    </div>
                  )}

                  {/* Node footer status bar */}
                  {node.status && (
                    <div className="mt-3 pt-2.5 border-t border-[#E8B968]/30 flex items-center justify-between">
                      <span className="text-[9px] uppercase tracking-wider text-foreground/50 font-bold">Node Status</span>
                      <span className={`text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider ${node.statusColor}`}>
                        {node.status}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Canvas Floating Controls */}
          <div className="absolute bottom-4 left-4 z-10 bg-white border-2 border-[#E8B968] rounded-xl flex items-center gap-1 p-1 shadow-md">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setZoom(Math.max(zoom - 0.1, 0.7))}
              className="h-8 w-8 p-0 text-foreground/80 hover:bg-[#FFE8C7] rounded-lg"
              title="Zoom Out"
            >
              <Minimize2 className="w-4 h-4" />
            </Button>
            <span className="text-[10px] font-mono px-2 font-black text-foreground/70">{Math.round(zoom * 100)}%</span>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setZoom(Math.min(zoom + 0.1, 1.3))}
              className="h-8 w-8 p-0 text-foreground/80 hover:bg-[#FFE8C7] rounded-lg"
              title="Zoom In"
            >
              <Maximize2 className="w-4 h-4" />
            </Button>
            <div className="h-4 w-[1px] bg-slate-300 mx-0.5" />
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setZoom(1);
                setSelectedNode(null);
              }}
              className="h-8 px-2 text-[10px] font-bold text-foreground/80 hover:bg-[#FFE8C7] rounded-lg"
            >
              Reset view
            </Button>
          </div>
        </div>

        {/* Node configuration drawer (Right sidebar) */}
        {selectedNode && activeNodeData && (
          <div className="w-[380px] border-l-2 border-[#E8B968] bg-white flex flex-col flex-shrink-0 relative z-20 shadow-[rgba(0,0,0,0.05)_(-10px)_0_30px_0]">
            {/* Drawer Header */}
            <div className="flex items-center justify-between border-b border-[#E8B968]/50 p-4 bg-[#FFF8EE]">
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white ${activeNodeData.color}`}>
                  {(() => {
                    const NodeIcon = activeNodeData.icon;
                    return <NodeIcon className="w-4 h-4" />;
                  })()}
                </div>
                <div>
                  <h2 className="text-[14px] font-black tracking-tight text-foreground">{activeNodeData.title}</h2>
                  <span className="text-[9px] uppercase tracking-wider bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded font-black">
                    {activeNodeData.type} Node
                  </span>
                </div>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSelectedNode(null)}
                className="h-8 w-8 p-0 text-foreground/60 hover:bg-slate-200/50 rounded-lg"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Drawer Parameter Controls */}
            <div className="flex-1 overflow-y-auto p-4 space-y-5">
              
              {/* Webhook trigger node */}
              {selectedNode === "trigger" && (
                <div className="space-y-4">
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] leading-relaxed text-amber-800">
                    <AlertTriangle className="w-4 h-4 text-amber-700 mb-1" />
                    <strong>Note:</strong> Inbound messages from clients will route through the default message handler. This system contact trigger runs exclusively for owner interactions within their platform inbox.
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-extrabold uppercase text-foreground/50">Listening Identifier</label>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 bg-slate-100 px-3 py-2 rounded-xl text-[12px] font-mono text-foreground/80 font-bold border border-slate-200 select-all">
                        system_marketing
                      </code>
                      <Button
                        size="sm"
                        onClick={handleCopyNumber}
                        className="bg-[#FFF1D6] hover:bg-[#FFE8C7] border-2 border-[#E8B968] text-foreground/70 hover:text-foreground h-9 px-3"
                      >
                        {isCopied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                      </Button>
                    </div>
                    <p className="text-[10px] text-foreground/50 font-medium">
                      Copy the custom phone ID representing the virtual Marketing Manager.
                    </p>
                  </div>

                  <div className="space-y-1 bg-slate-50 border border-slate-200 p-3.5 rounded-xl">
                    <p className="text-[11px] font-extrabold uppercase text-foreground/50 mb-1.5">Port Mapping</p>
                    <div className="flex items-center justify-between text-[11px] py-1 border-b border-slate-200/50">
                      <span className="font-semibold text-foreground/70">Trigger Source:</span>
                      <span className="font-mono bg-white px-1.5 py-0.5 rounded border">WhatsApp API</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] py-1">
                      <span className="font-semibold text-foreground/70">Target Flow:</span>
                      <span className="font-mono bg-white px-1.5 py-0.5 rounded border text-[#8B5CF6]">Addison AI Node</span>
                    </div>
                  </div>
                </div>
              )}

              {/* AI Agent Node */}
              {selectedNode === "agent" && (
                <div className="space-y-4">
                  {/* Status Toggle */}
                  <div className="flex items-center justify-between bg-purple-50/50 border border-purple-100 p-3.5 rounded-xl">
                    <div>
                      <p className="text-[12px] font-extrabold text-purple-950">AI Agent Status</p>
                      <p className="text-[10px] text-purple-700 font-semibold mt-0.5">
                        {isEnabled ? "Online & listening to owner chats" : "Offline / Disabled"}
                      </p>
                    </div>
                    <Switch
                      checked={isEnabled}
                      onCheckedChange={(checked) =>
                        handleUpdateSetting("marketing_agent_enabled", checked ? "true" : "false")
                      }
                    />
                  </div>

                  {/* Readonly model */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-extrabold uppercase text-foreground/50">Execution Model</label>
                    <Input value="gpt-4o-mini" disabled className="h-9 text-[12px] font-mono bg-slate-50" />
                    <p className="text-[10px] text-foreground/50 font-medium">
                      Fast, cost-efficient, tool-capable model for platform analytics tasks.
                    </p>
                  </div>

                  {/* System Prompt Instructions */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-extrabold uppercase text-foreground/50">System Prompt (Instructions)</label>
                    <Textarea
                      value={systemPrompt}
                      onChange={(e) => handleUpdateSetting("marketing_agent_system_prompt", e.target.value)}
                      placeholder="Specify what instructions the Marketing AI should follow..."
                      className="min-h-[220px] text-[11px] font-mono leading-relaxed focus-visible:ring-[#8B5CF6] border-2 border-[#E8B968]"
                    />
                    <p className="text-[10px] text-foreground/50 font-medium leading-normal">
                      The core directive template. Addison-AI will adopt this persona to talk with the business owner.
                    </p>
                  </div>
                </div>
              )}

              {/* Guardrails node */}
              {selectedNode === "guardrail" && (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-extrabold uppercase text-foreground/50">Maximum Daily Budget Threshold (INR)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[12px] font-extrabold text-foreground/60">₹</span>
                      <Input
                        type="number"
                        value={maxBudget}
                        onChange={(e) =>
                          handleUpdateSetting("marketing_agent_max_budget_limit", e.target.value)
                        }
                        className="pl-7 h-9 text-[12px] font-mono border-2 border-[#E8B968] focus-visible:ring-[#D4308E]"
                      />
                    </div>
                    <p className="text-[10px] text-foreground/50 font-medium leading-normal mt-1">
                      If the AI attempts to execute an ad budget update tool with a daily budget higher than this amount, the engine will force the agent to prompt the owner for double confirmation.
                    </p>
                  </div>

                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-[11px] leading-relaxed text-rose-800 flex items-start gap-2">
                    <ShieldCheck className="w-4 h-4 text-rose-700 flex-shrink-0 mt-0.5" />
                    <div>
                      <strong>Enforcement Mode:</strong> LLM System Injection. This threshold is appended dynamically to the bottom of the system instructions template.
                    </div>
                  </div>
                </div>
              )}

              {/* Meta Ads API Tool node */}
              {selectedNode === "tool_meta" && (
                <div className="space-y-4">
                  <p className="text-[12px] font-medium leading-relaxed text-foreground/80">
                    Provides the Marketing Agent with functions to pull campaigns, inspect analytics, change daily budgets, and pause or activate ads directly inside Meta's ecosystem.
                  </p>

                  <div className="space-y-2">
                    <label className="text-[11px] font-extrabold uppercase text-foreground/50">Available Functions</label>
                    
                    <div className="border border-slate-200 p-2.5 rounded-xl space-y-2.5 bg-slate-50/50">
                      <div className="flex items-start gap-2 text-[11px]">
                        <span className="bg-[#FF6A1F]/15 text-[#FF6A1F] px-1.5 py-0.2 rounded font-mono font-bold">list_campaigns</span>
                        <div className="text-foreground/70 leading-normal">
                          Lists all ad campaigns with name, objective, budget, and active status.
                        </div>
                      </div>
                      <div className="flex items-start gap-2 text-[11px] pt-2 border-t border-slate-200/50">
                        <span className="bg-[#FF6A1F]/15 text-[#FF6A1F] px-1.5 py-0.2 rounded font-mono font-bold">get_campaign_analytics</span>
                        <div className="text-foreground/70 leading-normal">
                          Pulls 30-day aggregates (CTR, CPC, reach, impressions, budget spent) for a selected campaign ID.
                        </div>
                      </div>
                      <div className="flex items-start gap-2 text-[11px] pt-2 border-t border-slate-200/50">
                        <span className="bg-[#FF6A1F]/15 text-[#FF6A1F] px-1.5 py-0.2 rounded font-mono font-bold">update_campaign</span>
                        <div className="text-foreground/70 leading-normal">
                          Modifies Meta Ad status (Active/Paused) or edits daily budget.
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* CRM Chats Tool node */}
              {selectedNode === "tool_crm" && (
                <div className="space-y-4">
                  <p className="text-[12px] font-medium leading-relaxed text-foreground/80">
                    Allows the Marketing Agent to query recent customer-facing conversation logs in the database. Enables the AI to analyze objections, FAQs, and buyer sentiment to formulate profitable campaign recommendations.
                  </p>

                  <div className="space-y-2">
                    <label className="text-[11px] font-extrabold uppercase text-foreground/50">Available Functions</label>
                    <div className="border border-slate-200 p-2.5 rounded-xl bg-slate-50/50">
                      <div className="flex items-start gap-2 text-[11px]">
                        <span className="bg-[#0E8A4B]/15 text-[#0E8A4B] px-1.5 py-0.2 rounded font-mono font-bold">analyze_crm_customer_chats</span>
                        <div className="text-foreground/70 leading-normal">
                          Retrieves recent dialogue rows in the workspace database to extract customer sentiment, requests, and pain points.
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>
        )}
      </div>

      {/* Bottom Area: Setting Update Audit logs */}
      <div className="h-64 border-t-2 border-[#E8B968] bg-white flex flex-col flex-shrink-0 z-10 shadow-[rgba(0,0,0,0.03)_0_-10px_30px_0]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#E8B968]/30 px-6 py-3.5 bg-[#FFF8EE] flex-shrink-0">
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-[#8B5CF6]" />
            <h3 className="text-[12px] font-black uppercase tracking-wider">Engine Execution & Configuration Audit Logs</h3>
          </div>
          <span className="text-[10px] font-mono text-foreground/60">Showing last config updates</span>
        </div>

        {/* Logs List */}
        <div className="flex-1 overflow-y-auto px-6 py-2.5 font-mono text-[11px] leading-relaxed divide-y divide-slate-100 bg-slate-50/50">
          {auditsLoading ? (
            <div className="flex items-center justify-center h-full py-10">
              <Loader2 className="w-5 h-5 animate-spin text-[#8B5CF6] mr-2" />
              <span>Fetching audit stream...</span>
            </div>
          ) : marketingAudits.length === 0 ? (
            <div className="text-foreground/50 italic py-6 text-center">
              No configuration changes recorded in system audit logs for the Marketing Agent yet.
            </div>
          ) : (
            marketingAudits.map((log) => {
              let payloadKey = "";
              let payloadVal = "";
              try {
                const parsed = JSON.parse(log.payload ?? "{}");
                payloadKey = parsed.key ?? "";
                payloadVal = parsed.value ?? "";
              } catch {}
              
              return (
                <div key={log.id} className="py-2.5 flex items-start gap-4">
                  <span className="text-foreground/40 flex-shrink-0 w-24">
                    {new Date(log.createdAt).toLocaleTimeString("en-IN")}
                  </span>
                  <span className="bg-[#8B5CF6]/10 text-[#8B5CF6] px-1.5 rounded text-[10px] font-black uppercase tracking-wide flex-shrink-0">
                    {log.action}
                  </span>
                  <div className="flex-1 min-w-0">
                    <span className="font-bold text-foreground/80">{payloadKey}</span>
                    <span className="text-foreground/50 mx-2">updated to</span>
                    <span className="text-foreground/90 bg-white border border-slate-200 px-1.5 py-0.5 rounded text-[10px] font-semibold truncate max-w-sm inline-block align-middle">
                      {payloadVal.length > 80 ? `${payloadVal.slice(0, 80)}...` : payloadVal}
                    </span>
                  </div>
                  {log.ipAddress && (
                    <span className="text-foreground/40 text-[10px] hidden sm:inline">IP: {log.ipAddress}</span>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminMarketingAgent;
