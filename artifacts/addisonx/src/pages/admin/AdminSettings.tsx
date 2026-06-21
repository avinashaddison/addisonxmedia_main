import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { adminApi, SystemSetting } from "@/lib/admin-api";
import {
  Settings, Loader2, Sparkles, CreditCard, Zap, AlertTriangle,
  CheckCircle2, KeyRound, Server, Search, Building2,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { PageShell } from "@/components/PageShell";

const CATEGORY_META: Record<string, { label: string; icon: typeof Settings; color: string; bg: string; text: string }> = {
  seo:      { label: "SEO & Meta Tags", icon: Search, color: "#D4308E", bg: "bg-[#FDF0F5]", text: "text-[#A11A6A]" },
  branding: { label: "Brand & Contact Info", icon: Building2, color: "#FF6A1F", bg: "bg-[#FFF1D6]", text: "text-[#B8420A]" },
  features: { label: "Feature Flags", icon: Sparkles, color: "#E8B968", bg: "bg-[#FFF6E8]", text: "text-[#0A3D24]" },
  billing:  { label: "Billing & Payments", icon: CreditCard, color: "#0E8A4B", bg: "bg-[#E6F7EE]", text: "text-[#0A6E3C]" },
  system:   { icon: Server, label: "System Core", color: "#3C50E0", bg: "bg-[#E6F0FA]", text: "text-[#2533A8]" },
  marketing_agent: { label: "AI Marketing Agent", icon: Sparkles, color: "#D4308E", bg: "bg-[#FDF0F5]", text: "text-[#A11A6A]" },
  general:  { label: "General", icon: Settings, color: "#cbd5e1", bg: "bg-slate-50", text: "text-slate-600" },
};

const isBool = (v: string | null) => v === "true" || v === "false";
const isDanger = (key: string) =>
  key === "maintenance_mode" || key === "signup_enabled" || key === "razorpay_live_mode";

const AdminSettings = () => {
  const qc = useQueryClient();
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["admin-settings"],
    queryFn: () => adminApi.settings(),
  });

  const grouped = rows.reduce<Record<string, SystemSetting[]>>((acc, s) => {
    (acc[s.category] ??= []).push(s);
    return acc;
  }, {});

  const update = async (key: string, value: string) => {
    try {
      await adminApi.updateSetting(key, value);
      toast.success("Setting updated");
      qc.invalidateQueries({ queryKey: ["admin-settings"] });
    } catch (e) { toast.error(String(e)); }
  };

  return (
    <PageShell
      title="Admin Settings"
      subtitle="Feature flags · Razorpay mode · system toggles. Super admin only. Every change is audited."
      icon={<Settings className="w-5 h-5 text-white" strokeWidth={2.5} />}
    >
      <div className="max-w-4xl mx-auto space-y-8">
        {isLoading && (
          <div className="flex items-center justify-center py-12 text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin text-[#0E8A4B]" />
          </div>
        )}

        {!isLoading && Object.entries(grouped).map(([category, settings]) => {
          const meta = CATEGORY_META[category] ?? CATEGORY_META.general;
          const Icon = meta.icon;
          return (
            <div key={category} className="space-y-4">
              <div className="flex items-center gap-2.5 px-1">
                <div className={cn("w-9 h-9 rounded-xl border-2 border-slate-900 flex items-center justify-center shadow-[0_2px_0_0_#000] flex-shrink-0", meta.bg, meta.text)}>
                  <Icon className="w-4.5 h-4.5" strokeWidth={2.5} />
                </div>
                <h2 className="text-[15px] font-black text-slate-850 tracking-tight">{meta.label}</h2>
              </div>

              <div className="bg-white border-2 border-[#E8B968] rounded-2xl shadow-[0_4px_0_0_#E8B968] overflow-hidden divide-y-2 divide-slate-100">
                {settings.map((s, idx) => (
                  <SettingRow
                    key={s.key}
                    setting={s}
                    onUpdate={update}
                  />
                ))}
              </div>
            </div>
          );
        })}

        {!isLoading && (
          <div className="flex items-start gap-3 p-4 bg-[#FFF6E8] border-2 border-[#E8B968] rounded-2xl shadow-[0_3px_0_0_#E8B968]">
            <AlertTriangle className="w-5 h-5 text-[#B8651A] flex-shrink-0 mt-0.5" strokeWidth={2.5} />
            <div>
              <p className="text-[12px] font-extrabold uppercase tracking-wider text-[#0A3D24] mb-1">Heads Up</p>
              <p className="text-[11.5px] text-slate-650 font-bold leading-relaxed">
                Toggling <code className="bg-white border border-[#E8B968] px-1.5 py-0.5 rounded font-mono text-[11px] font-black text-[#B8420A]">maintenance_mode</code> immediately shows a
                maintenance screen to every customer on <code className="bg-white border border-[#E8B968] px-1.5 py-0.5 rounded font-mono text-[11px] font-black text-[#B8420A]">/app</code>.
                Toggling <code className="bg-white border border-[#E8B968] px-1.5 py-0.5 rounded font-mono text-[11px] font-black text-[#B8420A]">razorpay_live_mode</code> switches refunds and
                new subscription payments to <strong>real money</strong>. Both write to the audit log.
              </p>
            </div>
          </div>
        )}
      </div>
    </PageShell>
  );
};

const SettingRow = ({
  setting, onUpdate,
}: {
  setting: SystemSetting;
  onUpdate: (key: string, value: string) => void;
}) => {
  const [draft, setDraft] = useState(setting.value ?? "");
  const [editing, setEditing] = useState(false);
  const isToggle = isBool(setting.value);
  const isOn = setting.value === "true";
  const danger = isDanger(setting.key);
  const isMultiline = setting.key === "marketing_agent_system_prompt" || setting.key.includes("prompt") || setting.key.includes("custom_head_html");

  if (isMultiline) {
    return (
      <div className={cn("px-5 py-4 transition-colors", danger && isOn ? "bg-rose-50/20" : "")}>
        <div className="flex items-center justify-between gap-4 mb-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-[13px] font-extrabold font-mono text-[#D4308E]">{setting.key}</p>
            </div>
            {setting.description && (
              <p className="text-[11px] text-slate-450 font-semibold mt-1 leading-relaxed">{setting.description}</p>
            )}
          </div>
          {!editing && (
            <button
              onClick={() => setEditing(true)}
              className="px-3 py-1.5 rounded-xl text-[11px] font-extrabold bg-white border-2 border-[#E8B968] shadow-[0_2px_0_0_#E8B968] text-slate-700 hover:bg-[#FFF1D6] active:translate-y-0.5 active:shadow-[0_1px_0_0_#E8B968] transition-all flex items-center gap-1"
            >
              <KeyRound className="w-3.5 h-3.5" /> Edit
            </button>
          )}
        </div>

        {editing ? (
          <div className="mt-3 space-y-3">
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Enter instructions..."
              className="min-h-[200px] text-[12px] font-mono leading-relaxed border-2 border-[#E8B968] focus:border-[#0E8A4B] rounded-xl bg-white text-slate-800 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 p-3"
              autoFocus
            />
            <div className="flex items-center gap-2">
              <button
                onClick={() => { onUpdate(setting.key, draft); setEditing(false); }}
                className="px-3 py-1.5 rounded-xl text-[11px] font-extrabold bg-[#0E8A4B] border-2 border-[#0A6E3C] shadow-[0_2px_0_0_#073D22] text-white hover:bg-[#0A6E3C] active:translate-y-0.5 active:shadow-[0_1px_0_0_#073D22] transition-all flex items-center gap-1"
              >
                <CheckCircle2 className="w-3.5 h-3.5" /> Save Changes
              </button>
              <button
                onClick={() => { setDraft(setting.value ?? ""); setEditing(false); }}
                className="px-3 py-1.5 rounded-xl text-[11px] font-extrabold bg-white border-2 border-[#E8B968] shadow-[0_2px_0_0_#E8B968] text-slate-700 hover:bg-[#FFF1D6] active:translate-y-0.5 active:shadow-[0_1px_0_0_#E8B968] transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-2">
            {setting.value ? (
              <pre className="text-[11px] font-mono text-slate-600 bg-[#FFF6E8]/30 p-3 rounded-xl border border-dashed border-[#E8B968] max-h-36 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                {setting.value}
              </pre>
            ) : (
              <span className="text-[11px] italic text-slate-400">empty</span>
            )}
            {setting.updatedAt && (
              <p className="text-[10px] text-slate-400 mt-2 font-semibold">
                Last updated {new Date(setting.updatedAt).toLocaleString("en-IN")}
              </p>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={cn("flex items-center justify-between gap-4 px-5 py-4 transition-colors", danger && isOn ? "bg-rose-50/20" : "")}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-[13px] font-bold font-mono text-slate-700">{setting.key}</p>
          {danger && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-rose-50 border-2 border-rose-350 text-rose-700 text-[9px] font-extrabold uppercase tracking-wider shadow-[0_1.5px_0_0_#cbd5e1]">
              <AlertTriangle className="w-2.5 h-2.5" /> Sensitive
            </span>
          )}
        </div>
        {setting.description && (
          <p className="text-[11px] text-slate-455 font-semibold mt-1 leading-relaxed">{setting.description}</p>
        )}
        {setting.updatedAt && (
          <p className="text-[10px] text-slate-400 mt-1.5 font-semibold">
            Last updated {new Date(setting.updatedAt).toLocaleString("en-IN")}
          </p>
        )}
      </div>

      {isToggle ? (
        <div className="flex items-center gap-3">
          <span className={cn("text-[11px] font-extrabold uppercase tracking-wider", isOn ? "text-[#0E8A4B]" : "text-slate-400")}>
            {isOn ? "ON" : "OFF"}
          </span>
          <Switch
            checked={isOn}
            onCheckedChange={(v) => onUpdate(setting.key, v ? "true" : "false")}
          />
        </div>
      ) : (
        <div className="flex items-center gap-2 max-w-xs w-full justify-end">
          {editing ? (
            <>
              <Input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Empty"
                className="h-9 text-[12px] font-mono border-2 border-[#E8B968] focus:border-[#0E8A4B] rounded-xl bg-white text-slate-800 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 px-3"
                autoFocus
              />
              <button
                onClick={() => { onUpdate(setting.key, draft); setEditing(false); }}
                className="w-9 h-9 flex items-center justify-center rounded-xl bg-[#0E8A4B] border-2 border-[#0A6E3C] shadow-[0_2px_0_0_#073D22] text-white hover:bg-[#0A6E3C] active:translate-y-0.5 active:shadow-[0_1px_0_0_#073D22] transition-all flex-shrink-0"
              >
                <CheckCircle2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => { setDraft(setting.value ?? ""); setEditing(false); }}
                className="px-3 h-9 rounded-xl text-[11px] font-extrabold bg-white border-2 border-[#E8B968] shadow-[0_2px_0_0_#E8B968] text-slate-700 hover:bg-[#FFF1D6] active:translate-y-0.5 active:shadow-[0_1px_0_0_#E8B968] transition-all flex-shrink-0"
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              <span className="text-[12px] font-mono text-slate-600 truncate flex-1 text-right">
                {setting.value ? (setting.key.includes("key") ? "•••••" : setting.value) : <span className="italic text-slate-400">empty</span>}
              </span>
              <button
                onClick={() => setEditing(true)}
                className="px-3 py-1.5 rounded-xl text-[11px] font-extrabold bg-white border-2 border-[#E8B968] shadow-[0_2px_0_0_#E8B968] text-slate-700 hover:bg-[#FFF1D6] active:translate-y-0.5 active:shadow-[0_1px_0_0_#E8B968] transition-all flex items-center gap-1"
              >
                <KeyRound className="w-3.5 h-3.5" /> Edit
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminSettings;
