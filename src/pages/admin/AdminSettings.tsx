import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { adminApi, SystemSetting } from "@/lib/admin-api";
import {
  Settings, Loader2, Sparkles, CreditCard, Zap, AlertTriangle,
  CheckCircle2, KeyRound, Server, Search, Building2,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const CATEGORY_META: Record<string, { label: string; icon: typeof Settings; color: string }> = {
  seo:      { label: "SEO & meta tags", icon: Search, color: "#ec4899" },
  branding: { label: "Brand & contact", icon: Building2, color: "#f97316" },
  features: { label: "Feature flags", icon: Sparkles, color: "#eab308" },
  billing:  { label: "Billing & payments", icon: CreditCard, color: "#10b981" },
  system:   { label: "System", icon: Server, color: "#6366f1" },
  marketing_agent: { label: "AI Marketing Agent Config", icon: Sparkles, color: "#8b5cf6" },
  general:  { label: "General", icon: Settings, color: "#64748b" },
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-650" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-6 lg:px-10 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3.5 border-b border-slate-200/80 pb-5">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-900 to-indigo-950 text-white flex items-center justify-center shadow-sm">
          <Settings className="w-5.5 h-5.5 text-indigo-400" strokeWidth={2.2} />
        </div>
        <div>
          <h1 className="text-[24px] font-black tracking-tight text-slate-900">Admin settings</h1>
          <p className="text-[12px] text-slate-500 font-medium">
            Feature flags · Razorpay mode · system toggles. Super admin only. Every change is audited.
          </p>
        </div>
      </div>

      {Object.entries(grouped).map(([category, settings]) => {
        const meta = CATEGORY_META[category] ?? CATEGORY_META.general;
        const Icon = meta.icon;
        return (
          <div key={category} className="mb-6 space-y-3">
            <div className="flex items-center gap-2.5 mb-1 px-1">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center border shadow-sm" style={{ background: `${meta.color}10`, borderColor: `${meta.color}25`, color: meta.color }}>
                <Icon className="w-4.5 h-4.5" strokeWidth={2.2} />
              </div>
              <h2 className="text-[15px] font-bold text-slate-800 tracking-tight">{meta.label}</h2>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
              {settings.map((s, idx) => (
                <SettingRow
                  key={s.key}
                  setting={s}
                  onUpdate={update}
                  isLast={idx === settings.length - 1}
                />
              ))}
            </div>
          </div>
        );
      })}

      {/* Heads up box */}
      <div className="mt-6 p-4 rounded-2xl bg-slate-50 border border-slate-200 text-[12px] font-medium text-slate-650">
        <p className="flex items-center gap-2 text-slate-800 font-bold uppercase tracking-wider mb-1.5">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-500" /> Heads up
        </p>
        <p className="text-slate-600 leading-relaxed">
          Toggling <code className="bg-white border border-slate-200 px-1 rounded font-mono text-[11px]">maintenance_mode</code> immediately shows a
          maintenance screen to every customer on <code className="bg-white border border-slate-200 px-1 rounded font-mono text-[11px]">/app</code>.
          Toggling <code className="bg-white border border-slate-200 px-1 rounded font-mono text-[11px]">razorpay_live_mode</code> switches refunds and
          new subscription payments to <strong>real money</strong>. Both write to the audit log.
        </p>
      </div>
    </div>
  );
};

const SettingRow = ({
  setting, onUpdate, isLast,
}: {
  setting: SystemSetting;
  onUpdate: (key: string, value: string) => void;
  isLast: boolean;
}) => {
  const [draft, setDraft] = useState(setting.value ?? "");
  const [editing, setEditing] = useState(false);
  const isToggle = isBool(setting.value);
  const isOn = setting.value === "true";
  const danger = isDanger(setting.key);
  const isMultiline = setting.key === "marketing_agent_system_prompt" || setting.key.includes("prompt") || setting.key.includes("custom_head_html");

  if (isMultiline) {
    return (
      <div className={`px-5 py-4 ${isLast ? "" : "border-b border-slate-100"}`}>
        <div className="flex items-center justify-between gap-4 mb-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-[13px] font-bold font-mono text-purple-600">{setting.key}</p>
            </div>
            {setting.description && (
              <p className="text-[11px] text-slate-400 font-medium mt-1 leading-relaxed">{setting.description}</p>
            )}
          </div>
          {!editing && (
            <Button size="sm" variant="outline" onClick={() => setEditing(true)} className="border-slate-250 active:scale-[0.98]">
              <KeyRound className="w-3.5 h-3.5 mr-1" /> Edit
            </Button>
          )}
        </div>

        {editing ? (
          <div className="mt-3 space-y-3">
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Enter instructions..."
              className="min-h-[200px] text-[12px] font-mono leading-relaxed focus-visible:ring-indigo-600 border border-slate-200"
              autoFocus
            />
            <div className="flex items-center gap-2">
              <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white active:scale-[0.98] transition" onClick={() => { onUpdate(setting.key, draft); setEditing(false); }}>
                <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Save changes
              </Button>
              <Button size="sm" variant="outline" onClick={() => { setDraft(setting.value ?? ""); setEditing(false); }} className="border-slate-250">
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="mt-2">
            {setting.value ? (
              <pre className="text-[11px] font-mono text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200 max-h-36 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                {setting.value}
              </pre>
            ) : (
              <span className="text-[11px] italic text-slate-400">empty</span>
            )}
            {setting.updatedAt && (
              <p className="text-[10px] text-slate-405 mt-1.5 font-medium">
                Last updated {new Date(setting.updatedAt).toLocaleString("en-IN")}
              </p>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`flex items-center justify-between gap-4 px-5 py-4 ${isLast ? "" : "border-b border-slate-100"} ${danger && isOn ? "bg-rose-50/20" : ""}`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-[13px] font-bold font-mono text-slate-700">{setting.key}</p>
          {danger && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-rose-55 text-rose-700 border border-rose-100 text-[9px] font-bold uppercase tracking-wider">
              <AlertTriangle className="w-2.5 h-2.5" /> Sensitive
            </span>
          )}
        </div>
        {setting.description && (
          <p className="text-[11px] text-slate-400 font-medium mt-1 leading-relaxed">{setting.description}</p>
        )}
        {setting.updatedAt && (
          <p className="text-[10px] text-slate-405 mt-1 font-medium">
            Last updated {new Date(setting.updatedAt).toLocaleString("en-IN")}
          </p>
        )}
      </div>

      {isToggle ? (
        <div className="flex items-center gap-3">
          <span className={`text-[11px] font-bold uppercase tracking-wider ${isOn ? "text-emerald-600" : "text-slate-400"}`}>
            {isOn ? "ON" : "OFF"}
          </span>
          <Switch
            checked={isOn}
            onCheckedChange={(v) => onUpdate(setting.key, v ? "true" : "false")}
          />
        </div>
      ) : (
        <div className="flex items-center gap-2 max-w-xs w-full">
          {editing ? (
            <>
              <Input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Empty"
                className="h-9 text-[12px] font-mono border-slate-200 focus-visible:ring-indigo-650"
                autoFocus
              />
              <Button size="sm" onClick={() => { onUpdate(setting.key, draft); setEditing(false); }} className="bg-slate-900 text-white hover:bg-slate-800">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </Button>
              <Button size="sm" variant="outline" onClick={() => { setDraft(setting.value ?? ""); setEditing(false); }} className="border-slate-250">
                Cancel
              </Button>
            </>
          ) : (
            <>
              <span className="text-[12px] font-mono text-slate-600 truncate flex-1 text-right">
                {setting.value ? (setting.key.includes("key") ? "•••••" : setting.value) : <span className="italic text-slate-400">empty</span>}
              </span>
              <Button size="sm" variant="outline" onClick={() => setEditing(true)} className="border-slate-250 active:scale-[0.98]">
                <KeyRound className="w-3.5 h-3.5 mr-1" /> Edit
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminSettings;
