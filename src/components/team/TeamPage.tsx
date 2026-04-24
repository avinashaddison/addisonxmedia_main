import { useState } from "react";
import { Plus, Mail, Crown, Shield, User as UserIcon, MoreVertical, MessageSquare, Trophy, Clock, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Role = "owner" | "admin" | "agent";
type Status = "online" | "away" | "offline";

type Member = {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: Status;
  assignedChats: number;
  dealsClosed: number;
  revenue: number;
  responseTime: string;
  joinedAt: string;
};

const ROLE_META: Record<Role, { label: string; color: string; icon: typeof Crown }> = {
  owner: { label: "Owner", color: "bg-warning/10 text-warning border-warning/20", icon: Crown },
  admin: { label: "Admin", color: "bg-primary/10 text-primary border-primary/20", icon: Shield },
  agent: { label: "Agent", color: "bg-muted text-muted-foreground border-border", icon: UserIcon },
};

const STATUS_DOT: Record<Status, string> = {
  online: "bg-success",
  away: "bg-warning",
  offline: "bg-muted-foreground/40",
};

const SEED: Member[] = [
  { id: "m1", name: "Karan Mehta", email: "karan@addisonx.media", role: "owner", status: "online", assignedChats: 24, dealsClosed: 18, revenue: 1240000, responseTime: "1m 12s", joinedAt: "Jan 2024" },
  { id: "m2", name: "Priya Sharma", email: "priya@addisonx.media", role: "admin", status: "online", assignedChats: 31, dealsClosed: 22, revenue: 1875000, responseTime: "48s", joinedAt: "Mar 2024" },
  { id: "m3", name: "Rahul Verma", email: "rahul@addisonx.media", role: "agent", status: "away", assignedChats: 18, dealsClosed: 11, revenue: 612000, responseTime: "2m 04s", joinedAt: "Jun 2024" },
  { id: "m4", name: "Ananya Iyer", email: "ananya@addisonx.media", role: "agent", status: "online", assignedChats: 27, dealsClosed: 14, revenue: 890000, responseTime: "1m 31s", joinedAt: "Aug 2024" },
  { id: "m5", name: "Vikram Patel", email: "vikram@addisonx.media", role: "agent", status: "offline", assignedChats: 12, dealsClosed: 6, revenue: 320000, responseTime: "4m 22s", joinedAt: "Oct 2024" },
];

const formatINR = (n: number) =>
  n >= 10000000 ? `₹${(n / 10000000).toFixed(1)}Cr` : n >= 100000 ? `₹${(n / 100000).toFixed(1)}L` : `₹${n.toLocaleString("en-IN")}`;

export const TeamPage = () => {
  const [members, setMembers] = useState<Member[]>(SEED);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [draft, setDraft] = useState<{ name: string; email: string; role: Role }>({
    name: "",
    email: "",
    role: "agent",
  });

  const filtered = members.filter((m) => {
    if (!q.trim()) return true;
    const s = q.toLowerCase();
    return m.name.toLowerCase().includes(s) || m.email.toLowerCase().includes(s);
  });

  const totalRevenue = members.reduce((a, m) => a + m.revenue, 0);
  const totalDeals = members.reduce((a, m) => a + m.dealsClosed, 0);
  const totalChats = members.reduce((a, m) => a + m.assignedChats, 0);
  const onlineCount = members.filter((m) => m.status === "online").length;

  const topPerformer = [...members].sort((a, b) => b.revenue - a.revenue)[0];

  const invite = () => {
    if (!draft.name || !draft.email) {
      toast.error("Name and email required");
      return;
    }
    setMembers((prev) => [
      ...prev,
      {
        id: `m${Date.now()}`,
        name: draft.name,
        email: draft.email,
        role: draft.role,
        status: "offline",
        assignedChats: 0,
        dealsClosed: 0,
        revenue: 0,
        responseTime: "—",
        joinedAt: "just now",
      },
    ]);
    toast.success(`Invite sent to ${draft.email}`);
    setOpen(false);
    setDraft({ name: "", email: "", role: "agent" });
  };

  const changeRole = (id: string, role: Role) => {
    setMembers((prev) => prev.map((m) => (m.id === id ? { ...m, role } : m)));
    toast.success("Role updated");
  };

  return (
    <div className="flex-1 min-h-0 overflow-y-auto bg-muted/20">
      <div className="max-w-[1400px] mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[26px] font-bold tracking-tight">Team & Agents</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Manage members, assign chats, and track performance
            </p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 shadow-md shadow-primary/20">
                <Plus className="w-4 h-4" />
                Invite member
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Invite a teammate</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold">Full name</label>
                  <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Riya Kapoor" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold">Email</label>
                  <Input type="email" value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} placeholder="riya@yourcompany.com" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold">Role</label>
                  <Select value={draft.role} onValueChange={(v) => setDraft({ ...draft, role: v as Role })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin — full access</SelectItem>
                      <SelectItem value="agent">Agent — chats & deals</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                <Button onClick={invite} className="gap-2"><Mail className="w-4 h-4" /> Send invite</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Active members" value={`${members.length}`} hint={`${onlineCount} online now`} />
          <StatCard label="Open chats" value={totalChats.toString()} hint="Assigned across team" />
          <StatCard label="Deals closed" value={totalDeals.toString()} hint="This month" />
          <StatCard label="Team revenue" value={formatINR(totalRevenue)} hint="Last 30 days" accent />
        </div>

        {/* Top performer */}
        {topPerformer && (
          <div className="rounded-2xl border border-warning/30 bg-gradient-to-r from-warning/10 via-card to-card p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-warning to-warning/70 text-warning-foreground flex items-center justify-center shadow-md">
              <Trophy className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-wider text-warning">Top performer · this month</p>
              <p className="font-semibold mt-0.5">{topPerformer.name} closed {topPerformer.dealsClosed} deals worth {formatINR(topPerformer.revenue)}</p>
            </div>
            <Button variant="outline" size="sm">View report</Button>
          </div>
        )}

        {/* Search */}
        <div className="relative md:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search members..." className="pl-9" />
        </div>

        {/* Members table */}
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="grid grid-cols-12 gap-3 px-4 py-2.5 border-b border-border bg-muted/40 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            <div className="col-span-4">Member</div>
            <div className="col-span-2">Role</div>
            <div className="col-span-1 text-center">Chats</div>
            <div className="col-span-1 text-center">Deals</div>
            <div className="col-span-2 text-right">Revenue</div>
            <div className="col-span-2 text-right">Avg reply</div>
          </div>
          {filtered.map((m) => {
            const meta = ROLE_META[m.role];
            const Icon = meta.icon;
            const initials = m.name.split(" ").slice(0, 2).map((p) => p[0]).join("");
            return (
              <div key={m.id} className="grid grid-cols-12 gap-3 px-4 py-3.5 border-b border-border/60 last:border-b-0 items-center hover:bg-muted/30 transition-colors group">
                <div className="col-span-4 flex items-center gap-3 min-w-0">
                  <div className="relative flex-shrink-0">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary-glow text-primary-foreground text-[12px] font-bold flex items-center justify-center">
                      {initials}
                    </div>
                    <span className={cn("absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-card", STATUS_DOT[m.status])} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-[13px] truncate">{m.name}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{m.email}</p>
                  </div>
                </div>

                <div className="col-span-2">
                  {m.role === "owner" ? (
                    <span className={cn("inline-flex items-center gap-1.5 px-2 py-1 rounded-md border text-[11px] font-semibold", meta.color)}>
                      <Icon className="w-3 h-3" /> {meta.label}
                    </span>
                  ) : (
                    <Select value={m.role} onValueChange={(v) => changeRole(m.id, v as Role)}>
                      <SelectTrigger className="h-8 w-[110px] text-[12px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="agent">Agent</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>

                <div className="col-span-1 text-center">
                  <div className="inline-flex items-center gap-1 text-[13px] font-semibold">
                    <MessageSquare className="w-3.5 h-3.5 text-muted-foreground" />
                    {m.assignedChats}
                  </div>
                </div>

                <div className="col-span-1 text-center">
                  <span className="text-[13px] font-bold text-success">{m.dealsClosed}</span>
                </div>

                <div className="col-span-2 text-right">
                  <span className="text-[13px] font-bold">{formatINR(m.revenue)}</span>
                </div>

                <div className="col-span-2 flex items-center justify-end gap-2">
                  <span className="text-[12px] text-muted-foreground inline-flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {m.responseTime}
                  </span>
                  <Button size="icon" variant="ghost" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ label, value, hint, accent }: { label: string; value: string; hint?: string; accent?: boolean }) => (
  <div className={cn(
    "rounded-xl border p-3.5",
    accent ? "bg-gradient-to-br from-primary-soft to-card border-primary/20" : "bg-card border-border"
  )}>
    <p className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider">{label}</p>
    <p className={cn("text-2xl font-bold mt-1", accent && "text-primary")}>{value}</p>
    {hint && <p className="text-[11px] text-muted-foreground mt-1">{hint}</p>}
  </div>
);
