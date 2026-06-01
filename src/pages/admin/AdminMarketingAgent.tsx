import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { adminApi } from "@/lib/admin-api";
import {
  Workflow, RefreshCw, Server, AlertTriangle, ShieldCheck, Check, Copy, X, Activity, MessageSquare, Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { PageShell } from "@/components/PageShell";

// Flow chart nodes
const nodes = [
  { id: "trigger",   title: "Virtual Agent Trigger", subtitle: "WhatsApp owner command", type: "trigger", icon: Workflow, color: "bg-[#E6F0FA] text-[#2533A8]", status: "Listening" },
  { id: "agent",     title: "Addison Marketing AI",  subtitle: "GPT-4o execution engine",  type: "agent",   icon: Activity, color: "bg-[#FDF0F5] text-[#A11A6A]", status: "Active" },
  { id: "guardrail", title: "Budget Guardrail",      subtitle: "Force double confirmation", type: "guard",   icon: ShieldCheck, color: "bg-[#FFF1D6] text-[#B8420A]", status: "Enforced" },
  { id: "tool_meta", title: "Meta Ads API Tool",     subtitle: "Read/Write Ads manager",    type: "tool",    icon: RefreshCw, color: "bg-[#FFF1D6] text-[#B8420A]", status: "Online" },
  { id: "tool_crm",  title: "CRM Chats Tool",        subtitle: "Read DB buyer sentiment",    type: "tool",    icon: MessageSquare, color: "bg-[#E6F7EE] text-[#0A6E3C]", status: "Online" },
];

const AdminMarketingAgent = () => {
  const [zoom, setZoom] = useState(1);
  const [selectedNode, setSelectedNode] = useState<string | null>("agent");
  const [isCopied, setIsCopied] = useState(false);

  // Settings
  const { data: settings = [], refetch, isRefetching } = useQuery({
    queryKey: ["admin-settings"],
    queryFn: () => adminApi.settings(),
  });

  // Fetch engine audit logs
  const { data: audits = [], isLoading: auditsLoading, refetch: refetchAudits } = useQuery({
    queryKey: ["admin-audit-all"],
    queryFn: () => adminApi.audit({ limit: 105 }),
    refetchInterval: 15_000,
  });

  const marketingAudits = audits.filter(
    (log) => log.action === "update_setting" && log.payload?.includes("marketing_agent")
  );

  const getVal = (key: string, def = "") =>
    settings.find((s) => s.key === key)?.value ?? def;

  const isEnabled = getVal("marketing_agent_enabled") === "true";
  const systemPrompt = getVal("marketing_agent_system_prompt");
  const maxBudget = getVal("marketing_agent_max_budget_limit", "5000");

  const handleUpdateSetting = async (key: string, value: string) => {
    try {
      await adminApi.updateSetting(key, value);
      toast.success("Setting synchronized with Engine");
      refetch();
      refetchAudits();
    } catch (e) {
      toast.error(String(e));
    }
  };

  const handleCopyNumber = () => {
    navigator.clipboard.writeText("system_marketing");
    setIsCopied(true);
    toast.success("Identifier copied to clipboard");
    setTimeout(() => setIsCopied(false), 2000);
  };

  const activeNodeData = nodes.find((n) => n.id === selectedNode);

  const headerActions = (
    <div className="flex items-center gap-2">
      <Button
        size="sm"
        variant="outline"
        onClick={() => refetch()}
        className="border-2 border-[#E8B968] bg-white hover:bg-[#FFF6E8]/40 text-slate-700 text-[12px] font-extrabold active:translate-y-0.5 active:shadow-none shadow-[0_2px_0_0_#E8B968]"
      >
        <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isRefetching ? "animate-spin" : ""}`} />
        Refresh Engine
      </Button>
      <div className="h-5 w-[2px] bg-[#E8B968] mx-1" />
      <span className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-[#0E8A4B] bg-[#E6F7EE] border-2 border-[#0E8A4B]/60 px-2 py-0.5 rounded-full shadow-[0_2px_0_0_#0E8A4B]">
        <span className="w-2 h-2 rounded-full bg-[#0E8A4B] animate-ping" />
        Engine Online
      </span>
    </div>
  );

  return (
    <PageShell
      title="Marketing Agent Workflow"
      subtitle="Configure trigger rules, custom AI prompts, guardrails, and Meta Ads action tools."
      icon={<Workflow className="w-5 h-5 text-white" strokeWidth={2.5} />}
      actions={headerActions}
    >
      {/* Visual Animation Styles */}
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

      <div className="max-w-7xl mx-auto space-y-6">
        {/* Interactive Canvas Box */}
        <div className="bg-white border-2 border-[#E8B968] rounded-2xl overflow-hidden shadow-[0_4px_0_0_#E8B968] flex flex-col h-[550px] relative">
          {/* Canvas header */}
          <div className="flex items-center justify-between border-b-2 border-[#E8B968] bg-[#FFF6E8] px-4 py-2.5 flex-shrink-0">
            <div className="flex items-center gap-2">
              <Workflow className="w-4 h-4 text-[#3C50E0]" />
              <span className="text-xs font-black uppercase tracking-wider text-[#0A3D24]">Interactive Canvas</span>
            </div>
            {/* Zoom Controls inside the header */}
            <div className="flex items-center gap-1.5">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setZoom(Math.max(zoom - 0.1, 0.7))}
                className="h-7 w-7 p-0 text-slate-700 hover:bg-[#FFF6E8] border border-transparent hover:border-[#E8B968] rounded font-bold"
                title="Zoom Out"
              >
                -
              </Button>
              <span className="text-[10px] font-mono font-black text-slate-650 bg-white px-2 py-0.5 border border-[#E8B968] rounded">{Math.round(zoom * 100)}%</span>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setZoom(Math.min(zoom + 0.1, 1.3))}
                className="h-7 w-7 p-0 text-slate-700 hover:bg-[#FFF6E8] border border-transparent hover:border-[#E8B968] rounded font-bold"
                title="Zoom In"
              >
                +
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setZoom(1);
                  setSelectedNode(null);
                }}
                className="h-7 px-2 text-[10px] font-bold text-slate-655 hover:bg-[#FFF6E8] border border-transparent hover:border-[#E8B968] rounded"
              >
                Reset
              </Button>
            </div>
          </div>

          <div className="flex-1 flex overflow-hidden relative">
            {/* Canvas Body */}
            <div className="flex-1 overflow-auto relative select-none bg-slate-50" style={{
              backgroundImage: "radial-gradient(#cbd5e1 1.5px, transparent 1.5px)",
              backgroundSize: "24px 24px"
            }}>
              {/* Zoomable Inner Canvas Container */}
              <div
                className="w-full h-full min-h-[480px] relative transition-transform duration-200"
                style={{ transform: `scale(${zoom})`, transformOrigin: "center center" }}
              >
                {/* SVG Connector Lines Layer */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none z-0" style={{ minHeight: "480px" }}>
                  {/* Trigger (1) -> Agent Core (2) */}
                  <path
                    d="M 240 240 C 320 240, 320 150, 400 150"
                    fill="none"
                    stroke={isEnabled ? "#3C50E0" : "#cbd5e1"}
                    strokeWidth="3.5"
                    className={isEnabled ? "flowing-line-active" : ""}
                  />
                  {/* Trigger (1) -> Guardrail (3) */}
                  <path
                    d="M 240 240 C 320 240, 320 330, 400 330"
                    fill="none"
                    stroke={isEnabled ? "#D4308E" : "#cbd5e1"}
                    strokeWidth="3.5"
                    className={isEnabled ? "flowing-line-active" : ""}
                  />
                  {/* Agent Core (2) -> Meta Ads Tool (4) */}
                  <path
                    d="M 580 150 C 650 150, 650 120, 720 120"
                    fill="none"
                    stroke={isEnabled ? "#FF6A1F" : "#cbd5e1"}
                    strokeWidth="3.5"
                    className={isEnabled ? "flowing-line-active" : ""}
                  />
                  {/* Agent Core (2) -> CRM Chats Tool (5) */}
                  <path
                    d="M 580 150 C 650 150, 650 300, 720 300"
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
                  let positionStyle = {};
                  if (node.id === "trigger") {
                    positionStyle = { left: "40px", top: "190px" };
                  } else if (node.id === "agent") {
                    positionStyle = { left: "370px", top: "100px" };
                  } else if (node.id === "guardrail") {
                    positionStyle = { left: "370px", top: "280px" };
                  } else if (node.id === "tool_meta") {
                    positionStyle = { left: "710px", top: "70px" };
                  } else if (node.id === "tool_crm") {
                    positionStyle = { left: "710px", top: "250px" };
                  }

                  // Customize colors/borders using our brutalist theme
                  let brutalBorder = "border-[#E8B968]";
                  let brutalShadow = "shadow-[0_4px_0_0_#E8B968]";
                  if (isSelected) {
                    brutalBorder = "border-[#3C50E0]";
                    brutalShadow = "shadow-[0_4px_0_0_#3C50E0]";
                  }

                  return (
                    <div
                      key={node.id}
                      onClick={() => setSelectedNode(node.id)}
                      style={positionStyle}
                      className={cn(
                        "absolute z-10 w-[240px] bg-white border-2 rounded-2xl p-4 cursor-pointer transition-all duration-200",
                        brutalBorder,
                        brutalShadow,
                        isSelected ? "-translate-y-0.5" : "hover:-translate-y-0.5 hover:bg-[#FFF6E8]/20"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border-2 border-[#E8B968] shadow-[0_2px_0_0_#E8B968]", node.color)}>
                          <NodeIcon className="w-5 h-5" strokeWidth={2.5} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-black tracking-tight text-slate-805 truncate">{node.title}</p>
                          <p className="text-[10px] text-slate-550 font-bold truncate leading-tight mt-0.5">{node.subtitle}</p>
                        </div>
                      </div>

                      {/* Node footer status bar */}
                      {node.status && (
                        <div className="mt-3 pt-2.5 border-t-2 border-slate-100 flex items-center justify-between">
                          <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">Node Status</span>
                          <span className={cn(
                            "text-[9px] px-2 py-0.5 rounded border-2 font-black uppercase tracking-wider", 
                            node.status === "Active" || node.status === "Online"
                              ? "bg-[#E6F7EE] border-[#0E8A4B]/60 text-[#0A6E3C]"
                              : node.status === "Enforced"
                                ? "bg-[#FDF0F5] border-[#D4308E]/60 text-[#A11A6A]"
                                : "bg-[#E6F0FA] border-[#3C50E0]/60 text-[#2533A8]"
                          )}>
                            {node.status}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Node configuration drawer (Right sidebar inside canvas box) */}
            {selectedNode && activeNodeData && (
              <div className="w-[360px] border-l-2 border-[#E8B968] bg-white flex flex-col flex-shrink-0 relative z-20 shadow-[-4px_0_0_0_rgba(232,185,104,0.1)]">
                {/* Drawer Header */}
                <div className="flex items-center justify-between border-b-2 border-[#E8B968] p-4 bg-[#FFF6E8]">
                  <div className="flex items-center gap-2.5">
                    <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center text-white border-2 border-[#E8B968] shadow-[0_2px_0_0_#E8B968]", activeNodeData.color)}>
                      {(() => {
                        const NodeIcon = activeNodeData.icon;
                        return <NodeIcon className="w-4.5 h-4.5" />;
                      })()}
                    </div>
                    <div>
                      <h2 className="text-[13px] font-black tracking-tight text-slate-800 uppercase leading-none">{activeNodeData.title}</h2>
                      <span className="text-[9px] uppercase tracking-wider bg-white text-slate-500 border border-slate-350 px-1.5 py-0.5 rounded font-black mt-1 inline-block">
                        {activeNodeData.type} Node
                      </span>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setSelectedNode(null)}
                    className="h-8 w-8 p-0 text-slate-400 hover:bg-[#FFF6E8]/80 hover:text-slate-700 rounded-lg"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                {/* Drawer Parameter Controls */}
                <div className="flex-1 overflow-y-auto p-4 space-y-5">
                  {/* Webhook trigger node */}
                  {selectedNode === "trigger" && (
                    <div className="space-y-4">
                      <div className="p-3 bg-[#FFF1D6] border-2 border-[#FF6A1F]/60 rounded-xl text-[11px] leading-relaxed text-[#B8420A] font-bold">
                        <AlertTriangle className="w-4 h-4 text-[#FF6A1F] mb-1" />
                        <strong>Note:</strong> Inbound messages from clients will route through the default message handler. This system contact trigger runs exclusively for owner interactions within their platform inbox.
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[11px] font-black uppercase text-slate-500">Listening Identifier</label>
                        <div className="flex items-center gap-2">
                          <code className="flex-1 bg-slate-50 px-3 py-2 rounded-xl text-[12px] font-mono text-slate-850 font-bold border-2 border-[#E8B968] select-all">
                            system_marketing
                          </code>
                          <Button
                            size="sm"
                            onClick={handleCopyNumber}
                            className="bg-white hover:bg-[#FFF6E8] border-2 border-[#E8B968] text-slate-700 h-9 px-3 active:translate-y-0.5 active:shadow-none shadow-[0_2px_0_0_#E8B968] font-bold"
                          >
                            {isCopied ? <Check className="w-4 h-4 text-emerald-655" /> : <Copy className="w-4 h-4" />}
                          </Button>
                        </div>
                        <p className="text-[10px] text-slate-450 font-bold">
                          Copy the custom phone ID representing the virtual Marketing Manager.
                        </p>
                      </div>

                      <div className="space-y-1 bg-[#FFF6E8]/20 border-2 border-[#E8B968] p-3.5 rounded-xl">
                        <p className="text-[11px] font-black uppercase text-slate-500 mb-1.5">Port Mapping</p>
                        <div className="flex items-center justify-between text-[11px] py-1 border-b border-[#E8B968]/50">
                          <span className="font-extrabold text-slate-600">Trigger Source:</span>
                          <span className="font-mono bg-white px-1.5 py-0.5 rounded border border-[#E8B968] text-slate-700 font-bold">WhatsApp API</span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] py-1">
                          <span className="font-extrabold text-slate-600">Target Flow:</span>
                          <span className="font-mono bg-white px-1.5 py-0.5 rounded border border-[#E8B968] text-[#3C50E0] font-bold">Addison AI Node</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* AI Agent Node */}
                  {selectedNode === "agent" && (
                    <div className="space-y-4">
                      {/* Status Toggle */}
                      <div className="flex items-center justify-between bg-[#E6F0FA] border-2 border-[#3C50E0]/60 p-3.5 rounded-xl shadow-[0_2px_0_0_#3C50E0]/30">
                        <div>
                          <p className="text-[12px] font-black text-slate-800">AI Agent Status</p>
                          <p className="text-[10px] text-[#2533A8] font-bold mt-0.5">
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
                        <label className="text-[11px] font-black uppercase text-slate-550">Execution Model</label>
                        <Input value="gpt-4o-mini" disabled className="h-9 text-[12px] font-mono border-2 border-[#E8B968] bg-slate-50 font-bold text-slate-600 cursor-not-allowed" />
                        <p className="text-[10px] text-slate-400 font-bold">
                          Fast, cost-efficient, tool-capable model for platform analytics tasks.
                        </p>
                      </div>

                      {/* System Prompt Instructions */}
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-black uppercase text-slate-555">System Prompt (Instructions)</label>
                        <Textarea
                          value={systemPrompt}
                          onChange={(e) => handleUpdateSetting("marketing_agent_system_prompt", e.target.value)}
                          placeholder="Specify what instructions the Marketing AI should follow..."
                          className="min-h-[220px] text-[11px] font-mono leading-relaxed border-2 border-[#E8B968] focus-visible:border-[#0E8A4B] focus-visible:ring-0 focus-visible:ring-offset-0 text-slate-800 font-bold bg-white"
                        />
                        <p className="text-[10px] text-slate-400 font-bold leading-normal">
                          The core directive template. Addison-AI will adopt this persona to talk with the business owner.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Guardrails node */}
                  {selectedNode === "guardrail" && (
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-black uppercase text-slate-550">Maximum Daily Budget Threshold (INR)</label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[12px] font-black text-slate-500">₹</span>
                          <Input
                            type="number"
                            value={maxBudget}
                            onChange={(e) =>
                              handleUpdateSetting("marketing_agent_max_budget_limit", e.target.value)
                            }
                            className="pl-7 h-9 text-[12px] font-mono border-2 border-[#E8B968] focus-visible:border-[#0E8A4B] focus-visible:ring-0 focus-visible:ring-offset-0 text-slate-800 font-bold bg-white"
                          />
                        </div>
                        <p className="text-[10px] text-slate-400 font-bold leading-normal mt-1">
                          If the AI attempts to execute an ad budget update tool with a daily budget higher than this amount, the engine will force the agent to prompt the owner for double confirmation.
                        </p>
                      </div>

                      <div className="p-3 bg-[#FDF0F5] border-2 border-[#D4308E]/60 rounded-xl text-[11px] leading-relaxed text-[#A11A6A] flex items-start gap-2 font-bold shadow-[0_2px_0_0_#D4308E]/30">
                        <ShieldCheck className="w-4 h-4 text-[#D4308E] flex-shrink-0 mt-0.5" />
                        <div>
                          <strong>Enforcement Mode:</strong> LLM System Injection. This threshold is appended dynamically to the bottom of the system instructions template.
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Meta Ads API Tool node */}
                  {selectedNode === "tool_meta" && (
                    <div className="space-y-4">
                      <p className="text-[12px] font-bold leading-relaxed text-slate-600">
                        Provides the Marketing Agent with functions to pull campaigns, inspect analytics, change daily budgets, and pause or activate ads directly inside Meta's ecosystem.
                      </p>

                      <div className="space-y-2">
                        <label className="text-[11px] font-black uppercase text-slate-550">Available Functions</label>
                        
                        <div className="border-2 border-[#E8B968] p-2.5 rounded-xl space-y-2.5 bg-slate-50/50">
                          <div className="flex items-start gap-2 text-[11px]">
                            <span className="bg-[#FFF1D6] border border-[#FF6A1F]/60 text-[#B8420A] px-1.5 py-0.5 rounded font-mono font-black">list_campaigns</span>
                            <div className="text-slate-655 leading-normal font-bold">
                              Lists all ad campaigns with name, objective, budget, and active status.
                            </div>
                          </div>
                          <div className="flex items-start gap-2 text-[11px] pt-2 border-t-2 border-[#E8B968]/30">
                            <span className="bg-[#FFF1D6] border border-[#FF6A1F]/60 text-[#B8420A] px-1.5 py-0.5 rounded font-mono font-black">get_campaign_analytics</span>
                            <div className="text-slate-655 leading-normal font-bold">
                              Pulls 30-day aggregates (CTR, CPC, reach, impressions, budget spent) for a selected campaign ID.
                            </div>
                          </div>
                          <div className="flex items-start gap-2 text-[11px] pt-2 border-t-2 border-[#E8B968]/30">
                            <span className="bg-[#FFF1D6] border border-[#FF6A1F]/60 text-[#B8420A] px-1.5 py-0.5 rounded font-mono font-black">update_campaign</span>
                            <div className="text-slate-655 leading-normal font-bold">
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
                      <p className="text-[12px] font-bold leading-relaxed text-slate-600">
                        Allows the Marketing Agent to query recent customer-facing conversation logs in the database. Enables the AI to analyze objections, FAQs, and buyer sentiment to formulate profitable campaign recommendations.
                      </p>

                      <div className="space-y-2">
                        <label className="text-[11px] font-black uppercase text-slate-555">Available Functions</label>
                        <div className="border-2 border-[#E8B968] p-2.5 rounded-xl bg-slate-50/50">
                          <div className="flex items-start gap-2 text-[11px]">
                            <span className="bg-[#E6F7EE] border border-[#0E8A4B]/60 text-[#0A6E3C] px-1.5 py-0.5 rounded font-mono font-black">analyze_crm_customer_chats</span>
                            <div className="text-slate-655 leading-normal font-bold">
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
        </div>

        {/* Bottom Area: Setting Update Audit logs */}
        <div className="bg-white border-2 border-[#E8B968] rounded-2xl overflow-hidden shadow-[0_4px_0_0_#E8B968] flex flex-col h-72">
          {/* Header */}
          <div className="flex items-center justify-between border-b-2 border-[#E8B968] px-5 py-3.5 bg-[#FFF6E8] flex-shrink-0">
            <div className="flex items-center gap-2">
              <Server className="w-4 h-4 text-[#3C50E0]" />
              <h3 className="text-[12px] font-extrabold text-[#0A3D24] uppercase tracking-wider">Engine Execution & Configuration Audit Logs</h3>
            </div>
            <span className="text-[10px] font-black text-slate-550 bg-white border border-[#E8B968] px-2 py-0.5 rounded">Showing last config updates</span>
          </div>

          {/* Logs List */}
          <div className="flex-1 overflow-y-auto px-6 py-2.5 font-mono text-[11px] leading-relaxed divide-y-2 divide-[#E8B968]/20 bg-slate-50">
            {auditsLoading ? (
              <div className="flex items-center justify-center h-full py-10 text-slate-400 font-bold">
                <Loader2 className="w-5 h-5 animate-spin text-[#3C50E0] mr-2" />
                <span>Fetching audit stream...</span>
              </div>
            ) : marketingAudits.length === 0 ? (
              <div className="text-slate-400 italic py-10 text-center font-bold">
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
                  <div key={log.id} className="py-2.5 flex items-start gap-4 text-slate-705">
                    <span className="text-slate-400 flex-shrink-0 w-24 font-bold">
                      {new Date(log.createdAt).toLocaleTimeString("en-IN")}
                    </span>
                    <span className="bg-[#E6F0FA] text-[#2533A8] border border-[#3C50E0]/60 px-1.5 rounded text-[10px] font-black uppercase tracking-wide flex-shrink-0">
                      {log.action}
                    </span>
                    <div className="flex-1 min-w-0 font-bold">
                      <span className="font-black text-slate-800">{payloadKey}</span>
                      <span className="text-slate-450 mx-2 font-normal">updated to</span>
                      <span className="text-slate-700 bg-white border border-[#E8B968] px-1.5 py-0.5 rounded text-[10px] font-extrabold truncate max-w-sm inline-block align-middle shadow-sm">
                        {payloadVal.length > 80 ? `${payloadVal.slice(0, 80)}...` : payloadVal}
                      </span>
                    </div>
                    {log.ipAddress && (
                      <span className="text-slate-400 text-[10px] hidden sm:inline font-bold">IP: {log.ipAddress}</span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </PageShell>
  );
};

export default AdminMarketingAgent;
