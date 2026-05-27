import { useEffect, useState, useMemo } from "react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  LayoutDashboard,
  Inbox,
  Users,
  Trophy,
  Megaphone,
  Radio,
  FileText,
  Bot,
  Brain,
  Workflow,
  BarChart3,
  Activity,
  UsersRound,
  Plug,
  Settings,
  Sparkles,
  Plus,
  MessageSquarePlus,
  Send,
  LogOut,
  Loader2,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { toast } from "sonner";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigate: (page: string) => void;
};

type SearchResult =
  | { kind: "contact"; id: string; name: string; phone: string }
  | { kind: "conversation"; id: string; name: string; preview: string }
  | { kind: "deal"; id: string; title: string; value: number; stage: string };

const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, group: "Sales", keywords: "home command center overview" },
  { id: "inbox", label: "Chats", icon: Inbox, group: "Sales", keywords: "messages whatsapp conversations" },
  { id: "contacts", label: "Contacts", icon: Users, group: "Sales", keywords: "leads people crm" },
  { id: "deals", label: "Deals", icon: Trophy, group: "Sales", keywords: "pipeline sales revenue" },
  { id: "campaigns", label: "Campaigns", icon: Megaphone, group: "Marketing", keywords: "ads outreach" },
  { id: "broadcasts", label: "Broadcasts", icon: Radio, group: "Marketing", keywords: "mass message blast" },
  { id: "templates", label: "Templates", icon: FileText, group: "Marketing", keywords: "messages reusable" },
  { id: "ai-assistant", label: "AI Assistant", icon: Bot, group: "AI", keywords: "addison copilot chat ai" },
  { id: "ai-training", label: "Agent Playground", icon: Brain, group: "AI", keywords: "train teach learn knowledge agent playground" },
  { id: "workflows", label: "Workflows", icon: Workflow, group: "AI", keywords: "automation flows triggers" },
  { id: "analytics", label: "Analytics", icon: BarChart3, group: "System", keywords: "reports stats metrics" },
  { id: "activity", label: "Activity", icon: Activity, group: "System", keywords: "logs timeline history" },
  { id: "team", label: "Team", icon: UsersRound, group: "System", keywords: "members agents users" },
  { id: "integrations", label: "Integrations", icon: Plug, group: "System", keywords: "connect apps webhooks" },
  { id: "settings", label: "Settings", icon: Settings, group: "System", keywords: "preferences account" },
];

export const CommandPalette = ({ open, onOpenChange, onNavigate }: Props) => {
  const { user, signOut } = useAuth();

  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);

  // Reset query when dialog closes
  useEffect(() => {
    if (!open) {
      setQ("");
      setResults([]);
    }
  }, [open]);

  // Live workspace search (debounced)
  useEffect(() => {
    if (!q.trim() || !user || !open) {
      setResults([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const data = await api.search(q);
        if (cancelled) return;
        const r: SearchResult[] = [];
        data.contacts?.forEach((c: any) => r.push({ kind: "contact", id: c.id, name: c.name, phone: c.phone }));
        data.conversations?.forEach((c: any) =>
          r.push({ kind: "conversation", id: c.id, name: c.contact_name ?? "Unknown", preview: c.last_message_preview ?? "" })
        );
        data.deals?.forEach((d: any) => r.push({ kind: "deal", id: d.id, title: d.title, value: Number(d.value), stage: d.stage }));
        setResults(r);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [q, user, open]);

  const grouped = useMemo(
    () => ({
      contacts: results.filter((r) => r.kind === "contact"),
      conversations: results.filter((r) => r.kind === "conversation"),
      deals: results.filter((r) => r.kind === "deal"),
    }),
    [results]
  );

  const go = (page: string) => {
    onNavigate(page);
    onOpenChange(false);
  };

  const runAction = (fn: () => void) => {
    fn();
    onOpenChange(false);
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Search or type a command…"
        value={q}
        onValueChange={setQ}
      />
      <CommandList className="max-h-[480px]">
        {loading && (
          <div className="px-4 py-6 text-center">
            <Loader2 className="w-4 h-4 animate-spin mx-auto text-muted-foreground" />
          </div>
        )}

        {!loading && q.trim() && results.length === 0 && (
          <CommandEmpty>
            No results for "<b className="text-foreground">{q}</b>"
          </CommandEmpty>
        )}

        {/* Workspace search results */}
        {grouped.contacts.length > 0 && (
          <CommandGroup heading="Contacts">
            {grouped.contacts.map(
              (r) =>
                r.kind === "contact" && (
                  <CommandItem key={`c-${r.id}`} value={`contact ${r.name} ${r.phone}`} onSelect={() => go("contacts")}>
                    <Users className="w-4 h-4 mr-2 text-muted-foreground" />
                    <span className="flex-1">{r.name}</span>
                    <span className="text-[10px] text-muted-foreground ml-2">{r.phone}</span>
                  </CommandItem>
                )
            )}
          </CommandGroup>
        )}

        {grouped.conversations.length > 0 && (
          <CommandGroup heading="Conversations">
            {grouped.conversations.map(
              (r) =>
                r.kind === "conversation" && (
                  <CommandItem key={`v-${r.id}`} value={`chat ${r.name} ${r.preview}`} onSelect={() => go("inbox")}>
                    <Inbox className="w-4 h-4 mr-2 text-muted-foreground" />
                    <span className="flex-1 truncate">{r.name}</span>
                    <span className="text-[10px] text-muted-foreground ml-2 truncate max-w-[180px]">{r.preview}</span>
                  </CommandItem>
                )
            )}
          </CommandGroup>
        )}

        {grouped.deals.length > 0 && (
          <CommandGroup heading="Deals">
            {grouped.deals.map(
              (r) =>
                r.kind === "deal" && (
                  <CommandItem key={`d-${r.id}`} value={`deal ${r.title} ${r.stage}`} onSelect={() => go("deals")}>
                    <Trophy className="w-4 h-4 mr-2 text-muted-foreground" />
                    <span className="flex-1">{r.title}</span>
                    <span className="text-[10px] text-muted-foreground ml-2">
                      ₹{r.value.toLocaleString("en-IN")} · {r.stage}
                    </span>
                  </CommandItem>
                )
            )}
          </CommandGroup>
        )}

        {(grouped.contacts.length > 0 || grouped.conversations.length > 0 || grouped.deals.length > 0) && (
          <CommandSeparator />
        )}

        {/* Quick Actions */}
        <CommandGroup heading="Quick Actions">
          <CommandItem value="new chat conversation message" onSelect={() => runAction(() => { go("inbox"); toast.success("Opening inbox — start a new chat ✨"); })}>
            <MessageSquarePlus className="w-4 h-4 mr-2 text-primary" />
            <span className="flex-1">Start new chat</span>
            <kbd className="text-[9px] font-bold text-muted-foreground">N</kbd>
          </CommandItem>
          <CommandItem value="new contact lead add" onSelect={() => runAction(() => { go("contacts"); toast.success("Opening contacts"); })}>
            <Plus className="w-4 h-4 mr-2 text-primary" />
            <span className="flex-1">Add new contact</span>
          </CommandItem>
          <CommandItem value="launch broadcast send blast" onSelect={() => runAction(() => { go("broadcasts"); toast.success("Opening broadcasts"); })}>
            <Send className="w-4 h-4 mr-2 text-primary" />
            <span className="flex-1">Launch broadcast</span>
          </CommandItem>
          <CommandItem value="ask addison ai assistant copilot" onSelect={() => runAction(() => { go("ai-assistant"); toast.success("Addison is ready ✨"); })}>
            <Sparkles className="w-4 h-4 mr-2 text-accent" />
            <span className="flex-1">Ask Addison AI</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        {/* Navigation */}
        <CommandGroup heading="Go to">
          {NAV_ITEMS.map((item) => (
            <CommandItem
              key={item.id}
              value={`${item.label} ${item.group} ${item.keywords}`}
              onSelect={() => go(item.id)}
            >
              <item.icon className="w-4 h-4 mr-2 text-muted-foreground" />
              <span className="flex-1">{item.label}</span>
              <span className="text-[9px] uppercase tracking-wider text-muted-foreground">{item.group}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        {/* Preferences */}
        <CommandGroup heading="Preferences">
          {/* Dark-mode toggle removed — app brand is light-only for now.
              See src/components/ThemeToggle.tsx for the full rationale. */}
          <CommandItem
            value="logout sign out exit"
            onSelect={() => runAction(() => {
              signOut();
              toast.success("Signed out");
            })}
          >
            <LogOut className="w-4 h-4 mr-2 text-muted-foreground" />
            <span className="flex-1">Sign out</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
};
