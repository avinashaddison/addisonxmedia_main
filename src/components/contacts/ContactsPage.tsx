import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PageShell } from "@/components/PageShell";
import { Contact, tagLabel, initialsFor, formatRelative } from "@/lib/inbox-types";
import { Users, Search, Plus, Download, Flame, Snowflake, CircleDot, Phone, Mail } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

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

export const ContactsPage = () => {
  const { data: contacts = [], isLoading } = useContacts();
  const [search, setSearch] = useState("");
  const [tagFilter, setTagFilter] = useState<"all" | Contact["tag"]>("all");

  const stats = useMemo(() => {
    const hot = contacts.filter((c) => c.tag === "hot").length;
    const warm = contacts.filter((c) => c.tag === "warm").length;
    const cold = contacts.filter((c) => c.tag === "cold").length;
    const avgScore = contacts.length
      ? Math.round(contacts.reduce((a, c) => a + c.score, 0) / contacts.length)
      : 0;
    return { total: contacts.length, hot, warm, cold, avgScore };
  }, [contacts]);

  const filtered = contacts.filter((c) => {
    if (tagFilter !== "all" && c.tag !== tagFilter) return false;
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

  return (
    <PageShell
      title="Contacts"
      subtitle="All your leads, sorted by recency"
      icon={<Users className="w-4 h-4" />}
      actions={
        <>
          <Button variant="outline" size="sm" className="gap-2">
            <Download className="w-3.5 h-3.5" />
            Export
          </Button>
          <Button size="sm" className="gap-2">
            <Plus className="w-3.5 h-3.5" />
            New Contact
          </Button>
        </>
      }
    >
      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <StatCard label="Total Contacts" value={stats.total} icon={<Users className="w-4 h-4" />} accent="primary" />
        <StatCard label="Hot Leads" value={stats.hot} icon={<Flame className="w-4 h-4" />} accent="hot" />
        <StatCard label="Warm Leads" value={stats.warm} icon={<CircleDot className="w-4 h-4" />} accent="warning" />
        <StatCard label="Avg Score" value={stats.avgScore} icon={<Snowflake className="w-4 h-4" />} accent="accent" suffix="/100" />
      </div>

      {/* Toolbar */}
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
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="grid grid-cols-[1fr_140px_140px_100px_120px_80px] gap-3 px-4 py-3 border-b border-border bg-muted/30 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          <div>Contact</div>
          <div>Phone</div>
          <div>Source</div>
          <div>Score</div>
          <div>Added</div>
          <div>Tag</div>
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
                : "Try a different search or tag filter"}
            </p>
          </div>
        )}

        {filtered.map((c) => {
          const tag = tagLabel[c.tag];
          return (
            <div
              key={c.id}
              className="grid grid-cols-[1fr_140px_140px_100px_120px_80px] gap-3 px-4 py-3 border-b border-border/50 last:border-b-0 hover:bg-muted/40 transition-colors items-center"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className={cn(
                  "w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0",
                  c.tag === "hot" ? "bg-hot-soft text-hot" : c.tag === "warm" ? "bg-warning-soft text-warning" : "bg-muted text-muted-foreground"
                )}>
                  {initialsFor(c.name)}
                </div>
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold truncate">{c.name}</p>
                  {c.email && (
                    <p className="text-[11px] text-muted-foreground truncate flex items-center gap-1">
                      <Mail className="w-2.5 h-2.5" />
                      {c.email}
                    </p>
                  )}
                </div>
              </div>
              <div className="text-[12px] font-mono text-muted-foreground flex items-center gap-1">
                <Phone className="w-3 h-3" />
                {c.phone}
              </div>
              <div className="text-[12px] text-muted-foreground truncate">{c.source ?? "—"}</div>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden max-w-[60px]">
                  <div
                    className={cn(
                      "h-full rounded-full",
                      c.score >= 80 ? "bg-hot" : c.score >= 60 ? "bg-warning" : "bg-muted-foreground"
                    )}
                    style={{ width: `${c.score}%` }}
                  />
                </div>
                <span className="text-[11px] font-bold tabular-nums">{c.score}</span>
              </div>
              <div className="text-[11px] text-muted-foreground">{formatRelative(c.created_at)}</div>
              <div>
                <span className={cn("text-[10px] font-bold px-2 py-1 rounded-full inline-flex items-center gap-1", tagPill[c.tag])}>
                  {tag.emoji} {tag.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </PageShell>
  );
};

const StatCard = ({
  label, value, icon, accent, suffix,
}: { label: string; value: number; icon: React.ReactNode; accent: "primary" | "hot" | "warning" | "accent"; suffix?: string }) => {
  const accentClass = {
    primary: "bg-primary-soft text-primary",
    hot: "bg-hot-soft text-hot",
    warning: "bg-warning-soft text-warning",
    accent: "bg-accent-soft text-accent",
  }[accent];
  return (
    <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
      <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0", accentClass)}>{icon}</div>
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</p>
        <p className="text-xl font-bold tabular-nums">
          {value}
          {suffix && <span className="text-[12px] text-muted-foreground font-medium">{suffix}</span>}
        </p>
      </div>
    </div>
  );
};
