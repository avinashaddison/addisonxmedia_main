import { useMemo, useState } from "react";
import {
  Copy, Search, Sparkles, MessageSquare, Tag, Send, RefreshCw, ExternalLink,
  ShieldCheck, AlertTriangle, Inbox, FileText, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
          <a
            href={metaTemplatesUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[12px] inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition font-semibold"
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
                    Copy body
                  </Button>
                  <Link
                    to="/app/broadcasts"
                    className="h-8 px-3 rounded-md bg-primary text-primary-foreground text-[11px] font-semibold flex items-center gap-1 hover:opacity-90 transition"
                    title="Use in a broadcast"
                  >
                    <Send className="w-3 h-3" />
                    Broadcast
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
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
