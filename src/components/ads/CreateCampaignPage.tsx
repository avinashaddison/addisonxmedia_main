/**
 * Full-page campaign creation flow — wired end-to-end against Meta Marketing API.
 *
 * Route: /app/ads/new
 *
 * What's "real" (not dummy) here:
 *  - Location picker hits POST /api/ads/targeting/search → Meta's geo taxonomy
 *  - Reach + results estimate hits POST /api/ads/estimate → Meta delivery_estimate
 *  - Audience dropdown reads /api/ads/audiences → Meta custom audiences
 *  - Page picker reads /api/ads/pages → Meta /me/accounts
 *  - WhatsApp number for CTW autofills from meta_config
 *  - Submit creates Campaign → AdSet → AdCreative → Ad atomically (with rollback)
 */

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft, ArrowRight, Sparkles, MessageCircle, Users, ShoppingBag, ArrowUpRight,
  Heart, Tag, IndianRupee, Loader2, CheckCircle2, Target, Megaphone, Brain,
  Eye, MapPin, Languages, ChevronRight, Info, Zap, X, Image as ImageIcon,
  Search, FileText, Clock, ThumbsUp, MessageSquare, Share2, MoreHorizontal,
  Globe,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { CreateAudienceDialog } from "./CreateAudienceDialog";
import { AdMediaInput } from "./AdMediaInput";

// Meta's ODAX taxonomy (Oct 2023+).
//
// "Click-to-WhatsApp" mode in this app uses OUTCOME_TRAFFIC + wa.me link
// instead of OUTCOME_ENGAGEMENT + destination_type:"WHATSAPP". Why:
// the native CTW path requires a WhatsApp Business Account to be linked to
// your FB Page AND owned by the same Business Manager — a 5-step setup
// inside business.facebook.com that most SMBs haven't completed. The
// traffic-to-wa.me approach has identical end-user UX (clicking the ad
// opens WhatsApp with your number pre-filled) but bypasses every WABA-Page
// linkage validation. Slightly worse tracking on Meta's side; identical
// for the business owner reading conversations in our inbox.
const OBJECTIVES = [
  { id: "ctw",        meta: "OUTCOME_TRAFFIC",    destinationType: undefined, label: "Click-to-WhatsApp",  desc: "Ad click opens WhatsApp · works with any FB Page",       icon: MessageCircle,  badge: "AI pick",  est: "₹2-3 per chat",          cta: "LEARN_MORE" },
  { id: "leads",      meta: "OUTCOME_LEADS",      destinationType: undefined, label: "Lead form",          desc: "Native form, low friction",                              icon: Users,          est: "₹5-8 per lead",          cta: "SIGN_UP" },
  { id: "sales",      meta: "OUTCOME_SALES",      destinationType: undefined, label: "Sales / Purchases",  desc: "Conversion-optimised — pixel events required",           icon: ShoppingBag,    est: "Depends on AOV",         cta: "SHOP_NOW" },
  { id: "traffic",    meta: "OUTCOME_TRAFFIC",    destinationType: undefined, label: "Traffic",            desc: "Send to landing page",                                   icon: ArrowUpRight,   est: "₹0.50-2 per click",      cta: "LEARN_MORE" },
  { id: "engagement", meta: "OUTCOME_ENGAGEMENT", destinationType: undefined, label: "Engagement",         desc: "Reactions, comments, follows",                           icon: Heart,          est: "₹0.30-1 per engagement", cta: "LIKE_PAGE" },
  { id: "catalog",    meta: "OUTCOME_SALES",      destinationType: undefined, label: "Catalog retarget",   desc: "Dynamic product ads — needs catalog feed",               icon: Tag,            est: "8-12x ROAS typical",     cta: "SHOP_NOW" },
] as const;
type ObjectiveId = typeof OBJECTIVES[number]["id"];

const BUDGET_PRESETS = ["500", "1000", "2500", "5000", "10000"] as const;

// Only country-code presets are safe to hardcode (ISO codes are stable).
// Region IDs are Meta-internal and not documented — they must come from
// the live targeting/search API. The earlier hardcoded Tier-1/Tier-2 IDs
// were guesses that Meta rejected with "Invalid regions". For city-level
// targeting use the "Custom — search cities" mode below.
const LOCATION_PRESETS = [
  { id: "all-india",   label: "All India · 1.4B reach", country_codes: ["IN"] },
];

// Meta locale IDs aren't public-documented and the user-facing language
// filter usually HURTS delivery (it tightens the audience). Geo targeting
// India + Meta's auto-language delivery (it serves the ad in the viewer's
// display language) already covers the intent. Keep the UI for clarity,
// but don't actually send a locales filter.
const LANGUAGE_PRESETS = [
  { id: "hi",        label: "Hindi",                       locales: [] },
  { id: "en-IN",     label: "English (India)",             locales: [] },
  { id: "all-india", label: "All Indian languages",        locales: [] },
];

type GeoChip = { key: string; name: string; type: string; country_code?: string };

const PLACEMENTS = {
  facebook: [
    { id: "feed", label: "Feed" },
    { id: "marketplace", label: "Marketplace" },
    { id: "video_feeds", label: "Video Feeds" },
    { id: "story", label: "Stories" },
    { id: "search", label: "Search" },
    { id: "instream_video", label: "In-Stream Video" },
    { id: "facebook_reels", label: "Reels" },
    { id: "facebook_reels_overlay", label: "Reels Overlay" },
    { id: "right_hand_column", label: "Right Column" },
  ],
  instagram: [
    { id: "stream", label: "Feed" },
    { id: "story", label: "Stories" },
    { id: "explore", label: "Explore" },
    { id: "explore_home", label: "Explore Home" },
    { id: "reels", label: "Reels" },
    { id: "profile_feed", label: "Profile Feed" },
    { id: "ig_search", label: "Search" },
    { id: "profile_reels", label: "Profile Reels" },
  ],
} as const;

const today = () => new Date().toISOString().slice(0, 10);
const plusDays = (d: string, n: number) => {
  const dt = new Date(d);
  dt.setDate(dt.getDate() + n);
  return dt.toISOString().slice(0, 10);
};

const compactNum = (n: number) => {
  if (n >= 1_00_00_000) return `${(n / 1_00_00_000).toFixed(1)} Cr`;
  if (n >= 1_00_000)    return `${(n / 1_00_000).toFixed(1)} L`;
  if (n >= 1_000)       return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
};

const useDebounced = <T,>(value: T, delay = 400) => {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
};

export const CreateCampaignPage = () => {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const connectionQ = useQuery({ queryKey: ["ads", "connection"], queryFn: () => api.getAdsConnection() });
  const audiencesQ  = useQuery({ queryKey: ["ads", "audiences"], queryFn: () => api.listAdAudiences() });
  const pagesQ      = useQuery({ queryKey: ["ads", "pages"], queryFn: () => api.listAdPages() });
  const metaQ       = useQuery({ queryKey: ["meta-config"], queryFn: () => api.getMetaConfig() });
  const preflightQ  = useQuery({ queryKey: ["ads", "preflight"], queryFn: () => api.adsPreflight(), staleTime: 60_000 });

  const isConnected = connectionQ.data?.connected ?? false;
  const audiences   = audiencesQ.data?.audiences ?? [];
  const pages       = pagesQ.data?.pages ?? [];

  const [step, setStep]                 = useState(1);
  const [objective, setObjective]       = useState<ObjectiveId>("ctw");
  const [name, setName]                 = useState("");
  const [audience, setAudience]         = useState<string>("");
  const [createAudienceOpen, setCreateAudienceOpen] = useState(false);
  const [pageId, setPageId]             = useState<string>("");
  const [locationMode, setLocationMode] = useState<"preset" | "custom">("preset");
  const [locationPreset, setLocationPreset] = useState<string>("all-india");
  const [customGeos, setCustomGeos]     = useState<GeoChip[]>([]);
  const [geoQuery, setGeoQuery]         = useState("");
  const [language, setLanguage]         = useState("hi");
  const [budget, setBudget]             = useState("1000");
  const [optimizeAI, setOptimizeAI]     = useState(true);
  const [launchPaused, setLaunchPaused] = useState(true);
  // Demographics
  const [ageMin, setAgeMin]             = useState(18);
  const [ageMax, setAgeMax]             = useState(65);
  const [gender, setGender]             = useState<"all" | "male" | "female">("all");
  // Schedule
  const [startDate, setStartDate]       = useState(today());
  const [hasEndDate, setHasEndDate]     = useState(false);
  const [endDate, setEndDate]           = useState(plusDays(today(), 7));
  // Placements
  const [fbEnabled, setFbEnabled]       = useState(true);
  const [igEnabled, setIgEnabled]       = useState(true);
  const [fbPlacements, setFbPlacements] = useState<string[]>(PLACEMENTS.facebook.map((p) => p.id));
  const [igPlacements, setIgPlacements] = useState<string[]>(PLACEMENTS.instagram.map((p) => p.id));
  // Advanced targeting
  type InterestChip = { id: string; name: string; size?: number };
  const [interestChips, setInterestChips]       = useState<InterestChip[]>([]);
  const [excludedInterests, setExcludedInterests] = useState<InterestChip[]>([]);
  const [interestQuery, setInterestQuery]       = useState("");
  const [excludedInterestQuery, setExcludedInterestQuery] = useState("");
  const [excludedAudienceId, setExcludedAudienceId] = useState<string>("");
  const [targetingExpansion, setTargetingExpansion] = useState(true);
  // Ad creative
  const [adImageUrl, setAdImageUrl]     = useState("");
  const [instagramMediaId, setInstagramMediaId] = useState<string | null>(null);
  const [instagramActorId, setInstagramActorId] = useState<string | null>(null);
  const [creativeType, setCreativeType] = useState<"image" | "video">("image");
  const [adHeadline, setAdHeadline]     = useState("");
  const [adBody, setAdBody]             = useState("");
  const [adLinkUrl, setAdLinkUrl]       = useState("");
  const [icebreaker, setIcebreaker]     = useState("");

  // ── AI Compose state ──────────────────────────────────────────────────
  // The big "describe what you're promoting" textbox at the top of the
  // wizard. One call returns 3 ad-copy variants + targeting + budget
  // suggestions. Clicking a variant auto-fills the wizard.
  const [aiOpen, setAiOpen]             = useState(true);
  const [aiDescription, setAiDescription] = useState("");
  type AiAdCopyResult = Awaited<ReturnType<typeof api.generateAdCopy>>;
  const [aiResult, setAiResult]         = useState<AiAdCopyResult | null>(null);
  const generateAdCopyMut = useMutation({
    mutationFn: (input: { description: string }) =>
      api.generateAdCopy({
        description: input.description,
        objective: objective === "ctw" ? "ctw" : "sales",
        language: language === "en" ? "english" : language === "hi" ? "hindi" : "hinglish",
      }),
    onSuccess: (data) => {
      setAiResult(data);
      toast.success(`Generated 3 ad variants · ₹${data.meta.cost_inr.toFixed(4)} spent`);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "AI generation failed"),
  });
  const applyAiVariant = (v: AiAdCopyResult["variants"][number]) => {
    if (!aiResult) return;
    setName(aiResult.campaign_name);
    setAdHeadline(v.headline);
    setAdBody(v.primary_text);
    setIcebreaker(v.icebreaker);
    setBudget(String(aiResult.budget_inr_daily));
    // Pre-load suggested interests as targeting chips — the customer can
    // refine/remove in Step 2. Each chip needs an id; we use the name itself
    // as a temporary id, then the existing typeahead resolver will replace
    // it with Meta's real interest_id when the customer searches.
    setInterestChips(
      aiResult.targeting_interests.slice(0, 5).map((name) => ({ id: `ai:${name}`, name })),
    );
    toast.success(`Applied "${v.label}" — review in steps 2-3 and launch`);
    // Jump to step 2 so they can review the auto-filled fields
    setStep(2);
  };

  const objectiveObj = OBJECTIVES.find((o) => o.id === objective)!;
  const isCTW = objective === "ctw";

  // Auto-fill page when only one available, and auto-fill WhatsApp destination for CTW
  useEffect(() => {
    if (!pageId && pages.length === 1) setPageId(pages[0].id);
  }, [pages, pageId]);

  useEffect(() => {
    if (isCTW && metaQ.data?.display_phone_number) {
      const digits = metaQ.data.display_phone_number.replace(/\D/g, "");
      if (!digits) return;
      const baseLink = `https://wa.me/${digits}`;
      // Auto-fill the base link if empty
      if (!adLinkUrl) setAdLinkUrl(baseLink);
    }
  }, [isCTW, metaQ.data, adLinkUrl]);

  // The actual link sent to Meta — appends the icebreaker as a pre-filled
  // WhatsApp greeting via the standard ?text= query parameter.
  const resolvedLinkUrl = useMemo(() => {
    if (!isCTW || !adLinkUrl || !icebreaker.trim()) return adLinkUrl;
    const sep = adLinkUrl.includes("?") ? "&" : "?";
    return `${adLinkUrl}${sep}text=${encodeURIComponent(icebreaker.trim())}`;
  }, [isCTW, adLinkUrl, icebreaker]);

  /* ─── Location typeahead (Meta targeting/search) ─── */
  const debouncedQuery = useDebounced(geoQuery, 350);
  const geoSearchQ = useQuery({
    queryKey: ["ads", "geo-search", debouncedQuery],
    queryFn: () => api.searchAdTargeting(debouncedQuery),
    enabled: locationMode === "custom" && debouncedQuery.trim().length >= 2,
  });

  /* ─── Interest typeahead ─── */
  const debouncedInterestQ = useDebounced(interestQuery, 350);
  const interestSearchQ = useQuery({
    queryKey: ["ads", "interest-search", debouncedInterestQ],
    queryFn: () => api.searchAdInterests(debouncedInterestQ),
    enabled: debouncedInterestQ.trim().length >= 2,
  });
  const debouncedExclInterestQ = useDebounced(excludedInterestQuery, 350);
  const excludedInterestSearchQ = useQuery({
    queryKey: ["ads", "interest-search-excl", debouncedExclInterestQ],
    queryFn: () => api.searchAdInterests(debouncedExclInterestQ),
    enabled: debouncedExclInterestQ.trim().length >= 2,
  });

  /* ─── Build targeting payload (used by estimate + create) ─── */
  const targetingPayload = useMemo(() => {
    const preset = LOCATION_PRESETS.find((l) => l.id === locationPreset);
    const t: NonNullable<Parameters<typeof api.estimateAdDelivery>[0]["targeting"]> = {
      age_min: ageMin,
      age_max: ageMax,
    };
    if (locationMode === "preset") {
      if (preset?.country_codes) t.country_codes = preset.country_codes;
    } else {
      t.country_codes = ["IN"];
      const cityKeys = customGeos.filter((g) => g.type === "city").map((g) => g.key);
      const regionKeys = customGeos.filter((g) => g.type === "region").map((g) => g.key);
      if (cityKeys.length) t.city_keys = cityKeys;
      if (regionKeys.length) t.region_keys = regionKeys;
    }
    if (audience) t.audience_id = audience;
    return t;
  }, [locationMode, locationPreset, customGeos, audience, ageMin, ageMax]);

  /* ─── Live estimate (debounced, hits Meta delivery_estimate) ─── */
  const debouncedBudget = useDebounced(budget, 500);
  const debouncedTargeting = useDebounced(targetingPayload, 500);
  const estimateQ = useQuery({
    queryKey: ["ads", "estimate", objectiveObj.meta, objectiveObj.destinationType, debouncedBudget, debouncedTargeting],
    queryFn: () =>
      api.estimateAdDelivery({
        objective: objectiveObj.meta,
        destination_type: objectiveObj.destinationType,
        daily_budget_inr: Number(debouncedBudget) || 1000,
        targeting: debouncedTargeting,
      }),
  });

  /* ─── Launch mutation ─── */
  const launch = useMutation({
    mutationFn: () => {
      const publisherPlatforms: string[] = [];
      if (fbEnabled) publisherPlatforms.push("facebook");
      if (igEnabled) publisherPlatforms.push("instagram");

      // Schedule rule: Meta refuses ad sets shorter than 24h on daily budget.
      // - If start date is today or in the past, omit start_time entirely so
      //   Meta defaults to "start delivering now, run indefinitely". Sending
      //   start_time=today midnight + no end_time triggers the
      //   "Campaign schedule is too short" rejection because some Meta
      //   timezones interpret it as a 0-hour window.
      // - End time only included when the user explicitly set one AND the
      //   gap from start is >= 24h.
      const now = Date.now();
      const startMs = new Date(startDate).getTime();
      const isFutureStart = startMs > now + 60_000;
      const startIso = isFutureStart ? new Date(startMs).toISOString() : undefined;
      const endMs = hasEndDate ? new Date(endDate).getTime() : null;
      const effectiveStartMs = isFutureStart ? startMs : now;
      const endIso = endMs && endMs - effectiveStartMs >= 24 * 3600_000
        ? new Date(endMs).toISOString()
        : undefined;

      return api.createAdCampaign({
        name: name.trim(),
        objective: objectiveObj.meta,
        destination_type: objectiveObj.destinationType,
        daily_budget_inr: Number(budget),
        status: launchPaused ? "PAUSED" : "ACTIVE",
        start_time: startIso,
        end_time: endIso,
        targeting: {
          ...targetingPayload,
          genders: gender === "all" ? undefined : (gender === "male" ? [1] : [2]),
          publisher_platforms: publisherPlatforms.length > 0 && publisherPlatforms.length < 2 ? publisherPlatforms : undefined,
          facebook_positions: fbEnabled && fbPlacements.length < PLACEMENTS.facebook.length ? fbPlacements : undefined,
          instagram_positions: igEnabled && igPlacements.length < PLACEMENTS.instagram.length ? igPlacements : undefined,
          interest_ids: interestChips.length ? interestChips.map(({ id, name }) => ({ id, name })) : undefined,
          excluded_interest_ids: excludedInterests.length ? excludedInterests.map(({ id, name }) => ({ id, name })) : undefined,
          excluded_audience_id: excludedAudienceId || undefined,
          targeting_expansion: targetingExpansion,
        },
        creative: pageId ? {
          page_id: pageId,
          image_url: creativeType === "image" ? (adImageUrl || undefined) : undefined,
          video_url: creativeType === "video" ? (adImageUrl || undefined) : undefined,
          instagram_media_id: creativeType === "video" ? (instagramMediaId || undefined) : undefined,
          instagram_actor_id: creativeType === "video" ? (instagramActorId || undefined) : undefined,
          headline: adHeadline,
          body: adBody,
          link_url: resolvedLinkUrl,
          cta_type: objectiveObj.cta,
        } : undefined,
      });
    },
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["ads", "campaigns"] });
      const msg = r.mode === "full_launch"
        ? launchPaused
          ? `Campaign created end-to-end (paused — turn on in Meta Ads Manager)`
          : `Campaign launched · live on Meta`
        : `Campaign created (skeleton only — add Ad Set + Ad in Meta Ads Manager)`;
      toast.success(msg);
      navigate("/app/ads");
    },
    onError: (e) => toast.error(String(e)),
  });

  const stepValid = (s: number) => {
    if (s === 1) return !!objective;
    if (s === 2) {
      // Schedule sanity: if user set an end date, require >= 24h gap from
      // start (or from "now" if start is today / in the past). Catches the
      // Meta "Campaign schedule is too short" error before hitting Meta.
      if (hasEndDate) {
        const startMs = new Date(startDate).getTime();
        const endMs = new Date(endDate).getTime();
        const refStart = startMs > Date.now() ? startMs : Date.now();
        if (endMs - refStart < 24 * 3600_000) return false;
      }
      return name.trim().length >= 3
        && adHeadline.trim().length >= 5
        && adBody.trim().length >= 10
        && (!isCTW || adLinkUrl.trim().length > 0);
    }
    if (s === 3) return Number(budget) >= 100;
    return false;
  };

  const goNext = () => {
    if (!stepValid(step)) {
      let msg = "";
      if (step === 1) {
        msg = "Pehle ek objective select karein";
      } else if (step === 2) {
        if (name.trim().length < 3) msg = "Campaign name kam se kam 3 letters ka chahiye";
        else if (adHeadline.trim().length < 5) msg = `Headline kam se kam 5 letters chahiye (abhi ${adHeadline.trim().length})`;
        else if (adBody.trim().length < 10) msg = `Body text kam se kam 10 letters chahiye (abhi ${adBody.trim().length})`;
        else if (isCTW && !adLinkUrl.trim()) msg = "WhatsApp link chahiye (wa.me/91xxxxxxxxxx)";
        else if (hasEndDate) {
          const startMs = new Date(startDate).getTime();
          const endMs = new Date(endDate).getTime();
          const refStart = startMs > Date.now() ? startMs : Date.now();
          if (endMs - refStart < 24 * 3600_000) {
            msg = "End date kam se kam 24 hours baad ka rakhein (Meta requirement)";
          } else {
            msg = "Form pura karein";
          }
        }
        else msg = "Form pura karein";
      } else if (step === 3) {
        msg = "Daily budget ₹100 ya zyada hona chahiye";
      }
      toast.error(msg);
      return;
    }
    if (step < 3) setStep(step + 1);
  };

  const dailySpend   = Number(budget) || 0;
  const ins          = estimateQ.data;
  const reachLow     = ins?.reach_low   ?? 0;
  const reachHigh    = ins?.reach_high  ?? 0;
  const resultsLow   = ins?.results_low ?? 0;
  const resultsHigh  = ins?.results_high?? 0;
  const estimateMode = ins?.demo ? "demo" : ins?.estimate_ready ? "live" : "warming";

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#FFF6E8]">
      {/* ─────── Top bar (back + title + thin progress + cancel) ─────── */}
      <div className="border-b-2 border-[#E8B968] bg-white sticky top-0 z-20">
        <div className="px-6 lg:px-10 py-3 flex items-center gap-3">
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
            <p className="text-[11px] text-foreground/60 font-medium">
              Step {step} of 3 · {step === 1 ? "Objective" : step === 2 ? "Audience & creative" : "Budget & launch"}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate("/app/ads")}>Cancel</Button>
        </div>
        {/* Thin progress strip — replaces the bulky step tracker */}
        <div className="h-1 bg-[#FFF1D6]">
          <div
            className="h-full bg-gradient-to-r from-[#FF6A1F] to-[#FFD23F] transition-all duration-300"
            style={{ width: `${(step / 3) * 100}%` }}
          />
        </div>
      </div>

      {/* ─────── Demo / connection warning ─────── */}
      {!connectionQ.isPending && !isConnected && (
        <div className="bg-[#FFF1D6] border-b-2 border-[#E8B968] px-6 lg:px-10 py-2.5 flex items-center gap-3 text-[12px]">
          <Info className="w-4 h-4 text-[#B8651A] flex-shrink-0" />
          <p className="font-medium text-foreground/80">
            Meta Ads connected nahi hai. Estimate aur creation dono dummy mode mein chal rahe hain. Connect karne ke baad real launch hoga.
          </p>
        </div>
      )}

      {/* ─────── Body: form + preview ─────── */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-10 py-6 grid lg:grid-cols-[1fr_360px] gap-6">
          {/* ─── FORM ─── */}
          <div className="space-y-4 min-w-0">
            {/* ── AI Compose panel — shown only on Step 1 so we don't
                  re-prompt as customer refines downstream steps. Customer
                  describes their offer once → 3 polished ad-copy variants +
                  targeting + budget → click to auto-fill the rest of the
                  wizard. */}
            {step === 1 && (
              <div className={cn(
                "rounded-2xl border-2 shadow-[0_4px_0_0_currentColor] mb-4 overflow-hidden transition-all",
                aiOpen ? "border-[#3C50E0] text-[#2533A8]" : "border-[#E8B968] text-[#B8651A]"
              )}>
                <div className={cn(
                  "px-4 py-3 flex items-center gap-3 flex-wrap",
                  aiOpen ? "bg-gradient-to-r from-[#E4E8FF] via-[#F0E9FF] to-[#E4E8FF]" : "bg-[#FFF1D6]"
                )}>
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center shadow-md flex-shrink-0",
                    aiOpen ? "bg-gradient-to-br from-[#3C50E0] to-[#1E40AF] text-white" : "bg-[#FFD23F] text-[#3D1A00]"
                  )}>
                    <Brain className="w-5 h-5" strokeWidth={2.5} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-black text-foreground tracking-tight">
                      Addison AI Compose
                    </p>
                    <p className="text-[11px] text-foreground/65 font-medium">
                      Apna offer ek line mein batayein · AI 3 ad versions banayega · targeting + budget bhi suggest karega
                    </p>
                  </div>
                  <button
                    onClick={() => setAiOpen(!aiOpen)}
                    className="text-[11px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-md bg-white border border-current hover:bg-current hover:text-white transition"
                  >
                    {aiOpen ? "Hide" : "Try AI"}
                  </button>
                </div>

                {aiOpen && (
                  <div className="p-4 bg-white space-y-3">
                    <div>
                      <label className="text-[11px] uppercase tracking-wider font-extrabold text-foreground/60 mb-1.5 block">
                        Describe what you're promoting
                      </label>
                      <textarea
                        value={aiDescription}
                        onChange={(e) => setAiDescription(e.target.value)}
                        placeholder="e.g. Diwali pickle gift box, ₹999 with free home delivery, hand-made by my mom in Ranchi. Want orders from women 28-45 across India."
                        rows={3}
                        className="w-full rounded-xl border-2 border-[#E8B968] bg-[#FFF6E8] px-3 py-2.5 text-[13px] font-medium placeholder:text-foreground/40 focus:outline-none focus:border-[#3C50E0] focus:bg-white transition"
                        maxLength={600}
                      />
                      <div className="flex items-center justify-between mt-1">
                        <p className="text-[10px] text-foreground/50 font-medium">
                          {aiDescription.length}/600 · the more specific, the better the copy
                        </p>
                        <Button
                          onClick={() => generateAdCopyMut.mutate({ description: aiDescription.trim() })}
                          disabled={aiDescription.trim().length < 10 || generateAdCopyMut.isPending}
                          className="bg-gradient-to-r from-[#3C50E0] to-[#1E40AF] text-white shadow-[0_3px_0_0_#2533A8] hover:from-[#2533A8] hover:to-[#1A3590]"
                        >
                          {generateAdCopyMut.isPending ? (
                            <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating…</>
                          ) : (
                            <><Sparkles className="w-3.5 h-3.5" /> Generate</>
                          )}
                        </Button>
                      </div>
                    </div>

                    {/* Results panel */}
                    {aiResult && (
                      <div className="pt-3 border-t border-[#E8B968]/40 space-y-3">
                        {/* Suggested campaign name + budget summary */}
                        <div className="flex items-center gap-3 flex-wrap text-[11px] font-extrabold">
                          <span className="px-2 py-1 rounded-md bg-[#E4E8FF] text-[#2533A8]">
                            📌 {aiResult.campaign_name}
                          </span>
                          <span className="px-2 py-1 rounded-md bg-[#FFF1D6] text-[#B8651A]">
                            💰 ₹{aiResult.budget_inr_daily}/day
                          </span>
                          <span className="px-2 py-1 rounded-md bg-[#E6F7EE] text-[#0A6E3C]">
                            🎯 {aiResult.cta_label.replace(/_/g, " ").toLowerCase()}
                          </span>
                          <span className="text-foreground/55 font-medium">
                            {aiResult.budget_reasoning}
                          </span>
                        </div>

                        {/* 3 variants */}
                        <div className="grid md:grid-cols-3 gap-2.5">
                          {aiResult.variants.map((v, i) => (
                            <div
                              key={i}
                              className="rounded-xl border-2 border-[#E8B968] bg-[#FFF6E8] p-3 flex flex-col gap-2 hover:border-[#3C50E0] hover:shadow-[0_3px_0_0_#2533A8] transition-all"
                            >
                              <span className="self-start text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-[#3C50E0] text-white">
                                {v.label}
                              </span>
                              <p className="text-[13px] font-black text-foreground leading-tight">
                                {v.headline}
                              </p>
                              <p className="text-[11px] text-foreground/75 leading-snug">
                                {v.primary_text}
                              </p>
                              <div className="rounded-lg bg-[#E6F7EE] border border-[#0E8A4B]/30 px-2 py-1.5">
                                <p className="text-[9px] font-extrabold uppercase tracking-wider text-[#0A6E3C] mb-0.5">
                                  WhatsApp opener
                                </p>
                                <p className="text-[11px] text-foreground/85 italic">"{v.icebreaker}"</p>
                              </div>
                              <Button
                                onClick={() => applyAiVariant(v)}
                                className="mt-1 bg-[#0E8A4B] text-white shadow-[0_3px_0_0_#0A6E3C] hover:bg-[#0A6E3C] w-full"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" /> Use this
                              </Button>
                            </div>
                          ))}
                        </div>

                        {/* Suggested interests */}
                        {aiResult.targeting_interests.length > 0 && (
                          <div className="rounded-lg bg-[#FFF1D6] border border-[#E8B968] p-2.5">
                            <p className="text-[10px] uppercase tracking-wider font-extrabold text-[#B8651A] mb-1.5">
                              Suggested targeting interests (auto-applied when you pick a variant)
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {aiResult.targeting_interests.map((name) => (
                                <span
                                  key={name}
                                  className="px-2 py-0.5 rounded-full bg-white border border-[#E8B968] text-[10px] font-extrabold text-foreground/75"
                                >
                                  {name}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {step === 1 && <StepObjective objective={objective} setObjective={setObjective} />}

            {step === 2 && (
              <StepAudienceCreative
                name={name} setName={setName}
                audience={audience} setAudience={setAudience}
                audiences={audiences}
                audiencesLoading={audiencesQ.isPending}
                onCreateAudience={() => setCreateAudienceOpen(true)}
                locationMode={locationMode} setLocationMode={setLocationMode}
                locationPreset={locationPreset} setLocationPreset={setLocationPreset}
                customGeos={customGeos} setCustomGeos={setCustomGeos}
                geoQuery={geoQuery} setGeoQuery={setGeoQuery}
                geoResults={geoSearchQ.data?.results ?? []}
                geoLoading={geoSearchQ.isFetching}
                language={language} setLanguage={setLanguage}
                pageId={pageId} setPageId={setPageId}
                pages={pages}
                pagesLoading={pagesQ.isPending || pagesQ.isFetching}
                refreshPages={() => qc.invalidateQueries({ queryKey: ["ads", "pages"] })}
                ageMin={ageMin} setAgeMin={setAgeMin}
                ageMax={ageMax} setAgeMax={setAgeMax}
                gender={gender} setGender={setGender}
                startDate={startDate} setStartDate={setStartDate}
                hasEndDate={hasEndDate} setHasEndDate={setHasEndDate}
                endDate={endDate} setEndDate={setEndDate}
                fbEnabled={fbEnabled} setFbEnabled={setFbEnabled}
                igEnabled={igEnabled} setIgEnabled={setIgEnabled}
                fbPlacements={fbPlacements} setFbPlacements={setFbPlacements}
                igPlacements={igPlacements} setIgPlacements={setIgPlacements}
                interestChips={interestChips} setInterestChips={setInterestChips}
                interestQuery={interestQuery} setInterestQuery={setInterestQuery}
                interestResults={interestSearchQ.data?.interests ?? []}
                interestLoading={interestSearchQ.isFetching}
                excludedInterests={excludedInterests} setExcludedInterests={setExcludedInterests}
                excludedInterestQuery={excludedInterestQuery} setExcludedInterestQuery={setExcludedInterestQuery}
                excludedInterestResults={excludedInterestSearchQ.data?.interests ?? []}
                excludedInterestLoading={excludedInterestSearchQ.isFetching}
                excludedAudienceId={excludedAudienceId} setExcludedAudienceId={setExcludedAudienceId}
                targetingExpansion={targetingExpansion} setTargetingExpansion={setTargetingExpansion}
                creativeType={creativeType} setCreativeType={setCreativeType}
                adImageUrl={adImageUrl} setAdImageUrl={setAdImageUrl}
                instagramMediaId={instagramMediaId} setInstagramMediaId={setInstagramMediaId}
                instagramActorId={instagramActorId} setInstagramActorId={setInstagramActorId}
                adHeadline={adHeadline} setAdHeadline={setAdHeadline}
                adBody={adBody} setAdBody={setAdBody}
                adLinkUrl={adLinkUrl} setAdLinkUrl={setAdLinkUrl}
                icebreaker={icebreaker} setIcebreaker={setIcebreaker}
                objectiveObj={objectiveObj}
                isCTW={isCTW}
                whatsappNumber={metaQ.data?.display_phone_number ?? null}
              />
            )}

            {step === 3 && (
              <StepBudget
                budget={budget} setBudget={setBudget}
                optimizeAI={optimizeAI} setOptimizeAI={setOptimizeAI}
                launchPaused={launchPaused} setLaunchPaused={setLaunchPaused}
                name={name}
                objectiveObj={objectiveObj}
                audienceName={audiences.find((a) => a.id === audience)?.name ?? "Auto (no custom audience)"}
                locationLabel={
                  locationMode === "preset"
                    ? LOCATION_PRESETS.find((l) => l.id === locationPreset)?.label ?? ""
                    : `${customGeos.length} custom location${customGeos.length === 1 ? "" : "s"}`
                }
                languageLabel={LANGUAGE_PRESETS.find((l) => l.id === language)?.label ?? ""}
                pageName={pages.find((p) => p.id === pageId)?.name ?? "—"}
                adHeadline={adHeadline}
                adBody={adBody}
                adImageUrl={adImageUrl}
                creativeType={creativeType}
              />
            )}
          </div>

          {/* ─── PREVIEW (sticky) ─── */}
          <div className="lg:sticky lg:top-[140px] lg:self-start space-y-4">
            {step >= 2 && (
              <AdMockupPreview
                pageName={pages.find((pg) => pg.id === pageId)?.name ?? "Your Page"}
                headline={adHeadline}
                body={adBody}
                imageUrl={adImageUrl}
                creativeType={creativeType}
                ctaLabel={isCTW ? "WhatsApp" : ctaLabel(objectiveObj.cta)}
                isCTW={isCTW}
              />
            )}
            <LivePreviewCard
              name={name}
              objectiveObj={objectiveObj}
              dailySpend={dailySpend}
              reachLow={reachLow}
              reachHigh={reachHigh}
              resultsLow={resultsLow}
              resultsHigh={resultsHigh}
              audienceSizeLow={ins?.audience_size_low}
              audienceSizeHigh={ins?.audience_size_high}
              mode={estimateMode}
              loading={estimateQ.isFetching}
              optimizeAI={optimizeAI}
            />
            {step === 3 && optimizeAI && <AISuggestionsCard objective={objective} budget={budget} />}
            {step === 3 && isConnected && preflightQ.data && <PreflightCard data={preflightQ.data} />}
          </div>
        </div>
      </div>

      {/* Audience-create dialog (opened from the audience picker) */}
      <CreateAudienceDialog
        open={createAudienceOpen}
        onOpenChange={setCreateAudienceOpen}
        onCreated={(a) => {
          qc.invalidateQueries({ queryKey: ["ads", "audiences"] });
          setAudience(a.id); // auto-select the new audience in the picker
        }}
      />

      {/* ─────── Bottom action bar ─────── */}
      <div className="border-t-2 border-[#E8B968] bg-white px-6 lg:px-10 py-3 flex items-center gap-3 flex-wrap">
        <div className="text-[11px] text-foreground/60 font-medium flex-1 min-w-0 truncate">
          Step {step} of 3 · {step === 1 ? "Pick what you want to optimise for" : step === 2 ? "Audience + ad creative" : "Set spend + go live"}
        </div>
        {step > 1 && (
          <Button variant="outline" onClick={() => setStep(step - 1)}>
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </Button>
        )}
        {step < 3 ? (
          <Button onClick={goNext}>Continue <ArrowRight className="w-3.5 h-3.5" /></Button>
        ) : (
          <Button
            disabled={launch.isPending || !isConnected || !stepValid(2) || !stepValid(3)}
            onClick={() => launch.mutate()}
          >
            {launch.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            {launchPaused ? "Create ad (paused)" : "Launch live now"}
          </Button>
        )}
      </div>
    </div>
  );
};

/* ─────────────────────────── STEP 1 ─────────────────────────── */

const StepObjective = ({
  objective, setObjective,
}: { objective: ObjectiveId; setObjective: (v: ObjectiveId) => void }) => (
  <>
    <SectionHeader
      icon={Target}
      iconBg="bg-[#FF6A1F]"
      title="Aapka goal kya hai?"
      subtitle="Meta is field se decide karta hai ki ad kisko dikhana hai · sahi objective = saste results"
      tag="Step 1 · Objective"
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

/* ─────────────────────────── STEP 2 ─────────────────────────── */

type StepAudienceCreativeProps = {
  name: string; setName: (v: string) => void;
  audience: string; setAudience: (v: string) => void;
  audiences: Array<{ id: string; name: string; size: number; type: string }>;
  audiencesLoading: boolean;
  onCreateAudience: () => void;
  locationMode: "preset" | "custom"; setLocationMode: (v: "preset" | "custom") => void;
  locationPreset: string; setLocationPreset: (v: string) => void;
  customGeos: GeoChip[]; setCustomGeos: (v: GeoChip[]) => void;
  geoQuery: string; setGeoQuery: (v: string) => void;
  geoResults: Array<{ key: string; name: string; type: string; country_name?: string; region?: string }>;
  geoLoading: boolean;
  language: string; setLanguage: (v: string) => void;
  pageId: string; setPageId: (v: string) => void;
  pages: Array<{ id: string; name: string; category: string | null }>;
  pagesLoading: boolean;
  refreshPages: () => void;
  ageMin: number; setAgeMin: (v: number) => void;
  ageMax: number; setAgeMax: (v: number) => void;
  gender: "all" | "male" | "female"; setGender: (v: "all" | "male" | "female") => void;
  startDate: string; setStartDate: (v: string) => void;
  hasEndDate: boolean; setHasEndDate: (v: boolean) => void;
  endDate: string; setEndDate: (v: string) => void;
  fbEnabled: boolean; setFbEnabled: (v: boolean) => void;
  igEnabled: boolean; setIgEnabled: (v: boolean) => void;
  fbPlacements: string[]; setFbPlacements: (v: string[]) => void;
  igPlacements: string[]; setIgPlacements: (v: string[]) => void;
  interestChips: Array<{ id: string; name: string; size?: number }>; setInterestChips: (v: Array<{ id: string; name: string; size?: number }>) => void;
  interestQuery: string; setInterestQuery: (v: string) => void;
  interestResults: Array<{ id: string; name: string; audience_size_lower_bound?: number; audience_size_upper_bound?: number; topic?: string }>;
  interestLoading: boolean;
  excludedInterests: Array<{ id: string; name: string; size?: number }>; setExcludedInterests: (v: Array<{ id: string; name: string; size?: number }>) => void;
  excludedInterestQuery: string; setExcludedInterestQuery: (v: string) => void;
  excludedInterestResults: Array<{ id: string; name: string; audience_size_lower_bound?: number; audience_size_upper_bound?: number; topic?: string }>;
  excludedInterestLoading: boolean;
  excludedAudienceId: string; setExcludedAudienceId: (v: string) => void;
  targetingExpansion: boolean; setTargetingExpansion: (v: boolean) => void;
  creativeType: "image" | "video"; setCreativeType: (v: "image" | "video") => void;
  adImageUrl: string; setAdImageUrl: (v: string) => void;
  instagramMediaId: string | null; setInstagramMediaId: (v: string | null) => void;
  instagramActorId: string | null; setInstagramActorId: (v: string | null) => void;
  adHeadline: string; setAdHeadline: (v: string) => void;
  adBody: string; setAdBody: (v: string) => void;
  adLinkUrl: string; setAdLinkUrl: (v: string) => void;
  icebreaker: string; setIcebreaker: (v: string) => void;
  objectiveObj: typeof OBJECTIVES[number];
  isCTW: boolean;
  whatsappNumber: string | null;
};

const StepAudienceCreative = (p: StepAudienceCreativeProps) => (
  <>
    <SectionHeader
      icon={Users}
      iconBg="bg-[#3C50E0]"
      title="Targeting"
      subtitle={`${p.objectiveObj.label} — kisko dikhega aur kya dikhega`}
      tag="Who sees this"
    />

    {/* Campaign name */}
    <Card>
      <Label htmlFor="cc-name" className="text-[11px] uppercase tracking-[0.15em] text-[#B8651A] font-extrabold">
        Campaign ka naam
      </Label>
      <Input id="cc-name" value={p.name} onChange={(e) => p.setName(e.target.value)} placeholder="e.g. Diwali Sale · CTW · Ranchi" className="mt-1.5" autoFocus />
      <p className="text-[11px] text-foreground/60 font-medium mt-1.5">
        Internal naam · customers ko nahi dikhega.
      </p>
    </Card>

    {/* Facebook Page (required for Ad creative) */}
    <Card>
      <div className="flex items-center justify-between gap-2 mb-1">
        <Label className="text-[11px] uppercase tracking-[0.15em] text-[#B8651A] font-extrabold">
          Facebook Page (ad isi se chalegi)
        </Label>
        <button
          onClick={p.refreshPages}
          disabled={p.pagesLoading}
          className="text-[10px] font-extrabold text-[#3C50E0] hover:underline disabled:opacity-50 inline-flex items-center gap-1"
        >
          {p.pagesLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : "↻"} Refresh
        </button>
      </div>
      <p className="text-[11px] text-foreground/60 font-medium mb-2">
        Ad apke Page ke naam se publish hoga · {p.isCTW ? "WhatsApp number bhi isi page se linked hai" : "users isi page ka naam dekhenge"}
      </p>

      {p.pages.length === 0 && !p.pagesLoading ? (
        <PageEmptyState />
      ) : (
        <Select value={p.pageId} onValueChange={p.setPageId}>
          <SelectTrigger>
            <SelectValue placeholder={p.pagesLoading ? "Loading pages…" : "Page select karein"} />
          </SelectTrigger>
          <SelectContent>
            {p.pages.map((pg) => (
              <SelectItem key={pg.id} value={pg.id}>
                <span className="flex items-center gap-2">
                  <span className="font-bold">{pg.name}</span>
                  {pg.category && <span className="text-foreground/60 text-[11px]">· {pg.category}</span>}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </Card>

    {/* Custom Audience */}
    <Card>
      <div className="flex items-center justify-between gap-2 mb-1">
        <Label className="text-[11px] uppercase tracking-[0.15em] text-[#B8651A] font-extrabold">
          Custom audience (optional)
        </Label>
        <button
          type="button"
          onClick={() => p.onCreateAudience()}
          className="text-[10px] font-extrabold text-[#3C50E0] hover:underline inline-flex items-center gap-1"
        >
          + Naya audience banao
        </button>
      </div>
      <p className="text-[11px] text-foreground/60 font-medium mt-1 mb-2">
        CRM contacts se audience banao, ya skip karein — Meta auto-target karega.
      </p>
      <Select value={p.audience} onValueChange={p.setAudience}>
        <SelectTrigger>
          <SelectValue placeholder={p.audiencesLoading ? "Loading…" : p.audiences.length === 0 ? "(no custom audiences — auto-targeting)" : "Audience select karein"} />
        </SelectTrigger>
        <SelectContent>
          {p.audiences.map((a) => (
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
      <div className="flex gap-2 mt-2 mb-3">
        <button
          onClick={() => p.setLocationMode("preset")}
          className={cn(
            "flex-1 px-3 py-1.5 rounded-lg text-[12px] font-extrabold border-2 transition-all",
            p.locationMode === "preset" ? "bg-[#FF6A1F] text-white border-[#B8420A]" : "bg-white text-foreground/70 border-[#E8B968]"
          )}
        >Quick presets</button>
        <button
          onClick={() => p.setLocationMode("custom")}
          className={cn(
            "flex-1 px-3 py-1.5 rounded-lg text-[12px] font-extrabold border-2 transition-all",
            p.locationMode === "custom" ? "bg-[#FF6A1F] text-white border-[#B8420A]" : "bg-white text-foreground/70 border-[#E8B968]"
          )}
        >Search cities</button>
      </div>

      {p.locationMode === "preset" ? (
        <div className="grid grid-cols-1 gap-2">
          {LOCATION_PRESETS.map((l) => (
            <button
              key={l.id}
              onClick={() => p.setLocationPreset(l.id)}
              className={cn(
                "px-3 py-2.5 rounded-xl border-2 text-left transition-all text-[12px] font-bold",
                p.locationPreset === l.id ? "border-[#3C50E0] bg-[#E4E8FF] text-[#2533A8]" : "border-[#E8B968] bg-white hover:bg-[#FFF6E8]"
              )}
            >
              {l.label}
            </button>
          ))}
          <p className="text-[10px] text-foreground/50 font-medium mt-1">
            Specific cities chahiye? "Search cities" mode try karein — Meta ke real IDs ke saath.
          </p>
        </div>
      ) : (
        <>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-foreground/40" />
            <Input value={p.geoQuery} onChange={(e) => p.setGeoQuery(e.target.value)} placeholder="Type city or state name (e.g. Ranchi, Jharkhand)…" className="pl-9" />
          </div>
          <div className="flex gap-1.5 mt-2 flex-wrap">
            {["Ranchi", "Mumbai", "Delhi", "Bangalore", "Hyderabad", "Chennai", "Kolkata", "Pune", "Ahmedabad", "Jaipur"].map((city) => (
              <button
                key={city}
                onClick={() => p.setGeoQuery(city)}
                className="px-2 py-1 rounded-full text-[10px] font-extrabold border border-[#E8B968] bg-white text-foreground/70 hover:bg-[#FFF1D6] transition"
              >+ {city}</button>
            ))}
          </div>
          {p.geoLoading && <p className="text-[11px] text-foreground/60 mt-2 flex items-center gap-1.5"><Loader2 className="w-3 h-3 animate-spin" /> Searching Meta…</p>}
          {p.geoResults.length > 0 && (
            <div className="mt-2 border-2 border-[#E8B968] rounded-xl divide-y divide-[#E8B968]/40 bg-white max-h-52 overflow-y-auto">
              {p.geoResults.map((r) => (
                <button
                  key={r.key + r.type}
                  onClick={() => {
                    if (!p.customGeos.find((g) => g.key === r.key)) {
                      p.setCustomGeos([...p.customGeos, { key: r.key, name: r.name, type: r.type, country_code: r.country_name }]);
                    }
                    p.setGeoQuery("");
                  }}
                  className="w-full px-3 py-2 text-left hover:bg-[#FFF6E8] transition flex items-center gap-2"
                >
                  <MapPin className="w-3.5 h-3.5 text-[#B8651A] flex-shrink-0" />
                  <span className="text-[12px] font-bold">{r.name}</span>
                  <span className="text-[10px] text-foreground/50 uppercase tracking-wider">{r.type}</span>
                  {r.region && <span className="text-[10px] text-foreground/40">· {r.region}</span>}
                </button>
              ))}
            </div>
          )}
          {p.customGeos.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {p.customGeos.map((g) => (
                <span key={g.key + g.type} className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-[#E4E8FF] border border-[#3C50E0]/30 text-[#2533A8] text-[11px] font-extrabold">
                  <MapPin className="w-3 h-3" />
                  {g.name}
                  <button onClick={() => p.setCustomGeos(p.customGeos.filter((x) => x.key !== g.key))} className="hover:text-[#D4308E]">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </>
      )}
    </Card>

    {/* Language */}
    <Card>
      <Label className="text-[11px] uppercase tracking-[0.15em] text-[#B8651A] font-extrabold flex items-center gap-1.5">
        <Languages className="w-3.5 h-3.5" /> Language
      </Label>
      <div className="flex gap-2 flex-wrap mt-2">
        {LANGUAGE_PRESETS.map((l) => (
          <button
            key={l.id}
            onClick={() => p.setLanguage(l.id)}
            className={cn(
              "px-3 py-2 rounded-xl border-2 text-[12px] font-extrabold transition-all",
              p.language === l.id ? "border-[#0E8A4B] bg-[#E6F7EE] text-[#0A6E3C]" : "border-[#E8B968] bg-white hover:bg-[#FFF6E8]"
            )}
          >{l.label}</button>
        ))}
      </div>
    </Card>

    {/* Demographics: age + gender */}
    <Card>
      <Label className="text-[11px] uppercase tracking-[0.15em] text-[#B8651A] font-extrabold">Demographics</Label>
      <div className="grid grid-cols-2 gap-3 mt-2">
        <div>
          <p className="text-[10px] text-foreground/60 font-extrabold mb-1.5">AGE</p>
          <div className="flex items-center gap-2">
            <Select value={String(p.ageMin)} onValueChange={(v) => p.setAgeMin(Number(v))}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Array.from({ length: 53 }, (_, i) => 13 + i).map((n) => (
                  <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-[12px] text-foreground/60 font-bold">to</span>
            <Select value={String(p.ageMax)} onValueChange={(v) => p.setAgeMax(Number(v))}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Array.from({ length: 53 }, (_, i) => 13 + i).map((n) => (
                  <SelectItem key={n} value={String(n)}>{n === 65 ? "65+" : n}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div>
          <p className="text-[10px] text-foreground/60 font-extrabold mb-1.5">GENDER</p>
          <div className="flex gap-1">
            {(["all", "male", "female"] as const).map((g) => (
              <button
                key={g}
                onClick={() => p.setGender(g)}
                className={cn(
                  "flex-1 px-2 py-2 rounded-lg text-[11px] font-extrabold border-2 capitalize transition-all",
                  p.gender === g ? "bg-[#FF6A1F] text-white border-[#B8420A]" : "bg-white text-foreground/70 border-[#E8B968]"
                )}
              >{g}</button>
            ))}
          </div>
        </div>
      </div>
    </Card>

    {/* Schedule */}
    <Card>
      <Label className="text-[11px] uppercase tracking-[0.15em] text-[#B8651A] font-extrabold flex items-center gap-1.5">
        <Clock className="w-3.5 h-3.5" /> Schedule
      </Label>
      <div className="grid grid-cols-2 gap-3 mt-2">
        <div>
          <p className="text-[10px] text-foreground/60 font-extrabold mb-1.5">START DATE</p>
          <Input type="date" value={p.startDate} onChange={(e) => p.setStartDate(e.target.value)} min={today()} />
        </div>
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-[10px] text-foreground/60 font-extrabold">END DATE</p>
            <label className="flex items-center gap-1.5 text-[10px] font-extrabold text-foreground/70 cursor-pointer">
              <input type="checkbox" checked={p.hasEndDate} onChange={(e) => p.setHasEndDate(e.target.checked)} className="accent-[#FF6A1F]" />
              Set end date
            </label>
          </div>
          <Input
            type="date"
            value={p.endDate}
            onChange={(e) => p.setEndDate(e.target.value)}
            min={p.startDate}
            disabled={!p.hasEndDate}
            className={!p.hasEndDate ? "opacity-50" : ""}
          />
        </div>
      </div>
    </Card>

    {/* Platforms & Placements */}
    <Card>
      <Label className="text-[11px] uppercase tracking-[0.15em] text-[#B8651A] font-extrabold">Platforms & Placements</Label>
      <p className="text-[11px] text-foreground/60 font-medium mt-1 mb-2.5">Sab on rakho = max reach. Specific placements pe limit karna ho to off-tick karein.</p>

      <PlacementBlock
        platform="facebook"
        enabled={p.fbEnabled}
        onEnabled={p.setFbEnabled}
        placements={p.fbPlacements}
        onPlacements={p.setFbPlacements}
        options={PLACEMENTS.facebook}
      />
      <div className="h-2" />
      <PlacementBlock
        platform="instagram"
        enabled={p.igEnabled}
        onEnabled={p.setIgEnabled}
        placements={p.igPlacements}
        onPlacements={p.setIgPlacements}
        options={PLACEMENTS.instagram}
      />
    </Card>

    {/* Advanced targeting — interests, exclusions, expansion */}
    <SectionHeader
      icon={Zap}
      iconBg="bg-[#7A1500]"
      title="Advanced targeting"
      subtitle="Interest aur behavior se audience tightly target karein · optional"
      tag="Optional · pro mode"
    />

    {/* Interests */}
    <Card>
      <Label className="text-[11px] uppercase tracking-[0.15em] text-[#B8651A] font-extrabold flex items-center gap-1.5">
        <Sparkles className="w-3.5 h-3.5" /> Detailed targeting · interests
      </Label>
      <p className="text-[11px] text-foreground/60 font-medium mt-1 mb-2">
        Meta ke 200k+ interests me se choose karein (Cricket, Bollywood, Online shopping, Diwali, etc.). Type karte hi Meta se real interest IDs aayenge.
      </p>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-foreground/40" />
        <Input
          value={p.interestQuery}
          onChange={(e) => p.setInterestQuery(e.target.value)}
          placeholder="Type interest (e.g. Cricket, Bollywood, Yoga, Diwali)…"
          className="pl-9"
        />
      </div>
      {p.interestLoading && (
        <p className="text-[11px] text-foreground/60 mt-2 flex items-center gap-1.5">
          <Loader2 className="w-3 h-3 animate-spin" /> Searching Meta…
        </p>
      )}
      {p.interestResults.length > 0 && (
        <div className="mt-2 border-2 border-[#E8B968] rounded-xl divide-y divide-[#E8B968]/40 bg-white max-h-60 overflow-y-auto">
          {p.interestResults.map((r) => {
            const sizeLow = r.audience_size_lower_bound ?? 0;
            const sizeHigh = r.audience_size_upper_bound ?? 0;
            const sizeLabel = sizeHigh > 0 ? `${compactNum(sizeLow)}–${compactNum(sizeHigh)}` : "—";
            const already = p.interestChips.find((c) => c.id === r.id);
            return (
              <button
                key={r.id}
                disabled={!!already}
                onClick={() => {
                  if (!already) p.setInterestChips([...p.interestChips, { id: r.id, name: r.name, size: sizeLow }]);
                  p.setInterestQuery("");
                }}
                className="w-full px-3 py-2 text-left hover:bg-[#FFF6E8] transition flex items-center gap-2 disabled:opacity-40"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#7A1500] flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-bold truncate">{r.name}</p>
                  {r.topic && <p className="text-[10px] text-foreground/50">{r.topic}</p>}
                </div>
                <span className="text-[10px] font-extrabold tabular-nums text-foreground/60">{sizeLabel}</span>
              </button>
            );
          })}
        </div>
      )}
      {p.interestChips.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {p.interestChips.map((c) => (
            <span key={c.id} className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-[#FFF1D6] border border-[#7A1500]/30 text-[#7A1500] text-[11px] font-extrabold">
              <Sparkles className="w-3 h-3" />
              {c.name}
              <button onClick={() => p.setInterestChips(p.interestChips.filter((x) => x.id !== c.id))} className="hover:text-[#D4308E]">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </Card>

    {/* Excluded interests */}
    <Card>
      <Label className="text-[11px] uppercase tracking-[0.15em] text-[#B8651A] font-extrabold flex items-center gap-1.5">
        <X className="w-3.5 h-3.5" /> Exclude interests <span className="text-foreground/40 normal-case ml-1">(optional)</span>
      </Label>
      <p className="text-[11px] text-foreground/60 font-medium mt-1 mb-2">
        Yeh interests waale logon ko ad NAHI dikhega. Useful for filtering competitors or wrong-fit audiences.
      </p>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-foreground/40" />
        <Input
          value={p.excludedInterestQuery}
          onChange={(e) => p.setExcludedInterestQuery(e.target.value)}
          placeholder="Type interest to exclude…"
          className="pl-9"
        />
      </div>
      {p.excludedInterestResults.length > 0 && (
        <div className="mt-2 border-2 border-[#D4308E]/40 rounded-xl divide-y divide-[#D4308E]/15 bg-white max-h-60 overflow-y-auto">
          {p.excludedInterestResults.map((r) => {
            const already = p.excludedInterests.find((c) => c.id === r.id);
            return (
              <button
                key={r.id}
                disabled={!!already}
                onClick={() => {
                  if (!already) p.setExcludedInterests([...p.excludedInterests, { id: r.id, name: r.name }]);
                  p.setExcludedInterestQuery("");
                }}
                className="w-full px-3 py-2 text-left hover:bg-[#FCE5F0]/40 transition flex items-center gap-2 disabled:opacity-40"
              >
                <X className="w-3.5 h-3.5 text-[#D4308E] flex-shrink-0" strokeWidth={3} />
                <span className="text-[12px] font-bold flex-1 truncate">{r.name}</span>
              </button>
            );
          })}
        </div>
      )}
      {p.excludedInterests.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {p.excludedInterests.map((c) => (
            <span key={c.id} className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-[#FCE5F0] border border-[#D4308E]/40 text-[#A11A6A] text-[11px] font-extrabold line-through">
              {c.name}
              <button onClick={() => p.setExcludedInterests(p.excludedInterests.filter((x) => x.id !== c.id))} className="no-underline hover:text-foreground">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </Card>

    {/* Exclude audience + Targeting expansion */}
    <Card>
      <Label className="text-[11px] uppercase tracking-[0.15em] text-[#B8651A] font-extrabold flex items-center gap-1.5">
        <X className="w-3.5 h-3.5" /> Exclude custom audience
      </Label>
      <p className="text-[11px] text-foreground/60 font-medium mt-1 mb-2">
        Yeh audience ke logon ko ad nahi dikhega (e.g. apne existing customers ko exclude karein to sirf naye log target hon).
      </p>
      <Select value={p.excludedAudienceId || "none"} onValueChange={(v) => p.setExcludedAudienceId(v === "none" ? "" : v)}>
        <SelectTrigger>
          <SelectValue placeholder="None — sab dikhayega" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">None</SelectItem>
          {p.audiences.map((a) => (
            <SelectItem key={a.id} value={a.id}>
              {a.name} <span className="text-foreground/60 ml-1">· {compactNum(a.size)}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="mt-4 flex items-center gap-3 p-3 rounded-xl bg-[#E6F7EE] border border-[#0E8A4B]/40">
        <CheckCircle2 className="w-5 h-5 text-[#0E8A4B] flex-shrink-0" strokeWidth={3} />
        <div className="flex-1">
          <p className="text-[13px] font-extrabold flex items-center gap-1.5 text-[#0A6E3C]">
            <Sparkles className="w-3.5 h-3.5" /> Meta Advantage detailed targeting · auto-applied
          </p>
          <p className="text-[11px] text-foreground/70 font-medium mt-0.5">
            Meta automatically expands audience beyond exact interests when cheaper results exist outside. No toggle needed — it's on by default for all campaigns (Meta removed the off-switch in 2024).
          </p>
        </div>
      </div>
    </Card>

    {/* Ad Creative */}
    <SectionHeader
      icon={ImageIcon}
      iconBg="bg-[#D4308E]"
      title="Ad creative · yeh actually dikhega"
      subtitle="Image/Video + heading + body + CTA button — yahi ad customer ko dikhega"
      tag="The visible part"
    />

    <Card accent="#D4308E">
      <Label className="text-[11px] uppercase tracking-[0.15em] text-[#B8651A] font-extrabold mb-2 block">
        Creative type
      </Label>
      <div className="flex gap-2 mb-4">
        <button
          type="button"
          onClick={() => { p.setCreativeType("image"); p.setAdImageUrl(""); p.setInstagramMediaId(null); p.setInstagramActorId(null); }}
          className={cn(
            "flex-1 px-3 py-2 rounded-xl border-2 text-[12px] font-extrabold transition-all",
            p.creativeType === "image" ? "border-[#D4308E] bg-[#FCE5F0] text-[#A11A6A]" : "border-[#E8B968] bg-white hover:bg-[#FFF6E8]"
          )}
        >Image Ad</button>
        <button
          type="button"
          onClick={() => { p.setCreativeType("video"); p.setAdImageUrl(""); p.setInstagramMediaId(null); p.setInstagramActorId(null); }}
          className={cn(
            "flex-1 px-3 py-2 rounded-xl border-2 text-[12px] font-extrabold transition-all",
            p.creativeType === "video" ? "border-[#D4308E] bg-[#FCE5F0] text-[#A11A6A]" : "border-[#E8B968] bg-white hover:bg-[#FFF6E8]"
          )}
        >Video Ad</button>
      </div>

      <Label className="text-[11px] uppercase tracking-[0.15em] text-[#B8651A] font-extrabold flex items-center gap-1.5 mt-2">
        <ImageIcon className="w-3.5 h-3.5" /> {p.creativeType === "image" ? "Ad image" : "Ad video"}
      </Label>
      <p className="text-[11px] text-foreground/60 font-medium mt-1 mb-2">
        {p.creativeType === "image"
          ? "1200×628px recommended · drag & drop upload via Cloudinary, ya public URL paste karein."
          : "MP4 recommended · upload, paste URL, ya Instagram video select karein."}
      </p>
      <AdMediaInput
        value={p.adImageUrl}
        onChange={(url, meta) => {
          p.setAdImageUrl(url);
          if (meta) {
            p.setInstagramMediaId(meta.instagram_media_id || null);
            p.setInstagramActorId(meta.instagram_actor_id || null);
          } else {
            p.setInstagramMediaId(null);
            p.setInstagramActorId(null);
          }
        }}
        resource={p.creativeType}
        pageId={p.pageId}
      />
    </Card>

    <Card accent="#D4308E">
      <Label htmlFor="cc-headline" className="text-[11px] uppercase tracking-[0.15em] text-[#B8651A] font-extrabold flex items-center gap-1.5">
        <FileText className="w-3.5 h-3.5" /> Headline <span className="text-foreground/40 ml-1">({p.adHeadline.length}/40)</span>
      </Label>
      <Input
        id="cc-headline"
        value={p.adHeadline}
        onChange={(e) => p.setAdHeadline(e.target.value.slice(0, 40))}
        placeholder="50% off · only 48 hours"
        className="mt-1.5 font-extrabold"
        maxLength={40}
      />
      <p className="text-[10px] text-foreground/50 font-medium mt-1.5">Big bold text below the image. Keep it short and punchy.</p>
    </Card>

    <Card accent="#D4308E">
      <Label htmlFor="cc-body" className="text-[11px] uppercase tracking-[0.15em] text-[#B8651A] font-extrabold flex items-center gap-1.5">
        <FileText className="w-3.5 h-3.5" /> Primary text <span className="text-foreground/40 ml-1">({p.adBody.length}/1000)</span>
      </Label>
      <Textarea
        id="cc-body"
        value={p.adBody}
        onChange={(e) => p.setAdBody(e.target.value.slice(0, 1000))}
        placeholder="Diwali special — WhatsApp pe order karein aur extra 15% discount paayein. Free delivery on orders above ₹499."
        className="mt-1.5"
        rows={4}
        maxLength={1000}
      />
      <p className="text-[10px] text-foreground/50 font-medium mt-1.5">Caption above the image. First 125 characters show in most placements; rest hides behind "See more".</p>
    </Card>

    <Card accent="#D4308E">
      <Label htmlFor="cc-link" className="text-[11px] uppercase tracking-[0.15em] text-[#B8651A] font-extrabold">
        Destination URL
      </Label>
      <Input
        id="cc-link"
        value={p.adLinkUrl}
        onChange={(e) => p.setAdLinkUrl(e.target.value)}
        placeholder={p.isCTW ? "https://wa.me/919709707311" : "https://yoursite.com/landing"}
        className="mt-1.5 font-mono text-[12px]"
      />
      {p.isCTW && p.whatsappNumber && (
        <p className="text-[11px] text-[#0A6E3C] font-medium mt-1.5 flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5" strokeWidth={3} /> Auto-filled from connected WhatsApp number: {p.whatsappNumber}
        </p>
      )}
      {!p.isCTW && (
        <p className="text-[11px] text-foreground/60 font-medium mt-1.5">
          Jahan customer click karke jayega · landing page, product page, ya wa.me link.
        </p>
      )}
      <div className="mt-3 px-3 py-2 rounded-lg bg-[#FFF1D6] border border-[#E8B968] text-[11px] font-bold text-[#7A4A00]">
        CTA button: <span className="font-mono">{p.objectiveObj.cta}</span> ({p.objectiveObj.label} ke liye recommended)
      </div>
    </Card>

    {/* Icebreaker — pre-filled WhatsApp message */}
    {p.isCTW && (
      <Card accent="#25D366">
        <Label htmlFor="cc-ice" className="text-[11px] uppercase tracking-[0.15em] text-[#B8651A] font-extrabold flex items-center gap-1.5">
          <MessageCircle className="w-3.5 h-3.5" /> Pre-filled WhatsApp message <span className="text-foreground/40 ml-1">(optional)</span>
        </Label>
        <Input
          id="cc-ice"
          value={p.icebreaker}
          onChange={(e) => p.setIcebreaker(e.target.value.slice(0, 200))}
          placeholder="Hi, mujhe Diwali offer ke baare me jaanna hai"
          className="mt-1.5"
          maxLength={200}
        />
        <p className="text-[11px] text-foreground/60 font-medium mt-1.5">
          Customer click karega → WhatsApp khulega aur yeh text already typed hoga. Sirf "Send" dabana hai. Conversion {">"}2x increase karta hai.
        </p>
      </Card>
    )}
  </>
);

/* ─────────────────────────── Placement block ─────────────────────────── */

const PlacementBlock = ({
  platform, enabled, onEnabled, placements, onPlacements, options,
}: {
  platform: "facebook" | "instagram";
  enabled: boolean;
  onEnabled: (v: boolean) => void;
  placements: string[];
  onPlacements: (v: string[]) => void;
  options: readonly { readonly id: string; readonly label: string }[];
}) => {
  const isFB = platform === "facebook";
  const color = isFB ? "#0866FF" : "#D4308E";
  const Logo = () => isFB
    ? <span className="w-5 h-5 rounded-full bg-[#0866FF] text-white flex items-center justify-center text-[11px] font-black flex-shrink-0">f</span>
    : <span className="w-5 h-5 rounded-md bg-gradient-to-br from-[#FFD23F] via-[#D4308E] to-[#3C50E0] text-white flex items-center justify-center flex-shrink-0">
        <span className="w-3 h-3 rounded-full border-[1.5px] border-white" />
      </span>;
  return (
    <div className={cn("rounded-xl border-2 p-3", enabled ? "border-[#E8B968] bg-white" : "border-[#E8B968]/40 bg-[#FFF6E8]/40 opacity-60")}>
      <div className="flex items-center gap-2 mb-2">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => onEnabled(e.target.checked)}
          className="w-4 h-4 accent-[#FF6A1F]"
        />
        <Logo />
        <span className="text-[13px] font-extrabold capitalize">{platform}</span>
        <span className="text-[10px] text-foreground/60 font-medium">
          {placements.length}/{options.length} placements
        </span>
        <button
          onClick={() => onPlacements(placements.length === options.length ? [] : options.map((o) => o.id))}
          disabled={!enabled}
          className="ml-auto text-[10px] font-extrabold text-foreground/60 hover:text-foreground disabled:opacity-40"
        >
          {placements.length === options.length ? "Clear all" : "Select all"}
        </button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => {
          const isOn = placements.includes(o.id);
          return (
            <button
              key={o.id}
              disabled={!enabled}
              onClick={() => onPlacements(isOn ? placements.filter((p) => p !== o.id) : [...placements, o.id])}
              className={cn(
                "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold border transition disabled:opacity-40",
                isOn ? "border-transparent text-white" : "border-[#E8B968] bg-white text-foreground/70 hover:bg-[#FFF1D6]"
              )}
              style={isOn ? { background: color } : {}}
            >
              {isOn && <CheckCircle2 className="w-3 h-3" strokeWidth={3} />}
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};

/* ─────────────────────────── STEP 3 ─────────────────────────── */

const StepBudget = ({
  budget, setBudget, optimizeAI, setOptimizeAI, launchPaused, setLaunchPaused,
  name, objectiveObj, audienceName, locationLabel, languageLabel,
  pageName, adHeadline, adBody, adImageUrl, creativeType,
}: {
  budget: string; setBudget: (v: string) => void;
  optimizeAI: boolean; setOptimizeAI: (v: boolean) => void;
  launchPaused: boolean; setLaunchPaused: (v: boolean) => void;
  name: string; objectiveObj: typeof OBJECTIVES[number];
  audienceName: string; locationLabel: string; languageLabel: string;
  pageName: string; adHeadline: string; adBody: string; adImageUrl: string;
  creativeType: "image" | "video";
}) => (
  <>
    <SectionHeader
      icon={IndianRupee}
      iconBg="bg-[#0E8A4B]"
      tag="Step 3 · Spend"
      title="Budget aur final review"
      subtitle="Daily budget set karo, AI optimization on rakho, aur campaign launch karo"
    />

    <Card>
      <Label htmlFor="cc-budget" className="text-[11px] uppercase tracking-[0.15em] text-[#B8651A] font-extrabold">
        Daily budget (₹)
      </Label>
      <div className="relative mt-2">
        <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#FF6A1F]" />
        <Input id="cc-budget" type="number" value={budget} onChange={(e) => setBudget(e.target.value)} min={100} step={100} className="pl-9 text-lg font-extrabold tabular-nums" />
      </div>
      <div className="flex gap-1.5 mt-2 flex-wrap">
        {BUDGET_PRESETS.map((p) => (
          <button
            key={p}
            onClick={() => setBudget(p)}
            className={cn(
              "px-3 py-1.5 rounded-full text-[12px] font-extrabold border-2 transition-all tabular-nums",
              budget === p ? "bg-[#FF6A1F] text-white border-[#B8420A]" : "bg-white text-foreground/70 border-[#E8B968] hover:bg-[#FFF1D6]"
            )}
          >₹{Number(p).toLocaleString("en-IN")}</button>
        ))}
      </div>
      <p className="text-[11px] text-foreground/60 font-medium mt-2">
        Minimum ₹100/day. Meta is amount tak hi spend karega.
      </p>
    </Card>

    <Card className="bg-[#FFF1D6] border-[#E8B968]">
      <div className="flex items-center gap-3">
        <Switch checked={optimizeAI} onCheckedChange={setOptimizeAI} />
        <div className="flex-1">
          <p className="text-[13px] font-extrabold flex items-center gap-1.5">
            <Brain className="w-3.5 h-3.5 text-[#FF6A1F]" /> Addison AI ko optimize karne dein
          </p>
          <p className="text-[11px] text-foreground/70 font-medium mt-0.5">
            Budget, bid, creatives auto-adjust honge har 6 ghante mein
          </p>
        </div>
      </div>
    </Card>

    <Card className={launchPaused ? "bg-white" : "bg-[#E6F7EE] border-[#0E8A4B]"}>
      <div className="flex items-center gap-3">
        <Switch checked={!launchPaused} onCheckedChange={(v) => setLaunchPaused(!v)} />
        <div className="flex-1">
          <p className="text-[13px] font-extrabold">{launchPaused ? "Create as paused (recommended)" : "Launch immediately"}</p>
          <p className="text-[11px] text-foreground/70 font-medium mt-0.5">
            {launchPaused
              ? "Ad create ho jayega but chalega nahi · Meta Ads Manager me review karke ON karein"
              : "⚠️ Ad turant chalu ho jaayegi aur paise spend hone shuru ho jayenge"}
          </p>
        </div>
      </div>
    </Card>

    <Card>
      <p className="text-[11px] uppercase tracking-[0.15em] text-[#B8651A] font-extrabold mb-3">Review summary</p>
      <div className="space-y-2">
        <ReviewRow label="Objective"     value={objectiveObj.label} icon={objectiveObj.icon} />
        <ReviewRow label="Campaign name" value={name || "—"} />
        <ReviewRow label="Facebook Page" value={pageName} />
        <ReviewRow label="Audience"      value={audienceName} />
        <ReviewRow label="Location"      value={locationLabel} />
        <ReviewRow label="Language"      value={languageLabel} />
        <ReviewRow label="Headline"      value={adHeadline || "—"} />
        <ReviewRow label="Body"          value={adBody ? (adBody.length > 50 ? adBody.slice(0, 50) + "…" : adBody) : "—"} />
        <ReviewRow label={creativeType === "image" ? "Image" : "Video"} value={adImageUrl ? "✓ attached" : "(none — text only ad)"} />
        <ReviewRow label="Daily budget"  value={`₹${Number(budget).toLocaleString("en-IN")}`} />
      </div>
    </Card>
  </>
);

/* ─────────────────────────── Shared blocks ─────────────────────────── */

/** Section header with gradient halo, decorative tag stripe, and animated
 *  icon — looks more like a polished SaaS hero than a plain h2. */
const SectionHeader = ({
  icon: Icon, iconBg, title, subtitle, tag,
}: { icon: typeof Target; iconBg: string; title: string; subtitle: string; tag?: string }) => (
  <div className="relative mb-1 mt-2">
    <div className="flex items-center gap-3">
      <div className="relative flex-shrink-0">
        {/* Glow halo */}
        <div className={cn("absolute inset-0 rounded-2xl blur-md opacity-40", iconBg)} />
        <div className={cn("relative w-12 h-12 rounded-2xl text-white flex items-center justify-center shadow-md", iconBg)}>
          <Icon className="w-6 h-6" strokeWidth={2.5} />
        </div>
      </div>
      <div className="flex-1 min-w-0">
        {tag && (
          <span className="inline-block text-[9px] font-extrabold uppercase tracking-[0.18em] text-[#B8651A] bg-[#FFF1D6] px-2 py-0.5 rounded-full border border-[#E8B968] mb-1">
            {tag}
          </span>
        )}
        <h2 className="text-[20px] font-black tracking-tight leading-tight">{title}</h2>
        <p className="text-[12px] text-foreground/70 font-medium mt-0.5">{subtitle}</p>
      </div>
    </div>
    {/* Decorative dashed bottom rule */}
    <div className="mt-3 h-px bg-[image:repeating-linear-gradient(90deg,#E8B968_0,#E8B968_6px,transparent_6px,transparent_12px)]" />
  </div>
);

/** Card with subtle category-color accent strip on the left edge + lift-on-hover.
 *  Default accent is saffron. Pass `accent` to switch (e.g. blue for targeting,
 *  magenta for creative). */
const Card = ({
  children, className, accent = "#E8B968",
}: { children: React.ReactNode; className?: string; accent?: string }) => (
  <div
    className={cn(
      "group relative bg-white border-2 border-[#E8B968] rounded-2xl p-4 shadow-[0_3px_0_0_#E8B968] transition-all duration-200 hover:-translate-y-px hover:shadow-[0_5px_0_0_#E8B968] overflow-hidden",
      className
    )}
  >
    {/* Accent strip — only shows when accent != default cream */}
    {accent !== "#E8B968" && (
      <span className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl" style={{ background: accent }} />
    )}
    {children}
  </div>
);

/** Empty-state shown inside the Page picker when /me/accounts returns no pages.
 *  Pages can't be created via API (Meta restriction), so we deep-link the user
 *  to the right place + show what they have to do once the page exists. */
const PageEmptyState = () => (
  <div className="rounded-xl border-2 border-dashed border-[#D4308E]/40 bg-[#FCE5F0]/40 p-3">
    <div className="flex items-start gap-2.5 mb-3">
      <div className="w-8 h-8 rounded-lg bg-[#D4308E] text-white flex items-center justify-center flex-shrink-0">
        <Info className="w-4 h-4" strokeWidth={2.5} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-extrabold text-[#A11A6A]">Koi Facebook Page nahi mila</p>
        <p className="text-[11px] text-foreground/70 font-medium mt-0.5">
          Meta khud ke API se hum Page banaa nahi sakte — Meta ki policy hai. 3 quick steps:
        </p>
      </div>
    </div>

    <ol className="space-y-2 text-[11px] mb-3">
      <li className="flex items-start gap-2">
        <span className="w-5 h-5 rounded-full bg-[#FF6A1F] text-white text-[10px] font-extrabold flex items-center justify-center flex-shrink-0">1</span>
        <div>
          <p className="font-extrabold">Page banao</p>
          <p className="text-foreground/70 font-medium">Click niche button — new tab khulega Meta pe</p>
        </div>
      </li>
      <li className="flex items-start gap-2">
        <span className="w-5 h-5 rounded-full bg-[#FF6A1F] text-white text-[10px] font-extrabold flex items-center justify-center flex-shrink-0">2</span>
        <div>
          <p className="font-extrabold">Business Manager me Page add karo</p>
          <p className="text-foreground/70 font-medium">business.facebook.com → Settings → Pages → Add → "Claim a Page" → Page name daalo</p>
        </div>
      </li>
      <li className="flex items-start gap-2">
        <span className="w-5 h-5 rounded-full bg-[#FF6A1F] text-white text-[10px] font-extrabold flex items-center justify-center flex-shrink-0">3</span>
        <div>
          <p className="font-extrabold">System User ko Page assign karo</p>
          <p className="text-foreground/70 font-medium">Settings → Users → System Users → "Addison" → Assign Assets → Pages → tick karo, "Manage Page" permission</p>
        </div>
      </li>
    </ol>

    <div className="flex gap-2 flex-wrap">
      <a
        href="https://www.facebook.com/pages/create"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#0866FF] text-white text-[12px] font-extrabold hover:bg-[#0050D6] transition"
      >
        <span className="w-4 h-4 rounded-full bg-white text-[#0866FF] flex items-center justify-center text-[10px] font-black">f</span>
        Create new Facebook Page →
      </a>
      <a
        href="https://business.facebook.com/settings/system-users"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white border-2 border-[#E8B968] text-foreground text-[12px] font-extrabold hover:bg-[#FFF6E8] transition"
      >
        Business Manager →
      </a>
    </div>

    <p className="text-[10px] text-foreground/60 font-medium mt-3">
      Page assign karne ke baad upar "Refresh" dabao — yahaan dropdown me dikhega.
    </p>
  </div>
);

const ReviewRow = ({ label, value, icon: Icon }: { label: string; value: string; icon?: typeof Target }) => (
  <div className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-[#FFF6E8] border border-[#E8B968]/40">
    <span className="text-[10px] uppercase tracking-[0.12em] text-[#B8651A] font-extrabold flex items-center gap-1.5 flex-shrink-0">
      {Icon && <Icon className="w-3 h-3" />} {label}
    </span>
    <span className="text-[13px] font-extrabold text-right truncate">{value}</span>
  </div>
);

/* ─── Realistic Facebook-feed style ad preview ─── */

const ctaLabel = (cta: string): string => {
  const map: Record<string, string> = {
    LEARN_MORE: "Learn More",
    SHOP_NOW: "Shop Now",
    SIGN_UP: "Sign Up",
    LIKE_PAGE: "Like Page",
    WHATSAPP_MESSAGE: "WhatsApp",
    MESSAGE_PAGE: "Message",
    CONTACT_US: "Contact Us",
    DOWNLOAD: "Download",
    SUBSCRIBE: "Subscribe",
    BOOK_TRAVEL: "Book Now",
    ORDER_NOW: "Order Now",
  };
  return map[cta] ?? "Learn More";
};

type PreviewMode = "ig_feed" | "fb_feed" | "ig_story";

const AdMockupPreview = ({
  pageName, headline, body, imageUrl, creativeType = "image", ctaLabel: cta, isCTW,
}: {
  pageName: string;
  headline: string;
  body: string;
  imageUrl: string;
  creativeType?: "image" | "video";
  ctaLabel: string;
  isCTW: boolean;
}) => {
  const [mode, setMode] = useState<PreviewMode>("ig_feed");
  return (
    <div>
      {/* Platform tabs */}
      <div className="flex gap-1 mb-2 px-1">
        <PreviewTab active={mode === "ig_feed"} onClick={() => setMode("ig_feed")} color="#D4308E" label="Instagram" />
        <PreviewTab active={mode === "fb_feed"} onClick={() => setMode("fb_feed")} color="#0866FF" label="Facebook" />
        <PreviewTab active={mode === "ig_story"} onClick={() => setMode("ig_story")} color="#D4308E" label="Story" />
      </div>

      {/* Phone frame */}
      <div className="bg-[#1F1F1F] rounded-[28px] p-2 shadow-[0_8px_24px_rgba(0,0,0,0.18)] mx-auto" style={{ maxWidth: 320 }}>
        {/* Notch */}
        <div className="flex justify-center mb-1">
          <div className="w-16 h-3 rounded-b-xl bg-black" />
        </div>
        {/* Screen */}
        <div className="bg-white rounded-[20px] overflow-hidden">
          {mode === "ig_feed" && <InstagramFeedCard pageName={pageName} headline={headline} body={body} imageUrl={imageUrl} creativeType={creativeType} cta={cta} isCTW={isCTW} />}
          {mode === "fb_feed" && <FacebookFeedCard pageName={pageName} headline={headline} body={body} imageUrl={imageUrl} creativeType={creativeType} cta={cta} isCTW={isCTW} />}
          {mode === "ig_story" && <InstagramStoryCard pageName={pageName} body={body} imageUrl={imageUrl} creativeType={creativeType} cta={cta} isCTW={isCTW} />}
        </div>
        {/* Home bar */}
        <div className="flex justify-center pt-2 pb-1">
          <div className="w-24 h-1 rounded-full bg-white/40" />
        </div>
      </div>
    </div>
  );
};

const PreviewTab = ({ active, onClick, color, label }: { active: boolean; onClick: () => void; color: string; label: string }) => (
  <button
    onClick={onClick}
    className={cn(
      "flex-1 px-2 py-1.5 rounded-lg text-[11px] font-extrabold border-2 transition-all",
      active ? "text-white border-transparent" : "bg-white text-foreground/60 border-[#E8B968]"
    )}
    style={active ? { background: color } : {}}
  >
    {label}
  </button>
);

/* ─── Instagram Feed (square image, IG header) ─── */
const InstagramFeedCard = ({ pageName, headline, body, imageUrl, creativeType = "image", cta, isCTW }: { pageName: string; headline: string; body: string; imageUrl: string; creativeType?: "image" | "video"; cta: string; isCTW: boolean }) => {
  const initial = (pageName || "A").charAt(0).toUpperCase();
  return (
    <div className="font-sans text-[#262626]">
      {/* IG header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-[#EFEFEF]">
        <div className="p-[2px] rounded-full bg-gradient-to-tr from-[#FFD23F] via-[#D4308E] to-[#3C50E0]">
          <div className="w-8 h-8 rounded-full bg-white p-[2px]">
            <div className="w-full h-full rounded-full bg-gradient-to-br from-[#0866FF] to-[#D4308E] text-white flex items-center justify-center text-[11px] font-extrabold">
              {initial}
            </div>
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[12px] font-bold truncate leading-tight">{pageName}</p>
          <p className="text-[10px] text-[#737373]">Sponsored</p>
        </div>
        <MoreHorizontal className="w-4 h-4 text-[#262626]" />
      </div>
      {/* Media (square, 1:1 for IG feed) */}
      <div className="bg-[#FAFAFA] aspect-square flex items-center justify-center overflow-hidden">
        {imageUrl ? (
          creativeType === "video" ? (
            <video src={imageUrl} className="w-full h-full object-cover animate-pulse" controls muted autoPlay loop />
          ) : (
            <img src={imageUrl} alt="ad" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
          )
        ) : (
          <div className="text-center text-[#A8A8A8] p-4">
            <ImageIcon className="w-10 h-10 mx-auto mb-1 opacity-50" />
            <p className="text-[10px] font-medium">{creativeType === "video" ? "Video · Instagram Feed" : "1:1 · Instagram Feed"}</p>
          </div>
        )}
      </div>
      {/* CTA bar (full width swipe-up style) */}
      <button
        className={cn(
          "w-full py-2.5 flex items-center justify-center gap-1.5 border-b border-[#EFEFEF] text-[12px] font-extrabold",
          isCTW ? "bg-[#25D366] text-white" : "bg-[#0866FF] text-white"
        )}
      >
        {isCTW && <MessageCircle className="w-3.5 h-3.5" fill="currentColor" strokeWidth={0} />}
        {cta}
        <ArrowRight className="w-3 h-3 ml-1" />
      </button>
      {/* Reactions */}
      <div className="flex items-center gap-3 px-3 py-1.5">
        <Heart className="w-5 h-5" />
        <MessageSquare className="w-5 h-5" />
        <Share2 className="w-5 h-5" />
      </div>
      {/* Caption */}
      <div className="px-3 pb-2">
        <p className="text-[11px] font-bold inline">{pageName} </p>
        <p className="text-[11px] inline">
          {body ? (body.length > 80 ? <>{body.slice(0, 80)}<span className="text-[#8E8E8E]"> … more</span></> : body) : <span className="italic text-[#A8A8A8]">Your primary text will appear here</span>}
        </p>
        {headline && <p className="text-[10px] text-[#8E8E8E] mt-0.5 truncate">{headline}</p>}
      </div>
    </div>
  );
};

/* ─── Facebook Feed (1.91:1 image, FB header) ─── */
const FacebookFeedCard = ({ pageName, headline, body, imageUrl, creativeType = "image", cta, isCTW }: { pageName: string; headline: string; body: string; imageUrl: string; creativeType?: "image" | "video"; cta: string; isCTW: boolean }) => {
  const initial = (pageName || "A").charAt(0).toUpperCase();
  return (
    <div className="font-sans">
      <div className="flex items-center gap-2 px-3 pt-3 pb-2">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#0866FF] to-[#D4308E] text-white flex items-center justify-center text-[12px] font-extrabold flex-shrink-0">
          {initial}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[12px] font-bold text-[#050505] truncate leading-tight">{pageName}</p>
          <div className="flex items-center gap-1 text-[10px] text-[#65676B]">
            <span>Sponsored</span>·<Globe className="w-2.5 h-2.5" />
          </div>
        </div>
        <MoreHorizontal className="w-4 h-4 text-[#65676B]" />
      </div>
      {body ? (
        <p className="px-3 pb-2 text-[12px] text-[#050505] leading-snug">
          {body.length > 100 ? <>{body.slice(0, 100)}<span className="text-[#65676B] font-medium"> … See more</span></> : body}
        </p>
      ) : (
        <p className="px-3 pb-2 text-[11px] text-[#65676B] italic">Your primary text will appear here</p>
      )}
      <div className="bg-[#F0F2F5] aspect-[1.91/1] flex items-center justify-center overflow-hidden">
        {imageUrl ? (
          creativeType === "video" ? (
            <video src={imageUrl} className="w-full h-full object-cover animate-pulse" controls muted autoPlay loop />
          ) : (
            <img src={imageUrl} alt="ad" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
          )
        ) : (
          <div className="text-center text-[#65676B] p-4">
            <ImageIcon className="w-7 h-7 mx-auto mb-1 opacity-50" />
            <p className="text-[10px] font-medium">{creativeType === "video" ? "Video · Facebook Feed" : "1200×628 · Facebook Feed"}</p>
          </div>
        )}
      </div>
      <div className="bg-[#F0F2F5] px-3 py-2 flex items-center justify-between">
        <div className="min-w-0">
          <p className="text-[9px] uppercase tracking-wider text-[#65676B] font-medium">{isCTW ? "WA.ME" : "WEBSITE"}</p>
          <p className="text-[12px] font-bold text-[#050505] truncate">{headline || "Your headline appears here"}</p>
        </div>
        <button
          className={cn(
            "inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-bold flex-shrink-0 ml-2 border",
            isCTW ? "bg-white border-[#25D366] text-[#25D366]" : "bg-[#0866FF] text-white border-[#0866FF]"
          )}
        >
          {isCTW && <MessageCircle className="w-3 h-3" fill="currentColor" strokeWidth={0} />}
          {cta}
        </button>
      </div>
      <div className="flex items-center gap-1 px-3 py-1.5 border-t border-[#E8E8E8] text-[#65676B]">
        <button className="flex-1 flex items-center justify-center gap-1 text-[11px] font-bold"><ThumbsUp className="w-3.5 h-3.5" />Like</button>
        <button className="flex-1 flex items-center justify-center gap-1 text-[11px] font-bold"><MessageSquare className="w-3.5 h-3.5" />Comment</button>
        <button className="flex-1 flex items-center justify-center gap-1 text-[11px] font-bold"><Share2 className="w-3.5 h-3.5" />Share</button>
      </div>
    </div>
  );
};

/* ─── Instagram Story (9:16 vertical, full image, overlay) ─── */
const InstagramStoryCard = ({ pageName, body, imageUrl, creativeType = "image", cta, isCTW }: { pageName: string; body: string; imageUrl: string; creativeType?: "image" | "video"; cta: string; isCTW: boolean }) => {
  const initial = (pageName || "A").charAt(0).toUpperCase();
  return (
    <div className="relative bg-black overflow-hidden" style={{ aspectRatio: "9/16" }}>
      {imageUrl ? (
        creativeType === "video" ? (
          <video src={imageUrl} className="absolute inset-0 w-full h-full object-cover" controls muted autoPlay loop />
        ) : (
          <img src={imageUrl} alt="ad" className="absolute inset-0 w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
        )
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-[#D4308E] via-[#7A1500] to-[#0A3D24] flex items-center justify-center text-center text-white/80">
          <div>
            <ImageIcon className="w-12 h-12 mx-auto mb-2 opacity-60" />
            <p className="text-[11px] font-bold">{creativeType === "video" ? "Video · Story / Reel" : "9:16 · Story / Reel"}</p>
            <p className="text-[10px] mt-1 opacity-70">Upload vertical or full-bleed {creativeType === "video" ? "video" : "image"}</p>
          </div>
        </div>
      )}
      {/* Progress bar */}
      <div className="absolute top-0 left-0 right-0 h-1 mx-2 mt-2 bg-white/30 rounded-full overflow-hidden">
        <div className="h-full bg-white w-1/3" />
      </div>
      {/* Story header */}
      <div className="absolute top-3 left-0 right-0 px-3 flex items-center gap-2 text-white">
        <div className="w-7 h-7 rounded-full bg-white/20 backdrop-blur flex items-center justify-center text-[11px] font-extrabold border border-white/30">
          {initial}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-bold truncate">{pageName}</p>
          <p className="text-[9px] opacity-80">Sponsored</p>
        </div>
        <MoreHorizontal className="w-4 h-4" />
      </div>
      {/* Bottom caption + swipe-up CTA */}
      <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/70 to-transparent">
        {body && <p className="text-white text-[11px] font-medium mb-2 line-clamp-2">{body}</p>}
        <button
          className={cn(
            "w-full py-2 rounded-full text-[12px] font-extrabold flex items-center justify-center gap-1.5 border",
            isCTW ? "bg-white text-[#25D366] border-white" : "bg-white text-[#0866FF] border-white"
          )}
        >
          {isCTW && <MessageCircle className="w-3.5 h-3.5" fill="currentColor" strokeWidth={0} />}
          {cta}
          <ArrowRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};

const LivePreviewCard = ({
  name, objectiveObj, dailySpend, reachLow, reachHigh, resultsLow, resultsHigh,
  audienceSizeLow, audienceSizeHigh, mode, loading, optimizeAI,
}: {
  name: string;
  objectiveObj: typeof OBJECTIVES[number];
  dailySpend: number;
  reachLow: number; reachHigh: number;
  resultsLow: number; resultsHigh: number;
  audienceSizeLow?: number; audienceSizeHigh?: number;
  mode: "live" | "warming" | "demo";
  loading: boolean;
  optimizeAI: boolean;
}) => (
  <div className="bg-gradient-to-br from-[#0A3D24] to-[#0D4E2E] text-white rounded-2xl border-2 border-[#0A3D24] shadow-[0_4px_0_0_#072917] p-5 relative overflow-hidden">
    <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "20px 20px" }} />
    <div className="relative">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-9 h-9 rounded-lg bg-[#FFD23F] text-[#7A4A00] flex items-center justify-center">
          <Eye className="w-4 h-4" strokeWidth={2.5} />
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-[0.18em] text-[#FFD23F] font-extrabold flex items-center gap-1.5">
            {mode === "live" ? "Live estimate · Meta" : mode === "warming" ? "Estimate warming up" : "Demo estimate"}
            {loading && <Loader2 className="w-3 h-3 animate-spin" />}
          </p>
          <p className="text-[13px] font-extrabold truncate max-w-[240px]">{name || "Naya campaign"}</p>
        </div>
      </div>

      <PreviewStat label="Per day"   value={`₹${dailySpend.toLocaleString("en-IN")}`} />
      <PreviewStat label="Per week"  value={`₹${(dailySpend * 7).toLocaleString("en-IN")}`} />
      <PreviewStat label="Per month" value={`₹${(dailySpend * 30).toLocaleString("en-IN")}`} />

      <div className="border-t border-white/15 my-3" />

      {audienceSizeLow !== undefined && audienceSizeHigh !== undefined && audienceSizeHigh > 0 && (
        <div className="mb-3">
          <p className="text-[10px] uppercase tracking-[0.15em] text-[#FFD23F] font-extrabold mb-1">Audience size</p>
          <p className="text-[14px] font-extrabold">
            {compactNum(audienceSizeLow)}<span className="opacity-60 mx-1">–</span>{compactNum(audienceSizeHigh)} people
          </p>
        </div>
      )}

      <p className="text-[10px] uppercase tracking-[0.15em] text-[#FFD23F] font-extrabold mb-1.5">Expected daily reach</p>
      <p className="text-2xl font-black tracking-tight">
        {compactNum(reachLow)}<span className="opacity-60 mx-1">–</span>{compactNum(reachHigh)}
        <span className="text-[11px] opacity-70 font-medium ml-1">people</span>
      </p>

      <div className="mt-3">
        <p className="text-[10px] uppercase tracking-[0.15em] text-[#FFD23F] font-extrabold mb-1.5">Expected {objectiveObj.label.toLowerCase()}</p>
        <p className="text-2xl font-black tracking-tight tabular-nums">
          {resultsLow}<span className="opacity-60 mx-1">–</span>{resultsHigh}
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

const PreflightCard = ({
  data,
}: {
  data: { ok: boolean; checks: Array<{ id: string; status: "pass" | "warn" | "fail"; label: string; message: string; fix_url?: string }> };
}) => (
  <div className={cn("border-2 rounded-2xl p-4 shadow-[0_3px_0_0_currentColor]", data.ok ? "bg-[#E6F7EE] border-[#0E8A4B] text-[#0A6E3C]" : "bg-[#FCE5F0] border-[#D4308E] text-[#A11A6A]")}>
    <div className="flex items-center gap-2 mb-2.5">
      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center text-white", data.ok ? "bg-[#0E8A4B]" : "bg-[#D4308E]")}>
        {data.ok ? <CheckCircle2 className="w-4 h-4" strokeWidth={3} /> : <Info className="w-4 h-4" strokeWidth={2.5} />}
      </div>
      <p className="text-[11px] uppercase tracking-[0.15em] font-extrabold">
        {data.ok ? "Pre-launch · all checks passed" : "Pre-launch · fix these first"}
      </p>
    </div>
    <ul className="space-y-1.5">
      {data.checks.map((c) => (
        <li key={c.id} className="flex items-start gap-1.5 text-[12px] text-foreground">
          {c.status === "pass" && <CheckCircle2 className="w-3.5 h-3.5 text-[#0E8A4B] flex-shrink-0 mt-0.5" strokeWidth={3} />}
          {c.status === "warn" && <Info className="w-3.5 h-3.5 text-[#B8651A] flex-shrink-0 mt-0.5" strokeWidth={3} />}
          {c.status === "fail" && <X className="w-3.5 h-3.5 text-[#D4308E] flex-shrink-0 mt-0.5" strokeWidth={3} />}
          <div className="min-w-0 flex-1">
            <p className="font-extrabold">{c.label}</p>
            <p className="text-foreground/70 font-medium">{c.message}</p>
            {c.fix_url && (
              <a href={c.fix_url} target="_blank" rel="noopener noreferrer" className="text-[11px] font-extrabold underline text-[#3C50E0]">
                Open fix page →
              </a>
            )}
          </div>
        </li>
      ))}
    </ul>
  </div>
);

const AISuggestionsCard = ({ objective, budget }: { objective: string; budget: string }) => {
  const suggestions = useMemo(() => {
    const out: string[] = [];
    if (Number(budget) < 1000) out.push("Budget ₹1,000+ rakho — Meta ko learning ke liye chahiye");
    if (objective === "ctw") out.push("WhatsApp greeting template approve karwa lo — pehli reply isi se jaayegi");
    if (objective === "leads") out.push("Form ke 2-3 fields hi rakho — har extra field 15% drop-off karta hai");
    out.push("Pehle 3 din 'learning phase' — results din 4 se settle hote hain");
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
