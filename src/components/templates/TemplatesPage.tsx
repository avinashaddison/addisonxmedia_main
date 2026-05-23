import { useMemo, useState } from "react";
import {
  Copy, Search, Sparkles, MessageSquare, Tag, Send, RefreshCw, ExternalLink,
  ShieldCheck, AlertTriangle, Inbox, FileText, Loader2, Plus, Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { api } from "@/lib/api";

// Meta WhatsApp template types — mirrors Graph API response.
type MetaTemplate = {
  name: string;
  language: string;
  status: "APPROVED" | "PENDING" | "REJECTED" | "DISABLED" | string;
  category: "MARKETING" | "UTILITY" | "AUTHENTICATION" | string;
  components: Array<{
    type: string; // BODY | HEADER | FOOTER | BUTTONS
    text?: string;
    format?: string;
  }>;
};

const CATEGORIES = [
  { id: "ALL", label: "All", icon: FileText },
  { id: "MARKETING", label: "Marketing", icon: Tag },
  { id: "UTILITY", label: "Utility", icon: ShieldCheck },
  { id: "AUTHENTICATION", label: "Auth", icon: ShieldCheck },
] as const;

const STATUS_PILL: Record<string, string> = {
  APPROVED: "bg-success-soft text-success border-success/30",
  PENDING: "bg-warning-soft text-warning border-warning/30",
  REJECTED: "bg-destructive/10 text-destructive border-destructive/30",
  DISABLED: "bg-muted text-muted-foreground border-border",
};

const CAT_PILL: Record<string, string> = {
  MARKETING: "bg-accent-soft text-accent",
  UTILITY: "bg-primary-soft text-primary",
  AUTHENTICATION: "bg-warning-soft text-warning",
};

// Extract body text from a Meta template's components (for preview)
const bodyOf = (t: MetaTemplate): string =>
  t.components.find((c) => c.type === "BODY")?.text ?? "(no body)";

export const TemplatesPage = () => {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "APPROVED" | "PENDING" | "REJECTED">("ALL");
  const [q, setQ] = useState("");

  // Meta config — drives empty state vs templates list
  const { data: metaCfg, isLoading: cfgLoading } = useQuery({
    queryKey: ["meta-config"],
    queryFn: () => api.getMetaConfig(),
  });

  // Templates fetched from Meta. Only attempt fetch when WABA ID is present.
  const canFetch = !!metaCfg?.business_account_id;
  const {
    data: templatesResp,
    isLoading: templatesLoading,
    isFetching,
    error,
    refetch,
  } = useQuery({
    queryKey: ["meta-templates", metaCfg?.business_account_id],
    queryFn: () => api.listMetaTemplates(),
    enabled: canFetch,
    retry: 1,
  });

  const templates: MetaTemplate[] = (templatesResp?.data ?? []) as MetaTemplate[];

  const filtered = useMemo(() => {
    return templates
      .filter((t) => filter === "ALL" || (t.category ?? "").toUpperCase() === filter)
      .filter((t) => statusFilter === "ALL" || (t.status ?? "").toUpperCase() === statusFilter)
      .filter((t) => {
        if (!q.trim()) return true;
        const s = q.toLowerCase();
        return t.name.toLowerCase().includes(s) || bodyOf(t).toLowerCase().includes(s);
      })
      .sort((a, b) => {
        // Approved first, then by name
        const aw = a.status === "APPROVED" ? 0 : 1;
        const bw = b.status === "APPROVED" ? 0 : 1;
        if (aw !== bw) return aw - bw;
        return a.name.localeCompare(b.name);
      });
  }, [templates, filter, statusFilter, q]);

  const counts = useMemo(() => ({
    total: templates.length,
    approved: templates.filter((t) => t.status === "APPROVED").length,
    pending: templates.filter((t) => t.status === "PENDING").length,
    rejected: templates.filter((t) => t.status === "REJECTED").length,
  }), [templates]);

  const copy = async (t: MetaTemplate) => {
    await navigator.clipboard.writeText(bodyOf(t));
    toast.success(`Copied "${t.name}" body`, { description: "Paste in any chat or broadcast" });
  };

  const handleRefresh = async () => {
    await qc.invalidateQueries({ queryKey: ["meta-templates"] });
    refetch();
    toast.success("Refreshed from Meta");
  };

  // ── Create template dialog state + mutation ─────────────────────────────
  const [createOpen, setCreateOpen] = useState(false);
  const [tName, setTName] = useState("");
  const [tCategory, setTCategory] = useState<"MARKETING" | "UTILITY" | "AUTHENTICATION">("MARKETING");
  const [tLanguage, setTLanguage] = useState("en");
  const [tBody, setTBody] = useState("");
  const [tFooter, setTFooter] = useState("");

  const resetCreateForm = () => {
    setTName("");
    setTCategory("MARKETING");
    setTLanguage("en");
    setTBody("");
    setTFooter("");
  };

  // Count placeholders in body (e.g. "Hi {{1}}, your order {{2}}" → 2).
  // Meta uses this to validate the variable count when broadcasts fill the
  // template. Surfaced in the preview so the customer sees how many they need.
  const placeholderCount = useMemo(() => {
    const m = tBody.match(/\{\{(\d+)\}\}/g);
    if (!m) return 0;
    const nums = m.map((s) => Number(s.slice(2, -2)));
    return nums.length ? Math.max(...nums) : 0;
  }, [tBody]);

  const createMut = useMutation({
    mutationFn: () =>
      api.createMetaTemplate({
        name: tName,
        category: tCategory,
        language: tLanguage,
        components: [
          { type: "BODY" as const, text: tBody },
          ...(tFooter.trim() ? [{ type: "FOOTER" as const, text: tFooter.trim() }] : []),
        ],
      }),
    onSuccess: (data) => {
      toast.success(`Submitted "${data.name_submitted}" — status: ${data.status}`, {
        description: data.status === "APPROVED"
          ? "Already approved — ready to use in broadcasts!"
          : "Meta usually approves in 10-60 minutes. Refresh this page to check status.",
        duration: 7000,
      });
      qc.invalidateQueries({ queryKey: ["meta-templates"] });
      resetCreateForm();
      setCreateOpen(false);
    },
    onError: (err) => {
      const e = err as { body?: { error?: string; hint?: string }; message?: string };
      const msg = e?.body?.error || e?.message || "Template submission failed";
      const hint = e?.body?.hint;
      toast.error(hint ? `${msg} · ${hint}` : msg, { duration: 9000 });
    },
  });

  // ── Delete template ──────────────────────────────────────────────────────
  const [deleteTarget, setDeleteTarget] = useState<MetaTemplate | null>(null);
  const deleteMut = useMutation({
    mutationFn: (name: string) => api.deleteMetaTemplate(name),
    onSuccess: (_d, name) => {
      toast.success(`Deleted "${name}"`);
      qc.invalidateQueries({ queryKey: ["meta-templates"] });
      setDeleteTarget(null);
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    },
  });

  const businessAccountId = metaCfg?.business_account_id;
  const metaTemplatesUrl = businessAccountId
    ? `https://business.facebook.com/wa/manage/message-templates/?business_id=&waba_id=${businessAccountId}`
    : "https://business.facebook.com/wa/manage/message-templates/";

  // ============================
  // EMPTY STATES
  // ============================

  if (cfgLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // No Meta config at all
  if (!metaCfg) {
    return (
      <PageWrapper>
        <EmptyState
          icon={Inbox}
          title="Connect WhatsApp first"
          subtitle="Templates are managed in Meta Business Manager and synced here. Configure your WhatsApp Business credentials in Settings to see your templates."
          action={
            <Button asChild>
              <Link to="/app/settings" className="gap-1.5">
                <ShieldCheck className="w-4 h-4" />
                Open Settings
              </Link>
            </Button>
          }
        />
      </PageWrapper>
    );
  }

  // Meta config exists but no business_account_id
  if (!metaCfg.business_account_id) {
    return (
      <PageWrapper>
        <EmptyState
          icon={AlertTriangle}
          title="Business Account ID required"
          subtitle="To list templates, paste your WhatsApp Business Account (WABA) ID into Settings → Integrations. You'll find it in Meta App → WhatsApp → API Setup."
          action={
            <Button asChild variant="outline">
              <Link to="/app/settings" className="gap-1.5">
                <ShieldCheck className="w-4 h-4" />
                Add WABA ID
              </Link>
            </Button>
          }
        />
      </PageWrapper>
    );
  }

  // Meta returned an error
  if (error) {
    const msg = error instanceof Error ? error.message : "Failed to load templates";
    return (
      <PageWrapper>
        <EmptyState
          icon={AlertTriangle}
          title="Couldn't load templates"
          subtitle={msg}
          action={
            <Button onClick={handleRefresh} variant="outline" className="gap-1.5">
              <RefreshCw className="w-4 h-4" />
              Try again
            </Button>
          }
        />
      </PageWrapper>
    );
  }

  // ============================
  // CONNECTED, RENDERING TEMPLATES
  // ============================

  return (
    <PageWrapper>
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#FF6A1F] to-[#E85C12] text-white flex items-center justify-center shadow-md">
            <FileText className="w-6 h-6" strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-[26px] font-black tracking-tight">WhatsApp Templates</h1>
            <p className="text-[12px] text-foreground/70 mt-0.5 font-medium">
              Approved message templates · WhatsApp Business Account se
              {metaCfg.display_phone_number && <span> · {metaCfg.display_phone_number}</span>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handleRefresh} variant="outline" size="sm" className="gap-2" disabled={isFetching}>
            <RefreshCw className={cn("w-4 h-4", isFetching && "animate-spin")} />
            {isFetching ? "Syncing…" : "Sync from Meta"}
          </Button>
          <Button
            onClick={() => setCreateOpen(true)}
            size="sm"
            className="gap-1.5 bg-[#0E8A4B] text-white shadow-[0_3px_0_0_#0A6E3C] hover:bg-[#0A6E3C]"
          >
            <Plus className="w-4 h-4" strokeWidth={2.5} />
            Create template
          </Button>
          <a
            href={metaTemplatesUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[12px] inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-muted hover:bg-muted/70 text-foreground transition font-semibold"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Manage in Meta
          </a>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <StatCard label="Total" value={counts.total} icon={MessageSquare} />
        <StatCard label="Approved" value={counts.approved} icon={ShieldCheck} tone="success" />
        <StatCard label="Pending" value={counts.pending} icon={Sparkles} tone="warning" />
        <StatCard label="Rejected" value={counts.rejected} icon={AlertTriangle} tone="destructive" />
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row md:items-center gap-3 mb-4">
        <Tabs value={filter} onValueChange={setFilter} className="overflow-x-auto">
          <TabsList>
            {CATEGORIES.map((c) => (
              <TabsTrigger key={c.id} value={c.id}>
                {c.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)} className="overflow-x-auto">
          <TabsList>
            <TabsTrigger value="ALL">All status</TabsTrigger>
            <TabsTrigger value="APPROVED">Approved</TabsTrigger>
            <TabsTrigger value="PENDING">Pending</TabsTrigger>
            <TabsTrigger value="REJECTED">Rejected</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative md:ml-auto md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search templates…" className="pl-9" />
        </div>
      </div>

      {/* List */}
      {templatesLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title={templates.length === 0 ? "No templates in your WhatsApp Business Account" : "No matches"}
          subtitle={
            templates.length === 0
              ? "Create your first template in Meta Business Manager — they need to be approved by Meta before they can be sent."
              : "Try a different category, status, or search term."
          }
          action={
            templates.length === 0 ? (
              <a
                href={metaTemplatesUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition text-sm font-semibold"
              >
                <ExternalLink className="w-4 h-4" />
                Create in Meta
              </a>
            ) : null
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {filtered.map((t) => {
            const body = bodyOf(t);
            const status = (t.status ?? "PENDING").toUpperCase();
            const cat = (t.category ?? "MARKETING").toUpperCase();
            return (
              <div
                key={`${t.name}-${t.language}`}
                className="rounded-2xl border border-border bg-card p-4 hover:border-primary/40 hover:shadow-md transition-all flex flex-col"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0">
                    <p className="text-[13px] font-bold truncate">{t.name}</p>
                    <p className="text-[11px] text-muted-foreground font-mono">{t.language}</p>
                  </div>
                  <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider border", STATUS_PILL[status] ?? STATUS_PILL.PENDING)}>
                    {status}
                  </span>
                </div>

                <span className={cn("inline-block text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider w-fit mb-3", CAT_PILL[cat] ?? "bg-muted text-muted-foreground")}>
                  {cat}
                </span>

                <div className="bg-[hsl(var(--chat-incoming))] rounded-xl rounded-bl-sm p-3 border border-border mb-3 flex-1">
                  <p className="text-[12px] leading-relaxed line-clamp-6 whitespace-pre-wrap">{body}</p>
                </div>

                <div className="flex items-center gap-1.5 pt-2 border-t border-border/60">
                  <Button
                    onClick={() => copy(t)}
                    size="sm"
                    variant="outline"
                    className="flex-1 h-8 text-[11px] gap-1"
                  >
                    <Copy className="w-3 h-3" />
                    Copy
                  </Button>
                  <Link
                    to="/app/broadcasts"
                    className="h-8 px-3 rounded-md bg-primary text-primary-foreground text-[11px] font-semibold flex items-center gap-1 hover:opacity-90 transition"
                    title="Use in a broadcast"
                  >
                    <Send className="w-3 h-3" />
                    Broadcast
                  </Link>
                  <Button
                    onClick={() => setDeleteTarget(t)}
                    size="sm"
                    variant="outline"
                    className="h-8 px-2 text-[#D4308E] border-[#D4308E]/40 hover:bg-[#FCE5F0] hover:text-[#A11A6A]"
                    title="Delete template"
                    aria-label="Delete template"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Create-template dialog ─────────────────────────────────────── */}
      <Dialog open={createOpen} onOpenChange={(v) => { setCreateOpen(v); if (!v) resetCreateForm(); }}>
        <DialogContent className="sm:max-w-[640px]">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#0E8A4B] to-[#0A6E3C] text-white flex items-center justify-center shadow-md">
                <Plus className="w-5 h-5" strokeWidth={2.5} />
              </div>
              <div>
                <DialogTitle>Create WhatsApp template</DialogTitle>
                <DialogDescription>
                  Submitted to Meta for approval. Usually approved within 10-60 min. Use {`{{1}}`}, {`{{2}}`} for variables.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Template name</Label>
                <Input
                  value={tName}
                  onChange={(e) => setTName(e.target.value)}
                  placeholder="diwali_offer_2026"
                  className="font-mono text-[12px]"
                  maxLength={120}
                />
                <p className="text-[10px] text-foreground/55">
                  lowercase, snake_case, ≤ 120 chars
                </p>
              </div>
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select value={tCategory} onValueChange={(v) => setTCategory(v as typeof tCategory)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MARKETING">Marketing (promotional)</SelectItem>
                    <SelectItem value="UTILITY">Utility (order/booking updates)</SelectItem>
                    <SelectItem value="AUTHENTICATION">Authentication (OTP)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-foreground/55">
                  Marketing ₹0.78 · Utility/Auth ₹0.13 per message
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Language</Label>
              <Select value={tLanguage} onValueChange={setTLanguage}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="en_US">English (US)</SelectItem>
                  <SelectItem value="hi">Hindi</SelectItem>
                  <SelectItem value="mr">Marathi</SelectItem>
                  <SelectItem value="ta">Tamil</SelectItem>
                  <SelectItem value="te">Telugu</SelectItem>
                  <SelectItem value="gu">Gujarati</SelectItem>
                  <SelectItem value="bn">Bengali</SelectItem>
                  <SelectItem value="kn">Kannada</SelectItem>
                  <SelectItem value="ml">Malayalam</SelectItem>
                  <SelectItem value="pa">Punjabi</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>
                Message body
                {placeholderCount > 0 && (
                  <span className="ml-2 text-[10px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#FFD23F] text-[#3D1A00]">
                    {placeholderCount} variable{placeholderCount === 1 ? "" : "s"}
                  </span>
                )}
              </Label>
              <textarea
                value={tBody}
                onChange={(e) => setTBody(e.target.value)}
                rows={5}
                placeholder="Hi {{1}}, your order #{{2}} is confirmed 🎉 Track here: {{3}}"
                className="w-full rounded-xl border-2 border-[#E8B968] bg-[#FFF6E8] px-3 py-2.5 text-[13px] font-medium placeholder:text-foreground/40 focus:outline-none focus:border-[#0E8A4B] focus:bg-white transition"
                maxLength={1024}
              />
              <p className="text-[10px] text-foreground/55">
                {tBody.length}/1024 chars · use {`{{1}}`}, {`{{2}}`} etc for variables to personalize each broadcast
              </p>
            </div>

            <div className="space-y-1.5">
              <Label>Footer (optional)</Label>
              <Input
                value={tFooter}
                onChange={(e) => setTFooter(e.target.value)}
                placeholder="Reply STOP to unsubscribe"
                maxLength={60}
              />
              <p className="text-[10px] text-foreground/55">
                Short legal/contact line shown below the body · ≤ 60 chars
              </p>
            </div>

            {/* Preview */}
            {tBody && (
              <div className="rounded-xl bg-[#E6F7EE] border-2 border-[#0E8A4B]/40 p-3">
                <p className="text-[10px] uppercase tracking-wider font-extrabold text-[#0A6E3C] mb-1.5">
                  WhatsApp preview
                </p>
                <div className="rounded-lg bg-white p-3 border border-[#0E8A4B]/30">
                  <p className="text-[13px] whitespace-pre-wrap leading-relaxed">{tBody}</p>
                  {tFooter && (
                    <p className="text-[10px] text-foreground/50 mt-2 italic">{tFooter}</p>
                  )}
                </div>
              </div>
            )}

            <div className="flex items-start gap-2 text-[11px] text-[#B8420A] font-semibold p-2.5 rounded-lg bg-[#FFEFE0] border border-[#FF6A1F]/40">
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              <span>
                Meta reviews each template. Most approve in 10-60 min. Common rejections:
                vague body, ALL CAPS shouting, missing context, looks like spam.
              </span>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setCreateOpen(false); resetCreateForm(); }}>
              Cancel
            </Button>
            <Button
              onClick={() => createMut.mutate()}
              disabled={
                createMut.isPending
                || !tName.trim()
                || !tBody.trim()
                || tBody.trim().length < 5
              }
              className="bg-[#0E8A4B] text-white shadow-[0_4px_0_0_#0A6E3C] hover:bg-[#0A6E3C]"
            >
              {createMut.isPending ? (
                <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Submitting…</>
              ) : (
                <><Plus className="w-3.5 h-3.5" /> Submit to Meta</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete confirmation ────────────────────────────────────────── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete template?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget && (
                <>
                  Removes <span className="font-bold">{deleteTarget.name}</span> (all languages) from Meta.
                  <br /><br />
                  Broadcasts using this template will fail until you create a new one.
                  <br /><br />
                  <span className="text-[#B8420A] font-semibold">This cannot be undone.</span>
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-[#D4308E] text-white shadow-[0_4px_0_0_#A11A6A] hover:bg-[#C02680]"
              onClick={() => { if (deleteTarget) deleteMut.mutate(deleteTarget.name); }}
            >
              <Trash2 className="w-3.5 h-3.5" /> Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageWrapper>
  );
};

// ============================================================
// Helpers
// ============================================================

const PageWrapper = ({ children }: { children: React.ReactNode }) => (
  <div className="flex-1 min-h-0 overflow-y-auto bg-muted/20">
    <div className="max-w-[1400px] mx-auto p-6">{children}</div>
  </div>
);

const EmptyState = ({
  icon: Icon, title, subtitle, action,
}: {
  icon: typeof MessageSquare;
  title: string;
  subtitle: string;
  action?: React.ReactNode;
}) => (
  <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center max-w-xl mx-auto">
    <div className="w-14 h-14 rounded-2xl bg-primary-soft text-primary mx-auto flex items-center justify-center mb-3">
      <Icon className="w-6 h-6" />
    </div>
    <h2 className="font-bold text-lg">{title}</h2>
    <p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto">{subtitle}</p>
    {action && <div className="mt-5">{action}</div>}
  </div>
);

const StatCard = ({
  label, value, icon: Icon, tone,
}: {
  label: string;
  value: number;
  icon: typeof MessageSquare;
  tone?: "success" | "warning" | "destructive";
}) => (
  <div className="rounded-xl border border-border bg-card p-3.5">
    <div className="flex items-center justify-between mb-1">
      <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">{label}</p>
      <div className={cn(
        "w-7 h-7 rounded-lg flex items-center justify-center",
        tone === "success" && "bg-success/10 text-success",
        tone === "warning" && "bg-warning/10 text-warning",
        tone === "destructive" && "bg-destructive/10 text-destructive",
        !tone && "bg-muted text-muted-foreground"
      )}>
        <Icon className="w-3.5 h-3.5" />
      </div>
    </div>
    <p className="text-2xl font-bold tabular-nums">{value}</p>
  </div>
);
