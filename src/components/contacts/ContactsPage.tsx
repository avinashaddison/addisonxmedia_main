import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PageShell } from "@/components/PageShell";
import { Contact, tagLabel, initialsFor, formatRelative } from "@/lib/inbox-types";
import {
  Users, Search, Plus, Download, Flame, Snowflake, CircleDot, Phone, Mail,
  TrendingUp, IndianRupee, MessageCircle, CreditCard, Send, Sparkles, Zap,
  Clock, Filter, ChevronDown, X, CheckSquare, Square, MoreHorizontal,
  AlertCircle, ArrowUpRight, UserPlus, Megaphone,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const useContacts = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["contacts-page", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<Contact[]> => {
      const { data, error } = await supabase
        .from("contacts")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
};

const tagPill: Record<Contact["tag"], string> = {
  hot: "bg-hot-soft text-hot",
  warm: "bg-warning-soft text-warning",
  cold: "bg-accent-soft text-accent",
};

const formatINR = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

const compactINR = (n: number) => {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(1)}Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
  return `₹${n}`;
};

// Deterministic intent signals & AI suggestion based on contact data
const intentSignalsFor = (c: Contact): string[] => {
  const seed = c.id.charCodeAt(0) + c.id.charCodeAt(1);
  const all = ["Asked price", "Requested demo", "Seen offer", "Opened link", "Replied fast", "Visited pricing"];
  if (c.tag === "hot") return [all[seed % all.length], all[(seed + 2) % all.length], "Asked price"].slice(0, 3);
  if (c.tag === "warm") return [all[seed % all.length], all[(seed + 3) % all.length]];
  if (c.score >= 30) return [all[(seed + 4) % all.length]];
  return [];
};

const aiSuggestionFor = (c: Contact): { label: string; tone: "hot" | "warm" | "cold" } => {
  if (c.tag === "hot" || c.score >= 80) return { label: "Close now", tone: "hot" };
  if (c.tag === "warm" || c.score >= 50) return { label: "Ask budget", tone: "warm" };
  return { label: "Follow-up", tone: "cold" };
};

// Last activity (deterministic mock until real signal lands)
const lastActivityFor = (c: Contact): { label: string; minsAgo: number } => {
  const mins = (c.id.charCodeAt(0) * 7 + c.id.charCodeAt(1) * 13) % 2880; // 0-48h
  if (mins < 1) return { label: "Just now", minsAgo: 0 };
  if (mins < 60) return { label: `${mins}m ago`, minsAgo: mins };
  if (mins < 1440) return { label: `${Math.floor(mins / 60)}h ago`, minsAgo: mins };
  return { label: `${Math.floor(mins / 1440)}d ago`, minsAgo: mins };
};

const potentialValueFor = (c: Contact) => Math.round(2000 + c.score * 100);

// Quick segment definitions
type Segment = "all" | "ready" | "followup" | "cold";

export const ContactsPage = () => {
  const { data: contacts = [], isLoading } = useContacts();
  const [search, setSearch] = useState("");
  const [tagFilter, setTagFilter] = useState<"all" | Contact["tag"]>("all");
  const [segment, setSegment] = useState<Segment>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [scoreMin, setScoreMin] = useState(0);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [insightsOpen, setInsightsOpen] = useState(true);

  const stats = useMemo(() => {
    const hot = contacts.filter((c) => c.tag === "hot").length;
    const warm = contacts.filter((c) => c.tag === "warm").length;
    const cold = contacts.filter((c) => c.tag === "cold").length;
    const avgScore = contacts.length
      ? Math.round(contacts.reduce((a, c) => a + c.score, 0) / contacts.length)
      : 0;
    const potentialRevenue = contacts
      .filter((c) => c.tag === "hot" || c.tag === "warm")
      .reduce((sum, c) => sum + potentialValueFor(c), 0);
    // simple "added in last 24h / 7d" trend
    const dayMs = 86400000;
    const now = Date.now();
    const addedToday = contacts.filter((c) => now - new Date(c.created_at).getTime() < dayMs).length;
    const addedWeek = contacts.filter((c) => now - new Date(c.created_at).getTime() < 7 * dayMs).length;
    const inactive24h = contacts.filter((c) => lastActivityFor(c).minsAgo > 1440).length;
    const readyToClose = contacts.filter((c) => c.tag === "hot" && c.score >= 75).length;
    return { total: contacts.length, hot, warm, cold, avgScore, potentialRevenue, addedToday, addedWeek, inactive24h, readyToClose };
  }, [contacts]);

  const sources = useMemo(() => {
    const set = new Set<string>();
    contacts.forEach((c) => c.source && set.add(c.source));
    return Array.from(set);
  }, [contacts]);

  const filtered = useMemo(() => {
    return contacts.filter((c) => {
      if (tagFilter !== "all" && c.tag !== tagFilter) return false;
      if (sourceFilter !== "all" && c.source !== sourceFilter) return false;
      if (c.score < scoreMin) return false;

      // Quick segments
      if (segment === "ready" && !(c.tag === "hot" && c.score >= 75)) return false;
      if (segment === "followup") {
        const a = lastActivityFor(c);
        if (!(a.minsAgo > 360 && a.minsAgo < 2880 && c.tag !== "cold")) return false;
      }
      if (segment === "cold" && c.tag !== "cold") return false;

      if (search) {
        const q = search.toLowerCase();
        return (
          c.name.toLowerCase().includes(q) ||
          c.phone.toLowerCase().includes(q) ||
          (c.email ?? "").toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [contacts, tagFilter, sourceFilter, scoreMin, segment, search]);

  // Clear stale selections when filter changes
  useEffect(() => {
    setSelected((prev) => {
      const filteredIds = new Set(filtered.map((c) => c.id));
      const next = new Set<string>();
      prev.forEach((id) => filteredIds.has(id) && next.add(id));
      return next;
    });
  }, [filtered]);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };
  const toggleSelectAll = () => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map((c) => c.id)));
  };

  const allSelected = filtered.length > 0 && selected.size === filtered.length;

  return (
    <PageShell
      title="Contacts"
      subtitle="Sales command center · every row, decision-ready"
      icon={<Users className="w-4 h-4" />}
      actions={
        <>
          <Button variant="outline" size="sm" className="gap-2" onClick={() => toast("Export started")}>
            <Download className="w-3.5 h-3.5" />
            Export
          </Button>
          <Button size="sm" className="gap-2" onClick={() => toast.success("Opening new contact form…")}>
            <Plus className="w-3.5 h-3.5" />
            New Contact
          </Button>
        </>
      }
    >
      {/* STAT CARDS — clickable filters with trends */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-4">
        <ClickableStat
          label="Total Contacts"
          value={stats.total}
          icon={<Users className="w-4 h-4" />}
          accent="primary"
          trend={`+${stats.addedToday} today`}
          active={tagFilter === "all" && segment === "all"}
          onClick={() => { setTagFilter("all"); setSegment("all"); }}
        />
        <ClickableStat
          label="Hot Leads"
          value={stats.hot}
          icon={<Flame className="w-4 h-4" />}
          accent="hot"
          trend={`+${Math.min(stats.hot, stats.addedWeek)} this week`}
          active={tagFilter === "hot"}
          onClick={() => { setTagFilter("hot"); setSegment("all"); }}
          pulse
        />
        <ClickableStat
          label="Warm Leads"
          value={stats.warm}
          icon={<CircleDot className="w-4 h-4" />}
          accent="warning"
          trend="needs nurture"
          active={tagFilter === "warm"}
          onClick={() => { setTagFilter("warm"); setSegment("all"); }}
        />
        <ClickableStat
          label="Avg Score"
          value={stats.avgScore}
          suffix="/100"
          icon={<TrendingUp className="w-4 h-4" />}
          accent="accent"
          trend="lead quality"
        />
        <ClickableStat
          label="Potential Revenue"
          value={0}
          customValue={compactINR(stats.potentialRevenue)}
          icon={<IndianRupee className="w-4 h-4" />}
          accent="success"
          trend="hot + warm"
          highlight
        />
      </div>

      {/* AI INSIGHTS PANEL */}
      {insightsOpen && (stats.readyToClose > 0 || stats.inactive24h > 0) && (
        <div className="relative bg-gradient-to-r from-primary-soft/60 via-card to-warning-soft/40 border border-primary/20 rounded-xl p-3 mb-3 flex items-center gap-3 overflow-hidden">
          <div className="absolute inset-0 aurora-bg animate-aurora opacity-30 pointer-events-none" />
          <div className="relative w-9 h-9 rounded-lg bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center text-primary-foreground shadow-md shadow-primary/40 animate-glow-pulse flex-shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="relative flex-1 flex flex-wrap items-center gap-x-4 gap-y-1">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold text-primary uppercase tracking-wider">Addison AI Insights</span>
              <span className="w-1 h-1 rounded-full bg-success animate-pulse" />
            </div>
            {stats.readyToClose > 0 && (
              <button
                onClick={() => setSegment("ready")}
                className="text-[12px] font-semibold flex items-center gap-1.5 hover:text-hot transition-colors"
              >
                <Flame className="w-3 h-3 text-hot" />
                <span className="text-hot font-bold">{stats.readyToClose}</span> ready to close
                <ArrowUpRight className="w-3 h-3 opacity-60" />
              </button>
            )}
            {stats.inactive24h > 0 && (
              <button
                onClick={() => setSegment("followup")}
                className="text-[12px] font-semibold flex items-center gap-1.5 hover:text-warning transition-colors"
              >
                <Clock className="w-3 h-3 text-warning" />
                <span className="text-warning font-bold">{stats.inactive24h}</span> inactive 24h+
                <ArrowUpRight className="w-3 h-3 opacity-60" />
              </button>
            )}
          </div>
          <button onClick={() => setInsightsOpen(false)} className="relative w-7 h-7 rounded-md hover:bg-muted flex items-center justify-center text-muted-foreground" title="Dismiss">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* QUICK SEGMENTS */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Segments</span>
        <SegmentChip label="All" icon={Users} active={segment === "all"} onClick={() => setSegment("all")} />
        <SegmentChip label="🔥 Ready to Buy" active={segment === "ready"} onClick={() => setSegment("ready")} count={stats.readyToClose} accent="hot" />
        <SegmentChip label="🕒 Needs Follow-up" active={segment === "followup"} onClick={() => setSegment("followup")} count={stats.inactive24h} accent="warning" />
        <SegmentChip label="❄️ Cold Leads" active={segment === "cold"} onClick={() => setSegment("cold")} count={stats.cold} accent="accent" />
      </div>

      {/* TOOLBAR */}
      <div className="bg-card border border-border rounded-xl p-3 mb-3 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, phone, email…"
            className="w-full h-9 pl-9 pr-3 rounded-lg bg-muted border-0 text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <div className="flex gap-1">
          {(["all", "hot", "warm", "cold"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTagFilter(t)}
              className={cn(
                "px-3 h-9 rounded-lg text-[12px] font-semibold capitalize transition-colors",
                tagFilter === t
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              {t}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className={cn(
            "h-9 px-3 rounded-lg text-[12px] font-semibold flex items-center gap-1.5 transition-colors",
            showAdvanced ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
          )}
        >
          <Filter className="w-3.5 h-3.5" />
          Advanced
          <ChevronDown className={cn("w-3 h-3 transition-transform", showAdvanced && "rotate-180")} />
        </button>
      </div>

      {/* ADVANCED FILTERS */}
      {showAdvanced && (
        <div className="bg-card border border-border rounded-xl p-3 mb-3 grid grid-cols-1 md:grid-cols-3 gap-3 animate-fade-in">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Source</label>
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="mt-1 w-full h-9 px-2 rounded-lg bg-muted border-0 text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="all">All sources</option>
              {sources.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
              Min Score <span className="text-foreground">{scoreMin}</span>
            </label>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={scoreMin}
              onChange={(e) => setScoreMin(Number(e.target.value))}
              className="mt-3 w-full accent-primary"
            />
          </div>
          <div className="flex items-end justify-end">
            <button
              onClick={() => { setSourceFilter("all"); setScoreMin(0); setSearch(""); setTagFilter("all"); setSegment("all"); }}
              className="text-[11px] font-semibold text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              <X className="w-3 h-3" /> Reset all
            </button>
          </div>
        </div>
      )}

      {/* BULK ACTION BAR */}
      {selected.size > 0 && (
        <div className="bg-gradient-to-r from-primary to-primary-glow text-primary-foreground rounded-xl px-4 py-2.5 mb-3 flex items-center justify-between shadow-lg shadow-primary/30 animate-slide-up">
          <div className="flex items-center gap-3">
            <CheckSquare className="w-4 h-4" />
            <span className="text-[13px] font-bold">{selected.size} selected</span>
          </div>
          <div className="flex items-center gap-1">
            <BulkBtn icon={Megaphone} label="Broadcast" onClick={() => toast.success(`Broadcast queued for ${selected.size}`)} />
            <BulkBtn icon={UserPlus} label="Assign" onClick={() => toast.success(`Assigned ${selected.size}`)} />
            <BulkBtn icon={ArrowUpRight} label="Move stage" onClick={() => toast.success(`${selected.size} moved`)} />
            <button onClick={() => setSelected(new Set())} className="ml-1 w-7 h-7 rounded-md hover:bg-primary-foreground/20 flex items-center justify-center" title="Clear">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* SMART LEAD LIST */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {/* Sticky header */}
        <div className="sticky top-0 z-10 grid grid-cols-[36px_1.6fr_120px_1fr_120px_140px_110px_90px_120px] gap-3 px-4 py-3 border-b border-border bg-card/95 backdrop-blur text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          <button onClick={toggleSelectAll} className="flex items-center justify-center" title={allSelected ? "Deselect all" : "Select all"}>
            {allSelected ? <CheckSquare className="w-3.5 h-3.5 text-primary" /> : <Square className="w-3.5 h-3.5" />}
          </button>
          <div>Contact</div>
          <div>Phone</div>
          <div>Intent Signals</div>
          <div>Score</div>
          <div>AI Suggestion</div>
          <div>Last Activity</div>
          <div>Tag</div>
          <div className="text-right">Actions</div>
        </div>

        {isLoading && (
          <div className="px-4 py-12 text-center text-[13px] text-muted-foreground">Loading contacts…</div>
        )}

        {!isLoading && filtered.length === 0 && (
          <div className="px-4 py-16 text-center">
            <div className="w-12 h-12 rounded-full bg-muted mx-auto mb-3 flex items-center justify-center">
              <Users className="w-5 h-5 text-muted-foreground" />
            </div>
            <p className="text-[14px] font-semibold mb-1">
              {contacts.length === 0 ? "No contacts yet" : "No matches"}
            </p>
            <p className="text-[12px] text-muted-foreground">
              {contacts.length === 0
                ? "Start a conversation in the Inbox to add your first contact"
                : "Try a different search, segment, or filter"}
            </p>
          </div>
        )}

        {filtered.map((c) => {
          const tag = tagLabel[c.tag];
          const signals = intentSignalsFor(c);
          const ai = aiSuggestionFor(c);
          const activity = lastActivityFor(c);
          const inactive = activity.minsAgo > 1440;
          const isSelected = selected.has(c.id);
          const isHovered = hoveredId === c.id;
          const value = potentialValueFor(c);
          const isHot = c.tag === "hot";

          return (
            <div
              key={c.id}
              onMouseEnter={() => setHoveredId(c.id)}
              onMouseLeave={() => setHoveredId(null)}
              className={cn(
                "grid grid-cols-[36px_1.6fr_120px_1fr_120px_140px_110px_90px_120px] gap-3 px-4 py-3 border-b border-border/50 last:border-b-0 items-center transition-all relative",
                isSelected ? "bg-primary-soft/50" : "hover:bg-muted/40",
                isHot && !isSelected && "bg-gradient-to-r from-hot-soft/20 to-transparent hot-glow",
                inactive && "opacity-70"
              )}
            >
              {/* Checkbox */}
              <button onClick={() => toggleSelect(c.id)} className="flex items-center justify-center">
                {isSelected ? <CheckSquare className="w-4 h-4 text-primary" /> : <Square className="w-4 h-4 text-muted-foreground hover:text-foreground" />}
              </button>

              {/* Contact */}
              <div className="flex items-center gap-3 min-w-0">
                <div className="relative flex-shrink-0">
                  <div className={cn(
                    "w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-bold",
                    c.tag === "hot" ? "bg-hot-soft text-hot" : c.tag === "warm" ? "bg-warning-soft text-warning" : "bg-muted text-muted-foreground"
                  )}>
                    {initialsFor(c.name)}
                  </div>
                  {isHot && <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-hot animate-pulse ring-2 ring-card" />}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-[13px] font-semibold truncate">{c.name}</p>
                    <span className="text-[9px] font-bold text-success tabular-nums">{compactINR(value)}</span>
                  </div>
                  {c.email ? (
                    <p className="text-[11px] text-muted-foreground truncate flex items-center gap-1">
                      <Mail className="w-2.5 h-2.5 flex-shrink-0" />
                      {c.email}
                    </p>
                  ) : (
                    <p className="text-[11px] text-muted-foreground truncate">{c.source ?? "No email"}</p>
                  )}
                </div>
              </div>

              {/* Phone with quick actions */}
              <div className="flex items-center gap-1">
                <button
                  onClick={(e) => { e.stopPropagation(); toast.success(`Calling ${c.name}…`); }}
                  className="w-6 h-6 rounded-md bg-muted hover:bg-success hover:text-success-foreground transition-colors flex items-center justify-center flex-shrink-0"
                  title="Call"
                >
                  <Phone className="w-3 h-3" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); toast(`WhatsApp ${c.name}`); }}
                  className="w-6 h-6 rounded-md bg-muted hover:bg-primary hover:text-primary-foreground transition-colors flex items-center justify-center flex-shrink-0"
                  title="WhatsApp"
                >
                  <MessageCircle className="w-3 h-3" />
                </button>
                <span className="text-[10px] font-mono text-muted-foreground truncate">{c.phone.slice(-5)}</span>
              </div>

              {/* Intent Signals */}
              <div className="flex flex-wrap gap-1">
                {signals.length === 0 ? (
                  <span className="text-[10px] text-muted-foreground italic">No signals yet</span>
                ) : (
                  signals.slice(0, 2).map((s) => (
                    <span key={s} className="text-[9px] font-bold bg-warning-soft text-warning px-1.5 py-0.5 rounded uppercase tracking-wider flex items-center gap-0.5">
                      <Zap className="w-2 h-2" />
                      {s}
                    </span>
                  ))
                )}
                {signals.length > 2 && (
                  <span className="text-[9px] font-bold bg-muted text-muted-foreground px-1.5 py-0.5 rounded">+{signals.length - 2}</span>
                )}
              </div>

              {/* Score */}
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden max-w-[70px] relative">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-700 bg-gradient-to-r",
                      c.score >= 80 ? "from-hot to-warning" :
                      c.score >= 50 ? "from-warning to-primary" :
                      "from-muted-foreground to-accent"
                    )}
                    style={{ width: `${c.score}%` }}
                  />
                </div>
                <span className={cn(
                  "text-[11px] font-bold tabular-nums",
                  c.score >= 80 ? "text-hot" : c.score >= 50 ? "text-warning" : "text-muted-foreground"
                )}>{c.score}</span>
              </div>

              {/* AI Suggestion */}
              <div>
                <span className={cn(
                  "text-[10px] font-bold px-2 py-1 rounded-md inline-flex items-center gap-1 uppercase tracking-wider",
                  ai.tone === "hot" ? "bg-hot text-hot-foreground shadow-sm shadow-hot/40" :
                  ai.tone === "warm" ? "bg-warning text-warning-foreground" :
                  "bg-accent-soft text-accent"
                )}>
                  <Sparkles className="w-2.5 h-2.5" />
                  {ai.label}
                </span>
              </div>

              {/* Last Activity */}
              <div className={cn(
                "text-[11px] flex items-center gap-1",
                inactive ? "text-destructive" : activity.minsAgo < 60 ? "text-success font-semibold" : "text-muted-foreground"
              )}>
                {inactive && <AlertCircle className="w-3 h-3" />}
                <Clock className="w-2.5 h-2.5" />
                {activity.label}
              </div>

              {/* Tag */}
              <div>
                <span className={cn(
                  "text-[10px] font-bold px-2 py-1 rounded-full inline-flex items-center gap-1",
                  tagPill[c.tag],
                  isHot && "animate-hot-pulse shadow-sm"
                )}>
                  {tag.emoji} {tag.label}
                </span>
              </div>

              {/* Hover Quick Actions */}
              <div className={cn(
                "flex items-center justify-end gap-1 transition-all",
                isHovered ? "opacity-100" : "opacity-0 pointer-events-none"
              )}>
                <QuickAction icon={MessageCircle} title="Chat" tone="primary" onClick={() => toast(`Open chat with ${c.name}`)} />
                <QuickAction icon={Phone} title="Call" tone="success" onClick={() => toast.success(`Calling ${c.name}…`)} />
                <QuickAction icon={Send} title="Send Offer" tone="warning" onClick={() => toast.success(`Offer sent to ${c.name}`)} />
                <QuickAction icon={CreditCard} title="Payment Link" tone="success" onClick={() => toast.success(`Payment link sent to ${c.name}`)} />
              </div>

              {/* Static row meta when not hovered */}
              {!isHovered && (
                <div className="flex items-center justify-end">
                  <button className="w-7 h-7 rounded-md hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
                    <MoreHorizontal className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </PageShell>
  );
};

// ============================================================
// Sub-components
// ============================================================

const ClickableStat = ({
  label, value, customValue, icon, accent, suffix, trend, active, onClick, pulse, highlight,
}: {
  label: string;
  value: number;
  customValue?: string;
  icon: React.ReactNode;
  accent: "primary" | "hot" | "warning" | "accent" | "success";
  suffix?: string;
  trend?: string;
  active?: boolean;
  onClick?: () => void;
  pulse?: boolean;
  highlight?: boolean;
}) => {
  const accentClass = {
    primary: "bg-primary-soft text-primary",
    hot: "bg-hot-soft text-hot",
    warning: "bg-warning-soft text-warning",
    accent: "bg-accent-soft text-accent",
    success: "bg-success-soft text-success",
  }[accent];

  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className={cn(
        "text-left bg-card border rounded-xl p-4 flex items-start gap-3 transition-all",
        active ? "border-primary shadow-md shadow-primary/20" : "border-border hover:border-primary/40 hover:shadow-md",
        onClick && "cursor-pointer hover:-translate-y-0.5",
        highlight && "gradient-border bg-gradient-to-br from-success-soft/40 via-card to-card"
      )}
    >
      <div className={cn(
        "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
        accentClass,
        pulse && "animate-pulse"
      )}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</p>
        <p className="text-xl font-bold tabular-nums leading-tight">
          {customValue ?? value}
          {suffix && <span className="text-[12px] text-muted-foreground font-medium">{suffix}</span>}
        </p>
        {trend && (
          <p className={cn(
            "text-[10px] font-semibold mt-0.5 flex items-center gap-0.5",
            highlight ? "text-success" : "text-muted-foreground"
          )}>
            {highlight && <TrendingUp className="w-2.5 h-2.5" />}
            {trend}
          </p>
        )}
      </div>
    </button>
  );
};

const SegmentChip = ({
  label, icon: Icon, active, onClick, count, accent,
}: {
  label: string;
  icon?: typeof Users;
  active: boolean;
  onClick: () => void;
  count?: number;
  accent?: "hot" | "warning" | "accent";
}) => {
  const accentRing = accent === "hot" ? "ring-hot/30" : accent === "warning" ? "ring-warning/30" : "ring-accent/30";
  return (
    <button
      onClick={onClick}
      className={cn(
        "h-8 px-3 rounded-full text-[12px] font-semibold flex items-center gap-1.5 transition-all",
        active
          ? "bg-foreground text-background shadow-md"
          : `bg-muted text-foreground hover:bg-card hover:ring-2 ${accentRing}`
      )}
    >
      {Icon && <Icon className="w-3.5 h-3.5" />}
      {label}
      {count !== undefined && count > 0 && (
        <span className={cn(
          "text-[9px] font-bold px-1.5 rounded-full min-w-[16px] text-center",
          active ? "bg-background/20" : "bg-foreground/10"
        )}>
          {count}
        </span>
      )}
    </button>
  );
};

const BulkBtn = ({ icon: Icon, label, onClick }: { icon: typeof Users; label: string; onClick: () => void }) => (
  <button
    onClick={onClick}
    className="h-8 px-3 rounded-md bg-primary-foreground/15 hover:bg-primary-foreground/25 text-[11px] font-bold flex items-center gap-1.5 transition-colors"
  >
    <Icon className="w-3.5 h-3.5" />
    {label}
  </button>
);

const QuickAction = ({
  icon: Icon, title, tone, onClick,
}: {
  icon: typeof Phone;
  title: string;
  tone: "primary" | "success" | "warning";
  onClick: () => void;
}) => {
  const toneClass = {
    primary: "hover:bg-primary hover:text-primary-foreground hover:shadow-md hover:shadow-primary/30",
    success: "hover:bg-success hover:text-success-foreground hover:shadow-md hover:shadow-success/30",
    warning: "hover:bg-warning hover:text-warning-foreground hover:shadow-md hover:shadow-warning/30",
  }[tone];
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      title={title}
      className={cn(
        "w-8 h-8 rounded-lg bg-card border border-border flex items-center justify-center text-muted-foreground transition-all hover:-translate-y-0.5",
        toneClass
      )}
    >
      <Icon className="w-3.5 h-3.5" />
    </button>
  );
};
