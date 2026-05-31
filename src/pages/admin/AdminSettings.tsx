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

const CATEGORY_META: Record<string, { label: string; icon: typeof Settings; color: string }> = {
  seo:      { label: "SEO & meta tags", icon: Search, color: "#D4308E" },
  branding: { label: "Brand & contact", icon: Building2, color: "#FF6A1F" },
  features: { label: "Feature flags", icon: Sparkles, color: "#FF6A1F" },
  billing:  { label: "Billing & payments", icon: CreditCard, color: "#0E8A4B" },
  system:   { label: "System", icon: Server, color: "#3C50E0" },
  marketing_agent: { label: "AI Marketing Agent Config", icon: Sparkles, color: "#8B5CF6" },
  general:  { label: "General", icon: Settings, color: "#B8651A" },
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
        <Loader2 className="w-6 h-6 animate-spin text-[#FF6A1F]" />
      </div>
    );
  }

  return (
    <div className="px-6 lg:px-10 py-6 max-w-4xl">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#B8651A] to-[#7A4A00] text-white flex items-center justify-center shadow-md">
          <Settings className="w-6 h-6" strokeWidth={2.5} />
        </div>
        <div>
          <h1 className="text-[26px] font-black tracking-tight">Admin settings</h1>
          <p className="text-[12px] text-foreground/70 font-medium">
            Feature flags · Razorpay mode · system toggles. Super admin only. Every change is audited.
          </p>
        </div>
      </div>

      {Object.entries(grouped).map(([category, settings]) => {
        const meta = CATEGORY_META[category] ?? CATEGORY_META.general;
        const Icon = meta.icon;
        return (
          <div key={category} className="mb-6">
            <div className="flex items-center gap-2.5 mb-3 px-1">
              <div className="w-9 h-9 rounded-xl text-white flex items-center justify-center shadow-md" style={{ background: meta.color }}>
                <Icon className="w-4 h-4" strokeWidth={2.5} />
              </div>
              <h2 className="text-[15px] font-black tracking-tight">{meta.label}</h2>
            </div>

            <div className="bg-white border-2 border-[#E8B968] rounded-2xl shadow-[0_4px_0_0_#E8B968] overflow-hidden">
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

      <div className="mt-6 p-4 rounded-2xl bg-[#FFF1D6] border-2 border-[#E8B968] text-[12px] font-semibold">
        <p className="flex items-center gap-2 text-[#B8651A] font-extrabold uppercase tracking-wider mb-1">
          <AlertTriangle className="w-3.5 h-3.5" /> Heads up
        </p>
        <p className="text-foreground/80 leading-relaxed">
          Toggling <code className="bg-white px-1 rounded font-mono">maintenance_mode</code> immediately shows a
          maintenance screen to every customer on <code className="bg-white px-1 rounded font-mono">/app</code>.
          Toggling <code className="bg-white px-1 rounded font-mono">razorpay_live_mode</code> switches refunds and
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
      <div className={`px-4 py-4 ${isLast ? "" : "border-b border-[#E8B968]/40"}`}>
        <div className="flex items-center justify-between gap-4 mb-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-[13px] font-extrabold font-mono text-[#8B5CF6]">{setting.key}</p>
            </div>
            {setting.description && (
              <p className="text-[11px] text-foreground/70 font-medium mt-1 leading-relaxed">{setting.description}</p>
            )}
          </div>
          {!editing && (
            <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
              <KeyRound className="w-3.5 h-3.5" /> Edit
            </Button>
          )}
        </div>

        {editing ? (
          <div className="mt-3 space-y-3">
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Enter instructions..."
              className="min-h-[200px] text-[12px] font-mono leading-relaxed focus-visible:ring-[#8B5CF6] border-2 border-[#E8B968]"
              autoFocus
            />
            <div className="flex items-center gap-2">
              <Button size="sm" className="bg-[#8B5CF6] hover:bg-[#7c4ee4] text-white" onClick={() => { onUpdate(setting.key, draft); setEditing(false); }}>
                <CheckCircle2 className="w-3.5 h-3.5" /> Save changes
              </Button>
              <Button size="sm" variant="outline" onClick={() => { setDraft(setting.value ?? ""); setEditing(false); }}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="mt-2">
            {setting.value ? (
              <pre className="text-[11px] font-mono text-foreground/70 bg-slate-50/50 p-3 rounded-xl border border-slate-200/80 max-h-36 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                {setting.value}
              </pre>
            ) : (
              <span className="text-[11px] italic opacity-50">empty</span>
            )}
            {setting.updatedAt && (
              <p className="text-[10px] text-foreground/50 mt-1.5 font-medium">
                Last updated {new Date(setting.updatedAt).toLocaleString("en-IN")}
              </p>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`flex items-center justify-between gap-4 px-4 py-4 ${isLast ? "" : "border-b border-[#E8B968]/40"} ${danger && isOn ? "bg-[#FCE5F0]/30" : ""}`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-[13px] font-extrabold font-mono">{setting.key}</p>
          {danger && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-[#FCE5F0] text-[#D4308E] text-[9px] font-extrabold uppercase tracking-wider">
              <AlertTriangle className="w-2.5 h-2.5" /> Sensitive
            </span>
          )}
        </div>
        {setting.description && (
          <p className="text-[11px] text-foreground/70 font-medium mt-1 leading-relaxed">{setting.description}</p>
        )}
        {setting.updatedAt && (
          <p className="text-[10px] text-foreground/50 mt-1 font-medium">
            Last updated {new Date(setting.updatedAt).toLocaleString("en-IN")}
          </p>
        )}
      </div>

      {isToggle ? (
        <div className="flex items-center gap-3">
          <span className={`text-[11px] font-extrabold uppercase tracking-wider ${isOn ? "text-[#0E8A4B]" : "text-foreground/50"}`}>
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
                className="h-9 text-[12px] font-mono"
                autoFocus
              />
              <Button size="sm" onClick={() => { onUpdate(setting.key, draft); setEditing(false); }}>
                <CheckCircle2 className="w-3.5 h-3.5" />
              </Button>
              <Button size="sm" variant="outline" onClick={() => { setDraft(setting.value ?? ""); setEditing(false); }}>
                Cancel
              </Button>
            </>
          ) : (
            <>
              <span className="text-[12px] font-mono text-foreground/70 truncate flex-1 text-right">
                {setting.value ? (setting.key.includes("key") ? "•••••" : setting.value) : <span className="italic opacity-50">empty</span>}
              </span>
              <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
                <KeyRound className="w-3.5 h-3.5" /> Edit
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminSettings;
