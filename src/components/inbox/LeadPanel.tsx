import { useEffect, useState } from "react";
import {
  Phone, Mail, Tag, StickyNote, X, Flame, Snowflake, CircleDot,
  Save, Trophy, Plus, Loader2, Globe, Bell, IndianRupee,
  MessageCircle, Instagram, Link2, Facebook, Send, Settings as SettingsIcon, ExternalLink,
} from "lucide-react";
import { Link as RouterLink } from "react-router-dom";
import { SendPaymentDialog } from "./SendPaymentDialog";
import { cn } from "@/lib/utils";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Contact, initialsFor, formatRelative } from "@/lib/inbox-types";
import type { Deal, Task } from "@/lib/api-types";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Props = {
  contact: Contact;
  conversationId?: string;
  onClose?: () => void;
};

const formatINR = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

export const LeadPanel = ({ contact, conversationId, onClose }: Props) => {
  const qc = useQueryClient();
  const { user } = useAuth();
  const initials = initialsFor(contact.name);

  // Editable fields — start from server state, persist on save
  const [tag, setTag] = useState<Contact["tag"]>(contact.tag);
  const [score, setScore] = useState(contact.score);
  const [notes, setNotes] = useState(contact.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);

  // Reset editor state when switching contacts
  useEffect(() => {
    setTag(contact.tag);
    setScore(contact.score);
    setNotes(contact.notes ?? "");
  }, [contact.id, contact.tag, contact.score, contact.notes]);

  const dirty = tag !== contact.tag || score !== contact.score || (notes ?? "") !== (contact.notes ?? "");

  // Real deals + tasks for this specific contact
  const { data: allDeals = [] } = useQuery({
    queryKey: ["deals", user?.id],
    enabled: !!user,
    queryFn: () => api.listDeals() as Promise<Deal[]>,
  });
  const { data: allTasks = [] } = useQuery({
    queryKey: ["tasks", user?.id],
    enabled: !!user,
    queryFn: () => api.listTasks() as Promise<(Task & { contact?: Contact | null })[]>,
  });
  const contactDeals = allDeals.filter((d) => d.contact_id === contact.id);
  const contactTasks = allTasks.filter((t) => t.contact_id === contact.id);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.updateContact(contact.id, {
        tag,
        score,
        notes: notes.trim() || null,
      });
      toast.success("Lead updated");
      // Invalidate both contacts (for the inbox list) and conversations (for the joined contact)
      qc.invalidateQueries({ queryKey: ["contacts-page"] });
      qc.invalidateQueries({ queryKey: ["contacts-lookup"] });
      qc.invalidateQueries({ queryKey: ["conversations"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const [taskOpen, setTaskOpen] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskSaving, setTaskSaving] = useState(false);

  const handleAddTask = () => {
    setTaskTitle("");
    setTaskOpen(true);
  };

  const submitTask = async (e: React.FormEvent) => {
    e.preventDefault();
    const title = taskTitle.trim();
    if (!title) { toast.error("Task likhna zaroori hai"); return; }
    setTaskSaving(true);
    try {
      await api.createTask({
        contact_id: contact.id,
        title,
        priority: tag === "hot" ? "high" : "medium",
        status: "pending",
        due_at: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
      });
      toast.success("Follow-up added");
      qc.invalidateQueries({ queryKey: ["tasks", user?.id] });
      setTaskOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setTaskSaving(false);
    }
  };

  return (
    <div className="w-[340px] h-full bg-white border-l-2 border-[#E8B968] flex flex-col flex-shrink-0 overflow-hidden">
      {/* Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b-2 border-[#E8B968] bg-[#FFF6E8] flex-shrink-0">
        <h3 className="text-[14px] font-black tracking-tight">Lead ki details</h3>
        {onClose && (
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-[#FFE8C7] flex items-center justify-center text-foreground/60 hover:text-foreground transition lg:hidden"
            aria-label="Close panel"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Profile + contact info */}
        <div className="p-4">
          <div className="flex items-center gap-3 mb-4">
            <div className={cn(
              "w-14 h-14 rounded-full flex items-center justify-center text-sm font-extrabold flex-shrink-0 text-white shadow-md",
              contact.tag === "hot" ? "bg-[#D4308E]" :
              contact.tag === "warm" ? "bg-[#FF6A1F]" :
              "bg-[#3C50E0]"
            )}>
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="text-[15px] font-black truncate">{contact.name}</h4>
              <p className="text-[11px] text-foreground/60 font-mono truncate font-medium">{contact.phone}</p>
              <p className="text-[10px] text-foreground/50 mt-0.5 font-medium">
                Added {formatRelative(contact.created_at)}
              </p>
            </div>
          </div>

          {/* Editable: temperature tag */}
          <div className="mb-3">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-[#B8651A] mb-1.5">Temperature</p>
            <div className="grid grid-cols-3 gap-1.5">
              {(["hot", "warm", "cold"] as const).map((t) => {
                const active = tag === t;
                const Icon = t === "hot" ? Flame : t === "warm" ? CircleDot : Snowflake;
                const colors = {
                  hot: { active: "bg-[#D4308E] text-white shadow-[0_2px_0_0_#A11A6A]", inactive: "bg-[#FCE5F0] text-[#D4308E] border-[#D4308E]/30" },
                  warm: { active: "bg-[#FF6A1F] text-white shadow-[0_2px_0_0_#B8420A]", inactive: "bg-[#FFEFE0] text-[#FF6A1F] border-[#FF6A1F]/30" },
                  cold: { active: "bg-[#3C50E0] text-white shadow-[0_2px_0_0_#2533A8]", inactive: "bg-[#E4E8FF] text-[#3C50E0] border-[#3C50E0]/30" },
                }[t];
                return (
                  <button
                    key={t}
                    onClick={() => setTag(t)}
                    className={cn(
                      "h-9 rounded-xl flex items-center justify-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider transition-all border-2",
                      active ? `${colors.active} border-transparent` : `${colors.inactive} hover:scale-105`
                    )}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {t}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Editable: score */}
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Lead score</p>
              <span className={cn(
                "text-[12px] font-bold tabular-nums",
                score >= 80 ? "text-hot" : score >= 50 ? "text-warning" : "text-muted-foreground"
              )}>
                {score}/100
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={score}
              onChange={(e) => setScore(Number(e.target.value))}
              className="w-full accent-primary"
              aria-label="Lead score"
            />
            <div className="flex justify-between text-[9px] font-bold text-muted-foreground/70 uppercase tracking-wider mt-0.5">
              <span>0</span>
              <span>50</span>
              <span>100</span>
            </div>
          </div>

          {/* Editable: notes */}
          <div className="mb-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1">
              <StickyNote className="w-3 h-3" /> Notes
            </p>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add private notes about this lead — what they care about, last conversation summary, etc."
              rows={3}
              className="w-full resize-none rounded-lg bg-muted border border-transparent px-3 py-2 text-[12px] placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/30 focus:bg-card transition-all"
            />
          </div>

          {/* Save button — only enabled when something changed */}
          <button
            onClick={handleSave}
            disabled={!dirty || saving}
            className={cn(
              "w-full h-9 rounded-lg flex items-center justify-center gap-1.5 text-[12px] font-bold transition-all",
              dirty
                ? "bg-primary text-primary-foreground hover:bg-primary-glow shadow-sm shadow-primary/20"
                : "bg-muted text-muted-foreground cursor-not-allowed"
            )}
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            {saving ? "Saving…" : dirty ? "Save changes" : "No changes"}
          </button>
        </div>

        {/* Send pay link — only when we have an active conversation */}
        {conversationId && (
          <div className="px-4 py-3 border-t border-border">
            <button
              onClick={() => setPaymentOpen(true)}
              className="w-full h-11 rounded-xl flex items-center justify-center gap-2 bg-gradient-to-br from-[#0E8A4B] to-[#0A6E3C] text-white text-[13px] font-extrabold shadow-[0_3px_0_0_#075A30] hover:shadow-[0_1px_0_0_#075A30] hover:translate-y-[2px] transition-all"
            >
              <IndianRupee className="w-4 h-4" strokeWidth={2.5} />
              Send UPI pay link
            </button>
            <p className="text-[10px] text-muted-foreground font-medium text-center mt-1.5">
              QR + tap-to-pay link · directly to WhatsApp
            </p>
          </div>
        )}

        {/* Quick share — workspace public links sent via WhatsApp with one click */}
        {conversationId && (
          <QuickShareSection contactName={contact.name} conversationId={conversationId} />
        )}

        {/* Lead info */}
        <div className="px-4 py-3 border-t border-border space-y-2">
          <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Contact info</h4>
          <div className="flex items-center gap-2.5">
            <Phone className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
            <a href={`tel:${contact.phone}`} className="text-[12px] font-mono hover:text-primary truncate">
              {contact.phone}
            </a>
          </div>
          {contact.email && (
            <div className="flex items-center gap-2.5">
              <Mail className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
              <a href={`mailto:${contact.email}`} className="text-[12px] hover:text-primary truncate">
                {contact.email}
              </a>
            </div>
          )}
          {contact.source && (
            <div className="flex items-center gap-2.5">
              <Globe className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
              <span className="text-[12px]">Source: <span className="font-medium">{contact.source}</span></span>
            </div>
          )}
          <div className="flex items-center gap-2.5">
            <Tag className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
            <span className="text-[12px] capitalize">{contact.tag} lead</span>
          </div>
        </div>

        {/* Real deals for this contact */}
        <div className="px-4 py-3 border-t border-border">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <Trophy className="w-3 h-3" /> Deals ({contactDeals.length})
            </h4>
          </div>
          {contactDeals.length === 0 ? (
            <p className="text-[11px] text-muted-foreground italic">No deals yet for this contact.</p>
          ) : (
            <ul className="space-y-1.5">
              {contactDeals.slice(0, 5).map((d) => (
                <li key={d.id} className="rounded-lg border border-border bg-card p-2.5">
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <p className="text-[12px] font-semibold truncate">{d.title}</p>
                    <span className="text-[11px] font-bold tabular-nums text-foreground flex-shrink-0">
                      {formatINR(Number(d.value))}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                    <span className="capitalize font-semibold">{d.stage}</span>
                    <span>{formatRelative(d.updated_at)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Real tasks for this contact + quick add */}
        <div className="px-4 py-3 border-t border-border">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Follow-ups ({contactTasks.length})
            </h4>
            <button
              onClick={handleAddTask}
              className="text-[10px] font-bold text-primary hover:text-primary-glow flex items-center gap-1"
            >
              <Plus className="w-3 h-3" /> Add
            </button>
          </div>
          {contactTasks.length === 0 ? (
            <p className="text-[11px] text-muted-foreground italic">No follow-ups for this contact yet.</p>
          ) : (
            <ul className="space-y-1.5">
              {contactTasks.slice(0, 5).map((t) => {
                const overdue = t.due_at && new Date(t.due_at).getTime() < Date.now() && t.status === "pending";
                return (
                  <li
                    key={t.id}
                    className={cn(
                      "rounded-lg border p-2.5",
                      overdue ? "border-destructive/30 bg-destructive/5" : "border-border bg-card",
                      t.status === "completed" && "opacity-60"
                    )}
                  >
                    <p className={cn(
                      "text-[12px] font-semibold leading-tight",
                      t.status === "completed" && "line-through"
                    )}>
                      {t.title}
                    </p>
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground mt-1">
                      <span className="capitalize">{t.status}</span>
                      <span className={cn(overdue && "text-destructive font-semibold")}>
                        {t.due_at ? (overdue ? "Overdue · " : "Due ") + formatRelative(t.due_at) : "no due date"}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      <Dialog open={taskOpen} onOpenChange={setTaskOpen}>
        <DialogContent>
          <DialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#D4308E] to-[#A11A6A] text-white flex items-center justify-center shadow-md">
                <Bell className="w-5 h-5" strokeWidth={2.5} />
              </div>
              <div>
                <DialogTitle>Naya follow-up</DialogTitle>
                <DialogDescription className="text-foreground/70 font-medium">
                  {contact.name} ke liye · default due: kal
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={submitTask} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label htmlFor="task-title">Task kya hai?</Label>
              <Input
                id="task-title"
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                placeholder="Pricing share karein"
                autoFocus
                autoComplete="off"
              />
            </div>
            <DialogFooter className="gap-2 sm:gap-2">
              <Button type="button" variant="outline" onClick={() => setTaskOpen(false)} disabled={taskSaving}>
                Cancel
              </Button>
              <Button type="submit" disabled={taskSaving}>
                {taskSaving ? "Add ho raha hai…" : "Add karein"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* UPI Send-payment dialog */}
      {conversationId && (
        <SendPaymentDialog
          open={paymentOpen}
          onOpenChange={setPaymentOpen}
          conversationId={conversationId}
          contactName={contact.name}
        />
      )}
    </div>
  );
};

// ─── Quick share workspace links ─────────────────────────────────────────────
//
// Reads the workspace's public links from /api/profile (community, instagram,
// website, facebook) and renders a button per configured link. Click → sends
// a Hinglish-templated WhatsApp message with the link.
// If the link isn't set up yet, shows a "Setup in Settings" CTA instead of
// hiding the section, so users discover the feature.

type LinkKey = "community" | "instagram" | "website" | "facebook";

// Per-link visual styling. Tones match each platform's brand.
const LINK_META: Record<LinkKey, {
  label: string;
  icon: typeof MessageCircle;
  bg: string;
  hoverBg: string;
  shadow: string;
  template: (name: string, link: string) => string;
}> = {
  community: {
    label: "WhatsApp Community",
    icon: MessageCircle,
    bg: "from-[#0E8A4B] to-[#0A6E3C]",
    hoverBg: "hover:from-[#0A6E3C] hover:to-[#075A30]",
    shadow: "shadow-[0_3px_0_0_#075A30]",
    template: (name, link) =>
      `🎉 *Hamari WhatsApp Community mein join karein*\n\nHi ${name}! Exclusive offers, daily tips aur direct support ke liye yahan click karein:\n\n👉 ${link}`,
  },
  instagram: {
    label: "Instagram",
    icon: Instagram,
    bg: "from-[#D4308E] to-[#A11A6A]",
    hoverBg: "hover:from-[#A11A6A] hover:to-[#7A1052]",
    shadow: "shadow-[0_3px_0_0_#7A1052]",
    template: (name, link) =>
      `📸 *Instagram pe follow karein*\n\nHi ${name}! Latest updates, behind-the-scenes aur customer stories yahan dekhein:\n\n👉 ${link}`,
  },
  website: {
    label: "Website",
    icon: Link2,
    bg: "from-[#3C50E0] to-[#2533A8]",
    hoverBg: "hover:from-[#2533A8] hover:to-[#1A2380]",
    shadow: "shadow-[0_3px_0_0_#1A2380]",
    template: (name, link) =>
      `🌐 *Hamari website*\n\nHi ${name}! Saare products aur services yahan dekh sakte hain:\n\n👉 ${link}`,
  },
  facebook: {
    label: "Facebook",
    icon: Facebook,
    bg: "from-[#1877F2] to-[#0E5BC0]",
    hoverBg: "hover:from-[#0E5BC0] hover:to-[#0A4490]",
    shadow: "shadow-[0_3px_0_0_#0A4490]",
    template: (name, link) =>
      `👍 *Facebook page*\n\nHi ${name}! Updates aur community ke liye Facebook pe join karein:\n\n👉 ${link}`,
  },
};

const QuickShareSection = ({ contactName, conversationId }: { contactName: string; conversationId: string }) => {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: () => api.getProfile(),
    staleTime: 60_000,
  });
  const [sending, setSending] = useState<LinkKey | null>(null);

  const links: { key: LinkKey; url: string | null }[] = [
    { key: "community", url: profile?.whatsapp_community_url ?? null },
    { key: "instagram", url: profile?.instagram_url ?? null },
    { key: "website",   url: profile?.website_url ?? null },
    { key: "facebook",  url: profile?.facebook_url ?? null },
  ];
  const configured = links.filter((l) => !!l.url);
  const allEmpty = configured.length === 0;

  const handleSend = async (key: LinkKey, url: string) => {
    setSending(key);
    try {
      const body = LINK_META[key].template(contactName.split(/\s+/)[0] || contactName, url);
      await api.sendMessage(conversationId, { body, direction: "outbound", status: "sent" });
      qc.invalidateQueries({ queryKey: ["messages", conversationId] });
      qc.invalidateQueries({ queryKey: ["conversations"] });
      toast.success(`${LINK_META[key].label} link sent ✨`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Send failed");
    } finally {
      setSending(null);
    }
  };

  return (
    <div className="px-4 py-3 border-t border-border">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
          <Send className="w-3 h-3" /> Quick share
        </h4>
        <RouterLink
          to="/app/settings"
          className="text-[10px] font-bold text-primary hover:text-primary-glow flex items-center gap-0.5"
        >
          <SettingsIcon className="w-3 h-3" /> Setup
        </RouterLink>
      </div>

      {isLoading ? (
        <div className="h-20 rounded-lg bg-muted/30 animate-pulse" />
      ) : allEmpty ? (
        <div className="rounded-xl border-2 border-dashed border-[#E8B968] bg-[#FFF6E8] px-3 py-3 text-center">
          <p className="text-[11.5px] font-semibold leading-snug">
            Apne links setup karein — fir ek click mein customer ko bhejein
          </p>
          <RouterLink
            to="/app/settings"
            className="inline-flex items-center gap-1 mt-1.5 text-[11px] font-extrabold text-[#FF6A1F] hover:text-[#E85C12]"
          >
            <ExternalLink className="w-3 h-3" /> Settings mein add karein
          </RouterLink>
        </div>
      ) : (
        <div className="space-y-1.5">
          {links.map(({ key, url }) => {
            const meta = LINK_META[key];
            const Icon = meta.icon;
            const isSending = sending === key;
            if (!url) {
              return (
                <div
                  key={key}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-dashed border-border bg-muted/20 opacity-60"
                  title={`${meta.label} not configured`}
                >
                  <Icon className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                  <span className="flex-1 text-[11.5px] font-semibold truncate">{meta.label}</span>
                  <RouterLink
                    to="/app/settings"
                    className="text-[10px] font-bold text-primary hover:underline flex-shrink-0"
                  >
                    Setup
                  </RouterLink>
                </div>
              );
            }
            return (
              <button
                key={key}
                onClick={() => handleSend(key, url)}
                disabled={isSending || !!sending}
                className={cn(
                  "w-full h-10 rounded-lg flex items-center gap-2 px-2.5 text-white text-[12px] font-extrabold bg-gradient-to-br transition-all hover:translate-y-[1px] disabled:opacity-70 disabled:cursor-not-allowed",
                  meta.bg, meta.hoverBg, meta.shadow
                )}
                title={`Send ${meta.label} link to ${contactName}`}
              >
                {isSending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin flex-shrink-0" />
                ) : (
                  <Icon className="w-3.5 h-3.5 flex-shrink-0" strokeWidth={2.5} />
                )}
                <span className="flex-1 text-left truncate">
                  {isSending ? "Sending…" : `Send ${meta.label}`}
                </span>
                <Send className="w-3 h-3 flex-shrink-0 opacity-80" />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
