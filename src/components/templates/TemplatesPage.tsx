import { useMemo, useState } from "react";
import { Copy, Plus, Search, Sparkles, MessageSquare, Tag, Trash2, Pencil, Send, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Category = "whatsapp" | "sales" | "offer" | "followup";

type Template = {
  id: string;
  title: string;
  body: string;
  category: Category;
  tags: string[];
  uses: number;
  starred?: boolean;
  updatedAt: string;
};

const CATEGORIES: { id: Category | "all"; label: string; hint: string }[] = [
  { id: "all", label: "All", hint: "Every template" },
  { id: "whatsapp", label: "WhatsApp", hint: "Approved templates" },
  { id: "sales", label: "Sales scripts", hint: "Pitch & objection handling" },
  { id: "offer", label: "Offers", hint: "Discounts & promos" },
  { id: "followup", label: "Follow-ups", hint: "Re-engage leads" },
];

const CAT_STYLES: Record<Category, { tone: string; icon: typeof MessageSquare; label: string }> = {
  whatsapp: { tone: "bg-success/10 text-success border-success/20", icon: MessageSquare, label: "WhatsApp" },
  sales: { tone: "bg-primary/10 text-primary border-primary/20", icon: Sparkles, label: "Sales script" },
  offer: { tone: "bg-warning/10 text-warning border-warning/20", icon: Tag, label: "Offer" },
  followup: { tone: "bg-accent/10 text-accent border-accent/20", icon: Send, label: "Follow-up" },
};

const SEED: Template[] = [
  {
    id: "t1",
    title: "Welcome — new lead",
    category: "whatsapp",
    tags: ["greeting", "intro"],
    uses: 184,
    starred: true,
    updatedAt: "2d ago",
    body: "Hi {{name}} 👋 Thanks for reaching out to AddisonX Media! I'm Addison, your dedicated growth partner. Quick question — what's the #1 thing you'd like to fix about your current marketing?",
  },
  {
    id: "t2",
    title: "Pricing reveal — premium",
    category: "sales",
    tags: ["pricing", "premium"],
    uses: 92,
    updatedAt: "1d ago",
    body: "Great question {{name}}! Our growth packages start at ₹49,000/mo and most clients see 3–5× ROI within 60 days. Want me to share the breakdown that fits your goal?",
  },
  {
    id: "t3",
    title: "Festive offer — 25% off",
    category: "offer",
    tags: ["festive", "discount"],
    uses: 47,
    starred: true,
    updatedAt: "5h ago",
    body: "🎉 {{name}}, exclusive for you: get 25% off any AddisonX growth plan if you onboard before Sunday. Shall I send the payment link?",
  },
  {
    id: "t4",
    title: "Follow-up — 24h silent",
    category: "followup",
    tags: ["nudge", "soft"],
    uses: 213,
    updatedAt: "3h ago",
    body: "Hey {{name}}, just circling back — still keen to chat about scaling your sales? I can hold a slot for you tomorrow.",
  },
  {
    id: "t5",
    title: "Objection — too expensive",
    category: "sales",
    tags: ["objection", "value"],
    uses: 64,
    updatedAt: "1w ago",
    body: "Totally hear you {{name}}. Most of our clients felt the same — until they saw the avg ₹4.2L extra revenue in month 2. Want me to share a quick case study?",
  },
  {
    id: "t6",
    title: "Payment confirmation",
    category: "whatsapp",
    tags: ["payment", "thanks"],
    uses: 128,
    updatedAt: "4d ago",
    body: "Payment received ✅ Thank you {{name}}! Your onboarding kit is on the way. Our team will reach out within 2 hours to kick things off 🚀",
  },
];

export const TemplatesPage = () => {
  const [items, setItems] = useState<Template[]>(SEED);
  const [filter, setFilter] = useState<Category | "all">("all");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Partial<Template>>({ category: "whatsapp" });
  const [editingId, setEditingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return items
      .filter((t) => (filter === "all" ? true : t.category === filter))
      .filter((t) => {
        if (!q.trim()) return true;
        const s = q.toLowerCase();
        return t.title.toLowerCase().includes(s) || t.body.toLowerCase().includes(s) || t.tags.join(" ").includes(s);
      })
      .sort((a, b) => Number(!!b.starred) - Number(!!a.starred));
  }, [items, filter, q]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: items.length };
    items.forEach((t) => (c[t.category] = (c[t.category] ?? 0) + 1));
    return c;
  }, [items]);

  const totalUses = items.reduce((a, t) => a + t.uses, 0);

  const copy = async (t: Template) => {
    await navigator.clipboard.writeText(t.body);
    setItems((prev) => prev.map((x) => (x.id === t.id ? { ...x, uses: x.uses + 1 } : x)));
    toast.success("Template copied to clipboard");
  };

  const remove = (id: string) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
    toast.success("Template deleted");
  };

  const star = (id: string) => {
    setItems((prev) => prev.map((t) => (t.id === id ? { ...t, starred: !t.starred } : t)));
  };

  const startEdit = (t: Template) => {
    setEditingId(t.id);
    setDraft(t);
    setOpen(true);
  };

  const save = () => {
    if (!draft.title || !draft.body || !draft.category) {
      toast.error("Title and body required");
      return;
    }
    if (editingId) {
      setItems((prev) =>
        prev.map((t) =>
          t.id === editingId
            ? { ...t, ...(draft as Template), updatedAt: "just now" }
            : t
        )
      );
      toast.success("Template updated");
    } else {
      setItems((prev) => [
        {
          id: `t${Date.now()}`,
          title: draft.title!,
          body: draft.body!,
          category: draft.category as Category,
          tags: (draft.tags as any) || [],
          uses: 0,
          updatedAt: "just now",
        },
        ...prev,
      ]);
      toast.success("Template created");
    }
    setOpen(false);
    setDraft({ category: "whatsapp" });
    setEditingId(null);
  };

  return (
    <div className="flex-1 min-h-0 overflow-y-auto bg-muted/20">
      <div className="max-w-[1400px] mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[26px] font-bold tracking-tight">Templates</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Reusable messages for chats, broadcasts & AI replies
            </p>
          </div>
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditingId(null); setDraft({ category: "whatsapp" }); } }}>
            <DialogTrigger asChild>
              <Button className="gap-2 shadow-md shadow-primary/20">
                <Plus className="w-4 h-4" />
                New template
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{editingId ? "Edit template" : "Create template"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold">Title</label>
                  <Input
                    value={draft.title ?? ""}
                    onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                    placeholder="Welcome — new lead"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold">Category</label>
                  <Select
                    value={draft.category as string}
                    onValueChange={(v) => setDraft({ ...draft, category: v as Category })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="whatsapp">WhatsApp</SelectItem>
                      <SelectItem value="sales">Sales script</SelectItem>
                      <SelectItem value="offer">Offer</SelectItem>
                      <SelectItem value="followup">Follow-up</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold">Body</label>
                  <Textarea
                    rows={6}
                    value={draft.body ?? ""}
                    onChange={(e) => setDraft({ ...draft, body: e.target.value })}
                    placeholder="Hi {{name}}, ..."
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Use <code className="px-1 rounded bg-muted">{`{{name}}`}</code> for personalization.
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                <Button onClick={save}>{editingId ? "Save changes" : "Create template"}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stat strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Total templates" value={items.length} />
          <StatCard label="Total uses" value={totalUses} accent />
          <StatCard label="WhatsApp ready" value={counts.whatsapp ?? 0} />
          <StatCard label="Starred" value={items.filter((t) => t.starred).length} />
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          <Tabs value={filter} onValueChange={(v) => setFilter(v as any)} className="overflow-x-auto">
            <TabsList>
              {CATEGORIES.map((c) => (
                <TabsTrigger key={c.id} value={c.id} className="gap-2">
                  {c.label}
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground font-semibold">
                    {counts[c.id] ?? 0}
                  </span>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <div className="relative md:ml-auto md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search templates..."
              className="pl-9"
            />
          </div>
        </div>

        {/* Grid */}
        {filtered.length === 0 ? (
          <EmptyState onCreate={() => setOpen(true)} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((t) => {
              const meta = CAT_STYLES[t.category];
              const Icon = meta.icon;
              return (
                <div
                  key={t.id}
                  className="group bg-card border border-border rounded-2xl p-4 hover:shadow-lg hover:-translate-y-0.5 transition-all flex flex-col"
                >
                  <div className="flex items-start gap-2 mb-2">
                    <div className={cn("w-8 h-8 rounded-lg border flex items-center justify-center flex-shrink-0", meta.tone)}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-[14px] truncate leading-tight">{t.title}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{meta.label} · {t.updatedAt}</p>
                    </div>
                    <button
                      onClick={() => star(t.id)}
                      className={cn(
                        "p-1 rounded hover:bg-muted transition-colors",
                        t.starred ? "text-warning" : "text-muted-foreground/50 hover:text-warning"
                      )}
                    >
                      <Star className={cn("w-4 h-4", t.starred && "fill-current")} />
                    </button>
                  </div>

                  <p className="text-[13px] text-foreground/80 leading-relaxed line-clamp-4 flex-1">{t.body}</p>

                  <div className="flex flex-wrap gap-1 mt-3">
                    {t.tags.map((tag) => (
                      <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
                        #{tag}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/60">
                    <span className="text-[11px] text-muted-foreground font-medium">
                      Used <span className="text-foreground font-bold">{t.uses}×</span>
                    </span>
                    <div className="flex items-center gap-1">
                      <Button size="sm" variant="ghost" className="h-8 px-2 gap-1.5" onClick={() => startEdit(t)}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-8 px-2 text-destructive hover:text-destructive" onClick={() => remove(t.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="sm" className="h-8 gap-1.5" onClick={() => copy(t)}>
                        <Copy className="w-3.5 h-3.5" />
                        Use
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

const StatCard = ({ label, value, accent }: { label: string; value: number; accent?: boolean }) => (
  <div
    className={cn(
      "rounded-xl border p-3.5",
      accent ? "bg-gradient-to-br from-primary-soft to-card border-primary/20" : "bg-card border-border"
    )}
  >
    <p className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider">{label}</p>
    <p className={cn("text-2xl font-bold mt-1", accent && "text-primary")}>{value.toLocaleString()}</p>
  </div>
);

const EmptyState = ({ onCreate }: { onCreate: () => void }) => (
  <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
    <div className="w-14 h-14 rounded-2xl bg-primary-soft text-primary mx-auto flex items-center justify-center mb-3">
      <MessageSquare className="w-6 h-6" />
    </div>
    <p className="font-semibold">No templates here yet</p>
    <p className="text-sm text-muted-foreground mt-1">Create your first reusable message and save hours every week.</p>
    <Button onClick={onCreate} className="mt-4 gap-2">
      <Plus className="w-4 h-4" />
      Create template
    </Button>
  </div>
);
