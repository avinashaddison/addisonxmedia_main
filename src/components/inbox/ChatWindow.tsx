import { useRef, useEffect, useState, useMemo } from "react";
import {
  Send, Paperclip, Smile, Check, CheckCheck, MoreVertical,
  CreditCard, Sparkles, Phone, Loader2, Bot,
  ChevronDown, Image as ImageIcon, Wand2, AlertTriangle,
  Package, RotateCcw, ShieldOff, FileText, Mic, Film, X,
  Brain, RefreshCcw, ShieldAlert, EyeOff, ArrowLeft, Info,
  QrCode, Power, Download,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ConversationWithContact, formatTime, initialsFor, splitTextWithLinks, tokenizeWhatsAppFormatting } from "@/lib/inbox-types";
import type { MessageStatus as MsgStatus } from "@/lib/api-types";
import { useMessages, useSendMessage } from "@/hooks/useInboxData";
import { toast } from "sonner";
import { SendProductDialog, type ProductDeliveryPayload } from "./SendProductDialog";
import { ProductDeliveryCard, decodeProductDelivery, encodeProductDelivery } from "./ProductDeliveryCard";
import { PaymentRequestCard, parsePaymentRequest } from "./PaymentRequestCard";
import { ProductPickerDialog } from "./ProductPickerDialog";
import { api } from "@/lib/api";
import { useCloudinaryConfig, useCloudinaryUpload } from "@/hooks/useCloudinaryUpload";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";

type Props = {
  conversation: ConversationWithContact;
  // Mobile-only navigation:
  //   onMobileBack — back to the conversation list (rendered on <md)
  //   onShowLead   — switch to / open the LeadPanel (mobile fullscreen, tablet drawer)
  onMobileBack?: () => void;
  onShowLead?: () => void;
};

type MessageStatus = MsgStatus;

const StatusIcon = ({ status }: { status: MessageStatus }) => {
  if (status === "queued" || status === "sent") return <Check className="w-3 h-3 text-muted-foreground" aria-label="sent" />;
  if (status === "delivered") return <CheckCheck className="w-3 h-3 text-muted-foreground" aria-label="delivered" />;
  if (status === "read") return <CheckCheck className="w-3 h-3 text-accent" aria-label="read" />;
  if (status === "failed") return <span className="text-[9px] text-destructive font-bold">FAILED</span>;
  return null;
};

/** Parse "meta:{type}:{id}" or legacy "meta:{id}" into { type, id, src }. */
function parseMediaUrl(mediaUrl: string | null, messageId: string): { type: "image" | "video" | "audio" | "document" | "sticker" | "unknown"; src: string } | null {
  if (!mediaUrl) return null;
  if (!mediaUrl.startsWith("meta:")) {
    // External URL — use directly
    return { type: "image", src: mediaUrl };
  }
  const rest = mediaUrl.slice("meta:".length);
  const parts = rest.split(":");
  const type = (parts.length > 1 ? parts[0] : "image") as "image" | "video" | "audio" | "document" | "sticker" | "unknown";
  return { type, src: `/api/messages/${messageId}/media` };
}

/** Day label for date separators: "Today" / "Yesterday" / "Mon, 17 May 2026". */
function dayLabel(d: Date): string {
  const now = new Date();
  const t0 = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const m0 = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const dayMs = 86400_000;
  if (m0 === t0) return "Today";
  if (m0 === t0 - dayMs) return "Yesterday";
  return d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
}

const MediaBubble = ({
  type, src, caption, onExpand,
}: {
  type: "image" | "video" | "audio" | "document" | "sticker" | "unknown";
  src: string;
  caption?: string;
  onExpand?: () => void;
}) => {
  if (type === "image" || type === "sticker") {
    // QR codes (we generate them via api.qrserver.com) need different
    // treatment from regular photos: they should NOT use object-cover (which
    // crops corners and breaks the scan pattern), should sit on a white
    // background (better contrast), and should be smaller (200px is plenty
    // for a customer to scan from a phone screen — the 280×320 max we use
    // for product photos makes QRs feel overwhelming in the chat).
    const isQr = typeof src === "string" && src.includes("api.qrserver.com");
    return (
      <div>
        <button
          onClick={onExpand}
          className={cn(
            "block rounded-xl overflow-hidden hover:opacity-95 transition cursor-zoom-in",
            isQr ? "bg-white border border-foreground/10 p-2" : "bg-muted/40"
          )}
          aria-label={isQr ? "Open QR full size" : "Open full size"}
        >
          <img
            src={src}
            alt={caption || (isQr ? "Payment QR code" : "WhatsApp image")}
            className={cn(
              "block",
              isQr
                ? "w-[200px] h-[200px] object-contain"
                : "max-w-[280px] max-h-[320px] object-cover w-full"
            )}
            loading="lazy"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
        </button>
        {caption && (
          <p className="text-[13px] leading-relaxed whitespace-pre-wrap text-foreground mt-1.5">
            {splitTextWithLinks(caption).map((seg, i) =>
              seg.kind === "link" ? (
                <a
                  key={i}
                  href={seg.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="underline decoration-2 underline-offset-2 font-semibold text-[#0E8A4B] hover:text-[#0A6E3C] break-all"
                >
                  {seg.label}
                </a>
              ) : (
                <span key={i}>
                  {tokenizeWhatsAppFormatting(seg.value).map((t, j) => {
                    if (t.kind === "bold")   return <strong key={j} className="font-bold">{t.value}</strong>;
                    if (t.kind === "italic") return <em key={j} className="italic">{t.value}</em>;
                    if (t.kind === "strike") return <s key={j} className="opacity-70">{t.value}</s>;
                    if (t.kind === "code")   return <code key={j} className="font-mono text-[12px] px-1 py-0.5 rounded bg-foreground/8 border border-foreground/10">{t.value}</code>;
                    return <span key={j}>{t.value}</span>;
                  })}
                </span>
              )
            )}
          </p>
        )}
      </div>
    );
  }
  if (type === "video") {
    return (
      <div>
        <video src={src} controls className="max-w-[280px] max-h-[320px] rounded-xl block" />
        {caption && <p className="text-[13px] leading-relaxed whitespace-pre-wrap text-foreground mt-1.5">{caption}</p>}
      </div>
    );
  }
  if (type === "audio") {
    return (
      <div className="flex items-center gap-2.5 min-w-[200px] max-w-[280px]">
        <div className="w-9 h-9 rounded-full bg-[#0E8A4B] text-white flex items-center justify-center flex-shrink-0">
          <Mic className="w-4 h-4" strokeWidth={2.5} />
        </div>
        <audio src={src} controls className="flex-1 h-9" />
      </div>
    );
  }
  if (type === "document") {
    return (
      <a href={src} target="_blank" rel="noopener noreferrer" download className="flex items-center gap-2.5 min-w-[200px] max-w-[280px] hover:underline">
        <div className="w-10 h-10 rounded-lg bg-[#3C50E0] text-white flex items-center justify-center flex-shrink-0">
          <FileText className="w-4 h-4" strokeWidth={2.5} />
        </div>
        <div className="min-w-0">
          <p className="text-[13px] font-extrabold truncate">{caption || "Document"}</p>
          <p className="text-[11px] text-foreground/60 font-medium">Click to download</p>
        </div>
      </a>
    );
  }
  // unknown
  return <p className="text-[13px] text-foreground/60 italic">[Unsupported media]</p>;
};

// Reusable saved-reply templates. Editing happens on the Templates page.
const QUICK_TEMPLATES = [
  { name: "Greeting", body: "Hi! Thanks for reaching out. How can I help you today?" },
  { name: "Pricing", body: "Our plans start at ₹499/mo. Want me to share a quick comparison?" },
  { name: "Demo", body: "I'd love to show you around in a 15-min call. Are you free today at 4pm or tomorrow morning?" },
  { name: "Follow-up", body: "Hey! Just checking in — happy to answer any questions." },
  { name: "Pay link", body: "Here's your pay link — UPI/Razorpay/Cards all work: " },
];

const CUSTOMER_SERVICE_WINDOW_HOURS = 24;

export const ChatWindow = ({ conversation, onMobileBack, onShowLead }: Props) => {
  const [input, setInput] = useState("");
  const [showTemplates, setShowTemplates] = useState(false);
  const [showProductPicker, setShowProductPicker] = useState(false);
  const [productOpen, setProductOpen] = useState(false);

  // ── Agent Mode toggle ─────────────────────────────────────────────────────
  const [agentMode, setAgentMode] = useState<boolean>(conversation.agent_mode ?? false);
  const [agentToggling, setAgentToggling] = useState(false);

  // ── Chat Export handlers ──────────────────────────────────────────────────
  const [exporting, setExporting] = useState(false);

  const handleExportChat = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const allMsgs = await api.listMessages(conversation.id);
      const contactName = conversation.contact.name;
      const contactPhone = conversation.contact.phone;
      
      const header = [
        "--------------------------------------------------",
        `Chat Export with ${contactName} (${contactPhone})`,
        `Exported on: ${new Date().toLocaleDateString("en-IN")}`,
        "--------------------------------------------------\n"
      ].join("\n");

      const body = allMsgs.map((m) => {
        const time = new Date(m.created_at).toLocaleTimeString("en-IN", {
          hour: "numeric",
          minute: "2-digit",
          hour12: true
        });
        const sender = m.direction === "inbound" ? contactName : "You";
        return `[${time}] ${sender}: ${m.body}`;
      }).join("\n");

      const blob = new Blob([header + body], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${contactName.replace(/\s+/g, "_")}_chat_export.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Chat exported successfully!");
    } catch (e) {
      toast.error("Failed to export chat");
      console.error(e);
    } finally {
      setExporting(false);
    }
  };

  const handleExportChatJson = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const allMsgs = await api.listMessages(conversation.id);
      const contactName = conversation.contact.name;
      
      const blob = new Blob([JSON.stringify(allMsgs, null, 2)], { type: "application/json;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${contactName.replace(/\s+/g, "_")}_chat_export.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Chat exported in JSON format!");
    } catch (e) {
      toast.error("Failed to export chat");
      console.error(e);
    } finally {
      setExporting(false);
    }
  };

  // Sync agentMode when switching conversations
  useEffect(() => {
    setAgentMode(conversation.agent_mode ?? false);
  }, [conversation.id, conversation.agent_mode]);

  const handleToggleAgentMode = async () => {
    if (agentToggling) return;
    const next = !agentMode;
    setAgentMode(next); // optimistic
    setAgentToggling(true);
    try {
      await api.toggleAgentMode(conversation.id, next);
      qc.invalidateQueries({ queryKey: ["conversations"] });
      toast.success(next ? "🤖 Agent ON — AI will auto-reply" : "Agent OFF");
    } catch (e) {
      setAgentMode(!next); // rollback
      toast.error("Failed to toggle agent mode");
    } finally {
      setAgentToggling(false);
    }
  };

  // ── QR Send panel ─────────────────────────────────────────────────────────
  const [showQrPanel, setShowQrPanel] = useState(false);
  const [qrAmount, setQrAmount] = useState("");
  const [qrNote, setQrNote] = useState("");
  const [qrSending, setQrSending] = useState(false);

  const handleSendQr = async () => {
    const amount = parseFloat(qrAmount);
    if (!amount || amount <= 0) { toast.error("Enter a valid amount"); return; }
    setQrSending(true);
    try {
      await api.sendUpiPaymentRequest({
        conversation_id: conversation.id,
        amount_inr: amount,
        note: qrNote.trim() || undefined,
      });
      toast.success(`✅ QR sent to ${contact.name}`);
      qc.invalidateQueries({ queryKey: ["messages", conversation.id] });
      setShowQrPanel(false);
      setQrAmount("");
      setQrNote("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "QR send failed");
    } finally {
      setQrSending(false);
    }
  };

  // Pending media attachment (uploaded but not sent yet)
  type Attachment = {
    url: string;
    type: "image" | "video" | "audio" | "document";
    filename: string;
    sizeBytes: number;
  };
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cloudinary config + upload helper (browser-direct upload, with progress)
  const cloudCfg = useCloudinaryConfig();
  const { upload, progress: uploadProgress, uploading, error: uploadError } = useCloudinaryUpload();

  // Classify a File into the right WhatsApp media bucket
  const classifyFile = (f: File): Attachment["type"] => {
    if (f.type.startsWith("image/")) return "image";
    if (f.type.startsWith("video/")) return "video";
    if (f.type.startsWith("audio/")) return "audio";
    return "document";
  };

  const onPickFile = async (file: File) => {
    if (!cloudCfg.data?.enabled || !cloudCfg.data.cloudName || !cloudCfg.data.uploadPreset) {
      toast.error("Media uploads not enabled — set CLOUDINARY env vars on the server");
      return;
    }
    const type = classifyFile(file);
    const maxMb = type === "video" ? cloudCfg.data.maxVideoMb : cloudCfg.data.maxImageMb;
    if (file.size > maxMb * 1024 * 1024) {
      toast.error(`${type} too large — max ${maxMb} MB`);
      return;
    }
    try {
      // Cloudinary "image" resource handles images; everything else uses "video"
      // resource which also accepts audio + documents. (Yes, Cloudinary calls
      // it "video" — it's their generic non-image endpoint.)
      const resource = type === "image" ? "image" : "video";
      const result = await upload(file, {
        cloudName: cloudCfg.data.cloudName,
        uploadPreset: cloudCfg.data.uploadPreset,
      }, resource);
      setAttachment({
        url: result.secure_url,
        type,
        filename: file.name,
        sizeBytes: result.bytes,
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    }
  };
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const qc = useQueryClient();

  const { data: messages = [], isLoading, error: messagesError } = useMessages(conversation.id);
  const sendMut = useSendMessage();

  // Mark-paid mutation — fired by the "Payment received" button on a
  // PaymentRequestCard. Server creates a won deal + sends a thank-you message.
  const markPaidMut = useMutation({
    mutationFn: (messageId: string) => api.markPaymentReceived(messageId),
    onSuccess: (res) => {
      toast.success(`✓ ₹${res.amount_inr.toLocaleString("en-IN")} marked as received${res.thank_you_sent ? " · thank-you sent" : ""}`);
      // Refresh messages (marker appears) + dashboard money (new won deal)
      qc.invalidateQueries({ queryKey: ["messages", conversation.id] });
      qc.invalidateQueries({ queryKey: ["conversations"] });
      qc.invalidateQueries({ queryKey: ["dashboard-money"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (e) => toast.error(String(e)),
  });

  // ── AI reply suggestions ──────────────────────────────────────────────────
  // Only show suggestions when:
  //   - the latest message is inbound (we're the ones who owe a reply)
  //   - we're inside Meta's 24h customer-service window
  //   - the user hasn't manually hidden the strip
  // React Query key includes the last inbound message id so a NEW inbound
  // auto-invalidates the prior suggestions.
  const lastInboundMsg = useMemo(
    () => [...messages].reverse().find((m) => m.direction === "inbound"),
    [messages],
  );
  const latestIsInbound = messages.length > 0 && messages[messages.length - 1]?.direction === "inbound";
  const [aiHidden, setAiHidden] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem("addisonx-ai-suggestions-hidden") === "1";
  });
  useEffect(() => {
    window.localStorage.setItem("addisonx-ai-suggestions-hidden", aiHidden ? "1" : "0");
  }, [aiHidden]);
  const shouldShowSuggestions = !aiHidden && latestIsInbound && !!lastInboundMsg;

  // Real send-mode indicator: is Meta WhatsApp configured + enabled?
  const { data: metaCfg } = useQuery({
    queryKey: ["meta-config"],
    queryFn: () => api.getMetaConfig(),
  });
  const sendMode: "meta" | "dryrun" = metaCfg?.enabled ? "meta" : "dryrun";

  const contact = conversation.contact;
  const initials = initialsFor(contact.name);

  // Auto-scroll on new message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  // Focus textarea + clear input when conversation switches
  useEffect(() => {
    textareaRef.current?.focus();
    setInput("");
    setShowTemplates(false);
    setAttachment(null);
  }, [conversation.id]);

  // Mark as read on view (clears unread_count once user has the chat open).
  useEffect(() => {
    if (conversation.unread_count > 0) {
      api.updateConversation(conversation.id, { unread_count: 0 })
        .then(() => qc.invalidateQueries({ queryKey: ["conversations"] }))
        .catch(() => { /* non-fatal — UI just doesn't update */ });
    }
  }, [conversation.id, conversation.unread_count, qc]);

  // Meta's 24-hour customer-service window: free-form text only allowed within
  // 24 hours of the last inbound message. Outside that, you must send a template.
  // Find the most recent inbound message timestamp.
  const lastInboundAt = messages
    .filter((m) => m.direction === "inbound")
    .map((m) => new Date(m.created_at).getTime())
    .reduce((max, t) => Math.max(max, t), 0);
  const inWindow =
    lastInboundAt > 0 &&
    Date.now() - lastInboundAt < CUSTOMER_SERVICE_WINDOW_HOURS * 3600 * 1000;
  const windowExpired = lastInboundAt > 0 && !inWindow;
  const noInboundYet = lastInboundAt === 0;

  const handleSend = () => {
    // Either text or attachment must be present
    if (!input.trim() && !attachment) return;
    const body = input;
    const att = attachment;
    setInput("");
    setAttachment(null);
    sendMut.mutate({
      conversationId: conversation.id,
      body,
      media_url: att?.url ?? null,
      media_type: att?.type ?? null,
      media_filename: att?.filename ?? null,
    });
  };

  const handleRetry = (failedBody: string) => {
    sendMut.mutate({ conversationId: conversation.id, body: failedBody });
  };

  const useTemplate = (body: string) => {
    setInput(body);
    setShowTemplates(false);
    textareaRef.current?.focus();
  };

  // Lightbox for click-to-expand on images
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  // AI suggestions — fetched only when the strip is visible. Key includes the
  // last inbound message id so suggestions auto-refresh when a new inbound
  // arrives (and we don't keep regenerating for the same message).
  const suggestionsQuery = useQuery({
    queryKey: ["reply-suggestions", conversation.id, lastInboundMsg?.id],
    queryFn: () => api.getReplySuggestions(conversation.id),
    enabled: shouldShowSuggestions && !!lastInboundMsg?.id,
    staleTime: Infinity,        // don't refetch on re-mount; new inbound = new key
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 0,
  });

  const useSuggestion = (text: string) => {
    setInput(text);
    requestAnimationFrame(() => textareaRef.current?.focus());
  };

  // Group consecutive same-sender messages within 2-minute windows so we
  // only show the timestamp + tail on the last bubble of the run. Date
  // separators ("Today" / "Yesterday" / date) get inserted between groups
  // from different calendar days.
  const messageRows = useMemo(() => {
    const out: Array<
      | { kind: "day"; label: string; key: string }
      | { kind: "msg"; msg: typeof messages[number]; isGroupTail: boolean; key: string }
    > = [];
    let lastDay = "";
    let lastDirection: string | null = null;
    let lastTime = 0;

    messages.forEach((msg, i) => {
      const ts = new Date(msg.created_at);
      const label = dayLabel(ts);
      if (label !== lastDay) {
        out.push({ kind: "day", label, key: `day-${label}-${i}` });
        lastDay = label;
        lastDirection = null;
      }

      // Look-ahead: is this the last in a same-direction same-2min run?
      const next = messages[i + 1];
      const isLastInRun =
        !next ||
        next.direction !== msg.direction ||
        new Date(next.created_at).getTime() - ts.getTime() > 2 * 60_000;

      out.push({ kind: "msg", msg, isGroupTail: isLastInRun, key: msg.id });
      lastDirection = msg.direction;
      lastTime = ts.getTime();
    });
    return out;
  }, [messages]);

  const handleDeliverProduct = async (payload: ProductDeliveryPayload, autoCloseDeal: boolean) => {
    sendMut.mutate({ conversationId: conversation.id, body: encodeProductDelivery(payload) });
    toast.success(`${payload.productName} delivered to ${contact.name}`);

    if (autoCloseDeal) {
      try {
        const all = await api.listDeals();
        const open = all.filter(
          (d: any) => d.conversation_id === conversation.id && d.stage !== "won" && d.stage !== "lost"
        );
        await Promise.all(
          open.map((d: any) =>
            api.updateDeal(d.id, {
              stage: "won",
              probability: 100,
              closed_at: new Date().toISOString(),
            })
          )
        );
        if (open.length > 0) {
          toast.success(`${open.length} deal${open.length > 1 ? "s" : ""} marked as won`);
          qc.invalidateQueries({ queryKey: ["deals"] });
        }
      } catch (e) {
        console.error("Auto-close failed", e);
      }
    }
  };

  return (
    <div className="h-full w-full flex flex-col bg-white min-w-0 min-h-0 relative overflow-hidden">
      {/* Chat header */}
      <div className="h-16 flex items-center justify-between px-3 sm:px-5 border-b-2 border-[#E8B968] flex-shrink-0 z-10 relative bg-[#0E8A4B] text-white">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {/* Mobile back arrow — returns to the conversation list. Only
              rendered when parent passes onMobileBack (i.e. inside the
              mobile state machine in InboxPage). */}
          {onMobileBack && (
            <button
              onClick={onMobileBack}
              aria-label="Back to chats"
              className="md:hidden w-9 h-9 -ml-1 rounded-lg hover:bg-white/15 flex items-center justify-center text-white transition"
            >
              <ArrowLeft className="w-5 h-5" strokeWidth={2.5} />
            </button>
          )}
          <div className="relative flex-shrink-0">
            <div className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center text-[12px] font-extrabold text-white shadow-md ring-2 ring-white/20",
              contact.tag === "hot" ? "bg-[#D4308E]" :
              contact.tag === "warm" ? "bg-[#FF6A1F]" :
              "bg-[#3C50E0]"
            )}>
              {initials}
            </div>
            <span className={cn(
              "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full ring-2 ring-[#0E8A4B]",
              contact.tag === "hot" ? "bg-[#FFD23F] animate-pulse" : "bg-[#16C172]"
            )} />
          </div>
          <div className="min-w-0">
            <h3 className="text-[15px] font-extrabold truncate">{contact.name}</h3>
            <p className="text-[11px] text-white/85 flex items-center gap-1.5 font-medium">
              <span className="font-mono">{contact.phone}</span>
              <span>·</span>
              <span className="capitalize font-extrabold">{contact.tag} lead</span>
              <span>·</span>
              <span>Score <span className="font-extrabold text-[#FFD23F]">{contact.score}</span></span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {sendMode === "meta" ? (
            <span
              className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#FFD23F] text-[#7A4A00] text-[10px] font-extrabold"
              title={`Connected via Meta · ${metaCfg?.display_phone_number ?? ""}`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#0A6E3C] animate-pulse" />
              Live · WhatsApp
            </span>
          ) : (
            <a
              href="/app/settings"
              className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#FF6A1F] text-white text-[10px] font-extrabold hover:bg-[#E85C12] transition"
              title="Configure WhatsApp in Settings → Integrations"
            >
              <ShieldOff className="w-3 h-3" />
              Dry-run · not connected
            </a>
          )}

          {/* Agent Mode toggle */}
          <button
            id="agent-mode-toggle"
            onClick={handleToggleAgentMode}
            disabled={agentToggling}
            title={agentMode ? "Agent ON — AI is auto-replying. Click to turn off." : "Agent OFF — click to enable AI auto-reply"}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold transition-all border",
              agentMode
                ? "bg-[#0E8A4B] text-white border-[#0A6E3C] shadow-[0_2px_0_0_#0A6E3C]"
                : "bg-white/10 text-white/80 border-white/25 hover:bg-white/20",
              agentToggling && "opacity-60"
            )}
            aria-pressed={agentMode}
          >
            {agentToggling
              ? <Loader2 className="w-3 h-3 animate-spin" />
              : <Bot className="w-3 h-3" strokeWidth={2.5} />
            }
            <span className="hidden sm:inline">{agentMode ? "Agent ON" : "Agent"}</span>
            {agentMode && <span className="w-1.5 h-1.5 rounded-full bg-[#FFD23F] animate-pulse" />}
          </button>

          {/* Lead info — opens LeadPanel on mobile/tablet where it isn't
              permanently visible. Hidden on lg+ where LeadPanel sits inline. */}
          {onShowLead && (
            <button
              onClick={onShowLead}
              aria-label="Show lead details"
              title="Lead details"
              className="lg:hidden w-9 h-9 rounded-lg hover:bg-white/15 flex items-center justify-center text-white transition"
            >
              <Info className="w-4 h-4" strokeWidth={2.5} />
            </button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-9 h-9 rounded-lg hover:bg-white/15 flex items-center justify-center text-white transition" aria-label="More options">
                <MoreVertical className="w-4 h-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 bg-white border border-[#E8B968] shadow-md rounded-xl p-1 z-50">
              <DropdownMenuItem
                onClick={handleExportChat}
                disabled={exporting}
                className="text-[12px] font-extrabold cursor-pointer flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-[#FFF6E8] hover:text-[#FF6A1F] focus:bg-[#FFF6E8] focus:text-[#FF6A1F] transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                Export Chat (.txt)
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={handleExportChatJson}
                disabled={exporting}
                className="text-[12px] font-extrabold cursor-pointer flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-[#FFF6E8] hover:text-[#FF6A1F] focus:bg-[#FFF6E8] focus:text-[#FF6A1F] transition-colors"
              >
                <FileText className="w-3.5 h-3.5" />
                Export Chat (.json)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* 24-hour customer-service window warning (Meta restriction).
          Only show when send mode is Meta — in dry-run it's irrelevant. */}
      {sendMode === "meta" && windowExpired && (
        <div className="px-5 py-2 border-b border-warning/30 bg-warning-soft/60 flex items-center gap-2 flex-shrink-0">
          <AlertTriangle className="w-4 h-4 text-warning flex-shrink-0" />
          <p className="text-[11px] text-foreground leading-snug">
            <span className="font-bold">Outside 24-hour window.</span> WhatsApp only allows
            approved <strong>template messages</strong> until {contact.name} replies. Free-form text will be rejected by Meta.
          </p>
        </div>
      )}

      {/* Messages — min-h-0 is critical: without it the flex child inherits
          min-height:auto (= its own content height) which makes overflow-y-auto
          a no-op and lets the whole ChatWindow balloon past the grid cell. */}
      <div
        className="flex-1 min-h-0 overflow-y-auto px-5 py-5 space-y-1 relative"
        style={{
          // Subtle WhatsApp-style wallpaper: warm cream base + tiny dot pattern
          // overlaid via repeating-radial-gradient. Looks closer to a real chat
          // app than the previous flat solid.
          backgroundColor: "hsl(var(--chat-bg))",
          backgroundImage: "radial-gradient(circle at 1px 1px, hsl(var(--foreground) / 0.04) 1px, transparent 0)",
          backgroundSize: "18px 18px",
        }}
      >
        {isLoading && (
          <div className="flex justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        )}

        {!isLoading && messages.length === 0 && messagesError && (
          // Surfacing the load error explicitly is far more helpful than the
          // generic "No messages yet" empty state — when a 401 / 403 / 500 is
          // silently swallowed, the user just sees an empty chat and can't
          // tell the difference between "really empty" and "auth/network died".
          <div className="flex flex-col items-center justify-center py-16 text-center px-6">
            <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-3">
              <span className="text-destructive text-lg font-bold">!</span>
            </div>
            <p className="text-[13px] font-semibold text-destructive">Couldn't load messages</p>
            <p className="text-[11px] text-muted-foreground mt-1 max-w-md break-words">
              {(messagesError as Error)?.message || "Unknown error"}
            </p>
            <button
              type="button"
              onClick={() => qc.invalidateQueries({ queryKey: ["messages", conversation.id] })}
              className="mt-3 text-[11px] font-medium text-primary hover:underline"
            >
              Retry
            </button>
          </div>
        )}

        {!isLoading && messages.length === 0 && !messagesError && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-12 h-12 rounded-full bg-card flex items-center justify-center mb-3 shadow-sm">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <p className="text-[13px] font-semibold text-foreground">No messages yet</p>
            <p className="text-[11px] text-muted-foreground mt-1">Send the first message below</p>
          </div>
        )}

        {messageRows.map((row) => {
          if (row.kind === "day") {
            return (
              <div key={row.key} className="flex items-center gap-3 py-3 px-2">
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-foreground/15 to-foreground/15" />
                <span className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-muted-foreground px-2 py-1 rounded-full bg-white/70 backdrop-blur shadow-sm">
                  {row.label}
                </span>
                <div className="flex-1 h-px bg-gradient-to-r from-foreground/15 via-foreground/15 to-transparent" />
              </div>
            );
          }

          const msg = row.msg;
          const isOutbound = msg.direction === "outbound";
          const productPayload = decodeProductDelivery(msg.body);
          const isFailed = msg.status === "failed";
          const media = parseMediaUrl(msg.media_url ?? null, msg.id);
          const hasMedia = !!media;
          const isImage = media?.type === "image" || media?.type === "sticker";
          // Detect old + new UPI payment messages by body pattern. Renders
          // them as a compact card (280px) instead of a giant QR + caption
          // bubble that was ballooning to 70% of viewport width.
          const paymentPayload = parsePaymentRequest(msg.body, msg.media_url ?? null);

          if (productPayload) {
            return (
              <div key={row.key} className={cn("flex animate-bubble-pop", isOutbound ? "justify-end" : "justify-start", !row.isGroupTail && "mb-0.5")}>
                <div className="relative">
                  <ProductDeliveryCard payload={productPayload} />
                  {row.isGroupTail && (
                    <div className={cn("flex items-center gap-1 mt-1", isOutbound ? "justify-end" : "justify-start")}>
                      <span className="text-[10px] text-muted-foreground">{formatTime(msg.created_at)}</span>
                      {isOutbound && <StatusIcon status={msg.status} />}
                    </div>
                  )}
                </div>
              </div>
            );
          }

          if (paymentPayload) {
            return (
              <div key={row.key} className={cn("flex animate-bubble-pop", isOutbound ? "justify-end" : "justify-start", !row.isGroupTail && "mb-0.5")}>
                <div className="relative">
                  <PaymentRequestCard
                    payment={paymentPayload}
                    outbound={isOutbound}
                    onMarkPaid={isOutbound && !paymentPayload.paid ? () => {
                      // Card handles its own Yes/No confirmation inline,
                      // so this fires only after the user picks "Yes".
                      if (markPaidMut.isPending) return;
                      markPaidMut.mutate(msg.id);
                    } : undefined}
                    markPaidPending={markPaidMut.isPending && markPaidMut.variables === msg.id}
                  />
                  {row.isGroupTail && (
                    <div className={cn("flex items-center gap-1 mt-1", isOutbound ? "justify-end" : "justify-start")}>
                      <span className="text-[10px] text-muted-foreground">{formatTime(msg.created_at)}</span>
                      {isOutbound && <StatusIcon status={msg.status} />}
                    </div>
                  )}
                </div>
              </div>
            );
          }

          return (
            <div key={row.key} className={cn("flex items-end gap-2 animate-bubble-pop group/msg", isOutbound ? "justify-end" : "justify-start", !row.isGroupTail && "mb-0.5")}>
              {/* Incoming avatar — only on the last bubble in a same-sender run.
                  Otherwise reserve the space so all bubbles in a group align. */}
              {!isOutbound && (
                row.isGroupTail ? (
                  <div className={cn(
                    "w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-extrabold text-white shadow-sm flex-shrink-0 mb-0.5",
                    contact.tag === "hot" ? "bg-[#D4308E]" :
                    contact.tag === "warm" ? "bg-[#FF6A1F]" :
                    "bg-[#3C50E0]"
                  )}>
                    {initials}
                  </div>
                ) : (
                  <div className="w-7 flex-shrink-0" />
                )
              )}

              <div className="max-w-[72%] relative">
                <div className={cn(
                  "relative overflow-hidden transition-shadow",
                  // No padding for image-only bubbles so the image goes edge-to-edge.
                  hasMedia && isImage && !msg.body ? "p-0" : "px-3.5 py-2",
                  // Premium-feel rounded corners: tail-corner is squared off ONLY on
                  // the last bubble of the group (matches the avatar/tail position).
                  isOutbound
                    ? cn("bg-[hsl(var(--chat-outgoing))] rounded-2xl", row.isGroupTail && "rounded-br-md")
                    : cn("bg-[hsl(var(--chat-incoming))] rounded-2xl", row.isGroupTail && "rounded-bl-md"),
                  // Layered soft shadow (bigger than shadow-sm, more refined)
                  "shadow-[0_1px_2px_rgba(0,0,0,0.04),0_2px_8px_rgba(0,0,0,0.04)]",
                  isFailed && "ring-2 ring-destructive/30"
                )}>
                  {/* CSS bubble tail — small triangular notch matching the bubble
                      colour, attached to the last bubble of each run. */}
                  {row.isGroupTail && (
                    <span
                      aria-hidden
                      className={cn(
                        "absolute bottom-0 w-3 h-3",
                        isOutbound
                          ? "right-[-6px] bg-[hsl(var(--chat-outgoing))] [clip-path:polygon(0_0,100%_100%,0_100%)]"
                          : "left-[-6px] bg-[hsl(var(--chat-incoming))] [clip-path:polygon(100%_0,100%_100%,0_100%)]"
                      )}
                    />
                  )}

                  {msg.is_ai_generated && isOutbound && (
                    <span className="absolute -top-2 -left-1 text-[8px] font-bold text-primary bg-primary-soft px-1.5 py-0.5 rounded uppercase tracking-wider flex items-center gap-0.5 z-10">
                      <Sparkles className="w-2.5 h-2.5" /> AI
                    </span>
                  )}
                  {hasMedia ? (
                    <div className={cn(hasMedia && isImage && !msg.body ? "p-0.5" : "")}>
                      <MediaBubble
                        type={media!.type}
                        src={media!.src}
                        caption={msg.body || undefined}
                        onExpand={isImage ? () => setLightboxSrc(media!.src) : undefined}
                      />
                    </div>
                  ) : msg.body ? (
                    <p className="text-[14px] leading-[1.45] whitespace-pre-wrap text-foreground break-words">
                      {splitTextWithLinks(msg.body).map((seg, i) =>
                        seg.kind === "link" ? (
                          <a
                            key={i}
                            href={seg.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className={cn(
                              "underline decoration-2 underline-offset-2 font-semibold transition-colors break-all",
                              isOutbound ? "text-[#0B5CFF] hover:text-[#0040D0]" : "text-[#0E8A4B] hover:text-[#0A6E3C]"
                            )}
                          >
                            {seg.label}
                          </a>
                        ) : (
                          // Render WhatsApp-style inline formatting (*bold*,
                          // _italic_, `code`, ~strike~). The raw markers
                          // shouldn't appear in the rendered chat — they're
                          // confusing to customers who copied a template.
                          <span key={i}>
                            {tokenizeWhatsAppFormatting(seg.value).map((t, j) => {
                              if (t.kind === "bold")   return <strong key={j} className="font-bold">{t.value}</strong>;
                              if (t.kind === "italic") return <em key={j} className="italic">{t.value}</em>;
                              if (t.kind === "strike") return <s key={j} className="opacity-70">{t.value}</s>;
                              if (t.kind === "code")   return <code key={j} className="font-mono text-[12.5px] px-1 py-0.5 rounded bg-foreground/8 border border-foreground/10">{t.value}</code>;
                              return <span key={j}>{t.value}</span>;
                            })}
                          </span>
                        )
                      )}
                    </p>
                  ) : null}
                  {row.isGroupTail && (
                    <div className={cn(
                      "flex items-center gap-1",
                      hasMedia && isImage && !msg.body ? "absolute bottom-1.5 right-2 bg-black/40 backdrop-blur-sm px-1.5 py-0.5 rounded-md" : "mt-0.5",
                      isOutbound ? "justify-end" : "justify-start"
                    )}>
                      <span className={cn(
                        "text-[10px] font-medium",
                        hasMedia && isImage && !msg.body ? "text-white" : "text-muted-foreground"
                      )}>
                        {formatTime(msg.created_at)}
                      </span>
                      {isOutbound && <StatusIcon status={msg.status} />}
                    </div>
                  )}
                </div>

                {/* Hover actions strip — appears on hover, positioned next to bubble */}
                <div className={cn(
                  "absolute top-1/2 -translate-y-1/2 opacity-0 group-hover/msg:opacity-100 transition-opacity flex items-center gap-1",
                  isOutbound ? "right-full mr-1.5" : "left-full ml-1.5"
                )}>
                  <button
                    onClick={() => { navigator.clipboard.writeText(msg.body); toast.success("Copied"); }}
                    className="w-7 h-7 rounded-full bg-white border border-border shadow-md hover:bg-muted text-foreground/60 hover:text-foreground flex items-center justify-center transition"
                    title="Copy text"
                  >
                    <FileText className="w-3 h-3" />
                  </button>
                </div>

                {/* Retry button for failed outbound messages */}
                {isFailed && isOutbound && row.isGroupTail && (
                  <div className="flex items-center gap-1 mt-1 justify-end">
                    <button
                      onClick={() => handleRetry(msg.body)}
                      className="text-[10px] text-destructive hover:text-foreground font-bold flex items-center gap-1 px-2 py-0.5 rounded hover:bg-destructive/10 transition-colors"
                      title="Retry sending"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Retry
                    </button>
                  </div>
                )}
              </div>

              {/* Outbound right-side spacer to balance the avatar column */}
              {isOutbound && <div className="w-1 flex-shrink-0" />}
            </div>
          );
        })}

        <div ref={bottomRef} />
      </div>

      {/* Templates dropdown (real saved replies — no fake AI suggestions) */}
      {showTemplates && (
        <div className="absolute bottom-20 left-5 z-20 w-72 bg-card border border-border rounded-xl shadow-2xl shadow-foreground/10 overflow-hidden animate-fade-in">
          <div className="px-3 py-2 border-b border-border bg-muted/40 flex items-center gap-2">
            <Wand2 className="w-3 h-3 text-primary" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Quick replies</span>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {QUICK_TEMPLATES.map((t) => (
              <button
                key={t.name}
                onClick={() => useTemplate(t.body)}
                className="w-full text-left px-3 py-2 hover:bg-primary-soft/40 border-b border-border/40 last:border-0 transition-colors group"
              >
                <div className="text-[11px] font-bold text-primary uppercase tracking-wider">{t.name}</div>
                <p className="text-[12px] text-muted-foreground truncate group-hover:text-foreground">{t.body}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* AI reply suggestions — manual approval flow (click to fill composer, never auto-sends) */}
      {shouldShowSuggestions && (
        <AiSuggestionStrip
          query={suggestionsQuery}
          onUse={useSuggestion}
          onHide={() => setAiHidden(true)}
          conversationId={conversation.id}
        />
      )}
      {!shouldShowSuggestions && latestIsInbound && aiHidden && (
        <button
          onClick={() => setAiHidden(false)}
          className="mx-5 mt-2 self-start text-[10.5px] font-bold text-primary/80 hover:text-primary bg-primary-soft hover:bg-primary-soft/80 px-2.5 py-1 rounded-full flex items-center gap-1 transition"
        >
          <Brain className="w-3 h-3" /> Show AI suggestions
        </button>
      )}

      {/* Composer — single brand-styled card that wraps action chips,
          textarea and the send button. Replaces the flat row that put the
          textarea in muted gray with no visual frame around the whole
          input area. */}
      <div className="px-4 py-3 border-t-2 border-[#E8B968] bg-gradient-to-b from-[#FFF6E8]/40 to-card flex-shrink-0">
        <div
          className={cn(
            "rounded-2xl bg-white border-2 transition-all shadow-[0_3px_0_0_#E8B968]",
            input.length > 0 ? "border-[#0E8A4B] shadow-[0_3px_0_0_#0A6E3C]" : "border-[#E8B968]"
          )}
        >
          {/* Hidden file input — triggered by the Attach button */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*,audio/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/zip,text/plain,text/csv"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void onPickFile(f);
              // Reset so picking the same file twice still fires onChange
              if (fileInputRef.current) fileInputRef.current.value = "";
            }}
          />

          {/* Pending attachment preview (shown above the chip row) */}
          {attachment && (
            <div className="mx-2.5 mt-2 mb-1 flex items-center gap-2.5 px-2.5 py-2 rounded-lg bg-[#FFF1D6] border-2 border-[#E8B968]">
              <div className="w-10 h-10 rounded-md bg-white border border-[#E8B968] flex items-center justify-center flex-shrink-0 overflow-hidden">
                {attachment.type === "image" ? (
                  <img src={attachment.url} alt="" className="w-full h-full object-cover" />
                ) : attachment.type === "video" ? (
                  <Film className="w-5 h-5 text-[#B8651A]" />
                ) : attachment.type === "audio" ? (
                  <Mic className="w-5 h-5 text-[#B8651A]" />
                ) : (
                  <FileText className="w-5 h-5 text-[#B8651A]" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-extrabold truncate">{attachment.filename}</p>
                <p className="text-[10px] text-foreground/55 font-mono">
                  {(attachment.sizeBytes / 1024).toFixed(0)} KB · {attachment.type}
                </p>
              </div>
              <button
                onClick={() => setAttachment(null)}
                aria-label="Remove attachment"
                className="w-7 h-7 rounded-md hover:bg-[#FFE9BD] flex items-center justify-center text-[#B8651A] transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Upload-in-progress strip */}
          {uploading && (
            <div className="mx-2.5 mt-2 mb-1 flex items-center gap-2.5 px-2.5 py-2 rounded-lg bg-[#E4E8FF] border-2 border-[#3C50E0]">
              <Loader2 className="w-4 h-4 animate-spin text-[#3C50E0] flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-extrabold text-[#3C50E0]">Uploading… {uploadProgress}%</p>
                <div className="w-full h-1.5 bg-white rounded-full overflow-hidden mt-1 border border-[#3C50E0]/30">
                  <div className="h-full bg-[#3C50E0] transition-all" style={{ width: `${uploadProgress}%` }} />
                </div>
              </div>
            </div>
          )}

          {/* Upload error */}
          {uploadError && !uploading && (
            <div className="mx-2.5 mt-2 mb-1 px-2.5 py-1.5 rounded-lg bg-[#FCE5F0] border border-[#D4308E]/30 text-[11px] font-semibold text-[#A11A6A] flex items-center gap-2">
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
              {uploadError}
            </div>
          )}

          {/* Top row: action chips */}
          <div className="flex items-center gap-1.5 px-2.5 pt-2 pb-1 flex-wrap">
            {/* Attach (paperclip) — opens hidden file input */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className={cn(
                "h-8 px-2.5 rounded-lg flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider transition-all border",
                attachment
                  ? "bg-[#E4E8FF] text-[#3C50E0] border-[#3C50E0]/50 shadow-[0_2px_0_0_#2533A8]"
                  : "bg-[#FFF1D6] text-[#B8651A] border-[#E8B968] hover:bg-[#FFE9BD] hover:-translate-y-0.5 disabled:opacity-50"
              )}
              aria-label="Attach photo, video, or document"
              title="Attach photo / video / document / audio"
            >
              <Paperclip className="w-3 h-3" strokeWidth={2.5} />
              {attachment ? "Attached" : "Attach"}
            </button>

            <button
              onClick={() => setShowTemplates(!showTemplates)}
              className={cn(
                "h-8 px-2.5 rounded-lg flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider transition-all border",
                showTemplates
                  ? "bg-[#FFD23F] text-[#3D1A00] border-[#E8B400] shadow-[0_2px_0_0_#B8860B]"
                  : "bg-[#FFF1D6] text-[#B8651A] border-[#E8B968] hover:bg-[#FFE9BD] hover:-translate-y-0.5"
              )}
              aria-label="Quick reply templates"
            >
              <Wand2 className="w-3 h-3" strokeWidth={2.5} />
              Templates
              <ChevronDown className={cn("w-2.5 h-2.5 transition-transform", showTemplates && "rotate-180")} />
            </button>

            {/* WhatsApp Commerce — Send products / Create order from chat */}
            <button
              onClick={() => setShowProductPicker(true)}
              className="h-8 px-2.5 rounded-lg flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider transition-all border bg-[#E6F7EE] text-[#0E8A4B] border-[#0E8A4B]/40 hover:bg-[#C6F0D6] hover:-translate-y-0.5"
              aria-label="Send products / create order"
              title="Send products from your catalog or create an order with UPI QR"
            >
              <Package className="w-3 h-3" strokeWidth={2.5} />
              Send products
            </button>

            {/* Send QR — UPI payment QR to customer */}
            <button
              id="send-qr-btn"
              onClick={() => setShowQrPanel(!showQrPanel)}
              className={cn(
                "h-8 px-2.5 rounded-lg flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider transition-all border",
                showQrPanel
                  ? "bg-[#3C50E0] text-white border-[#2533A8] shadow-[0_2px_0_0_#1E2880]"
                  : "bg-[#E4E8FF] text-[#3C50E0] border-[#3C50E0]/40 hover:bg-[#C8CFFF] hover:-translate-y-0.5"
              )}
              aria-label="Send UPI payment QR to customer"
              title="Send a UPI payment QR code to the customer"
            >
              <QrCode className="w-3 h-3" strokeWidth={2.5} />
              Send QR
            </button>

            <div className="flex-1" />

            {/* Tiny char counter — appears only when typing */}
            {input.length > 0 && (
              <span className="text-[10px] font-mono font-extrabold text-foreground/40 tabular-nums pr-1">
                {input.length}
              </span>
            )}
          </div>

          {/* QR send panel — inline below chips */}
          {showQrPanel && (
            <div className="mx-2.5 mb-2 rounded-xl border-2 border-[#3C50E0] bg-[#E4E8FF] p-3 animate-fade-in">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <QrCode className="w-3.5 h-3.5 text-[#3C50E0]" strokeWidth={2.5} />
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#1E2880]">Send Payment QR</span>
                </div>
                <button onClick={() => setShowQrPanel(false)} className="w-6 h-6 rounded-md hover:bg-[#3C50E0]/15 text-[#3C50E0] flex items-center justify-center transition">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[#1E2880] mb-1 block">Amount (₹)</label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[13px] font-extrabold text-[#3C50E0]">₹</span>
                    <input
                      id="qr-amount-input"
                      type="number"
                      min="1"
                      step="1"
                      value={qrAmount}
                      onChange={(e) => setQrAmount(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") void handleSendQr(); }}
                      placeholder="0"
                      className="w-full pl-7 pr-2 py-1.5 rounded-lg border-2 border-[#3C50E0]/40 bg-white text-[14px] font-extrabold text-[#1E2880] placeholder:text-foreground/30 focus:outline-none focus:border-[#3C50E0] transition"
                    />
                  </div>
                </div>
                <div className="flex-[1.5]">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[#1E2880] mb-1 block">Note (optional)</label>
                  <input
                    id="qr-note-input"
                    type="text"
                    value={qrNote}
                    onChange={(e) => setQrNote(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") void handleSendQr(); }}
                    placeholder="e.g. ChatGPT Plus order"
                    className="w-full px-2.5 py-1.5 rounded-lg border-2 border-[#3C50E0]/40 bg-white text-[13px] placeholder:text-foreground/30 focus:outline-none focus:border-[#3C50E0] transition"
                  />
                </div>
                <button
                  onClick={handleSendQr}
                  disabled={qrSending || !qrAmount}
                  className="h-[38px] px-4 rounded-xl bg-[#3C50E0] text-white text-[11px] font-extrabold border-2 border-[#2533A8] shadow-[0_2px_0_0_#1E2880] hover:-translate-y-0.5 hover:bg-[#2533A8] active:translate-y-0 active:shadow-none transition-all disabled:opacity-50 flex items-center gap-1.5"
                >
                  {qrSending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  Send
                </button>
              </div>
              <p className="text-[10px] text-[#3C50E0]/70 font-medium mt-2">QR will be sent as a WhatsApp image · UPI VPA must be set in Settings</p>
            </div>
          )}

          {/* Textarea + send */}
          <div className="flex items-end gap-2 px-2.5 pb-2">
            <div className="flex-1 relative">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                placeholder={
                  sendMode === "meta" && windowExpired
                    ? "Outside 24-hour window — send a template instead"
                    : sendMode === "dryrun"
                      ? "Type a message…  (dry-run — not actually sent)"
                      : "Type a message…  Enter to send · Shift + Enter for new line"
                }
                rows={1}
                className="w-full resize-none bg-transparent border-0 px-2 py-1.5 text-[14px] placeholder:text-foreground/35 focus:outline-none transition-all leading-relaxed"
              />
            </div>
            <button
              onClick={handleSend}
              disabled={(!input.trim() && !attachment) || sendMut.isPending || uploading}
              aria-label="Send message"
              className={cn(
                "w-11 h-11 rounded-xl flex items-center justify-center transition-all flex-shrink-0 border-2",
                (input.trim() || attachment) && !sendMut.isPending && !uploading
                  ? "bg-[#0E8A4B] text-white border-[#0A6E3C] shadow-[0_3px_0_0_#0A6E3C] hover:-translate-y-0.5 hover:bg-[#0A6E3C] active:translate-y-0 active:shadow-[0_1px_0_0_#0A6E3C]"
                  : "bg-[#FFF1D6] text-foreground/35 border-[#E8B968]/50 shadow-[0_2px_0_0_#E8B968]/50"
              )}
            >
              {sendMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" strokeWidth={2.5} />}
            </button>
          </div>
        </div>
      </div>

      {/* SendProductDialog moved to LeadPanel → Digital Product tab. */}

      {/* WhatsApp Commerce — product picker (send catalog OR create order) */}
      {showProductPicker && (
        <ProductPickerDialog
          conversationId={conversation.id}
          contactName={conversation.contact.name}
          onClose={() => setShowProductPicker(false)}
          onSent={() => qc.invalidateQueries({ queryKey: ["messages", conversation.id] })}
        />
      )}

      {/* Image lightbox — click outside or X to close */}
      {lightboxSrc && (
        <div
          onClick={() => setLightboxSrc(null)}
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-6 cursor-zoom-out animate-fade-in"
        >
          <button
            onClick={(e) => { e.stopPropagation(); setLightboxSrc(null); }}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center transition"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
          <img
            src={lightboxSrc}
            alt="Full size"
            onClick={(e) => e.stopPropagation()}
            className="max-w-[90vw] max-h-[90vh] object-contain rounded-xl shadow-2xl cursor-default"
          />
        </div>
      )}
    </div>
  );
};

// ─── AI suggestion strip ─────────────────────────────────────────────────────
// Renders 3 draft replies above the composer. Manual-approval only: click =
// fill the textarea; user can edit before sending. Never auto-sends in v1.
const SUGGESTION_STYLE: Record<"polite" | "sell" | "qualify", { label: string; accent: string; chipBg: string }> = {
  polite:  { label: "Polite",   accent: "border-[#0E8A4B] text-[#0E8A4B]", chipBg: "bg-[#E6F7EE]" },
  sell:    { label: "Sell",     accent: "border-[#FF6A1F] text-[#FF6A1F]", chipBg: "bg-[#FFEFE0]" },
  qualify: { label: "Qualify",  accent: "border-[#3C50E0] text-[#3C50E0]", chipBg: "bg-[#E4E8FF]" },
};

const AiSuggestionStrip = ({
  query,
  onUse,
  onHide,
  conversationId,
}: {
  query: ReturnType<typeof useQuery<import("@/lib/api").ReplySuggestionsResult>>;
  onUse: (text: string) => void;
  onHide: () => void;
  conversationId?: string;
}) => {
  const { data, isLoading, isError, error, refetch, isFetching } = query;
  const qc = useQueryClient();
  const [sendingProducts, setSendingProducts] = useState(false);
  const [creatingOrder, setCreatingOrder] = useState(false);

  return (
    <div className="px-5 py-2 border-t border-border bg-gradient-to-b from-[#FFF6E8]/60 to-card flex-shrink-0">
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5">
          <Brain className="w-3.5 h-3.5 text-[#3C50E0]" />
          <span className="text-[10px] uppercase tracking-[0.18em] font-extrabold text-foreground/60">
            Addison AI suggestions
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="text-[10px] font-bold text-foreground/55 hover:text-foreground flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-muted transition"
            title="Generate fresh suggestions"
          >
            {isFetching ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCcw className="w-3 h-3" />}
            Refresh
          </button>
          <button
            onClick={onHide}
            className="text-[10px] font-bold text-foreground/55 hover:text-foreground flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-muted transition"
            title="Hide AI suggestions"
          >
            <EyeOff className="w-3 h-3" />
            Hide
          </button>
        </div>
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-1.5">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-[60px] rounded-xl bg-muted/60 animate-pulse" />
          ))}
        </div>
      )}

      {isError && (
        <div className="text-[11px] text-foreground/65 italic">
          AI suggestions unavailable: {(error instanceof Error ? error.message : "unknown error")}
        </div>
      )}

      {data?.escalate && (
        <div className="flex items-start gap-2 rounded-xl border-2 border-[#D4308E] bg-[#FCE5F0] px-3 py-2">
          <ShieldAlert className="w-4 h-4 text-[#D4308E] flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-[11.5px] font-extrabold text-[#7A1854]">Escalate to human</p>
            <p className="text-[10.5px] text-foreground/70 leading-snug">{data.reason}</p>
          </div>
        </div>
      )}

      {data && !data.escalate && data.suggestions.length === 0 && !isLoading && (
        <div className="text-[11px] text-foreground/55 italic">
          {data.note ?? "No suggestions — try refresh."}
        </div>
      )}

      {data && !data.escalate && data.suggestions.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-1.5">
          {data.suggestions.map((s, i) => {
            const style = SUGGESTION_STYLE[s.type] ?? SUGGESTION_STYLE.polite;
            return (
              <button
                key={i}
                onClick={() => onUse(s.text)}
                className={cn(
                  "group text-left rounded-xl border-2 bg-card p-2 transition-all hover:-translate-y-0.5 hover:shadow-sm",
                  style.accent.replace("text-", "border-").split(" ")[0]
                )}
                title="Click to fill composer"
              >
                <span className={cn(
                  "inline-block text-[9px] font-extrabold uppercase tracking-[0.12em] px-1.5 py-0.5 rounded mb-1",
                  style.chipBg, style.accent
                )}>
                  {style.label}
                </span>
                <p className="text-[11.5px] leading-snug text-foreground/85 line-clamp-3 group-hover:text-foreground">
                  {s.text}
                </p>
              </button>
            );
          })}
        </div>
      )}

      {/* ── WhatsApp Commerce: AI-detected shopping intent ─────────────
          AI noticed the customer is asking about products. Show the
          matched products + one-click actions to send them or create
          an order directly from this chat. */}
      {data && !data.escalate && conversationId && data.suggested_products && data.suggested_products.length > 0 && (
        <div className="mt-2 rounded-xl border-2 border-[#0E8A4B]/40 bg-gradient-to-br from-[#E6F7EE] to-white p-2.5">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5 text-[#0E8A4B]" strokeWidth={2.5} />
              <span className="text-[10px] uppercase tracking-[0.15em] font-extrabold text-[#0A6E3C]">
                Shopping intent · {data.suggested_products.length} match{data.suggested_products.length === 1 ? "" : "es"}
              </span>
            </div>
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
            {data.suggested_products.map((p) => (
              <div key={p.id} className="flex-shrink-0 w-[72px] text-center">
                {p.photo_url ? (
                  <div className="w-[72px] h-[72px] rounded-lg overflow-hidden bg-white border border-[#0E8A4B]/20">
                    <img src={p.photo_url} alt="" className="w-full h-full object-cover"
                         onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                  </div>
                ) : (
                  <div className="w-[72px] h-[72px] rounded-lg bg-white border border-[#0E8A4B]/20 flex items-center justify-center text-[24px]">📦</div>
                )}
                <p className="text-[9.5px] font-extrabold truncate mt-0.5">{p.name}</p>
                {p.price > 0 && <p className="text-[10px] font-black tabular-nums text-[#0E8A4B]">₹{p.price.toLocaleString("en-IN")}</p>}
              </div>
            ))}
          </div>
          <div className="flex gap-1.5 mt-2">
            <button
              onClick={async () => {
                setSendingProducts(true);
                try {
                  await api.sendProductsToConversation({
                    conversation_id: conversationId,
                    product_ids: data.suggested_products!.map((p) => p.id),
                  });
                  toast.success(`Sent ${data.suggested_products!.length} product${data.suggested_products!.length === 1 ? "" : "s"}`);
                  qc.invalidateQueries({ queryKey: ["messages", conversationId] });
                } catch (e) { toast.error((e as Error).message); }
                finally { setSendingProducts(false); }
              }}
              disabled={sendingProducts}
              className="flex-1 inline-flex items-center justify-center gap-1 h-8 rounded-lg bg-white border-2 border-[#0E8A4B] text-[#0E8A4B] text-[11px] font-extrabold hover:bg-[#0E8A4B] hover:text-white transition disabled:opacity-50"
            >
              {sendingProducts ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />} Send these
            </button>
            <button
              onClick={async () => {
                if (!confirm(`Create an order with these ${data.suggested_products!.length} product${data.suggested_products!.length === 1 ? "" : "s"} and send the customer a UPI QR for payment?`)) return;
                setCreatingOrder(true);
                try {
                  const res = await api.createOrderFromMessage({
                    conversation_id: conversationId,
                    product_ids: data.suggested_products!.map((p) => p.id),
                  });
                  toast.success(`Order #${res.order_number} · ₹${res.total_inr.toLocaleString("en-IN")} UPI QR sent`);
                  qc.invalidateQueries({ queryKey: ["messages", conversationId] });
                  qc.invalidateQueries({ queryKey: ["orders"] });
                } catch (e) { toast.error((e as Error).message); }
                finally { setCreatingOrder(false); }
              }}
              disabled={creatingOrder}
              className="flex-1 inline-flex items-center justify-center gap-1 h-8 rounded-lg bg-[#FF6A1F] text-white text-[11px] font-extrabold hover:bg-[#E85C12] transition disabled:opacity-50"
            >
              {creatingOrder ? <Loader2 className="w-3 h-3 animate-spin" /> : <CreditCard className="w-3 h-3" />} Create order + QR
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
