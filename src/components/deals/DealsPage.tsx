import { useMemo, useState } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  Plus,
  Sparkles,
  TrendingUp,
  Trophy,
  Search,
  Filter,
  IndianRupee,
  Flame,
  ChevronRight,
  Phone,
  MessageSquare,
  Receipt,
  Tag,
  Clock,
  Brain,
  Target,
  Trash2,
} from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  useDeals,
  useCreateDeal,
  useUpdateDeal,
  useDeleteDeal,
  useContactsLookup,
  type DealWithContact,
} from "@/hooks/useCrmData";
import type { Database } from "@/integrations/supabase/types";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

type Stage = Database["public"]["Enums"]["deal_stage"];

type StageDef = {
  id: Stage;
  label: string;
  hint: string;
  accent: string; // bg gradient class
  ring: string; // border accent
  dot: string;
};

const STAGES: StageDef[] = [
  { id: "new", label: "New Lead", hint: "Just landed", accent: "from-muted-foreground/15 to-transparent", ring: "border-muted-foreground/20", dot: "bg-muted-foreground" },
  { id: "qualification", label: "Contacted", hint: "Reach out done", accent: "from-accent/20 to-transparent", ring: "border-accent/30", dot: "bg-accent" },
  { id: "proposal", label: "Interested", hint: "Hot signals", accent: "from-warning/25 to-transparent", ring: "border-warning/30", dot: "bg-warning" },
  { id: "closing", label: "Negotiation", hint: "Pricing / terms", accent: "from-warning/30 to-transparent", ring: "border-warning/40", dot: "bg-warning" },
  { id: "won", label: "Won 💰", hint: "Money in", accent: "from-success/30 to-transparent", ring: "border-success/40", dot: "bg-success" },
  { id: "lost", label: "Lost", hint: "Closed lost", accent: "from-destructive/20 to-transparent", ring: "border-destructive/30", dot: "bg-destructive" },
];

const fmtINR = (n: number) =>
  n >= 100000
    ? `₹${(n / 100000).toFixed(n % 100000 === 0 ? 0 : 1)}L`
    : n >= 1000
    ? `₹${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k`
    : `₹${n}`;

const initials = (name?: string | null) =>
  (name ?? "·")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("");

// Deterministic helpers (UI-only) — derive AI insight + activity from deal data
const insightFor = (d: DealWithContact): { label: string; tone: "success" | "warning" | "danger" | "info" } => {
  if (d.stage === "won") return { label: "Closed — log win story", tone: "success" };
  if (d.stage === "lost") return { label: "Re-engage in 30 days", tone: "danger" };
  if (d.probability >= 70) return { label: "High chance to close", tone: "success" };
  if (d.stage === "closing" || d.stage === "proposal")
    return { label: "Send offer now", tone: "warning" };
  if (d.stage === "qualification") return { label: "Needs follow-up", tone: "info" };
  return { label: "Qualify intent", tone: "info" };
};

const healthFor = (d: DealWithContact) => {
  if (d.stage === "won") return "success";
  if (d.stage === "lost") return "danger";
  const ageDays = (Date.now() - new Date(d.updated_at).getTime()) / 86_400_000;
  if (ageDays > 7) return "danger";
  if (ageDays > 3) return "warning";
  return "success";
};

const tagFor = (d: DealWithContact): "hot" | "warm" | "cold" => {
  if (d.contact?.tag) return d.contact.tag as any;
  if (d.probability >= 70) return "hot";
  if (d.probability >= 40) return "warm";
  return "cold";
};

// ---------------- Card ----------------
type CardProps = {
  deal: DealWithContact;
  onOpen: (d: DealWithContact) => void;
  dragging?: boolean;
};

const DealCard = ({ deal, onOpen, dragging }: CardProps) => {
  const insight = insightFor(deal);
  const health = healthFor(deal);
  const tag = tagFor(deal);
  const isWon = deal.stage === "won";
  const isLost = deal.stage === "lost";

  const tagStyles = {
    hot: "bg-hot/15 text-hot border-hot/30",
    warm: "bg-warning/15 text-warning border-warning/30",
    cold: "bg-accent/15 text-accent border-accent/30",
  } as const;

  const insightStyles = {
    success: "bg-success/10 text-success border-success/20",
    warning: "bg-warning/10 text-warning border-warning/25",
    danger: "bg-destructive/10 text-destructive border-destructive/20",
    info: "bg-accent/10 text-accent border-accent/20",
  } as const;

  return (
    <button
      onClick={() => onOpen(deal)}
      className={cn(
        "group w-full text-left rounded-xl border bg-card p-3 transition-all duration-200",
        "hover:-translate-y-0.5 hover:shadow-lg hover:border-primary/30",
        isWon && "ring-1 ring-success/30 shadow-[0_0_20px_-8px_hsl(var(--success)/0.6)]",
        isLost && "opacity-80",
        dragging && "shadow-2xl ring-2 ring-primary/40 rotate-[1.5deg]"
      )}
    >
      {/* Header row */}
      <div className="flex items-start gap-2.5">
        <div className="relative flex-shrink-0">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/80 to-primary-glow/80 text-primary-foreground text-[11px] font-bold flex items-center justify-center shadow-sm">
            {initials(deal.contact?.name) || initials(deal.title)}
          </div>
          <span
            className={cn(
              "absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ring-2 ring-card",
              health === "success" && "bg-success",
              health === "warning" && "bg-warning",
              health === "danger" && "bg-destructive animate-pulse"
            )}
          />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-bold leading-tight truncate">{deal.contact?.name ?? "Unknown lead"}</p>
          <p className="text-[11px] text-muted-foreground truncate mt-0.5">{deal.title}</p>
        </div>
        <Badge variant="outline" className={cn("text-[9px] font-bold uppercase tracking-wider px-1.5 h-5", tagStyles[tag])}>
          {tag}
        </Badge>
      </div>

      {/* Value */}
      <div className="mt-3 flex items-baseline justify-between">
        <div className="flex items-center gap-1">
          <IndianRupee className="w-3.5 h-3.5 text-success" />
          <span className="text-[18px] font-extrabold tracking-tight text-foreground">
            {Number(deal.value).toLocaleString("en-IN")}
          </span>
        </div>
        <div className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground">
          <Target className="w-3 h-3" />
          {deal.probability}%
        </div>
      </div>

      {/* Probability bar */}
      <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            deal.probability >= 70 ? "bg-gradient-to-r from-success to-primary-glow" :
            deal.probability >= 40 ? "bg-gradient-to-r from-warning to-warning" :
            "bg-gradient-to-r from-muted-foreground/40 to-muted-foreground/60"
          )}
          style={{ width: `${Math.min(100, deal.probability)}%` }}
        />
      </div>

      {/* Footer */}
      <div className="mt-2.5 flex items-center justify-between gap-2">
        <span
          className={cn(
            "inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-md border",
            insightStyles[insight.tone]
          )}
        >
          <Brain className="w-2.5 h-2.5" />
          {insight.label}
        </span>
        <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
          <Clock className="w-2.5 h-2.5" />
          {formatDistanceToNow(new Date(deal.updated_at), { addSuffix: true })}
        </span>
      </div>
    </button>
  );
};

// ---------------- Draggable wrapper ----------------
const DraggableCard = ({ deal, onOpen }: { deal: DealWithContact; onOpen: (d: DealWithContact) => void }) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: deal.id,
    data: { deal },
  });
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={{ opacity: isDragging ? 0 : 1 }}
      className="touch-none"
    >
      <DealCard deal={deal} onOpen={onOpen} />
    </div>
  );
};

// ---------------- Column ----------------
const Column = ({
  stage,
  deals,
  onOpen,
  onAdd,
}: {
  stage: StageDef;
  deals: DealWithContact[];
  onOpen: (d: DealWithContact) => void;
  onAdd: (s: Stage) => void;
}) => {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id, data: { stage: stage.id } });
  const total = deals.reduce((a, d) => a + Number(d.value || 0), 0);

  return (
    <div className="flex flex-col w-[300px] shrink-0 h-full">
      {/* Header */}
      <div
        className={cn(
          "rounded-xl border bg-gradient-to-b p-3 mb-2",
          stage.accent,
          stage.ring
        )}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <span className={cn("w-2 h-2 rounded-full", stage.dot)} />
            <p className="text-[12px] font-bold uppercase tracking-wider truncate">{stage.label}</p>
            <span className="text-[10px] font-bold text-muted-foreground bg-card border border-border rounded-full px-1.5 py-px">
              {deals.length}
            </span>
          </div>
          <button
            onClick={() => onAdd(stage.id)}
            className="w-6 h-6 rounded-md hover:bg-card text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors"
            title={`Add deal to ${stage.label}`}
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="flex items-baseline justify-between mt-1.5">
          <p className="text-[10px] text-muted-foreground">{stage.hint}</p>
          <p className="text-[13px] font-extrabold tracking-tight">{fmtINR(total)}</p>
        </div>
      </div>

      {/* Drop zone */}
      <div
        ref={setNodeRef}
        className={cn(
          "flex-1 min-h-[120px] rounded-xl space-y-2 p-1 transition-all overflow-y-auto",
          isOver && "bg-primary-soft/60 ring-2 ring-primary/40 ring-inset"
        )}
      >
        {deals.map((d) => (
          <DraggableCard key={d.id} deal={d} onOpen={onOpen} />
        ))}
        {deals.length === 0 && (
          <div className="h-24 rounded-lg border border-dashed border-border flex items-center justify-center text-[11px] text-muted-foreground">
            Drop deals here
          </div>
        )}
      </div>
    </div>
  );
};

// ---------------- Add Deal Dialog ----------------
const AddDealDialog = ({
  open,
  onOpenChange,
  defaultStage,
  ai = false,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  defaultStage: Stage;
  ai?: boolean;
}) => {
  const { data: contacts = [] } = useContactsLookup();
  const create = useCreateDeal();
  const [contactId, setContactId] = useState<string>("");
  const [title, setTitle] = useState("");
  const [value, setValue] = useState<number>(10000);
  const [stage, setStage] = useState<Stage>(defaultStage);
  const [probability, setProbability] = useState<number>(40);
  const [notes, setNotes] = useState("");

  // Reset on open
  useMemo(() => {
    if (open) {
      setStage(defaultStage);
      if (ai) {
        const c = contacts[0];
        setContactId(c?.id ?? "");
        setTitle(c ? `${c.name} — qualified opportunity` : "AI-generated opportunity");
        setValue(25000);
        setProbability(55);
        setNotes("AI suggestion: warm lead with recent engagement. Recommend offer within 24h.");
      } else {
        setContactId("");
        setTitle("");
        setValue(10000);
        setProbability(40);
        setNotes("");
      }
    }
    return null;
  }, [open, defaultStage, ai, contacts]);

  const submit = async () => {
    if (!contactId) return toast.error("Select a contact");
    if (!title.trim()) return toast.error("Add a deal title");
    await create.mutateAsync({
      contact_id: contactId,
      title: title.trim(),
      value,
      probability,
      stage,
      currency: "INR",
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {ai ? <Sparkles className="w-5 h-5 text-primary" /> : <Plus className="w-5 h-5 text-primary" />}
            {ai ? "AI-suggested deal" : "Add new deal"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3.5">
          <div>
            <Label className="text-xs">Contact</Label>
            <Select value={contactId} onValueChange={setContactId}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Select a lead" /></SelectTrigger>
              <SelectContent>
                {contacts.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name} <span className="text-muted-foreground ml-1 text-xs">{c.phone}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Deal title</Label>
            <Input className="mt-1" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Premium plan — 6 months" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Value (₹)</Label>
              <Input className="mt-1" type="number" value={value} onChange={(e) => setValue(Number(e.target.value))} />
            </div>
            <div>
              <Label className="text-xs">Probability %</Label>
              <Input className="mt-1" type="number" min={0} max={100} value={probability} onChange={(e) => setProbability(Number(e.target.value))} />
            </div>
            <div>
              <Label className="text-xs">Stage</Label>
              <Select value={stage} onValueChange={(v) => setStage(v as Stage)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STAGES.map((s) => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          {ai && (
            <div className="rounded-lg border border-primary/20 bg-primary-soft/50 p-2.5">
              <Label className="text-xs text-primary font-bold flex items-center gap-1.5"><Brain className="w-3 h-3" /> AI notes</Label>
              <Textarea className="mt-1 text-xs" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={create.isPending}>
            {create.isPending ? "Saving…" : ai ? "Create with AI" : "Add deal"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ---------------- Detail Drawer ----------------
const DealDrawer = ({
  deal,
  onClose,
}: {
  deal: DealWithContact | null;
  onClose: () => void;
}) => {
  const update = useUpdateDeal();
  const del = useDeleteDeal();
  if (!deal) return null;
  const insight = insightFor(deal);
  const health = healthFor(deal);

  const nextBest =
    deal.stage === "won"
      ? "Ask for a referral within 24h"
      : deal.stage === "lost"
      ? "Schedule re-engagement in 30 days"
      : deal.probability >= 70
      ? "Send payment link now — close today"
      : deal.stage === "closing"
      ? "Call within 10 minutes"
      : deal.stage === "proposal"
      ? "Send offer with urgency"
      : "Qualify pain point on WhatsApp";

  return (
    <Sheet open={!!deal} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-md p-0 flex flex-col">
        <SheetHeader className="p-5 border-b">
          <SheetTitle className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-primary to-primary-glow text-primary-foreground font-bold flex items-center justify-center">
              {initials(deal.contact?.name)}
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-base font-bold truncate">{deal.contact?.name}</p>
              <p className="text-xs text-muted-foreground truncate font-normal">{deal.contact?.phone}</p>
            </div>
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Value tile */}
          <div className="rounded-xl border bg-gradient-to-br from-success/10 via-card to-primary-soft p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Deal value</p>
            <div className="flex items-baseline gap-2 mt-1">
              <IndianRupee className="w-5 h-5 text-success" />
              <span className="text-3xl font-extrabold tracking-tight">{Number(deal.value).toLocaleString("en-IN")}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">{deal.title}</p>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg bg-card border p-2">
                <p className="text-[9px] text-muted-foreground uppercase font-bold">Stage</p>
                <p className="text-xs font-bold mt-0.5">{STAGES.find((s) => s.id === deal.stage)?.label}</p>
              </div>
              <div className="rounded-lg bg-card border p-2">
                <p className="text-[9px] text-muted-foreground uppercase font-bold">Probability</p>
                <p className="text-xs font-bold mt-0.5">{deal.probability}%</p>
              </div>
              <div className="rounded-lg bg-card border p-2">
                <p className="text-[9px] text-muted-foreground uppercase font-bold">Health</p>
                <p
                  className={cn(
                    "text-xs font-bold mt-0.5",
                    health === "success" && "text-success",
                    health === "warning" && "text-warning",
                    health === "danger" && "text-destructive"
                  )}
                >
                  {health === "success" ? "Healthy" : health === "warning" ? "Stalling" : "At risk"}
                </p>
              </div>
            </div>
          </div>

          {/* AI Next Best Action */}
          <div className="rounded-xl border border-primary/30 bg-primary-soft/60 p-4">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-4 h-4 text-primary" />
              <p className="text-xs font-bold text-primary uppercase tracking-wider">Next best action</p>
            </div>
            <p className="text-sm font-semibold">{nextBest}</p>
            <p className="text-[11px] text-muted-foreground mt-1">Insight: {insight.label}</p>
          </div>

          {/* Stage selector */}
          <div>
            <Label className="text-xs">Move to stage</Label>
            <Select
              value={deal.stage}
              onValueChange={(v) => update.mutate({ id: deal.id, stage: v as Stage })}
            >
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {STAGES.map((s) => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Activity timeline (synthetic from updated_at/created_at) */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Activity</p>
            <ol className="space-y-3 border-l border-border pl-4">
              <li className="relative">
                <span className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-primary ring-2 ring-card" />
                <p className="text-xs font-semibold">Stage updated</p>
                <p className="text-[10px] text-muted-foreground">
                  {formatDistanceToNow(new Date(deal.updated_at), { addSuffix: true })}
                </p>
              </li>
              <li className="relative">
                <span className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-accent ring-2 ring-card" />
                <p className="text-xs font-semibold">Deal created</p>
                <p className="text-[10px] text-muted-foreground">
                  {formatDistanceToNow(new Date(deal.created_at), { addSuffix: true })}
                </p>
              </li>
            </ol>
          </div>

          {deal.contact?.notes && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Notes</p>
              <p className="text-xs text-foreground/80 leading-relaxed">{deal.contact.notes}</p>
            </div>
          )}
        </div>

        {/* Action bar */}
        <div className="border-t p-3 grid grid-cols-4 gap-2 bg-card">
          <Button variant="outline" size="sm" className="flex-col h-14 gap-1" onClick={() => toast.success("Opening chat…")}>
            <MessageSquare className="w-4 h-4 text-success" />
            <span className="text-[10px]">Chat</span>
          </Button>
          <Button variant="outline" size="sm" className="flex-col h-14 gap-1" onClick={() => toast.success("Calling…")}>
            <Phone className="w-4 h-4 text-accent" />
            <span className="text-[10px]">Call</span>
          </Button>
          <Button variant="outline" size="sm" className="flex-col h-14 gap-1" onClick={() => toast.success("Offer sent")}>
            <Tag className="w-4 h-4 text-warning" />
            <span className="text-[10px]">Offer</span>
          </Button>
          <Button variant="outline" size="sm" className="flex-col h-14 gap-1" onClick={() => toast.success("Payment link generated")}>
            <Receipt className="w-4 h-4 text-primary" />
            <span className="text-[10px]">Payment</span>
          </Button>
        </div>
        <div className="border-t p-2 flex items-center justify-end gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={() => {
              del.mutate(deal.id);
              onClose();
            }}
          >
            <Trash2 className="w-4 h-4 mr-1" />
            Delete deal
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

// ---------------- Page ----------------
export const DealsPage = () => {
  const { data: deals = [], isLoading } = useDeals();
  const update = useUpdateDeal();

  const [search, setSearch] = useState("");
  const [tagFilter, setTagFilter] = useState<"all" | "hot" | "warm" | "cold">("all");
  const [active, setActive] = useState<DealWithContact | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [defaultStage, setDefaultStage] = useState<Stage>("new");

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const filtered = useMemo(() => {
    return deals.filter((d) => {
      const tag = tagFor(d);
      if (tagFilter !== "all" && tag !== tagFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const hay = `${d.title} ${d.contact?.name ?? ""} ${d.contact?.phone ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [deals, search, tagFilter]);

  const grouped = useMemo(() => {
    const g: Record<Stage, DealWithContact[]> = {
      new: [], qualification: [], proposal: [], closing: [], won: [], lost: [],
    };
    filtered.forEach((d) => g[d.stage].push(d));
    return g;
  }, [filtered]);

  // Top metrics from full dataset (not filtered) so they reflect reality
  const totalDeals = deals.length;
  const pipelineValue = deals
    .filter((d) => d.stage !== "won" && d.stage !== "lost")
    .reduce((a, d) => a + Number(d.value || 0), 0);
  const wonValue = deals.filter((d) => d.stage === "won").reduce((a, d) => a + Number(d.value || 0), 0);
  const closed = deals.filter((d) => d.stage === "won" || d.stage === "lost").length;
  const conversion = closed === 0 ? 0 : Math.round((deals.filter((d) => d.stage === "won").length / closed) * 100);

  const handleDragStart = (e: DragStartEvent) => setDraggingId(String(e.active.id));
  const handleDragEnd = (e: DragEndEvent) => {
    setDraggingId(null);
    if (!e.over) return;
    const dealId = String(e.active.id);
    const newStage = e.over.id as Stage;
    const deal = deals.find((d) => d.id === dealId);
    if (!deal || deal.stage === newStage) return;
    const probMap: Record<Stage, number> = {
      new: 10, qualification: 30, proposal: 55, closing: 80, won: 100, lost: 0,
    };
    update.mutate({
      id: dealId,
      stage: newStage,
      probability: probMap[newStage],
      ...(newStage === "won" ? { closed_at: new Date().toISOString() } : {}),
    });
    if (newStage === "won") toast.success(`💰 ${fmtINR(Number(deal.value))} closed!`);
  };

  const draggingDeal = draggingId ? deals.find((d) => d.id === draggingId) ?? null : null;

  // Empty state
  if (!isLoading && deals.length === 0) {
    return (
      <PageShell title="Deals Pipeline" subtitle="Track every opportunity from first touch to revenue.">
        <div className="flex-1 flex items-center justify-center">
          <div className="max-w-md text-center">
            <div className="mx-auto w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center shadow-xl shadow-primary/30 mb-5">
              <Trophy className="w-10 h-10 text-primary-foreground" />
            </div>
            <h2 className="text-2xl font-extrabold tracking-tight">No deals yet</h2>
            <p className="text-sm text-muted-foreground mt-2">
              Start converting leads into revenue. Every card on your pipeline is potential money on the table.
            </p>
            <div className="flex items-center justify-center gap-2 mt-5">
              <Button onClick={() => { setDefaultStage("new"); setAddOpen(true); }}>
                <Plus className="w-4 h-4 mr-1.5" /> Create your first deal
              </Button>
              <Button variant="outline" onClick={() => { setDefaultStage("qualification"); setAiOpen(true); }}>
                <Sparkles className="w-4 h-4 mr-1.5 text-primary" /> AI Create
              </Button>
            </div>
          </div>
        </div>
        <AddDealDialog open={addOpen} onOpenChange={setAddOpen} defaultStage={defaultStage} />
        <AddDealDialog open={aiOpen} onOpenChange={setAiOpen} defaultStage={defaultStage} ai />
      </PageShell>
    );
  }

  return (
    <PageShell
      title="Deals Pipeline"
      subtitle="Drag, drop, and close. Every card is potential revenue."
      actions={
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => { setDefaultStage("qualification"); setAiOpen(true); }}>
            <Sparkles className="w-4 h-4 mr-1.5 text-primary" />
            AI Create Deal
          </Button>
          <Button size="sm" onClick={() => { setDefaultStage("new"); setAddOpen(true); }}>
            <Plus className="w-4 h-4 mr-1.5" />
            Add Deal
          </Button>
        </div>
      }
    >
      {/* Metric tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <MetricTile
          label="Total Deals"
          value={totalDeals.toString()}
          icon={<Flame className="w-4 h-4" />}
          tone="primary"
          hint={`${filtered.length} after filters`}
        />
        <MetricTile
          label="Pipeline Value"
          value={fmtINR(pipelineValue)}
          icon={<TrendingUp className="w-4 h-4" />}
          tone="accent"
          hint="Open opportunities"
        />
        <MetricTile
          label="Won"
          value={fmtINR(wonValue)}
          icon={<Trophy className="w-4 h-4" />}
          tone="success"
          hint={`${deals.filter((d) => d.stage === "won").length} deals closed`}
        />
        <MetricTile
          label="Conversion Rate"
          value={`${conversion}%`}
          icon={<Target className="w-4 h-4" />}
          tone="warning"
          hint={`${closed} closed total`}
        />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, deal, phone…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-9"
          />
        </div>
        <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
          {(["all", "hot", "warm", "cold"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTagFilter(t)}
              className={cn(
                "px-2.5 h-7 rounded-md text-[11px] font-bold uppercase tracking-wider transition-colors",
                tagFilter === t
                  ? "bg-card shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {t}
            </button>
          ))}
        </div>
        <Button variant="outline" size="sm" className="h-9">
          <Filter className="w-3.5 h-3.5 mr-1.5" /> More filters
        </Button>
      </div>

      {/* Kanban */}
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="overflow-x-auto pb-2 -mx-2 px-2" style={{ height: "calc(100vh - 320px)", minHeight: 480 }}>
          <div className="flex gap-3 h-full min-w-max">
            {STAGES.map((s) => (
              <Column
                key={s.id}
                stage={s}
                deals={grouped[s.id]}
                onOpen={setActive}
                onAdd={(stg) => { setDefaultStage(stg); setAddOpen(true); }}
              />
            ))}
          </div>
        </div>
        <DragOverlay>
          {draggingDeal ? <DealCard deal={draggingDeal} onOpen={() => {}} dragging /> : null}
        </DragOverlay>
      </DndContext>

      <DealDrawer deal={active} onClose={() => setActive(null)} />
      <AddDealDialog open={addOpen} onOpenChange={setAddOpen} defaultStage={defaultStage} />
      <AddDealDialog open={aiOpen} onOpenChange={setAiOpen} defaultStage={defaultStage} ai />
    </PageShell>
  );
};

// ---------------- Metric Tile ----------------
const toneStyles = {
  primary: "from-primary/15 to-primary/0 text-primary border-primary/20",
  accent: "from-accent/15 to-accent/0 text-accent border-accent/20",
  success: "from-success/15 to-success/0 text-success border-success/20",
  warning: "from-warning/20 to-warning/0 text-warning border-warning/25",
} as const;

const MetricTile = ({
  label,
  value,
  icon,
  tone,
  hint,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  tone: keyof typeof toneStyles;
  hint?: string;
}) => (
  <div className={cn("rounded-xl border bg-gradient-to-br p-3.5 relative overflow-hidden", toneStyles[tone])}>
    <div className="flex items-center justify-between">
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
      <span className="opacity-80">{icon}</span>
    </div>
    <p className="text-2xl font-extrabold tracking-tight text-foreground mt-1">{value}</p>
    {hint && (
      <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
        <ChevronRight className="w-3 h-3" /> {hint}
      </p>
    )}
  </div>
);

export default DealsPage;
