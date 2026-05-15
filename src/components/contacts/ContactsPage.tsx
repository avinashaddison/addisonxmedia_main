import { useState, useMemo, useEffect, useRef } from "react";

// Tiny CSV parser. Handles "quoted fields, with commas" and escaped "" quotes.
// Good enough for contact lists; not RFC-4180 complete (no multi-line quoted fields).
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  const re = /(?:^|,|\r?\n)(?:"((?:[^"]|"")*)"|([^",\r\n]*))/g;
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim() && rows.length > 0) continue;
    const row: string[] = [];
    let last = 0;
    let inQuotes = false;
    let cell = "";
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"') {
          if (line[i + 1] === '"') { cell += '"'; i++; }
          else inQuotes = false;
        } else cell += ch;
      } else {
        if (ch === '"') inQuotes = true;
        else if (ch === ",") { row.push(cell); cell = ""; }
        else cell += ch;
      }
      last = i;
    }
    row.push(cell);
    rows.push(row);
  }
  return rows;
}
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { PageShell } from "@/components/PageShell";
import { Contact, tagLabel, initialsFor, formatRelative } from "@/lib/inbox-types";
import {
  Users, Search, Plus, Download, Upload, Flame, Snowflake, CircleDot, Phone, Mail,
  TrendingUp, IndianRupee, MessageCircle, CreditCard, Send, Sparkles, Zap,
  Clock, Filter, ChevronDown, X, CheckSquare, Square, MoreHorizontal,
  AlertCircle, ArrowUpRight, UserPlus, Megaphone,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

const useContacts = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["contacts-page", user?.id],
    enabled: !!user,
    queryFn: () => api.listContacts() as Promise<Contact[]>,
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
  const qc = useQueryClient();
  const { data: contacts = [], isLoading } = useContacts();
  const [search, setSearch] = useState("");
  const [tagFilter, setTagFilter] = useState<"all" | Contact["tag"]>("all");
  const [segment, setSegment] = useState<Segment>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [scoreMin, setScoreMin] = useState(0);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const importInputRef = useRef<HTMLInputElement>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newSaving, setNewSaving] = useState(false);

  // Parse a CSV file (header row + data rows) and bulk-upsert via /api/contacts/bulk.
  // Recognized columns (case-insensitive): name, phone, email, source, tag, score.
  // Phone is auto-prefixed with +91 if it's 10 digits.
  const handleCsvImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = ""; // allow re-uploading same file later

    try {
      const text = await file.text();
      const rows = parseCsv(text);
      if (rows.length < 2) {
        toast.error("CSV needs a header row + at least one data row");
        return;
      }
      const header = rows[0].map((h) => h.toLowerCase().trim());
      const idx = {
        name: header.indexOf("name"),
        phone: header.indexOf("phone"),
        email: header.indexOf("email"),
        source: header.indexOf("source"),
        tag: header.indexOf("tag"),
        score: header.indexOf("score"),
      };
      if (idx.name === -1 || idx.phone === -1) {
        toast.error("CSV must have at least 'name' and 'phone' columns");
        return;
      }
      const contacts = rows.slice(1)
        .filter((r) => r.some((c) => c.trim())) // skip blank lines
        .map((r) => ({
          name: r[idx.name]?.trim() ?? "",
          phone: r[idx.phone]?.trim() ?? "",
          email: idx.email !== -1 ? r[idx.email]?.trim() : undefined,
          source: idx.source !== -1 ? r[idx.source]?.trim() : undefined,
          tag: idx.tag !== -1 ? r[idx.tag]?.trim()?.toLowerCase() : undefined,
          score: idx.score !== -1 ? Number(r[idx.score]) : undefined,
        }));

      // Backend caps at 500 rows per request — chunk into batches.
      let totalImported = 0;
      let totalSkipped = 0;
      const allErrors: Array<{ row: number; reason: string }> = [];
      for (let i = 0; i < contacts.length; i += 500) {
        const batch = contacts.slice(i, i + 500);
        const res = await api.bulkContacts(batch);
        totalImported += res.imported;
        totalSkipped += res.skipped;
        if (res.errors?.length) allErrors.push(...res.errors.slice(0, 10));
      }
      if (totalImported > 0) {
        toast.success(`Imported ${totalImported} contact${totalImported !== 1 ? "s" : ""}${totalSkipped > 0 ? ` · ${totalSkipped} skipped` : ""}`);
        qc.invalidateQueries({ queryKey: ["contacts-page"] });
        qc.invalidateQueries({ queryKey: ["contacts-lookup"] });
      } else {
        toast.error(`No contacts imported · ${totalSkipped} skipped${allErrors[0] ? ` · first error: ${allErrors[0].reason}` : ""}`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to import");
    }
  };
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
      subtitle="Aapke saare leads · har row decision-ready"
      icon={<Users className="w-5 h-5" />}
      actions={
        <>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => {
              if (filtered.length === 0) { toast.error("No contacts to export"); return; }
              const headers = ["Name", "Phone", "Email", "Tag", "Score", "Source", "Created"];
              const rows = filtered.map((c) => [
                c.name, c.phone, c.email ?? "", c.tag, c.score, c.source ?? "",
                new Date(c.created_at).toISOString(),
              ]);
              const csv = [headers, ...rows]
                .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
                .join("\n");
              const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `contacts-${new Date().toISOString().slice(0, 10)}.csv`;
              a.click();
              URL.revokeObjectURL(url);
              toast.success(`Exported ${filtered.length} contacts`);
            }}
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => importInputRef.current?.click()}
          >
            <Upload className="w-3.5 h-3.5" />
            Import CSV
          </Button>
          <input
            ref={importInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={handleCsvImport}
          />
          <Button
            size="sm"
            className="gap-2"
            onClick={() => {
              setNewName("");
              setNewPhone("");
              setNewOpen(true);
            }}
          >
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
      <div className="bg-white border-2 border-[#E8B968] rounded-2xl p-3 mb-3 flex flex-wrap items-center gap-2 shadow-[0_3px_0_0_#E8B968]">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#B8651A]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Name, phone, email se search karein…"
            className="w-full h-10 pl-9 pr-3 rounded-xl bg-[#FFF6E8] border-2 border-[#E8B968] text-[13px] font-medium focus:outline-none focus:border-[#FF6A1F] focus:bg-white"
          />
        </div>
        <div className="flex gap-1">
          {(["all", "hot", "warm", "cold"] as const).map((t) => {
            const colors = {
              all: { active: "bg-foreground text-white", inactive: "bg-[#FFF6E8] text-foreground" },
              hot: { active: "bg-[#D4308E] text-white", inactive: "bg-[#FCE5F0] text-[#D4308E]" },
              warm: { active: "bg-[#FFD23F] text-[#7A4A00]", inactive: "bg-[#FFF1D6] text-[#B8651A]" },
              cold: { active: "bg-[#3C50E0] text-white", inactive: "bg-[#E4E8FF] text-[#3C50E0]" },
            }[t];
            return (
              <button
                key={t}
                onClick={() => setTagFilter(t)}
                className={cn(
                  "px-3.5 h-10 rounded-xl text-[12px] font-extrabold capitalize transition-all border-2 border-transparent",
                  tagFilter === t ? colors.active + " shadow-sm" : colors.inactive + " hover:scale-105"
                )}
              >
                {t}
              </button>
            );
          })}
        </div>
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className={cn(
            "h-10 px-3.5 rounded-xl text-[12px] font-extrabold flex items-center gap-1.5 transition-all border-2",
            showAdvanced
              ? "bg-[#FF6A1F] text-white border-[#B8420A] shadow-[0_3px_0_0_#B8420A]"
              : "bg-white text-foreground border-[#E8B968] hover:bg-[#FFE8C7]"
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
            <BulkBtn
              icon={Megaphone}
              label="Broadcast"
              onClick={() => {
                // Real handoff: navigate to broadcasts with the selected segment
                window.location.href = "/app/broadcasts";
              }}
            />
            <BulkBtn
              icon={ArrowUpRight}
              label="Set hot"
              onClick={async () => {
                const ids = Array.from(selected);
                try {
                  await Promise.all(ids.map((id) => api.updateContact(id, { tag: "hot", score: 85 })));
                  toast.success(`Marked ${ids.length} as hot`);
                  setSelected(new Set());
                  qc.invalidateQueries({ queryKey: ["contacts-page"] });
                  qc.invalidateQueries({ queryKey: ["contacts-lookup"] });
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "Failed");
                }
              }}
            />
            <BulkBtn
              icon={UserPlus}
              label="Set cold"
              onClick={async () => {
                const ids = Array.from(selected);
                try {
                  await Promise.all(ids.map((id) => api.updateContact(id, { tag: "cold", score: 20 })));
                  toast.success(`Marked ${ids.length} as cold`);
                  setSelected(new Set());
                  qc.invalidateQueries({ queryKey: ["contacts-page"] });
                  qc.invalidateQueries({ queryKey: ["contacts-lookup"] });
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "Failed");
                }
              }}
            />
            <button onClick={() => setSelected(new Set())} className="ml-1 w-7 h-7 rounded-md hover:bg-primary-foreground/20 flex items-center justify-center" aria-label="Clear selection">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* SMART LEAD LIST */}
      <div className="bg-white border-2 border-[#E8B968] rounded-2xl overflow-hidden shadow-[0_4px_0_0_#E8B968]">
        {/* Sticky header */}
        <div className="sticky top-0 z-10 grid grid-cols-[36px_1.6fr_120px_1fr_120px_140px_110px_90px_120px] gap-3 px-4 py-3 border-b-2 border-[#E8B968] bg-[#FFF1D6] text-[10px] font-extrabold uppercase tracking-wider text-[#B8651A]">
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
                  {isHot && <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-hot ring-2 ring-card" />}
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
                  isHot && "shadow-sm"
                )}>
                  {tag.emoji} {tag.label}
                </span>
              </div>

              {/* Hover Quick Actions — chat opens inbox, call uses tel: link.
                  Offer/Payment require Razorpay integration which isn't wired yet. */}
              <div className={cn(
                "flex items-center justify-end gap-1 transition-all",
                isHovered ? "opacity-100" : "opacity-0 pointer-events-none"
              )}>
                <a
                  href="/app/inbox"
                  title={`Chat with ${c.name}`}
                  className="w-7 h-7 rounded-md bg-primary-soft hover:bg-primary text-primary hover:text-primary-foreground flex items-center justify-center transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                </a>
                <a
                  href={`tel:${c.phone}`}
                  title={`Call ${c.phone}`}
                  className="w-7 h-7 rounded-md bg-success-soft hover:bg-success text-success hover:text-success-foreground flex items-center justify-center transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Phone className="w-3.5 h-3.5" />
                </a>
                <a
                  href={`https://wa.me/${c.phone.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={`Open in WhatsApp`}
                  className="w-7 h-7 rounded-md bg-[#25D366]/10 hover:bg-[#25D366] text-[#25D366] hover:text-white flex items-center justify-center transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Send className="w-3.5 h-3.5" />
                </a>
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

      {/* New Contact dialog */}
      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent>
          <DialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#FF6A1F] to-[#E85C12] text-white flex items-center justify-center shadow-md">
                <UserPlus className="w-5 h-5" strokeWidth={2.5} />
              </div>
              <div>
                <DialogTitle>Naya contact add karein</DialogTitle>
                <DialogDescription className="text-foreground/70 font-medium">
                  Name aur phone do · baaki AI khud bharega
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const name = newName.trim();
              const phone = newPhone.trim();
              if (!name) { toast.error("Naam zaroori hai"); return; }
              if (!phone) { toast.error("Phone number zaroori hai"); return; }
              const phoneNormalized = /^\+/.test(phone) ? phone : (phone.length === 10 ? `+91${phone}` : phone);
              setNewSaving(true);
              try {
                await api.createContact({ name, phone: phoneNormalized, tag: "cold", score: 30 });
                toast.success(`${name} added!`);
                qc.invalidateQueries({ queryKey: ["contacts-page"] });
                qc.invalidateQueries({ queryKey: ["contacts-lookup"] });
                setNewOpen(false);
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "Failed to add");
              } finally {
                setNewSaving(false);
              }
            }}
            className="space-y-4 mt-2"
          >
            <div className="space-y-1.5">
              <Label htmlFor="new-contact-name">Naam</Label>
              <Input
                id="new-contact-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Priya Mehta"
                autoFocus
                autoComplete="off"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="new-contact-phone">Phone number</Label>
              <Input
                id="new-contact-phone"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                placeholder="9876543210 ya +91 9876543210"
                inputMode="tel"
                autoComplete="off"
              />
              <p className="text-[11px] text-foreground/60 font-medium">10-digit number par auto +91 lag jaayega</p>
            </div>

            <DialogFooter className="gap-2 sm:gap-2">
              <Button type="button" variant="outline" onClick={() => setNewOpen(false)} disabled={newSaving}>
                Cancel
              </Button>
              <Button type="submit" disabled={newSaving}>
                {newSaving ? "Add ho raha hai…" : "Add karein"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
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
  const styles = {
    primary: { border: "border-[#3C50E0]", shadow: "shadow-[0_4px_0_0_#2533A8]", iconBg: "bg-[#3C50E0]", text: "text-[#3C50E0]" },
    hot:     { border: "border-[#D4308E]", shadow: "shadow-[0_4px_0_0_#A11A6A]", iconBg: "bg-[#D4308E]", text: "text-[#D4308E]" },
    warning: { border: "border-[#FFD23F]", shadow: "shadow-[0_4px_0_0_#E8B400]", iconBg: "bg-[#FFD23F] text-[#7A4A00]", text: "text-[#B8651A]" },
    accent:  { border: "border-[#FF6A1F]", shadow: "shadow-[0_4px_0_0_#B8420A]", iconBg: "bg-[#FF6A1F]", text: "text-[#FF6A1F]" },
    success: { border: "border-[#0E8A4B]", shadow: "shadow-[0_4px_0_0_#0A6E3C]", iconBg: "bg-[#0E8A4B]", text: "text-[#0E8A4B]" },
  }[accent];

  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className={cn(
        "text-left bg-white border-2 rounded-2xl p-4 flex items-start gap-3 transition-all",
        styles.border,
        styles.shadow,
        active && "ring-2 ring-[#FF6A1F] ring-offset-2 ring-offset-[#FFF6E8]",
        onClick && "cursor-pointer hover:-translate-y-1"
      )}
    >
      <div className={cn(
        "w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 text-white shadow-md",
        styles.iconBg,
        pulse && "animate-pulse"
      )}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] uppercase tracking-[0.15em] text-foreground/60 font-extrabold">{label}</p>
        <p className={cn("text-2xl font-black tabular-nums leading-tight", highlight && styles.text)}>
          {customValue ?? value}
          {suffix && <span className="text-[12px] text-foreground/60 font-medium">{suffix}</span>}
        </p>
        {trend && (
          <p className={cn(
            "text-[10px] font-extrabold mt-0.5 flex items-center gap-0.5",
            highlight ? styles.text : "text-foreground/60"
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
  return (
    <button
      onClick={onClick}
      className={cn(
        "h-9 px-3.5 rounded-full text-[12px] font-extrabold flex items-center gap-1.5 transition-all border-2",
        active
          ? "bg-[#FF6A1F] text-white border-[#B8420A] shadow-[0_3px_0_0_#B8420A]"
          : "bg-white text-foreground border-[#E8B968] hover:bg-[#FFE8C7]"
      )}
    >
      {Icon && <Icon className="w-3.5 h-3.5" />}
      {label}
      {count !== undefined && count > 0 && (
        <span className={cn(
          "text-[9px] font-extrabold px-1.5 rounded-full min-w-[18px] text-center",
          active ? "bg-white/25 text-white" : "bg-[#FFD23F] text-[#7A4A00]"
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
