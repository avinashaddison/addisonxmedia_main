import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ConversationList } from "./ConversationList";
import { ChatWindow } from "./ChatWindow";
import { LeadPanel } from "./LeadPanel";
import { useConversations } from "@/hooks/useInboxData";
import { useMuteState } from "@/hooks/useNotificationSound";
import { api } from "@/lib/api";
import { MessageCircle, Loader2, Phone, AlertTriangle, CheckCircle2, ArrowRight, MessageSquareWarning } from "lucide-react";

/* Mobile-aware 3-pane layout:
 *   - lg (≥1024px): all three panels visible side-by-side (classic desktop)
 *   - md (768-1023px): conversation list + chat (lead panel slides over)
 *   - <md (<768px):  ONE panel at a time, like WhatsApp on phone
 *
 * On mobile, `mobileView` drives which panel is on screen. Tapping a chat
 * jumps from 'list' → 'chat'. The chat header has a back button on mobile
 * that returns to 'list', and an info button that switches to 'lead'.
 */
type MobileView = "list" | "chat" | "lead";

export const InboxPage = () => {
  const { data: conversations = [], isLoading } = useConversations();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [muted, toggleMuted] = useMuteState();
  const [mobileView, setMobileView] = useState<MobileView>("list");
  // Tablet: lead panel slides as an overlay drawer (not full-screen). On
  // desktop it sits inline. State is separate from mobileView so behavior
  // is predictable at each breakpoint.
  const [leadOpenTablet, setLeadOpenTablet] = useState(false);

  // Auto-select the first conversation when the list loads / changes
  useEffect(() => {
    if (!activeId && conversations.length > 0) {
      setActiveId(conversations[0].id);
    }
    // If the active conversation got deleted, fall back to the first one
    if (activeId && !conversations.some((c) => c.id === activeId)) {
      setActiveId(conversations[0]?.id ?? null);
    }
  }, [conversations, activeId]);

  const active = conversations.find((c) => c.id === activeId) ?? null;

  const handleSelect = (id: string) => {
    setActiveId(id);
    setMobileView("chat");
  };

  // Track viewport tier in JS so the layout decision is unambiguous.
  const [viewport, setViewport] = useState<"mobile" | "tablet" | "desktop">(() => {
    if (typeof window === "undefined") return "desktop";
    const w = window.innerWidth;
    if (w < 768) return "mobile";
    if (w < 1024) return "tablet";
    return "desktop";
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const update = () => {
      const w = window.innerWidth;
      setViewport(w < 768 ? "mobile" : w < 1024 ? "tablet" : "desktop");
    };
    update();
    window.addEventListener("resize", update, { passive: true });
    return () => window.removeEventListener("resize", update);
  }, []);

  const isListView = mobileView === "list";
  const isChatView = mobileView === "chat";
  const isLeadView = mobileView === "lead";

  const showList = viewport === "desktop" || viewport === "tablet" || (viewport === "mobile" && isListView);
  const showChat = viewport === "desktop" || viewport === "tablet" || (viewport === "mobile" && isChatView);
  const showLeadInline = viewport === "desktop";
  const showLeadDrawer = viewport === "tablet" && leadOpenTablet;
  const showLeadFullscreen = viewport === "mobile" && isLeadView;

  // CSS Grid layout — explicit column tracks make the panel widths independent
  // of content. The middle track uses `minmax(0, 1fr)` so descendant content
  // can NEVER widen the cell beyond its share (a plain `1fr` would still grow
  // to fit min-content). Same trick on rows so the messages list (overflow-y-
  // auto) gets a constrained height; without minmax(0,..) the row tries to be
  // at least min-content tall, which uncaps the chat panel and breaks scroll.
  const gridTemplate =
    viewport === "mobile"  ? "minmax(0, 1fr)"
  : viewport === "tablet"  ? "340px minmax(0, 1fr)"
                           : "340px minmax(0, 1fr) 340px";

  return (
    <div className="flex flex-col h-full w-full overflow-hidden relative">
      <div
        className="flex-1 min-h-0 overflow-hidden grid"
        style={{ gridTemplateColumns: gridTemplate, gridTemplateRows: "minmax(0, 1fr)" }}
      >
        {/* Each grid item uses `relative` + an absolute-inset child to GUARANTEE
            the inner panel fills the cell exactly — eliminates every flex/grid
            sizing inheritance edge case that was clipping the chat header and
            composer when content was tall. */}

        {/* ── ConversationList ── */}
        {showList && (
          <div className="relative min-w-0 overflow-hidden">
            <div className="absolute inset-0 flex">
              <ConversationList
                conversations={conversations}
                activeId={activeId}
                onSelect={handleSelect}
                loading={isLoading}
                muted={muted}
                onToggleMuted={toggleMuted}
              />
            </div>
          </div>
        )}

        {/* ── ChatWindow ── */}
        {showChat && (
          <div className="relative min-w-0 overflow-hidden">
            <div className="absolute inset-0 flex flex-col">
              {active ? (
                <ChatWindow
                  conversation={active}
                  onMobileBack={() => setMobileView("list")}
                  onShowLead={() => {
                    if (viewport === "mobile") setMobileView("lead");
                    else if (viewport === "tablet") setLeadOpenTablet(true);
                  }}
                />
              ) : (
                <InboxEmptyState loading={isLoading} />
              )}
            </div>
          </div>
        )}

        {/* ── LeadPanel: inline on desktop ── */}
        {active && showLeadInline && (
          <div className="relative min-w-0 overflow-hidden">
            <div className="absolute inset-0 flex">
              <LeadPanel
                contact={active.contact}
                conversationId={active.id}
                onClose={() => setLeadOpenTablet(false)}
              />
            </div>
          </div>
        )}
      </div>

      {/* ── LeadPanel: tablet drawer (slide-over) ── */}
      {active && showLeadDrawer && (
        <>
          <button
            onClick={() => setLeadOpenTablet(false)}
            aria-label="Close lead panel"
            className="fixed inset-0 z-20 bg-black/30 backdrop-blur-sm"
          />
          <div
            style={{ width: 340 }}
            className="fixed inset-y-0 right-0 z-30 flex shadow-2xl"
          >
            <LeadPanel
              contact={active.contact}
              conversationId={active.id}
              onClose={() => setLeadOpenTablet(false)}
            />
          </div>
        </>
      )}

      {/* ── LeadPanel: mobile fullscreen ── */}
      {active && showLeadFullscreen && (
        <div className="absolute inset-0 z-10 bg-white flex">
          <LeadPanel
            contact={active.contact}
            conversationId={active.id}
            onClose={() => setMobileView("chat")}
          />
        </div>
      )}
    </div>
  );
};

/* Three-state empty inbox — was a single "click +" message regardless of
 * whether WhatsApp was even connected, which sent confused users to support
 * instead of the next correct action. */
const InboxEmptyState = ({ loading }: { loading: boolean }) => {
  const { data: status } = useQuery({
    queryKey: ["inbox-status"],
    queryFn: () => api.inboxStatus(),
    staleTime: 30_000,
  });

  // Probe /api/conversations directly — bypasses the useConversations hook so
  // we can compare the raw HTTP response against the cached list. If `probe`
  // returns 4 rows but the page still shows "No conversations yet", the bug
  // is in React Query caching. If probe also returns 0, the backend is at fault.
  const { data: probe } = useQuery({
    queryKey: ["inbox-debug-probe"],
    queryFn: async () => {
      const t = performance.now();
      const r = await fetch("/api/conversations", { credentials: "include" });
      const ms = Math.round(performance.now() - t);
      const body = await r.json().catch(() => null);
      return {
        ok: r.ok,
        status: r.status,
        ms,
        count: Array.isArray(body) ? body.length : 0,
        firstName: Array.isArray(body) && body[0]?.contact?.name ? body[0].contact.name : null,
        errorDetail: !r.ok && body && typeof body === "object" ? ((body as { detail?: string; error?: string }).detail ?? (body as { error?: string }).error ?? null) : null,
      };
    },
    staleTime: 5_000,
    refetchInterval: 8_000,
  });

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-card">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // State A — never connected WhatsApp. Most likely to be hit by trial users.
  if (status && !status.meta_connected) {
    return (
      <div className="flex-1 flex items-center justify-center bg-card px-6">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#0E8A4B] to-[#0A6E3C] text-white flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Phone className="w-8 h-8" strokeWidth={2.5} />
          </div>
          <h2 className="text-[18px] font-black mb-1">Connect WhatsApp to receive chats</h2>
          <p className="text-[13px] text-muted-foreground mb-4">
            Your AddisonX inbox shows real-time conversations from your WhatsApp Business number. Connect Meta to start receiving chats from customers and ads.
          </p>
          <Link
            to="/app/settings"
            className="inline-flex items-center gap-2 px-5 h-11 rounded-xl bg-[#0E8A4B] text-white font-extrabold text-[13px] shadow-[0_4px_0_0_#0A6E3C] hover:bg-[#0A6E3C] active:translate-y-0.5 active:shadow-[0_2px_0_0_#0A6E3C] transition"
          >
            <Phone className="w-4 h-4" /> Connect WhatsApp <ArrowRight className="w-3.5 h-3.5" />
          </Link>
          <p className="text-[11px] text-muted-foreground/80 mt-3">
            Already connected on a different account? <Link to="/app/settings" className="text-[#B8230C] font-extrabold hover:underline">Check ownership</Link>
          </p>
        </div>
      </div>
    );
  }

  // State B — connected but not enabled/verified yet. Webhook can't deliver.
  if (status && status.meta_connected && !status.meta_enabled) {
    return (
      <div className="flex-1 flex items-center justify-center bg-card px-6">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#FFD23F] to-[#E8B400] text-[#3D1A00] flex items-center justify-center mx-auto mb-4 shadow-lg">
            <AlertTriangle className="w-8 h-8" strokeWidth={2.5} />
          </div>
          <h2 className="text-[18px] font-black mb-1">WhatsApp connection pending verification</h2>
          <p className="text-[13px] text-muted-foreground mb-4">
            We have your credentials but Meta hasn't confirmed the number is live yet. Re-test the connection to enable inbound message delivery.
          </p>
          <Link
            to="/app/settings"
            className="inline-flex items-center gap-2 px-5 h-11 rounded-xl bg-[#B8651A] text-white font-extrabold text-[13px] shadow-[0_4px_0_0_#8A4A12] hover:bg-[#8A4A12] active:translate-y-0.5 active:shadow-[0_2px_0_0_#8A4A12] transition"
          >
            <CheckCircle2 className="w-4 h-4" /> Re-verify connection <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    );
  }

  // State C — connected, enabled, 0 chats. Genuine empty state.
  return (
    <div className="flex-1 flex items-center justify-center bg-card px-6">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 rounded-2xl bg-primary-soft text-primary flex items-center justify-center mx-auto mb-4">
          <MessageCircle className="w-8 h-8" />
        </div>
        <h2 className="text-[18px] font-black mb-1">You're connected — waiting for the first chat</h2>
        <p className="text-[13px] text-muted-foreground mb-4">
          Your WhatsApp Business number <span className="font-mono font-bold text-foreground/80">{status?.display_phone_number ?? ""}</span> is live. Share it on your site, in ads, or click <span className="font-bold text-primary">+</span> to send the first message yourself.
        </p>
        <div className="flex items-start gap-2 text-[11px] text-foreground/70 font-semibold p-3 rounded-lg bg-[#FFF1D6] border border-[#E8B968] max-w-sm mx-auto text-left">
          <MessageSquareWarning className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-[#B8651A]" />
          <span>Customers messaging your number should appear here automatically. If they're not, see <Link to="/app/settings" className="font-extrabold text-[#B8230C] hover:underline">integrations</Link>.</span>
        </div>

        {/* Session whoami + raw /api/conversations probe. If probe.count ≠
            status.conversation_count → caching bug. If probe.count == 0 →
            backend bug. */}
        {status && (
          <div className="mt-3 p-2.5 rounded-lg bg-foreground/5 border border-foreground/10 text-[10px] font-mono text-foreground/55 text-left max-w-sm mx-auto break-all">
            <p className="font-extrabold text-foreground/70 text-[9px] uppercase tracking-wider mb-1 font-sans">Session debug</p>
            <p>user_id · {status.session_user_id}</p>
            <p>email · {status.session_email}</p>
            <p>db conversation_count · <span className={status.conversation_count === 0 ? "text-[#D4308E] font-bold" : "text-[#0E8A4B] font-bold"}>{status.conversation_count}</span></p>
            {probe && (
              <>
                <p className="mt-1 font-extrabold text-foreground/70 text-[9px] uppercase tracking-wider font-sans">Raw /api/conversations probe</p>
                <p>http · <span className={probe.ok ? "text-[#0E8A4B] font-bold" : "text-[#D4308E] font-bold"}>{probe.status}</span> · {probe.ms}ms</p>
                <p>rows returned · <span className={probe.count === 0 ? "text-[#D4308E] font-bold" : "text-[#0E8A4B] font-bold"}>{probe.count}</span></p>
                {probe.firstName && <p>first.contact.name · {probe.firstName}</p>}
                {probe.errorDetail && <p className="text-[#D4308E] font-bold">error · {probe.errorDetail}</p>}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
