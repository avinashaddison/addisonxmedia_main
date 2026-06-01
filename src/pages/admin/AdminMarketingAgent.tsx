import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { adminApi, SystemSetting } from "@/lib/admin-api";
import {
  Workflow, Play, Square, Settings, RefreshCw, Server, AlertTriangle, ShieldCheck, Check, Copy, minimize as Minimize2, maximize as Maximize2, X, Activity, MessageSquare
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// Flow chart nodes
const nodes = [
  { id: "trigger",   title: "Virtual Agent Trigger", subtitle: "WhatsApp owner command", type: "trigger", icon: Workflow, color: "bg-indigo-50 text-indigo-650 border border-indigo-200", status: "Listening", statusColor: "bg-indigo-50 text-indigo-705 border border-indigo-200" },
  { id: "agent",     title: "Addison Marketing AI",  subtitle: "GPT-4o execution engine",  type: "agent",   icon: Activity, color: "bg-purple-50 text-purple-650 border border-purple-200", status: "Active", statusColor: "bg-emerald-50 text-emerald-705 border border-emerald-200" },
  { id: "guardrail", title: "Budget Guardrail",      subtitle: "Force double confirmation", type: "guard",   icon: ShieldCheck, color: "bg-pink-55 text-pink-650 border border-pink-200", status: "Enforced", statusColor: "bg-pink-50 text-pink-705 border border-pink-200" },
  { id: "tool_meta", title: "Meta Ads API Tool",     subtitle: "Read/Write Ads manager",    type: "tool",    icon: Play, color: "bg-orange-50 text-orange-650 border border-orange-200", status: "Online", statusColor: "bg-emerald-50 text-emerald-705 border border-emerald-200" },
  { id: "tool_crm",  title: "CRM Chats Tool",        subtitle: "Read DB buyer sentiment",    type: "tool",    icon: MessageSquare, color: "bg-emerald-50 text-emerald-600 border border-emerald-200", status: "Online", statusColor: "bg-emerald-50 text-emerald-705 border border-emerald-200" },
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
    queryFn: () => adminApi.audit({ limit: 100 }),
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

  return (
    <div className="h-screen w-full flex flex-col overflow-hidden text-slate-800 bg-slate-50">
      
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

      {/* Top action header */}
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4 flex-shrink-0 relative z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-900 to-indigo-950 text-white flex items-center justify-center shadow-sm">
            <Workflow className="w-5 h-5 text-indigo-400" strokeWidth={2.2} />
          </div>
          <div>
            <h1 className="text-[20px] font-black tracking-tight flex items-center gap-2 text-slate-900">
              Marketing Agent Workflow
              <span className="text-[9px] uppercase tracking-wider bg-indigo-50 border border-indigo-150 text-indigo-600 px-2 py-0.5 rounded-full font-bold">
                n8n Engine v1.0
              </span>
            </h1>
            <p className="text-[11px] text-slate-500 font-medium">
              Configure trigger rules, custom AI prompts, guardrails, and Meta Ads action tools.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => refetch()}
            className="border border-slate-205 bg-white hover:bg-slate-50 text-slate-700 text-[12px] font-bold active:scale-[0.98] transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isRefetching ? "animate-spin" : ""}`} />
            Refresh Engine
          </Button>
          <div className="h-4 w-[1px] bg-slate-200 mx-1" />
          <span className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-emerald-600">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
            Engine Online
          </span>
        </div>
      </div>

      {/* Workspace Area: Canvas + Drawer */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* Visual Workflow Canvas */}
        <div className="flex-1 overflow-auto relative p-6 select-none bg-slate-50" style={{
          backgroundImage: "radial-gradient(#cbd5e1 1.5px, transparent 1.5px)",
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
                stroke={isEnabled ? "#8b5cf6" : "#cbd5e1"}
                strokeWidth="3.5"
                className={isEnabled ? "flowing-line-active" : ""}
              />
              {/* Trigger (1) -> Guardrail (3) */}
              <path
                d="M 240 270 C 320 270, 320 360, 420 360"
                fill="none"
                stroke={isEnabled ? "#ec4899" : "#cbd5e1"}
                strokeWidth="3.5"
                className={isEnabled ? "flowing-line-active" : ""}
              />
              {/* Agent Core (2) -> Meta Ads Tool (4) */}
              <path
                d="M 580 180 C 650 180, 650 150, 750 150"
                fill="none"
                stroke={isEnabled ? "#f97316" : "#cbd5e1"}
                strokeWidth="3.5"
                className={isEnabled ? "flowing-line-active" : ""}
              />
              {/* Agent Core (2) -> CRM Chats Tool (5) */}
              <path
                d="M 580 180 C 650 180, 650 330, 750 330"
                fill="none"
                stroke={isEnabled ? "#10b981" : "#cbd5e1"}
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
                  className={`absolute z-10 w-[240px] bg-white border rounded-2xl p-4 cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
                    isSelected
                      ? "border-purple-500 ring-4 ring-purple-100 shadow-sm"
                      : "border-slate-200 shadow-sm"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm", node.color)}>
                      <NodeIcon className="w-5 h-5" strokeWidth={2.2} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-bold tracking-tight text-slate-800 truncate">{node.title}</p>
                      <p className="text-[10px] text-slate-450 font-medium truncate leading-tight mt-0.5">{node.subtitle}</p>
                    </div>
                  </div>

                  {/* Node port connectors */}
                  {node.id !== "trigger" && (
                    <div className="absolute top-[30px] -left-2 w-4 h-4 bg-white border border-slate-300 rounded-full flex items-center justify-center shadow-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-350" />
                    </div>
                  )}
                  {node.id !== "tool_meta" && node.id !== "tool_crm" && node.id !== "guardrail" && (
                    <div className="absolute top-[30px] -right-2 w-4 h-4 bg-white border border-slate-300 rounded-full flex items-center justify-center shadow-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-350" />
                    </div>
                  )}

                  {/* Node footer status bar */}
                  {node.status && (
                    <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">Node Status</span>
                      <span className={cn("text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border", node.statusColor)}>
                        {node.status}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Canvas Floating Controls */}
          <div className="absolute bottom-4 left-4 z-10 bg-white border border-slate-200 rounded-xl flex items-center gap-1 p-1 shadow-sm">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setZoom(Math.max(zoom - 0.1, 0.7))}
              className="h-8 w-8 p-0 text-slate-500 hover:bg-slate-50 rounded-lg"
              title="Zoom Out"
            >
              <X className="w-4 h-4" />
            </Button>
            <span className="text-[10px] font-mono px-2 font-black text-slate-500">{Math.round(zoom * 100)}%</span>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setZoom(Math.min(zoom + 0.1, 1.3))}
              className="h-8 w-8 p-0 text-slate-500 hover:bg-slate-50 rounded-lg"
              title="Zoom In"
            >
              <Workflow className="w-4 h-4" />
            </Button>
            <div className="h-4 w-[1px] bg-slate-200 mx-0.5" />
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setZoom(1);
                setSelectedNode(null);
              }}
              className="h-8 px-2 text-[10px] font-bold text-slate-550 hover:bg-slate-50 rounded-lg"
            >
              Reset view
            </Button>
          </div>
        </div>

        {/* Node configuration drawer (Right sidebar) */}
        {selectedNode && activeNodeData && (
          <div className="w-[380px] border-l border-slate-200 bg-white flex flex-col flex-shrink-0 relative z-20 shadow-[rgba(0,0,0,0.05)_(-10px)_0_30px_0]">
            {/* Drawer Header */}
            <div className="flex items-center justify-between border-b border-slate-200 p-4 bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white shadow-sm ${activeNodeData.color.split(" ")[0]}`}>
                  {(() => {
                    const NodeIcon = activeNodeData.icon;
                    return <NodeIcon className="w-4.5 h-4.5" />;
                  })()}
                </div>
                <div>
                  <h2 className="text-[14px] font-bold tracking-tight text-slate-805">{activeNodeData.title}</h2>
                  <span className="text-[9px] uppercase tracking-wider bg-slate-100 text-slate-500 border border-slate-200 px-1.5 py-0.2 rounded font-bold">
                    {activeNodeData.type} Node
                  </span>
                </div>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSelectedNode(null)}
                className="h-8 w-8 p-0 text-slate-400 hover:bg-slate-100 rounded-lg"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Drawer Parameter Controls */}
            <div className="flex-1 overflow-y-auto p-4 space-y-5">
              
              {/* Webhook trigger node */}
              {selectedNode === "trigger" && (
                <div className="space-y-4">
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] leading-relaxed text-amber-805">
                    <AlertTriangle className="w-4 h-4 text-amber-705 mb-1" />
                    <strong>Note:</strong> Inbound messages from clients will route through the default message handler. This system contact trigger runs exclusively for owner interactions within their platform inbox.
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase text-slate-400">Listening Identifier</label>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 bg-slate-50 px-3 py-2 rounded-xl text-[12px] font-mono text-slate-800 font-bold border border-slate-200 select-all">
                        system_marketing
                      </code>
                      <Button
                        size="sm"
                        onClick={handleCopyNumber}
                        className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 h-9 px-3 active:scale-[0.98] transition-all"
                      >
                        {isCopied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                      </Button>
                    </div>
                    <p className="text-[10px] text-slate-450 font-medium">
                      Copy the custom phone ID representing the virtual Marketing Manager.
                    </p>
                  </div>

                  <div className="space-y-1 bg-slate-50 border border-slate-200 p-3.5 rounded-xl">
                    <p className="text-[11px] font-bold uppercase text-slate-400 mb-1.5">Port Mapping</p>
                    <div className="flex items-center justify-between text-[11px] py-1 border-b border-slate-200/55">
                      <span className="font-semibold text-slate-600">Trigger Source:</span>
                      <span className="font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200 text-slate-700">WhatsApp API</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] py-1">
                      <span className="font-semibold text-slate-600">Target Flow:</span>
                      <span className="font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200 text-purple-600 font-bold">Addison AI Node</span>
                    </div>
                  </div>
                </div>
              )}

              {/* AI Agent Node */}
              {selectedNode === "agent" && (
                <div className="space-y-4">
                  {/* Status Toggle */}
                  <div className="flex items-center justify-between bg-purple-50/20 border border-purple-100 p-3.5 rounded-xl">
                    <div>
                      <p className="text-[12px] font-bold text-slate-800">AI Agent Status</p>
                      <p className="text-[10px] text-purple-600 font-medium mt-0.5">
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
                    <label className="text-[11px] font-bold uppercase text-slate-400">Execution Model</label>
                    <Input value="gpt-4o-mini" disabled className="h-9 text-[12px] font-mono border-slate-200" />
                    <p className="text-[10px] text-slate-400 font-medium">
                      Fast, cost-efficient, tool-capable model for platform analytics tasks.
                    </p>
                  </div>

                  {/* System Prompt Instructions */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase text-slate-400">System Prompt (Instructions)</label>
                    <Textarea
                      value={systemPrompt}
                      onChange={(e) => handleUpdateSetting("marketing_agent_system_prompt", e.target.value)}
                      placeholder="Specify what instructions the Marketing AI should follow..."
                      className="min-h-[220px] text-[11px] font-mono leading-relaxed focus-visible:ring-indigo-650 border border-slate-200"
                    />
                    <p className="text-[10px] text-slate-400 font-medium leading-normal">
                      The core directive template. Addison-AI will adopt this persona to talk with the business owner.
                    </p>
                  </div>
                </div>
              )}

              {/* Guardrails node */}
              {selectedNode === "guardrail" && (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase text-slate-400">Maximum Daily Budget Threshold (INR)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[12px] font-bold text-slate-400">₹</span>
                      <Input
                        type="number"
                        value={maxBudget}
                        onChange={(e) =>
                          handleUpdateSetting("marketing_agent_max_budget_limit", e.target.value)
                        }
                        className="pl-7 h-9 text-[12px] font-mono border border-slate-200 focus-visible:ring-indigo-600"
                      />
                    </div>
                    <p className="text-[10px] text-slate-400 font-medium leading-normal mt-1">
                      If the AI attempts to execute an ad budget update tool with a daily budget higher than this amount, the engine will force the agent to prompt the owner for double confirmation.
                    </p>
                  </div>

                  <div className="p-3 bg-rose-50 border border-rose-150 rounded-xl text-[11px] leading-relaxed text-rose-800 flex items-start gap-2">
                    <ShieldCheck className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <strong>Enforcement Mode:</strong> LLM System Injection. This threshold is appended dynamically to the bottom of the system instructions template.
                    </div>
                  </div>
                </div>
              )}

              {/* Meta Ads API Tool node */}
              {selectedNode === "tool_meta" && (
                <div className="space-y-4">
                  <p className="text-[12px] font-medium leading-relaxed text-slate-500">
                    Provides the Marketing Agent with functions to pull campaigns, inspect analytics, change daily budgets, and pause or activate ads directly inside Meta's ecosystem.
                  </p>

                  <div className="space-y-2">
                    <label className="text-[11px] font-bold uppercase text-slate-400">Available Functions</label>
                    
                    <div className="border border-slate-200 p-2.5 rounded-xl space-y-2.5 bg-slate-50/50">
                      <div className="flex items-start gap-2 text-[11px]">
                        <span className="bg-orange-50 border border-orange-100 text-orange-655 px-1.5 py-0.2 rounded font-mono font-bold">list_campaigns</span>
                        <div className="text-slate-600 leading-normal">
                          Lists all ad campaigns with name, objective, budget, and active status.
                        </div>
                      </div>
                      <div className="flex items-start gap-2 text-[11px] pt-2 border-t border-slate-200/50">
                        <span className="bg-orange-50 border border-orange-100 text-orange-655 px-1.5 py-0.2 rounded font-mono font-bold">get_campaign_analytics</span>
                        <div className="text-slate-600 leading-normal">
                          Pulls 30-day aggregates (CTR, CPC, reach, impressions, budget spent) for a selected campaign ID.
                        </div>
                      </div>
                      <div className="flex items-start gap-2 text-[11px] pt-2 border-t border-slate-200/50">
                        <span className="bg-orange-50 border border-orange-100 text-orange-655 px-1.5 py-0.2 rounded font-mono font-bold">update_campaign</span>
                        <div className="text-slate-600 leading-normal">
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
                  <p className="text-[12px] font-medium leading-relaxed text-slate-500">
                    Allows the Marketing Agent to query recent customer-facing conversation logs in the database. Enables the AI to analyze objections, FAQs, and buyer sentiment to formulate profitable campaign recommendations.
                  </p>

                  <div className="space-y-2">
                    <label className="text-[11px] font-bold uppercase text-slate-400">Available Functions</label>
                    <div className="border border-slate-200 p-2.5 rounded-xl bg-slate-50/50">
                      <div className="flex items-start gap-2 text-[11px]">
                        <span className="bg-emerald-50 border border-emerald-100 text-emerald-600 px-1.5 py-0.2 rounded font-mono font-bold">analyze_crm_customer_chats</span>
                        <div className="text-slate-600 leading-normal">
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
      <div className="h-64 border-t border-slate-200 bg-white flex flex-col flex-shrink-0 z-10 shadow-[rgba(0,0,0,0.03)_0_-10px_30px_0]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-3.5 bg-slate-50 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-purple-600" />
            <h3 className="text-[12px] font-bold text-slate-700 uppercase tracking-wider">Engine Execution & Configuration Audit Logs</h3>
          </div>
          <span className="text-[10px] font-mono text-slate-450">Showing last config updates</span>
        </div>

        {/* Logs List */}
        <div className="flex-1 overflow-y-auto px-6 py-2.5 font-mono text-[11px] leading-relaxed divide-y divide-slate-100 bg-slate-50/50">
          {auditsLoading ? (
            <div className="flex items-center justify-center h-full py-10 text-slate-400">
              <Loader2 className="w-5 h-5 animate-spin text-purple-600 mr-2" />
              <span>Fetching audit stream...</span>
            </div>
          ) : marketingAudits.length === 0 ? (
            <div className="text-slate-400 italic py-6 text-center">
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
                <div key={log.id} className="py-2.5 flex items-start gap-4 text-slate-650">
                  <span className="text-slate-400 flex-shrink-0 w-24">
                    {new Date(log.createdAt).toLocaleTimeString("en-IN")}
                  </span>
                  <span className="bg-purple-50 text-purple-600 border border-purple-150 px-1.5 rounded text-[10px] font-bold uppercase tracking-wide flex-shrink-0">
                    {log.action}
                  </span>
                  <div className="flex-1 min-w-0">
                    <span className="font-bold text-slate-800">{payloadKey}</span>
                    <span className="text-slate-400 mx-2">updated to</span>
                    <span className="text-slate-700 bg-white border border-slate-200 px-1.5 py-0.5 rounded text-[10px] font-semibold truncate max-w-sm inline-block align-middle shadow-sm">
                      {payloadVal.length > 80 ? `${payloadVal.slice(0, 80)}...` : payloadVal}
                    </span>
                  </div>
                  {log.ipAddress && (
                    <span className="text-slate-400 text-[10px] hidden sm:inline">IP: {log.ipAddress}</span>
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
