import { useState } from "react";
import { Plus, UserPlus, Trophy, Radio, MessageSquarePlus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Props = { onNavigate: (page: string) => void };

const ACTIONS = [
  { id: "contact", label: "Add Contact", icon: UserPlus, page: "contacts", color: "from-accent to-accent" },
  { id: "deal", label: "Create Deal", icon: Trophy, page: "deals", color: "from-warning to-warning" },
  { id: "broadcast", label: "Send Broadcast", icon: Radio, page: "broadcasts", color: "from-primary to-primary-glow" },
  { id: "chat", label: "Start Chat", icon: MessageSquarePlus, page: "inbox", color: "from-success to-primary" },
];

export const QuickActionFAB = ({ onNavigate }: Props) => {
  const [open, setOpen] = useState(false);

  const handle = (a: typeof ACTIONS[number]) => {
    setOpen(false);
    onNavigate(a.page);
    toast.success(`Opening ${a.label.toLowerCase()}...`);
  };

  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-3">
      {/* Action items */}
      {open && (
        <div className="flex flex-col items-end gap-2 mb-1">
          {ACTIONS.map((a, i) => (
            <button
              key={a.id}
              onClick={() => handle(a)}
              className="group flex items-center gap-3 animate-slide-up"
              style={{ animationDelay: `${i * 40}ms`, animationFillMode: "backwards" }}
            >
              <span className="px-3 py-1.5 rounded-lg bg-card border border-border shadow-lg text-[12px] font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all">
                {a.label}
              </span>
              <span className={cn(
                "w-12 h-12 rounded-2xl bg-gradient-to-br flex items-center justify-center text-primary-foreground shadow-lg shadow-foreground/20 hover:scale-110 transition-all ring-1 ring-primary-foreground/10",
                a.color
              )}>
                <a.icon className="w-5 h-5" />
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Main FAB */}
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "relative w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-primary-glow text-primary-foreground shadow-xl shadow-primary/40 flex items-center justify-center transition-all hover:scale-110 active:scale-95 ring-2 ring-primary-foreground/10",
          open && "rotate-45"
        )}
        title="Quick actions"
      >
        {!open && <span className="absolute inset-0 rounded-2xl bg-primary animate-ping opacity-20" />}
        {open ? <X className="w-6 h-6" /> : <Plus className="w-6 h-6" strokeWidth={2.5} />}
      </button>
    </div>
  );
};
