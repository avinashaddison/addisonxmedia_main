import { useEffect, useState } from "react";
import { Search, MessageSquare, Users, Trophy, Loader2, CornerDownLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

type Result =
  | { kind: "contact"; id: string; name: string; phone: string; tag: string }
  | { kind: "conversation"; id: string; name: string; preview: string }
  | { kind: "deal"; id: string; title: string; value: number; stage: string };

type Props = { onNavigate: (page: string) => void };

export const GlobalSearch = ({ onNavigate }: Props) => {
  const { user } = useAuth();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!q.trim() || !user) {
      setResults([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const t = setTimeout(async () => {
      const term = `%${q}%`;
      const [contacts, convos, deals] = await Promise.all([
        supabase.from("contacts").select("id,name,phone,tag").or(`name.ilike.${term},phone.ilike.${term}`).limit(4),
        supabase.from("conversations").select("id,last_message_preview,contact:contacts(name)").ilike("last_message_preview", term).limit(4),
        supabase.from("deals").select("id,title,value,stage").ilike("title", term).limit(4),
      ]);
      if (cancelled) return;
      const r: Result[] = [];
      contacts.data?.forEach((c) => r.push({ kind: "contact", id: c.id, name: c.name, phone: c.phone, tag: c.tag }));
      convos.data?.forEach((c: any) => r.push({ kind: "conversation", id: c.id, name: c.contact?.name ?? "Unknown", preview: c.last_message_preview ?? "" }));
      deals.data?.forEach((d) => r.push({ kind: "deal", id: d.id, title: d.title, value: Number(d.value), stage: d.stage }));
      setResults(r);
      setLoading(false);
    }, 220);
    return () => { cancelled = true; clearTimeout(t); };
  }, [q, user]);

  // Cmd/Ctrl + K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        document.getElementById("global-search-input")?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const handlePick = (r: Result) => {
    setOpen(false);
    setQ("");
    if (r.kind === "contact") onNavigate("contacts");
    else if (r.kind === "conversation") onNavigate("inbox");
    else onNavigate("deals");
  };

  const grouped = {
    contacts: results.filter((r) => r.kind === "contact"),
    conversations: results.filter((r) => r.kind === "conversation"),
    deals: results.filter((r) => r.kind === "deal"),
  };

  const showDropdown = open && (q.trim().length > 0);

  return (
    <div className="relative w-full max-w-md">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <input
          id="global-search-input"
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="Search contacts, chats, deals..."
          className="w-full h-9 pl-9 pr-16 rounded-xl bg-muted/50 hover:bg-muted/70 focus:bg-card border border-transparent focus:border-primary/30 focus:ring-2 focus:ring-primary/15 text-[13px] outline-none transition-all"
        />
        <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 hidden md:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-card border border-border text-[9px] font-bold text-muted-foreground">
          ⌘K
        </kbd>
      </div>

      {showDropdown && (
        <div className="absolute top-full left-0 right-0 mt-2 rounded-xl bg-popover border border-border shadow-2xl shadow-foreground/10 overflow-hidden z-50 animate-fade-in max-h-[440px] overflow-y-auto">
          {loading && (
            <div className="px-4 py-6 text-center">
              <Loader2 className="w-4 h-4 animate-spin mx-auto text-muted-foreground" />
            </div>
          )}
          {!loading && results.length === 0 && (
            <div className="px-4 py-6 text-center">
              <p className="text-[12px] text-muted-foreground">No results for "<b className="text-foreground">{q}</b>"</p>
            </div>
          )}
          {!loading && grouped.contacts.length > 0 && (
            <Group label="Contacts" icon={Users}>
              {grouped.contacts.map((r) => r.kind === "contact" && (
                <ResultRow key={r.id} onClick={() => handlePick(r)} title={r.name} subtitle={r.phone}
                  badge={r.tag === "hot" ? "🔥 Hot" : r.tag === "warm" ? "Warm" : null} badgeClass={r.tag === "hot" ? "bg-hot-soft text-hot" : "bg-warning-soft text-warning"} />
              ))}
            </Group>
          )}
          {!loading && grouped.conversations.length > 0 && (
            <Group label="Conversations" icon={MessageSquare}>
              {grouped.conversations.map((r) => r.kind === "conversation" && (
                <ResultRow key={r.id} onClick={() => handlePick(r)} title={r.name} subtitle={r.preview} />
              ))}
            </Group>
          )}
          {!loading && grouped.deals.length > 0 && (
            <Group label="Deals" icon={Trophy}>
              {grouped.deals.map((r) => r.kind === "deal" && (
                <ResultRow key={r.id} onClick={() => handlePick(r)} title={r.title}
                  subtitle={`₹${r.value.toLocaleString("en-IN")} · ${r.stage}`} />
              ))}
            </Group>
          )}
          <div className="px-3 py-2 border-t border-border bg-muted/20 flex items-center justify-between text-[10px] text-muted-foreground">
            <span>{results.length} results</span>
            <span className="flex items-center gap-1">Press <CornerDownLeft className="w-3 h-3" /> to open</span>
          </div>
        </div>
      )}
    </div>
  );
};

const Group = ({ label, icon: Icon, children }: { label: string; icon: any; children: React.ReactNode }) => (
  <div>
    <div className="px-3 py-1.5 flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider text-muted-foreground bg-muted/30 border-b border-border">
      <Icon className="w-3 h-3" />
      {label}
    </div>
    <ul>{children}</ul>
  </div>
);

const ResultRow = ({ title, subtitle, badge, badgeClass, onClick }: { title: string; subtitle?: string; badge?: string | null; badgeClass?: string; onClick: () => void }) => (
  <li>
    <button onMouseDown={onClick} className="w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-primary-soft/40 transition-colors">
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-semibold truncate">{title}</p>
        {subtitle && <p className="text-[10px] text-muted-foreground truncate">{subtitle}</p>}
      </div>
      {badge && (
        <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded-full", badgeClass)}>{badge}</span>
      )}
    </button>
  </li>
);
