import { useState, useRef, useEffect } from "react";
import {
  Sparkles, BookOpen, Brain, MessageSquare, Zap, FlaskConical,
  Plus, Trash2, Edit2, FileText, Globe, Upload, Send, CheckCircle2,
  TrendingUp, Clock, Bot, User as UserIcon, Save, Lightbulb, ArrowRight,
  ChevronRight, AlertCircle, Wand2, Activity, GripVertical
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type SectionId = "overview" | "knowledge" | "behavior" | "replies" | "automation" | "testing";

const SECTIONS: { id: SectionId; label: string; icon: any; hint: string }[] = [
  { id: "overview", label: "Overview", icon: Sparkles, hint: "Status & stats" },
  { id: "knowledge", label: "Knowledge Base", icon: BookOpen, hint: "Train your AI" },
  { id: "behavior", label: "AI Behavior", icon: Brain, hint: "Tone & personality" },
  { id: "replies", label: "Reply Settings", icon: MessageSquare, hint: "Templates & timing" },
  { id: "automation", label: "Automation Rules", icon: Zap, hint: "If-this-then-that" },
  { id: "testing", label: "Testing & Logs", icon: FlaskConical, hint: "Live preview" },
];

type Knowledge = { id: string; type: "text" | "file" | "url"; title: string; content: string; updatedAt: string };
type Rule = { id: string; condition: string; action: string; enabled: boolean };
type ChatMsg = { role: "user" | "ai"; text: string; intent?: string; confidence?: number };

const INITIAL_KNOWLEDGE: Knowledge[] = [
  { id: "k1", type: "text", title: "Pricing tiers", content: "Starter ₹4,999/mo · Pro ₹14,999/mo · Enterprise custom.", updatedAt: "2h ago" },
  { id: "k2", type: "text", title: "Top FAQ – Refund policy", content: "7-day no-questions-asked refund on Pro & Starter plans.", updatedAt: "1d ago" },
  { id: "k3", type: "url", title: "addisonx.media/services", content: "Auto-imported · 12 pages indexed", updatedAt: "5d ago" },
  { id: "k4", type: "file", title: "Sales playbook v3.pdf", content: "42 pages · objection handling, closing scripts", updatedAt: "1w ago" },
];

const INITIAL_RULES: Rule[] = [
  { id: "r1", condition: "User asks about price", action: "Send pricing card + 10% first-time offer", enabled: true },
  { id: "r2", condition: "No reply for 1 hour", action: "Send soft follow-up message", enabled: true },
  { id: "r3", condition: "High intent detected (confidence > 80%)", action: "Suggest closing action to agent", enabled: true },
  { id: "r4", condition: "Lead asks for demo", action: "Share Calendly link + notify owner", enabled: false },
];

export const AITrainingPage = () => {
  const [section, setSection] = useState<SectionId>("overview");
  const [aiActive, setAiActive] = useState(true);
  const [mode, setMode] = useState<"manual" | "assisted" | "auto">("assisted");
  const [autoReply, setAutoReply] = useState(true);

  // Behavior
  const [tone, setTone] = useState("sales");
  const [persuasion, setPersuasion] = useState([60]);
  const [language, setLanguage] = useState("hinglish");
  const [replyStyle, setReplyStyle] = useState("question");

  // Replies
  const [greeting, setGreeting] = useState("Hey 👋 Welcome to AddisonX! How can I help you grow today?");
  const [firstReply, setFirstReply] = useState("Got it! Let me pull the right info for you in a sec.");
  const [followup, setFollowup] = useState("Just checking in — still interested in scaling your sales? 🚀");
  const [delay, setDelay] = useState("5");

  // Knowledge & Rules
  const [knowledge, setKnowledge] = useState<Knowledge[]>(INITIAL_KNOWLEDGE);
  const [rules, setRules] = useState<Rule[]>(INITIAL_RULES);
  const [newKbType, setNewKbType] = useState<"text" | "url">("text");
  const [newKbTitle, setNewKbTitle] = useState("");
  const [newKbContent, setNewKbContent] = useState("");

  const [dirty, setDirty] = useState(false);

  // Mark dirty on changes
  useEffect(() => { setDirty(true); }, [tone, persuasion, language, replyStyle, greeting, firstReply, followup, delay, mode, autoReply]);

  const handleSave = () => {
    setDirty(false);
    toast.success("AI configuration saved", { description: "Addison AI updated in real-time." });
  };

  const addKnowledge = () => {
    if (!newKbTitle.trim() || !newKbContent.trim()) {
      toast.error("Add a title and content");
      return;
    }
    setKnowledge((k) => [
      { id: `k${Date.now()}`, type: newKbType, title: newKbTitle, content: newKbContent, updatedAt: "just now" },
      ...k,
    ]);
    setNewKbTitle("");
    setNewKbContent("");
    toast.success("Knowledge added", { description: "AI is learning from this entry." });
  };

  const deleteKnowledge = (id: string) => {
    setKnowledge((k) => k.filter((x) => x.id !== id));
    toast.success("Removed");
  };

  const toggleRule = (id: string) => {
    setRules((rs) => rs.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r)));
  };

  const addRule = () => {
    setRules((rs) => [
      ...rs,
      { id: `r${Date.now()}`, condition: "New condition...", action: "New action...", enabled: false },
    ]);
  };

  const removeRule = (id: string) => setRules((rs) => rs.filter((r) => r.id !== id));

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-background">
      {/* Top header */}
      <div className="h-16 px-6 border-b border-border flex items-center justify-between flex-shrink-0 bg-card/60 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center shadow-lg shadow-primary/30 ring-1 ring-primary-foreground/10">
            <Brain className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-[16px] font-bold leading-tight flex items-center gap-2">
              AI Training & Control
              <span className={cn("inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full",
                aiActive ? "bg-success-soft text-success" : "bg-muted text-muted-foreground")}>
                <span className={cn("w-1.5 h-1.5 rounded-full", aiActive ? "bg-success animate-pulse" : "bg-muted-foreground")} />
                {aiActive ? "Active" : "Off"}
              </span>
            </h1>
            <p className="text-[11px] text-muted-foreground">Train Addison like a sales employee — tone, knowledge, behavior</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {dirty && (
            <span className="text-[11px] text-warning font-semibold flex items-center gap-1.5 mr-2 animate-fade-in">
              <span className="w-1.5 h-1.5 rounded-full bg-warning animate-pulse" />
              Unsaved changes
            </span>
          )}
          <Button variant="outline" size="sm" onClick={() => toast.info("Coming soon")}>
            <Activity className="w-4 h-4 mr-1.5" />
            View logs
          </Button>
          <Button size="sm" onClick={handleSave} className="shadow-md shadow-primary/20">
            <Save className="w-4 h-4 mr-1.5" />
            Save changes
          </Button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* LEFT: section nav */}
        <aside className="w-[220px] border-r border-border bg-card/30 flex-shrink-0 p-3 space-y-1 overflow-y-auto">
          {SECTIONS.map((s) => {
            const isActive = s.id === section;
            return (
              <button
                key={s.id}
                onClick={() => setSection(s.id)}
                className={cn(
                  "relative w-full text-left rounded-xl px-3 py-2.5 transition-all group",
                  isActive
                    ? "bg-gradient-to-r from-primary-soft via-primary-soft/60 to-transparent text-primary"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                )}
              >
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-7 rounded-r-full bg-gradient-to-b from-primary to-primary-glow shadow-[0_0_12px_hsl(var(--primary)/0.6)]" />
                )}
                <div className="flex items-center gap-2.5">
                  <s.icon className={cn("w-4 h-4 transition-transform group-hover:scale-110", isActive && "text-primary")} strokeWidth={isActive ? 2.4 : 2} />
                  <div className="flex-1">
                    <p className="text-[13px] font-semibold leading-tight">{s.label}</p>
                    <p className="text-[10px] opacity-70 leading-tight mt-0.5">{s.hint}</p>
                  </div>
                </div>
              </button>
            );
          })}

          <div className="pt-4">
            <div className="rounded-xl p-3 bg-gradient-to-br from-accent-soft to-primary-soft border border-primary/15">
              <div className="flex items-center gap-2 mb-1">
                <Lightbulb className="w-3.5 h-3.5 text-primary" />
                <p className="text-[11px] font-bold">AI Insight</p>
              </div>
              <p className="text-[10px] text-muted-foreground leading-snug">Conversion <b className="text-success">+34%</b> when AI uses question-based replies.</p>
            </div>
          </div>
        </aside>

        {/* CENTER */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto p-6 space-y-5 animate-fade-in" key={section}>
            {section === "overview" && (
              <OverviewSection
                aiActive={aiActive} setAiActive={setAiActive}
                mode={mode} setMode={setMode}
                autoReply={autoReply} setAutoReply={setAutoReply}
              />
            )}
            {section === "knowledge" && (
              <KnowledgeSection
                knowledge={knowledge} addKnowledge={addKnowledge} deleteKnowledge={deleteKnowledge}
                newKbType={newKbType} setNewKbType={setNewKbType}
                newKbTitle={newKbTitle} setNewKbTitle={setNewKbTitle}
                newKbContent={newKbContent} setNewKbContent={setNewKbContent}
              />
            )}
            {section === "behavior" && (
              <BehaviorSection
                tone={tone} setTone={setTone}
                persuasion={persuasion} setPersuasion={setPersuasion}
                language={language} setLanguage={setLanguage}
                replyStyle={replyStyle} setReplyStyle={setReplyStyle}
              />
            )}
            {section === "replies" && (
              <RepliesSection
                greeting={greeting} setGreeting={setGreeting}
                firstReply={firstReply} setFirstReply={setFirstReply}
                followup={followup} setFollowup={setFollowup}
                delay={delay} setDelay={setDelay}
              />
            )}
            {section === "automation" && (
              <AutomationSection rules={rules} toggleRule={toggleRule} addRule={addRule} removeRule={removeRule} />
            )}
            {section === "testing" && <LogsSection />}
          </div>
        </div>

        {/* RIGHT: live preview */}
        <PreviewPanel tone={tone} language={language} replyStyle={replyStyle} persuasion={persuasion[0]} />
      </div>
    </div>
  );
};

/* ---------- Overview ---------- */
const OverviewSection = ({ aiActive, setAiActive, mode, setMode, autoReply, setAutoReply }: any) => {
  const stats = [
    { label: "Replies sent by AI", value: "2,847", delta: "+18%", icon: MessageSquare, color: "text-primary", bg: "bg-primary-soft" },
    { label: "Conversion via AI", value: "23.4%", delta: "+5.2%", icon: TrendingUp, color: "text-success", bg: "bg-success-soft" },
    { label: "Avg response time", value: "1.2s", delta: "-0.4s", icon: Clock, color: "text-accent", bg: "bg-accent-soft" },
  ];

  return (
    <>
      <SectionHeader title="Overview" subtitle="Status, mode and AI performance at a glance" icon={Sparkles} />

      <div className="rounded-2xl border border-border bg-card p-5 relative overflow-hidden">
        <div className="absolute inset-0 aurora-bg opacity-30 pointer-events-none" />
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center transition-all",
              aiActive ? "bg-gradient-to-br from-primary to-primary-glow shadow-lg shadow-primary/40 animate-glow-pulse" : "bg-muted")}>
              <Bot className={cn("w-7 h-7", aiActive ? "text-primary-foreground" : "text-muted-foreground")} />
            </div>
            <div>
              <p className="text-[18px] font-bold flex items-center gap-2">
                Addison AI is {aiActive ? "Active" : "Off"}
                <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full",
                  aiActive ? "bg-success-soft text-success" : "bg-muted text-muted-foreground")}>
                  {aiActive ? "🟢 LIVE" : "⚪ PAUSED"}
                </span>
              </p>
              <p className="text-[12px] text-muted-foreground">Currently handling your incoming WhatsApp chats</p>
            </div>
          </div>
          <Switch checked={aiActive} onCheckedChange={setAiActive} className="scale-125" />
        </div>
      </div>

      {/* Mode selector */}
      <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
        <div>
          <p className="text-[13px] font-bold">Operating Mode</p>
          <p className="text-[11px] text-muted-foreground">Choose how much control AI has over conversations</p>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[
            { id: "manual", title: "Manual", desc: "AI suggests only, you reply", icon: UserIcon },
            { id: "assisted", title: "Assisted", desc: "AI drafts, you approve", icon: Wand2 },
            { id: "auto", title: "Fully Automatic", desc: "AI handles end-to-end", icon: Zap },
          ].map((m) => {
            const active = mode === m.id;
            return (
              <button
                key={m.id}
                onClick={() => setMode(m.id)}
                className={cn(
                  "relative text-left rounded-xl p-4 border-2 transition-all hover:-translate-y-0.5",
                  active ? "border-primary bg-primary-soft/50 shadow-md shadow-primary/10" : "border-border hover:border-primary/40"
                )}
              >
                {active && <CheckCircle2 className="absolute top-2 right-2 w-4 h-4 text-primary" />}
                <m.icon className={cn("w-5 h-5 mb-2", active ? "text-primary" : "text-muted-foreground")} />
                <p className="text-[13px] font-bold">{m.title}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug">{m.desc}</p>
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40">
          <div>
            <p className="text-[12px] font-semibold">Enable AI Auto-Reply</p>
            <p className="text-[10px] text-muted-foreground">Reply instantly when leads message you</p>
          </div>
          <Switch checked={autoReply} onCheckedChange={setAutoReply} />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl border border-border bg-card p-4 hover:shadow-md hover:-translate-y-0.5 transition-all">
            <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center mb-2", s.bg)}>
              <s.icon className={cn("w-4 h-4", s.color)} />
            </div>
            <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide">{s.label}</p>
            <p className="text-[22px] font-extrabold mt-1">{s.value}</p>
            <p className="text-[10px] text-success font-semibold">{s.delta} vs last week</p>
          </div>
        ))}
      </div>
    </>
  );
};

/* ---------- Knowledge ---------- */
const KnowledgeSection = ({ knowledge, addKnowledge, deleteKnowledge, newKbType, setNewKbType, newKbTitle, setNewKbTitle, newKbContent, setNewKbContent }: any) => (
  <>
    <SectionHeader title="Knowledge Base" subtitle="Teach AI everything about your business — FAQs, pricing, services" icon={BookOpen} />

    {/* Add new */}
    <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Plus className="w-4 h-4 text-primary" />
        <p className="text-[13px] font-bold">Add new knowledge</p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {[
          { id: "text", label: "Text Input", icon: FileText, desc: "FAQs, pricing, scripts" },
          { id: "url", label: "Website URL", icon: Globe, desc: "Auto-scrape pages" },
          { id: "file", label: "Upload File", icon: Upload, desc: "PDF, DOCX (soon)" },
        ].map((t) => {
          const active = newKbType === t.id;
          const disabled = t.id === "file";
          return (
            <button
              key={t.id}
              disabled={disabled}
              onClick={() => !disabled && setNewKbType(t.id as any)}
              className={cn(
                "rounded-xl p-3 border-2 transition-all text-left",
                disabled && "opacity-50 cursor-not-allowed",
                active ? "border-primary bg-primary-soft/50" : "border-border hover:border-primary/40"
              )}
            >
              <t.icon className={cn("w-4 h-4 mb-1.5", active ? "text-primary" : "text-muted-foreground")} />
              <p className="text-[12px] font-bold">{t.label}</p>
              <p className="text-[10px] text-muted-foreground">{t.desc}</p>
            </button>
          );
        })}
      </div>

      <div className="space-y-2">
        <Input placeholder={newKbType === "url" ? "https://yoursite.com/pricing" : "Title (e.g. Pricing FAQ)"} value={newKbTitle} onChange={(e) => setNewKbTitle(e.target.value)} />
        {newKbType === "text" ? (
          <Textarea placeholder="What should AI know? (e.g. Our Pro plan is ₹14,999/mo and includes unlimited chats)" value={newKbContent} onChange={(e) => setNewKbContent(e.target.value)} rows={3} />
        ) : (
          <Input placeholder="Description (optional)" value={newKbContent} onChange={(e) => setNewKbContent(e.target.value)} />
        )}
        <Button onClick={addKnowledge} size="sm" className="w-full">
          <Plus className="w-4 h-4 mr-1.5" /> Train AI with this
        </Button>
      </div>
    </div>

    {/* List */}
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="px-5 py-3 border-b border-border flex items-center justify-between">
        <p className="text-[13px] font-bold">Trained knowledge ({knowledge.length})</p>
        <Badge variant="secondary" className="text-[10px]">Indexed</Badge>
      </div>
      <div className="divide-y divide-border">
        {knowledge.map((k: Knowledge) => {
          const Icon = k.type === "text" ? FileText : k.type === "url" ? Globe : Upload;
          return (
            <div key={k.id} className="group px-5 py-3 flex items-start gap-3 hover:bg-muted/30 transition-colors">
              <GripVertical className="w-4 h-4 text-muted-foreground/40 mt-1 cursor-grab" />
              <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
                k.type === "url" ? "bg-accent-soft text-accent" : k.type === "file" ? "bg-warning-soft text-warning" : "bg-primary-soft text-primary")}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-bold">{k.title}</p>
                <p className="text-[11px] text-muted-foreground line-clamp-1">{k.content}</p>
                <p className="text-[10px] text-muted-foreground/70 mt-0.5">Updated {k.updatedAt}</p>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => toast.info("Edit coming soon")}>
                  <Edit2 className="w-3.5 h-3.5" />
                </Button>
                <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => deleteKnowledge(k.id)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  </>
);

/* ---------- Behavior ---------- */
const BehaviorSection = ({ tone, setTone, persuasion, setPersuasion, language, setLanguage, replyStyle, setReplyStyle }: any) => {
  const persuasionLabel = persuasion[0] < 33 ? "Soft" : persuasion[0] < 66 ? "Persuasive" : "Aggressive Closer";
  return (
    <>
      <SectionHeader title="AI Behavior" subtitle="Shape how Addison talks, sells, and closes" icon={Brain} />

      {/* Tone */}
      <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
        <div>
          <p className="text-[13px] font-bold">Tone of voice</p>
          <p className="text-[11px] text-muted-foreground">How should AI sound to your leads?</p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {[
            { id: "friendly", label: "Friendly", desc: "Warm and approachable", emoji: "😊" },
            { id: "professional", label: "Professional", desc: "Polished and corporate", emoji: "💼" },
            { id: "sales", label: "Sales-focused", desc: "Conversion-driven", emoji: "🎯" },
            { id: "aggressive", label: "Aggressive Closer", desc: "Direct, urgent, deal-first", emoji: "🔥" },
          ].map((t) => {
            const active = tone === t.id;
            return (
              <button key={t.id} onClick={() => setTone(t.id)}
                className={cn("text-left rounded-xl p-3 border-2 transition-all hover:-translate-y-0.5",
                  active ? "border-primary bg-primary-soft/50" : "border-border hover:border-primary/40")}>
                <div className="flex items-center gap-2">
                  <span className="text-base">{t.emoji}</span>
                  <p className="text-[13px] font-bold">{t.label}</p>
                  {active && <CheckCircle2 className="w-3.5 h-3.5 text-primary ml-auto" />}
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5">{t.desc}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Persuasion slider */}
      <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[13px] font-bold">Personality intensity</p>
            <p className="text-[11px] text-muted-foreground">From gentle to closer-mode</p>
          </div>
          <Badge className="bg-gradient-to-r from-primary to-primary-glow text-primary-foreground border-0">{persuasionLabel}</Badge>
        </div>
        <Slider value={persuasion} onValueChange={setPersuasion} max={100} step={1} />
        <div className="flex justify-between text-[10px] text-muted-foreground font-semibold uppercase tracking-wide">
          <span>Soft</span>
          <span>Persuasive</span>
          <span>Aggressive</span>
        </div>
      </div>

      {/* Language & style */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
          <p className="text-[13px] font-bold">Language</p>
          <Select value={language} onValueChange={setLanguage}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="hinglish">🇮🇳 Hinglish</SelectItem>
              <SelectItem value="english">🇬🇧 English</SelectItem>
              <SelectItem value="hindi">🇮🇳 Hindi</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
          <p className="text-[13px] font-bold">Response style</p>
          <Select value={replyStyle} onValueChange={setReplyStyle}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="short">Short replies (1-2 lines)</SelectItem>
              <SelectItem value="detailed">Detailed (full explanation)</SelectItem>
              <SelectItem value="question">Question-based (qualify lead)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </>
  );
};

/* ---------- Replies ---------- */
const RepliesSection = ({ greeting, setGreeting, firstReply, setFirstReply, followup, setFollowup, delay, setDelay }: any) => (
  <>
    <SectionHeader title="Reply Settings" subtitle="Templates, timing, and conversation openers" icon={MessageSquare} />

    <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
      <div className="space-y-2">
        <Label className="text-[12px] font-bold">Greeting message</Label>
        <Textarea value={greeting} onChange={(e) => setGreeting(e.target.value)} rows={2} />
        <p className="text-[10px] text-muted-foreground">Sent when a lead first messages you</p>
      </div>
      <div className="space-y-2">
        <Label className="text-[12px] font-bold">First reply template</Label>
        <Textarea value={firstReply} onChange={(e) => setFirstReply(e.target.value)} rows={2} />
      </div>
      <div className="space-y-2">
        <Label className="text-[12px] font-bold">Follow-up message style</Label>
        <Textarea value={followup} onChange={(e) => setFollowup(e.target.value)} rows={2} />
      </div>
    </div>

    <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
      <p className="text-[13px] font-bold">Reply delay</p>
      <p className="text-[11px] text-muted-foreground">Make AI feel more human by adding a small delay</p>
      <div className="grid grid-cols-3 gap-2">
        {[
          { v: "0", label: "Instant", desc: "0 seconds" },
          { v: "5", label: "Natural", desc: "after 5s" },
          { v: "30", label: "Thoughtful", desc: "after 30s" },
        ].map((d) => {
          const active = delay === d.v;
          return (
            <button key={d.v} onClick={() => setDelay(d.v)}
              className={cn("rounded-xl p-3 border-2 transition-all",
                active ? "border-primary bg-primary-soft/50" : "border-border hover:border-primary/40")}>
              <p className="text-[13px] font-bold">{d.label}</p>
              <p className="text-[10px] text-muted-foreground">{d.desc}</p>
            </button>
          );
        })}
      </div>
    </div>
  </>
);

/* ---------- Automation ---------- */
const AutomationSection = ({ rules, toggleRule, addRule, removeRule }: { rules: Rule[]; toggleRule: (id: string) => void; addRule: () => void; removeRule: (id: string) => void; }) => (
  <>
    <SectionHeader title="Automation Rules" subtitle="If-this-then-that logic for AI behavior" icon={Zap} />

    <div className="space-y-3">
      {rules.map((r) => (
        <div key={r.id} className={cn("rounded-2xl border bg-card p-4 transition-all hover:shadow-md",
          r.enabled ? "border-primary/30 shadow-sm shadow-primary/5" : "border-border opacity-70")}>
          <div className="flex items-start gap-4">
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[9px] font-bold uppercase tracking-wide bg-warning-soft text-warning border-warning/20">IF</Badge>
                <p className="text-[13px] font-semibold">{r.condition}</p>
              </div>
              <div className="flex items-center gap-2 pl-2">
                <ChevronRight className="w-3 h-3 text-muted-foreground" />
                <Badge variant="outline" className="text-[9px] font-bold uppercase tracking-wide bg-primary-soft text-primary border-primary/20">THEN</Badge>
                <p className="text-[12px] text-muted-foreground">{r.action}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={r.enabled} onCheckedChange={() => toggleRule(r.id)} />
              <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => removeRule(r.id)}>
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </div>
      ))}

      <button onClick={addRule}
        className="w-full rounded-2xl border-2 border-dashed border-border hover:border-primary/40 p-5 text-center text-muted-foreground hover:text-primary transition-all hover:bg-primary-soft/30">
        <Plus className="w-5 h-5 mx-auto mb-1" />
        <p className="text-[12px] font-semibold">Add new automation rule</p>
        <p className="text-[10px] opacity-70">e.g. IF lead asks for demo → send Calendly</p>
      </button>
    </div>
  </>
);

/* ---------- Logs ---------- */
const LogsSection = () => {
  const logs = [
    { time: "2 min ago", lead: "Rohit S.", action: "AI replied with pricing card", outcome: "success", confidence: 92 },
    { time: "8 min ago", lead: "Priya M.", action: "AI suggested closing offer", outcome: "success", confidence: 88 },
    { time: "23 min ago", lead: "Aman K.", action: "AI escalated to human agent", outcome: "escalated", confidence: 54 },
    { time: "1h ago", lead: "Neha D.", action: "AI sent follow-up after silence", outcome: "success", confidence: 76 },
    { time: "2h ago", lead: "Vikram T.", action: "AI couldn't match intent", outcome: "failed", confidence: 31 },
  ];
  return (
    <>
      <SectionHeader title="Testing & Logs" subtitle="Every AI conversation tracked, scored, and improvable" icon={FlaskConical} />
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="divide-y divide-border">
          {logs.map((l, i) => (
            <div key={i} className="px-4 py-3 flex items-center gap-3 hover:bg-muted/30 transition-colors">
              <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
                l.outcome === "success" ? "bg-success-soft text-success" :
                l.outcome === "escalated" ? "bg-warning-soft text-warning" : "bg-hot-soft text-hot")}>
                {l.outcome === "success" ? <CheckCircle2 className="w-4 h-4" /> : l.outcome === "escalated" ? <ArrowRight className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-bold">{l.lead} <span className="text-muted-foreground font-normal">· {l.action}</span></p>
                <p className="text-[10px] text-muted-foreground">{l.time}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-muted-foreground">Confidence</p>
                <p className={cn("text-[12px] font-bold",
                  l.confidence > 75 ? "text-success" : l.confidence > 50 ? "text-warning" : "text-hot")}>
                  {l.confidence}%
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

/* ---------- Live preview panel ---------- */
const PreviewPanel = ({ tone, language, replyStyle, persuasion }: { tone: string; language: string; replyStyle: string; persuasion: number; }) => {
  const [messages, setMessages] = useState<ChatMsg[]>([
    { role: "ai", text: "Hey 👋 Welcome to AddisonX! What brings you here today?" },
  ]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }); }, [messages, typing]);

  const generateReply = (userText: string): ChatMsg => {
    const lower = userText.toLowerCase();
    let intent = "general_inquiry";
    let confidence = 65;
    let text = "";

    if (/price|cost|how much|kitna/i.test(lower)) {
      intent = "pricing_inquiry"; confidence = 94;
      text = persuasion > 66
        ? "Pro plan is ₹14,999/mo — but if you commit today I'll lock in 15% off. Should I send you the payment link right now? 🚀"
        : tone === "aggressive"
        ? "₹14,999/mo for Pro. Want the link to start today?"
        : replyStyle === "question"
        ? "Great question! Quick check — how many chats per month do you handle? That'll help me suggest the right plan 💪"
        : "Our plans start at ₹4,999/mo (Starter) and Pro is ₹14,999/mo with unlimited chats. Want me to send the breakdown?";
    } else if (/demo|trial|try/i.test(lower)) {
      intent = "demo_request"; confidence = 90;
      text = "Love it! Booking a 15-min demo right now — what time works for you tomorrow? 📅";
    } else if (/refund|cancel/i.test(lower)) {
      intent = "support"; confidence = 82;
      text = "No worries — we offer a 7-day no-questions-asked refund. Want me to walk you through it?";
    } else {
      text = language === "hinglish"
        ? "Got it! Bata yaar, kya specifically chahiye — sales automation, broadcasts, ya CRM?"
        : "Got it! Tell me more — are you looking at sales automation, broadcasts, or CRM?";
    }

    return { role: "ai", text, intent, confidence };
  };

  const send = () => {
    if (!input.trim()) return;
    const userMsg: ChatMsg = { role: "user", text: input };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setTyping(true);
    setTimeout(() => {
      setMessages((m) => [...m, generateReply(userMsg.text)]);
      setTyping(false);
    }, 900);
  };

  const lastAi = [...messages].reverse().find((m) => m.role === "ai" && m.intent);

  return (
    <aside className="w-[360px] border-l border-border bg-card/40 flex-shrink-0 flex flex-col">
      <div className="px-4 py-3 border-b border-border flex items-center gap-2 flex-shrink-0">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center">
          <FlaskConical className="w-3.5 h-3.5 text-primary-foreground" />
        </div>
        <div className="flex-1">
          <p className="text-[12px] font-bold">Live Test</p>
          <p className="text-[10px] text-muted-foreground">Chat with AI using your settings</p>
        </div>
        <span className="text-[9px] font-bold text-success flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" /> LIVE
        </span>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-[hsl(var(--chat-bg))]">
        {messages.map((m, i) => (
          <div key={i} className={cn("flex animate-bubble-pop", m.role === "user" ? "justify-end" : "justify-start")}>
            <div className={cn(
              "max-w-[85%] px-3 py-2 rounded-2xl text-[12px] leading-snug shadow-sm",
              m.role === "user"
                ? "bg-[hsl(var(--chat-outgoing))] text-foreground rounded-br-sm"
                : "bg-[hsl(var(--chat-incoming))] text-foreground rounded-bl-sm border border-border/60"
            )}>
              {m.role === "ai" && (
                <div className="flex items-center gap-1 mb-1">
                  <Sparkles className="w-2.5 h-2.5 text-primary" />
                  <span className="text-[9px] font-bold text-primary uppercase tracking-wider">Addison AI</span>
                </div>
              )}
              {m.text}
            </div>
          </div>
        ))}
        {typing && (
          <div className="flex justify-start">
            <div className="bg-[hsl(var(--chat-incoming))] border border-border/60 rounded-2xl rounded-bl-sm px-3 py-2.5 flex items-center gap-1">
              <span className="typing-dot" /><span className="typing-dot" /><span className="typing-dot" />
            </div>
          </div>
        )}
      </div>

      {lastAi?.intent && (
        <div className="px-4 py-2 border-t border-border bg-muted/20 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Intent detected</span>
            <span className="text-[10px] font-semibold text-primary">{lastAi.intent}</span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Confidence</span>
            <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
              <div className={cn("h-full rounded-full transition-all",
                (lastAi.confidence ?? 0) > 75 ? "bg-success" : (lastAi.confidence ?? 0) > 50 ? "bg-warning" : "bg-hot")}
                style={{ width: `${lastAi.confidence}%` }} />
            </div>
            <span className="text-[10px] font-bold w-8 text-right">{lastAi.confidence}%</span>
          </div>
          <Button size="sm" variant="outline" className="w-full h-7 text-[10px]" onClick={() => toast.success("Feedback noted — AI will learn")}>
            <Wand2 className="w-3 h-3 mr-1" /> Improve this response
          </Button>
        </div>
      )}

      <div className="p-3 border-t border-border flex-shrink-0">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="Test as a lead..."
            className="text-[12px] h-9"
          />
          <Button size="icon" onClick={send} className="h-9 w-9 flex-shrink-0">
            <Send className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </aside>
  );
};

/* ---------- helpers ---------- */
const SectionHeader = ({ title, subtitle, icon: Icon }: { title: string; subtitle: string; icon: any }) => (
  <div className="flex items-center gap-3 pb-1">
    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-soft to-accent-soft border border-primary/20 flex items-center justify-center">
      <Icon className="w-4 h-4 text-primary" />
    </div>
    <div>
      <h2 className="text-[18px] font-extrabold leading-tight">{title}</h2>
      <p className="text-[11px] text-muted-foreground">{subtitle}</p>
    </div>
  </div>
);
