import { useState, useMemo } from "react";
import { PageShell } from "@/components/PageShell";
import { Megaphone, Sparkles, Plus, TrendingUp, Users, MousePointerClick, ShoppingCart, Trash2, Play, Pause, MoreVertical, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useCampaigns, useCreateCampaign, useDeleteCampaign, useUpdateCampaign, Campaign } from "@/hooks/useCrmData";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { Database } from "@/integrations/supabase/types";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

type Channel = Database["public"]["Enums"]["campaign_channel"];
type Status = Database["public"]["Enums"]["campaign_status"];

const statusStyle: Record<Status, string> = {
  active: "bg-success-soft text-success",
  scheduled: "bg-warning-soft text-warning",
  draft: "bg-muted text-muted-foreground",
  paused: "bg-accent-soft text-accent",
  completed: "bg-primary-soft text-primary",
};

const channelEmoji: Record<Channel, string> = {
  whatsapp: "💬",
  sms: "📱",
  email: "📧",
  multi: "🌐",
};

export const CampaignsPage = () => {
  const { data: campaigns = [], isLoading } = useCampaigns();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | Status>("all");

  const filtered = useMemo(() => {
    return campaigns.filter((c) => {
      if (filter !== "all" && c.status !== filter) return false;
      if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [campaigns, search, filter]);

  const totals = useMemo(() => {
    const sent = campaigns.reduce((a, c) => a + c.sent_count, 0);
    const replies = campaigns.reduce((a, c) => a + c.replied_count, 0);
    const conversions = campaigns.reduce((a, c) => a + c.conversion_count, 0);
    const active = campaigns.filter((c) => c.status === "active").length;
    return { sent, replies, conversions, active, total: campaigns.length };
  }, [campaigns]);

  return (
    <PageShell
      title="Campaigns"
      subtitle="Marketing campaigns with AI-driven targeting"
      icon={<Megaphone className="w-4 h-4" />}
      actions={<NewCampaignDialog />}
    >
      {/* Hero strip */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary to-primary-glow p-6 mb-5 text-primary-foreground">
        <div className="absolute -right-6 -top-6 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute right-32 bottom-0 w-24 h-24 bg-white/10 rounded-full blur-xl" />
        <div className="relative grid grid-cols-2 lg:grid-cols-5 gap-5 items-center">
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4" />
              <span className="text-[10px] font-bold uppercase tracking-wider opacity-90">Campaign HQ</span>
            </div>
            <h2 className="text-2xl font-bold mb-1">{totals.active} active campaigns</h2>
            <p className="text-[13px] opacity-90 max-w-md">
              Reach the right contact at the right time. Track sent, replies, and conversions live.
            </p>
          </div>
          <HeroStat label="Sent" value={totals.sent.toLocaleString()} />
          <HeroStat label="Replies" value={totals.replies.toLocaleString()} />
          <HeroStat label="Conversions" value={totals.conversions.toLocaleString()} />
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-card border border-border rounded-xl p-3 mb-4 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search campaigns…"
            className="w-full h-9 pl-9 pr-3 rounded-lg bg-muted border-0 text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <div className="flex gap-1 flex-wrap">
          {(["all", "active", "scheduled", "draft", "paused", "completed"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={cn(
                "px-3 h-9 rounded-lg text-[12px] font-semibold capitalize transition-colors",
                filter === t ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {isLoading && (
        <div className="bg-card border border-border rounded-xl p-12 text-center text-[13px] text-muted-foreground">
          Loading campaigns…
        </div>
      )}

      {!isLoading && filtered.length === 0 && (
        <EmptyState search={!!search || filter !== "all"} />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {filtered.map((c) => (
          <CampaignCard key={c.id} campaign={c} />
        ))}
      </div>
    </PageShell>
  );
};

const HeroStat = ({ label, value }: { label: string; value: string }) => (
  <div className="bg-white/10 backdrop-blur rounded-xl p-3">
    <p className="text-[10px] uppercase tracking-wider opacity-75 font-semibold">{label}</p>
    <p className="text-xl font-bold tabular-nums mt-0.5">{value}</p>
  </div>
);

const EmptyState = ({ search }: { search: boolean }) => (
  <div className="bg-card border border-dashed border-border rounded-xl p-12 text-center">
    <div className="w-12 h-12 rounded-full bg-primary-soft mx-auto mb-3 flex items-center justify-center">
      <Megaphone className="w-5 h-5 text-primary" />
    </div>
    <p className="text-[14px] font-semibold mb-1">{search ? "No matching campaigns" : "No campaigns yet"}</p>
    <p className="text-[12px] text-muted-foreground mb-4">
      {search ? "Try changing your filters." : "Create your first campaign to start reaching contacts at scale."}
    </p>
  </div>
);

const CampaignCard = ({ campaign: c }: { campaign: Campaign }) => {
  const updateMut = useUpdateCampaign();
  const deleteMut = useDeleteCampaign();
  const replyRate = c.sent_count ? Math.round((c.replied_count / c.sent_count) * 100) : 0;
  const convRate = c.sent_count ? Math.round((c.conversion_count / c.sent_count) * 100) : 0;

  const togglePause = () => {
    updateMut.mutate({ id: c.id, status: c.status === "active" ? "paused" : "active" });
  };

  return (
    <div className="bg-card border border-border rounded-xl p-4 hover:border-primary/30 hover:shadow-md transition-all group">
      <div className="flex items-start justify-between mb-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-base">{channelEmoji[c.channel]}</span>
            <h4 className="text-[14px] font-bold truncate">{c.name}</h4>
            <span className={cn("text-[9px] font-bold uppercase px-1.5 py-0.5 rounded", statusStyle[c.status])}>
              {c.status}
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground">
            {c.channel} · {c.audience_size.toLocaleString()} contacts · ₹{Number(c.budget).toLocaleString()} budget
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger className="w-7 h-7 rounded-lg hover:bg-muted flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <MoreVertical className="w-3.5 h-3.5" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={togglePause}>
              {c.status === "active" ? <><Pause className="w-3.5 h-3.5 mr-2" />Pause</> : <><Play className="w-3.5 h-3.5 mr-2" />Activate</>}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => deleteMut.mutate(c.id)} className="text-destructive">
              <Trash2 className="w-3.5 h-3.5 mr-2" />Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-3">
        <Metric icon={<MousePointerClick className="w-3 h-3" />} label="Sent" value={c.sent_count.toLocaleString()} />
        <Metric icon={<Users className="w-3 h-3" />} label="Replies" value={`${c.replied_count} (${replyRate}%)`} />
        <Metric icon={<ShoppingCart className="w-3 h-3" />} label="Won" value={`${c.conversion_count} (${convRate}%)`} accent />
      </div>

      {c.sent_count > 0 ? (
        <div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden flex">
            <div className="h-full bg-success" style={{ width: `${convRate}%` }} />
            <div className="h-full bg-primary" style={{ width: `${Math.max(0, replyRate - convRate)}%` }} />
            <div className="h-full bg-muted-foreground/20" style={{ width: `${100 - replyRate}%` }} />
          </div>
          <div className="flex items-center justify-between mt-1.5 text-[10px] text-muted-foreground">
            <span>Conversion funnel</span>
            <span className="text-success font-semibold flex items-center gap-1"><TrendingUp className="w-3 h-3" />{convRate}%</span>
          </div>
        </div>
      ) : (
        <p className="text-[11px] text-muted-foreground italic">Not started yet</p>
      )}
    </div>
  );
};

const Metric = ({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string; accent?: boolean }) => (
  <div className="bg-muted/40 rounded-lg p-2">
    <div className="flex items-center gap-1 text-[9px] uppercase tracking-wider text-muted-foreground font-semibold mb-0.5">
      {icon}
      {label}
    </div>
    <p className={cn("text-[13px] font-bold tabular-nums", accent && "text-success")}>{value}</p>
  </div>
);

type FormValues = {
  name: string;
  description?: string;
  channel: Channel;
  budget: number;
  audience_size: number;
};

const NewCampaignDialog = () => {
  const [open, setOpen] = useState(false);
  const create = useCreateCampaign();
  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    defaultValues: { channel: "whatsapp", budget: 0, audience_size: 0 },
  });

  const onSubmit = (v: FormValues) => {
    create.mutate(
      { name: v.name, description: v.description || null, channel: v.channel, budget: v.budget, audience_size: v.audience_size, status: "draft" },
      { onSuccess: () => { setOpen(false); reset(); } }
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2"><Plus className="w-3.5 h-3.5" />New Campaign</Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Create campaign</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="cname">Name *</Label>
            <Input id="cname" {...register("name", { required: true })} placeholder="Diwali Sale 2026" />
            {errors.name && <p className="text-[11px] text-destructive">Required</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cdesc">Description</Label>
            <Textarea id="cdesc" {...register("description")} placeholder="Goal of this campaign…" rows={2} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="cchan">Channel</Label>
              <select id="cchan" {...register("channel")} className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
                <option value="whatsapp">WhatsApp</option>
                <option value="sms">SMS</option>
                <option value="email">Email</option>
                <option value="multi">Multi-channel</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cbud">Budget (₹)</Label>
              <Input id="cbud" type="number" {...register("budget", { valueAsNumber: true })} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="caud">Audience size</Label>
            <Input id="caud" type="number" {...register("audience_size", { valueAsNumber: true })} />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={create.isPending}>{create.isPending ? "Creating…" : "Create"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
