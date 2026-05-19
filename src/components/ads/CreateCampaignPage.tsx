/**
 * Full-page campaign creation flow — replaces the cramped dialog with a
 * 3-step wizard + live preview, modeled after Meta Ads Manager and Google
 * Ads' new-campaign experience.
 *
 * Route: /app/ads/new
 * On success → POST /api/ads/campaigns → navigate back to /app/ads
 */

import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft, ArrowRight, Sparkles, MessageCircle, Users, ShoppingBag, ArrowUpRight,
  Heart, Tag, IndianRupee, Loader2, CheckCircle2, Target, Megaphone, Brain,
  Eye, Clock, MapPin, Languages, ChevronRight, Info, Zap, Globe,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";

const OBJECTIVES = [
  { id: "ctw", meta: "MESSAGES", label: "Click-to-WhatsApp", desc: "Lead chats start in your inbox · best for Indian SMBs", icon: MessageCircle, badge: "AI pick", est: "₹2-3 per chat" },
  { id: "leads", meta: "OUTCOME_LEADS", label: "Lead form", desc: "Native form, low friction", icon: Users, est: "₹5-8 per lead" },
  { id: "sales", meta: "OUTCOME_SALES", label: "Sales / Purchases", desc: "Conversion-optimised — pixel events required", icon: ShoppingBag, est: "Depends on AOV" },
  { id: "traffic", meta: "OUTCOME_TRAFFIC", label: "Traffic", desc: "Send to landing page", icon: ArrowUpRight, est: "₹0.50-2 per click" },
  { id: "engagement", meta: "OUTCOME_ENGAGEMENT", label: "Engagement", desc: "Reactions, comments, follows", icon: Heart, est: "₹0.30-1 per engagement" },
  { id: "catalog", meta: "OUTCOME_SALES", label: "Catalog retarget", desc: "Dynamic product ads — needs catalog feed", icon: Tag, est: "8-12x ROAS typical" },
] as const;

const BUDGET_PRESETS = ["500", "1000", "2500", "5000", "10000"] as const;

const LOCATIONS = [
  { id: "all-india", label: "All India · 1.4B reach" },
  { id: "tier1", label: "Tier-1 cities (Bombay, Delhi, Bangalore, Chennai, Hyderabad)" },
  { id: "tier2", label: "Tier-2 cities (Indore, Ranchi, Jaipur, Lucknow, Pune…)" },
  { id: "ranchi", label: "Ranchi + 50km radius" },
  { id: "custom", label: "Custom — pick states/cities" },
];

const LANGUAGES = [
  { id: "hi", label: "Hindi" },
  { id: "en-IN", label: "English (India)" },
  { id: "all-india", label: "All Indian languages (Hi, En, Bn, Te, Ta, Mr, Gu, Kn, Ml, Pa, Or)" },
];

const compactNum = (n: number) => {
  if (n >= 1_00_00_000) return `${(n / 1_00_00_000).toFixed(1)} Cr`;
  if (n >= 1_00_000) return `${(n / 1_00_000).toFixed(1)} L`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
};

export const CreateCampaignPage = () => {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const connectionQ = useQuery({ queryKey: ["ads", "connection"], queryFn: () => api.getAdsConnection() });
  const audiencesQ = useQuery({ queryKey: ["ads", "audiences"], queryFn: () => api.listAdAudiences() });
  const audiences = audiencesQ.data?.audiences ?? [];

  const [step, setStep] = useState(1);
  const [objective, setObjective] = useState<typeof OBJECTIVES[number]["id"]>("ctw");
  const [name, setName] = useState("");
  const [audience, setAudience] = useState<string>("");
  const [location, setLocation] = useState("tier2");
  const [language, setLanguage] = useState("hi");
  const [budget, setBudget] = useState("1000");
  const [optimizeAI, setOptimizeAI] = useState(true);
  const [launchPaused, setLaunchPaused] = useState(true);

  const isConnected = connectionQ.data?.connected ?? false;

  const create = useMutation({
    mutationFn: () => {
      const objMeta = OBJECTIVES.find((o) => o.id === objective)?.meta ?? "MESSAGES";
      return api.createAdCampaign({
        name: name.trim(),
        objective: objMeta,
        daily_budget_inr: Number(budget),
        status: launchPaused ? "PAUSED" : "ACTIVE",
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ads", "campaigns"] });
      toast.success(`Campaign "${name}" created${launchPaused ? " (paused — review in Meta Ads Manager)" : " and launched"}`);
      navigate("/app/ads");
    },
    onError: (e) => toast.error(String(e)),
  });

  const objectiveObj = OBJECTIVES.find((o) => o.id === objective)!;
  const dailySpend = Number(budget) || 0;
  const weeklySpend = dailySpend * 7;
  const monthlySpend = dailySpend * 30;
  const estReachLow = Math.round(dailySpend * 12);
  const estReachHigh = Math.round(dailySpend * 28);
  const estResultsLow = Math.round(dailySpend / 3.5);
  const estResultsHigh = Math.round(dailySpend / 1.8);

  const stepValid = (s: number) => {
    if (s === 1) return !!objective;
    if (s === 2) return name.trim().length >= 3;
    if (s === 3) return Number(budget) >= 100;
    return false;
  };

  const goNext = () => {
    if (!stepValid(step)) {
      toast.error(
        step === 1 ? "Pehle ek objective select karein" :
        step === 2 ? "Campaign ka naam kam se kam 3 letters ka hona chahiye" :
        "Daily budget ₹100 ya zyada hona chahiye"
      );
      return;
    }
    if (step < 3) setStep(step + 1);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#FFF6E8]">
      {/* ─────── Top bar ─────── */}
      <div className="border-b-2 border-[#E8B968] bg-white px-6 lg:px-10 py-3 flex items-center gap-3 sticky top-0 z-20">
        <button
          onClick={() => navigate("/app/ads")}
          className="w-9 h-9 rounded-xl bg-[#FFF1D6] border-2 border-[#E8B968] flex items-center justify-center hover:bg-[#FFE8C7] transition flex-shrink-0"
          aria-label="Back"
        >
          <ArrowLeft className="w-4 h-4 text-[#B8651A]" strokeWidth={2.5} />
        </button>
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#FF6A1F] to-[#E85C12] text-white flex items-center justify-center shadow-md flex-shrink-0">
          <Megaphone className="w-5 h-5" strokeWidth={2.5} />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-[18px] font-black tracking-tight leading-tight">Naya campaign banaiye</h1>
          <p className="text-[11px] text-foreground/60 font-medium">Meta Marketing API · campaign defaults to paused so you can review</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => navigate("/app/ads")}>Cancel</Button>
      </div>

      {/* ─────── Step tracker ─────── */}
      <div className="bg-white border-b border-[#E8B968]/40 px-6 lg:px-10 py-3 flex items-center gap-2 sticky top-[64px] z-10">
        {[
          { n: 1, label: "Objective" },
          { n: 2, label: "Audience & creative" },
          { n: 3, label: "Budget & review" },
        ].map((s, i) => (
          <div key={s.n} className="flex items-center gap-2 flex-1">
            <button
              onClick={() => { if (s.n < step) setStep(s.n); }}
              className={cn(
                "flex items-center gap-2 flex-1 px-3 py-2 rounded-xl border-2 transition-all text-left",
                step === s.n && "border-[#FF6A1F] bg-[#FFEFE0] shadow-[0_2px_0_0_#B8420A]",
                step > s.n && "border-[#0E8A4B]/40 bg-[#E6F7EE] cursor-pointer hover:bg-[#D2F1DF]",
                step < s.n && "border-[#E8B968]/60 bg-white opacity-60",
              )}
            >
              <span className={cn(
                "w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-extrabold flex-shrink-0",
                step === s.n && "bg-[#FF6A1F] text-white",
                step > s.n && "bg-[#0E8A4B] text-white",
                step < s.n && "bg-[#FFF1D6] text-[#B8651A] border border-[#E8B968]",
              )}>
                {step > s.n ? <CheckCircle2 className="w-3.5 h-3.5" strokeWidth={3} /> : s.n}
              </span>
              <span className="text-[12px] font-extrabold tracking-tight truncate">{s.label}</span>
            </button>
            {i < 2 && <ChevronRight className="w-4 h-4 text-foreground/30 flex-shrink-0" />}
          </div>
        ))}
      </div>

      {/* ─────── Connection / demo warning ─────── */}
      {!connectionQ.isPending && !isConnected && (
        <div className="bg-[#FFF1D6] border-b-2 border-[#E8B968] px-6 lg:px-10 py-2.5 flex items-center gap-3 text-[12px]">
          <Info className="w-4 h-4 text-[#B8651A] flex-shrink-0" />
          <p className="font-medium text-foreground/80">
            Meta Ads connected nahi hai — yeh form draft ki tarah kaam karega. Connect karne ke baad campaign Meta pe create hoga.
          </p>
        </div>
      )}

      {/* ─────── Body: form (left) + preview (right) ─────── */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-10 py-6 grid lg:grid-cols-[1fr_360px] gap-6">
          {/* ─── FORM COLUMN ─── */}
          <div className="space-y-4 min-w-0">
            {step === 1 && <StepObjective objective={objective} setObjective={setObjective} />}
            {step === 2 && (
              <StepAudience
                name={name}
                setName={setName}
                audience={audience}
                setAudience={setAudience}
                location={location}
                setLocation={setLocation}
                language={language}
                setLanguage={setLanguage}
                audiences={audiences}
                audiencesLoading={audiencesQ.isPending}
                objectiveObj={objectiveObj}
              />
            )}
            {step === 3 && (
              <StepBudget
                budget={budget}
                setBudget={setBudget}
                optimizeAI={optimizeAI}
                setOptimizeAI={setOptimizeAI}
                launchPaused={launchPaused}
                setLaunchPaused={setLaunchPaused}
                name={name}
                objectiveObj={objectiveObj}
                audienceName={audiences.find((a) => a.id === audience)?.name ?? "Auto-targeted"}
                location={LOCATIONS.find((l) => l.id === location)?.label ?? ""}
                language={LANGUAGES.find((l) => l.id === language)?.label ?? ""}
              />
            )}
          </div>

          {/* ─── PREVIEW COLUMN (sticky) ─── */}
          <div className="lg:sticky lg:top-[140px] lg:self-start space-y-4">
            <PreviewCard
              objectiveObj={objectiveObj}
              name={name}
              budget={budget}
              dailySpend={dailySpend}
              weeklySpend={weeklySpend}
              monthlySpend={monthlySpend}
              estReachLow={estReachLow}
              estReachHigh={estReachHigh}
              estResultsLow={estResultsLow}
              estResultsHigh={estResultsHigh}
              optimizeAI={optimizeAI}
            />
            {step === 3 && optimizeAI && <AISuggestionsCard objective={objective} budget={budget} />}
          </div>
        </div>
      </div>

      {/* ─────── Sticky bottom action bar ─────── */}
      <div className="border-t-2 border-[#E8B968] bg-white px-6 lg:px-10 py-3 flex items-center gap-3 flex-wrap sticky bottom-0 z-20">
        <div className="text-[11px] text-foreground/60 font-medium flex-1 min-w-0 truncate">
          Step {step} of 3 · {step === 1 ? "Pick what you want to optimise for" : step === 2 ? "Tell Meta who should see this" : "Set spend + go live"}
        </div>
        {step > 1 && (
          <Button variant="outline" onClick={() => setStep(step - 1)}>
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </Button>
        )}
        {step < 3 ? (
          <Button onClick={goNext}>
            Continue <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        ) : (
          <Button
            disabled={create.isPending || !isConnected || !stepValid(3) || !stepValid(2)}
            onClick={() => create.mutate()}
          >
            {create.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            {launchPaused ? "Create campaign (paused)" : "Launch now"}
          </Button>
        )}
      </div>
    </div>
  );
};

/* ─────────────────────────── STEP 1: Objective ─────────────────────────── */

const StepObjective = ({
  objective, setObjective,
}: { objective: string; setObjective: (v: typeof OBJECTIVES[number]["id"]) => void }) => (
  <>
    <SectionHeader
      icon={Target}
      iconBg="bg-[#FF6A1F]"
      title="Aapka goal kya hai?"
      subtitle="Meta is field se decide karta hai ki ad kisko dikhana hai · sahi objective = saste results"
    />
    <div className="grid sm:grid-cols-2 gap-3">
      {OBJECTIVES.map((o) => (
        <button
          key={o.id}
          onClick={() => setObjective(o.id)}
          className={cn(
            "relative p-4 rounded-2xl border-2 text-left transition-all",
            objective === o.id
              ? "border-[#FF6A1F] bg-[#FFEFE0] shadow-[0_4px_0_0_#B8420A]"
              : "border-[#E8B968] bg-white hover:bg-[#FFF6E8] shadow-[0_3px_0_0_#E8B968]"
          )}
        >
          {o.badge && (
            <span className="absolute -top-2 right-3 px-1.5 py-0.5 rounded-full bg-[#FFD23F] text-[#7A4A00] text-[9px] font-extrabold uppercase tracking-wider">
              {o.badge}
            </span>
          )}
          <div className="flex items-start gap-3 mb-2">
            <div className={cn(
              "w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0",
              objective === o.id ? "bg-[#FF6A1F] text-white" : "bg-[#FFF1D6] text-[#B8651A]"
            )}>
              <o.icon className="w-5 h-5" strokeWidth={2.5} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-black tracking-tight">{o.label}</p>
              <p className="text-[11px] text-foreground/60 font-medium mt-0.5">{o.desc}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 mt-2 px-2 py-1 rounded-md bg-white/60 border border-[#E8B968]/40 w-fit">
            <Zap className="w-3 h-3 text-[#0E8A4B]" />
            <span className="text-[10px] font-extrabold text-[#0A6E3C] tabular-nums">Typical: {o.est}</span>
          </div>
        </button>
      ))}
    </div>
  </>
);

/* ─────────────────────────── STEP 2: Audience ─────────────────────────── */

const StepAudience = ({
  name, setName, audience, setAudience, location, setLocation, language, setLanguage,
  audiences, audiencesLoading, objectiveObj,
}: {
  name: string;
  setName: (v: string) => void;
  audience: string;
  setAudience: (v: string) => void;
  location: string;
  setLocation: (v: string) => void;
  language: string;
  setLanguage: (v: string) => void;
  audiences: Array<{ id: string; name: string; size: number; type: string }>;
  audiencesLoading: boolean;
  objectiveObj: typeof OBJECTIVES[number];
}) => (
  <>
    <SectionHeader
      icon={Users}
      iconBg="bg-[#3C50E0]"
      title="Audience aur creative"
      subtitle={`${objectiveObj.label} campaign — yahi audience ko ad dikhega`}
    />

    {/* Campaign name */}
    <Card>
      <Label htmlFor="cc-name" className="text-[11px] uppercase tracking-[0.15em] text-[#B8651A] font-extrabold">
        Campaign ka naam
      </Label>
      <Input
        id="cc-name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="e.g. Diwali Sale · CTW Ads · Ranchi"
        className="mt-1.5"
        autoFocus
      />
      <p className="text-[11px] text-foreground/60 font-medium mt-1.5">
        Sirf aapko dikhega — customers ko nahi. Internal tracking ke liye hai.
      </p>
    </Card>

    {/* Audience */}
    <Card>
      <Label className="text-[11px] uppercase tracking-[0.15em] text-[#B8651A] font-extrabold">
        Audience (Custom / Lookalike / Saved)
      </Label>
      <p className="text-[11px] text-foreground/60 font-medium mt-1 mb-2.5">
        Existing audiences Meta se aate hain. Empty hai? Pehle Audiences tab pe banao.
      </p>
      <Select value={audience} onValueChange={setAudience}>
        <SelectTrigger>
          <SelectValue placeholder={audiencesLoading ? "Loading…" : audiences.length === 0 ? "Koi audience nahi — pehle banao" : "Audience select karein"} />
        </SelectTrigger>
        <SelectContent>
          {audiences.map((a) => (
            <SelectItem key={a.id} value={a.id}>
              <span className="flex items-center gap-2">
                <span className="font-bold">{a.name}</span>
                <span className="text-foreground/60 text-[11px]">· {compactNum(a.size)} · {a.type}</span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Card>

    {/* Location */}
    <Card>
      <Label className="text-[11px] uppercase tracking-[0.15em] text-[#B8651A] font-extrabold flex items-center gap-1.5">
        <MapPin className="w-3.5 h-3.5" /> Location
      </Label>
      <div className="grid grid-cols-1 gap-2 mt-2">
        {LOCATIONS.map((l) => (
          <button
            key={l.id}
            onClick={() => setLocation(l.id)}
            className={cn(
              "px-3 py-2.5 rounded-xl border-2 text-left transition-all text-[12px] font-bold",
              location === l.id
                ? "border-[#3C50E0] bg-[#E4E8FF] text-[#2533A8]"
                : "border-[#E8B968] bg-white hover:bg-[#FFF6E8]"
            )}
          >
            {l.label}
          </button>
        ))}
      </div>
    </Card>

    {/* Language */}
    <Card>
      <Label className="text-[11px] uppercase tracking-[0.15em] text-[#B8651A] font-extrabold flex items-center gap-1.5">
        <Languages className="w-3.5 h-3.5" /> Language
      </Label>
      <div className="flex gap-2 flex-wrap mt-2">
        {LANGUAGES.map((l) => (
          <button
            key={l.id}
            onClick={() => setLanguage(l.id)}
            className={cn(
              "px-3 py-2 rounded-xl border-2 text-[12px] font-extrabold transition-all",
              language === l.id
                ? "border-[#0E8A4B] bg-[#E6F7EE] text-[#0A6E3C]"
                : "border-[#E8B968] bg-white hover:bg-[#FFF6E8]"
            )}
          >
            {l.label}
          </button>
        ))}
      </div>
    </Card>
  </>
);

/* ─────────────────────────── STEP 3: Budget & Review ─────────────────────────── */

const StepBudget = ({
  budget, setBudget, optimizeAI, setOptimizeAI, launchPaused, setLaunchPaused,
  name, objectiveObj, audienceName, location, language,
}: {
  budget: string;
  setBudget: (v: string) => void;
  optimizeAI: boolean;
  setOptimizeAI: (v: boolean) => void;
  launchPaused: boolean;
  setLaunchPaused: (v: boolean) => void;
  name: string;
  objectiveObj: typeof OBJECTIVES[number];
  audienceName: string;
  location: string;
  language: string;
}) => (
  <>
    <SectionHeader
      icon={IndianRupee}
      iconBg="bg-[#0E8A4B]"
      title="Budget aur final review"
      subtitle="Daily budget set karo, AI optimization on rakho, aur campaign launch karo"
    />

    {/* Budget */}
    <Card>
      <Label htmlFor="cc-budget" className="text-[11px] uppercase tracking-[0.15em] text-[#B8651A] font-extrabold">
        Daily budget (₹)
      </Label>
      <div className="relative mt-2">
        <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#FF6A1F]" />
        <Input
          id="cc-budget"
          type="number"
          value={budget}
          onChange={(e) => setBudget(e.target.value)}
          min={100}
          step={100}
          className="pl-9 text-lg font-extrabold tabular-nums"
        />
      </div>
      <div className="flex gap-1.5 mt-2 flex-wrap">
        {BUDGET_PRESETS.map((p) => (
          <button
            key={p}
            onClick={() => setBudget(p)}
            className={cn(
              "px-3 py-1.5 rounded-full text-[12px] font-extrabold border-2 transition-all tabular-nums",
              budget === p
                ? "bg-[#FF6A1F] text-white border-[#B8420A]"
                : "bg-white text-foreground/70 border-[#E8B968] hover:bg-[#FFF1D6]"
            )}
          >
            ₹{Number(p).toLocaleString("en-IN")}
          </button>
        ))}
      </div>
      <p className="text-[11px] text-foreground/60 font-medium mt-2">
        Minimum ₹100/day. Meta is amount tak hi spend karega — over-spending nahi hogi.
      </p>
    </Card>

    {/* AI optimization */}
    <Card className="bg-[#FFF1D6] border-[#E8B968]">
      <div className="flex items-center gap-3">
        <Switch checked={optimizeAI} onCheckedChange={setOptimizeAI} />
        <div className="flex-1">
          <p className="text-[13px] font-extrabold flex items-center gap-1.5">
            <Brain className="w-3.5 h-3.5 text-[#FF6A1F]" />
            Addison AI ko optimize karne dein
          </p>
          <p className="text-[11px] text-foreground/70 font-medium mt-0.5">
            Budget, bid, creatives auto-adjust honge har 6 ghante mein, performance ke base pe
          </p>
        </div>
      </div>
    </Card>

    {/* Launch mode */}
    <Card className={launchPaused ? "bg-white" : "bg-[#E6F7EE] border-[#0E8A4B]"}>
      <div className="flex items-center gap-3">
        <Switch checked={!launchPaused} onCheckedChange={(v) => setLaunchPaused(!v)} />
        <div className="flex-1">
          <p className="text-[13px] font-extrabold">
            {launchPaused ? "Create as paused (recommended)" : "Launch immediately"}
          </p>
          <p className="text-[11px] text-foreground/70 font-medium mt-0.5">
            {launchPaused
              ? "Campaign create ho jayega lekin chalega nahi · Meta Ads Manager me review karke ON karein"
              : "⚠️ Ad turant chalu ho jaayegi aur paise spend hone shuru ho jayenge"}
          </p>
        </div>
      </div>
    </Card>

    {/* Final review summary */}
    <Card>
      <p className="text-[11px] uppercase tracking-[0.15em] text-[#B8651A] font-extrabold mb-3">Review summary</p>
      <div className="space-y-2">
        <ReviewRow label="Objective" value={objectiveObj.label} icon={objectiveObj.icon} />
        <ReviewRow label="Campaign name" value={name || "—"} />
        <ReviewRow label="Audience" value={audienceName} />
        <ReviewRow label="Location" value={location} />
        <ReviewRow label="Language" value={language} />
        <ReviewRow label="Daily budget" value={`₹${Number(budget).toLocaleString("en-IN")}`} />
      </div>
    </Card>
  </>
);

/* ─────────────────────────── Building blocks ─────────────────────────── */

const SectionHeader = ({
  icon: Icon, iconBg, title, subtitle,
}: { icon: typeof Target; iconBg: string; title: string; subtitle: string }) => (
  <div className="flex items-start gap-3 mb-1">
    <div className={cn("w-12 h-12 rounded-2xl text-white flex items-center justify-center shadow-md flex-shrink-0", iconBg)}>
      <Icon className="w-6 h-6" strokeWidth={2.5} />
    </div>
    <div className="flex-1 min-w-0">
      <h2 className="text-[20px] font-black tracking-tight">{title}</h2>
      <p className="text-[12px] text-foreground/70 font-medium mt-0.5">{subtitle}</p>
    </div>
  </div>
);

const Card = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={cn("bg-white border-2 border-[#E8B968] rounded-2xl p-4 shadow-[0_3px_0_0_#E8B968]", className)}>
    {children}
  </div>
);

const ReviewRow = ({ label, value, icon: Icon }: { label: string; value: string; icon?: typeof Target }) => (
  <div className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-[#FFF6E8] border border-[#E8B968]/40">
    <span className="text-[10px] uppercase tracking-[0.12em] text-[#B8651A] font-extrabold flex items-center gap-1.5 flex-shrink-0">
      {Icon && <Icon className="w-3 h-3" />}
      {label}
    </span>
    <span className="text-[13px] font-extrabold text-right truncate">{value}</span>
  </div>
);

const PreviewCard = ({
  objectiveObj, name, budget, dailySpend, weeklySpend, monthlySpend,
  estReachLow, estReachHigh, estResultsLow, estResultsHigh, optimizeAI,
}: {
  objectiveObj: typeof OBJECTIVES[number];
  name: string;
  budget: string;
  dailySpend: number;
  weeklySpend: number;
  monthlySpend: number;
  estReachLow: number;
  estReachHigh: number;
  estResultsLow: number;
  estResultsHigh: number;
  optimizeAI: boolean;
}) => (
  <div className="bg-gradient-to-br from-[#0A3D24] to-[#0D4E2E] text-white rounded-2xl border-2 border-[#0A3D24] shadow-[0_4px_0_0_#072917] p-5 relative overflow-hidden">
    <div
      className="absolute inset-0 opacity-10 pointer-events-none"
      style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "20px 20px" }}
    />
    <div className="relative">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-9 h-9 rounded-lg bg-[#FFD23F] text-[#7A4A00] flex items-center justify-center">
          <Eye className="w-4 h-4" strokeWidth={2.5} />
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-[0.18em] text-[#FFD23F] font-extrabold">Live estimate</p>
          <p className="text-[13px] font-extrabold">{name || "Naya campaign"}</p>
        </div>
      </div>

      <PreviewStat label="Per day" value={`₹${dailySpend.toLocaleString("en-IN")}`} />
      <PreviewStat label="Per week" value={`₹${weeklySpend.toLocaleString("en-IN")}`} />
      <PreviewStat label="Per month" value={`₹${monthlySpend.toLocaleString("en-IN")}`} />

      <div className="border-t border-white/15 my-3" />

      <div>
        <p className="text-[10px] uppercase tracking-[0.15em] text-[#FFD23F] font-extrabold mb-1.5">Expected reach</p>
        <p className="text-2xl font-black tracking-tight">
          {compactNum(estReachLow)}<span className="opacity-60 mx-1">–</span>{compactNum(estReachHigh)}
          <span className="text-[11px] opacity-70 font-medium ml-1">people</span>
        </p>
      </div>
      <div className="mt-3">
        <p className="text-[10px] uppercase tracking-[0.15em] text-[#FFD23F] font-extrabold mb-1.5">Expected {objectiveObj.label.toLowerCase()} results</p>
        <p className="text-2xl font-black tracking-tight tabular-nums">
          {estResultsLow}<span className="opacity-60 mx-1">–</span>{estResultsHigh}
          <span className="text-[11px] opacity-70 font-medium ml-1">/ day</span>
        </p>
      </div>

      {optimizeAI && (
        <div className="mt-3 px-3 py-2 rounded-lg bg-white/10 border border-white/20 flex items-center gap-2">
          <Brain className="w-3.5 h-3.5 text-[#FFD23F]" />
          <p className="text-[11px] font-extrabold">Addison AI active — performance auto-tuned</p>
        </div>
      )}
    </div>
  </div>
);

const PreviewStat = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-center justify-between py-1">
    <span className="text-[11px] uppercase tracking-[0.12em] text-white/60 font-extrabold">{label}</span>
    <span className="text-[14px] font-black tabular-nums">{value}</span>
  </div>
);

const AISuggestionsCard = ({ objective, budget }: { objective: string; budget: string }) => {
  const suggestions = useMemo(() => {
    const out: string[] = [];
    if (Number(budget) < 1000) out.push("Budget ₹1,000+ rakho — Meta ko learn karne ke liye chahiye");
    if (objective === "ctw") out.push("WhatsApp template approve karwa lo — pehli reply isi se jaayegi");
    if (objective === "leads") out.push("Form ke 2-3 fields hi rakho — har extra field 15% drop-off karta hai");
    out.push("Pehle 3 din ko 'learning phase' samjho — results din 4 se settle hote hain");
    return out;
  }, [objective, budget]);

  return (
    <div className="bg-white border-2 border-[#FFD23F] rounded-2xl p-4 shadow-[0_3px_0_0_#E8B400]">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 rounded-lg bg-[#FFD23F] text-[#7A4A00] flex items-center justify-center">
          <Brain className="w-4 h-4" strokeWidth={2.5} />
        </div>
        <p className="text-[11px] uppercase tracking-[0.15em] text-[#7A4A00] font-extrabold">AI tips</p>
      </div>
      <ul className="space-y-1.5">
        {suggestions.map((s, i) => (
          <li key={i} className="flex items-start gap-1.5 text-[12px] font-medium">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#0E8A4B] flex-shrink-0 mt-0.5" strokeWidth={3} />
            <span>{s}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default CreateCampaignPage;
