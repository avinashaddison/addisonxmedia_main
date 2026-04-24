import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { MessageCircle, Sparkles, TrendingUp, Flame, Star, Zap, ArrowUpRight, CheckCheck } from "lucide-react";
import { CountUp } from "@/components/landing/CountUp";

const TICKER = [
  { icon: TrendingUp, text: "Rohan paid ₹12,500 — Premium plan", tone: "money" },
  { icon: Flame, text: "Hot lead detected · Mehta Tutorials", tone: "hot" },
  { icon: MessageCircle, text: "AI replied to 5 chats in 1.2s", tone: "info" },
  { icon: Zap, text: "Priya converted in 4 messages", tone: "money" },
];

const CHAT_SCRIPT = [
  { from: "lead", text: "Hi, fees kya hai for class 10 batch?", delay: 0 },
  { from: "ai", text: "Hi Priya 👋 Class 10 batch is ₹8,500/mo. We have a slot opening Mon. Should I block it?", delay: 1100 },
  { from: "lead", text: "Yes please. How to pay?", delay: 2400 },
  { from: "ai", text: "Tap to pay ₹8,500 → razorpay.me/mehta · Seat confirmed instantly ✨", delay: 3600 },
  { from: "lead", text: "Done ✅", delay: 5000 },
];

export const RevenueHero = () => {
  const [tick, setTick] = useState(0);
  const [visibleMsgs, setVisibleMsgs] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => (t + 1) % TICKER.length), 2800);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const run = () => {
      setVisibleMsgs(0);
      CHAT_SCRIPT.forEach((_, i) => {
        setTimeout(() => {
          if (!cancelled) setVisibleMsgs(i + 1);
        }, CHAT_SCRIPT[i].delay + 400);
      });
      setTimeout(() => {
        if (!cancelled) run();
      }, 8500);
    };
    run();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <aside className="hidden lg:flex relative flex-1 overflow-hidden bg-[hsl(220_28%_6%)] text-white">
      {/* Aurora background */}
      <div className="absolute inset-0 opacity-90">
        <div className="absolute top-[-15%] left-[-10%] w-[600px] h-[600px] rounded-full bg-primary/35 blur-[120px] animate-aurora" />
        <div className="absolute bottom-[-20%] right-[-15%] w-[640px] h-[640px] rounded-full bg-accent/25 blur-[140px] animate-aurora" style={{ animationDelay: "3s" }} />
        <div className="absolute top-[40%] left-[30%] w-[420px] h-[420px] rounded-full bg-primary-glow/20 blur-[120px] animate-aurora" style={{ animationDelay: "6s" }} />
      </div>

      {/* Grid */}
      <div
        className="absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)",
          backgroundSize: "44px 44px",
          maskImage: "radial-gradient(ellipse 70% 60% at 50% 50%, black 50%, transparent 100%)",
        }}
      />

      {/* Soft vignette */}
      <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-black/40 pointer-events-none" />

      <div className="relative z-10 flex flex-col justify-between p-10 xl:p-12 w-full">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 w-fit group">
          <div className="relative w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md border border-white/15 flex items-center justify-center group-hover:bg-white/15 transition-colors">
            <MessageCircle className="w-5 h-5" fill="currentColor" strokeWidth={0} />
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-primary rounded-full border-2 border-[hsl(220_28%_6%)] animate-pulse" />
          </div>
          <div>
            <p className="font-bold tracking-tight text-[15px] leading-none">AddisonX Media</p>
            <p className="text-[10px] uppercase tracking-[0.22em] text-white/50 mt-1">Revenue OS</p>
          </div>
        </Link>

        {/* Center: Live conversion demo */}
        <div className="grid grid-cols-[1.1fr_1fr] gap-6 items-center">
          {/* Left: pitch + stats */}
          <div className="space-y-5">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/8 backdrop-blur-md border border-white/15 text-[11px] font-semibold uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              Live · happening now
            </span>

            <h2 className="text-[34px] xl:text-[40px] font-bold tracking-tight leading-[1.05]">
              Every chat,{" "}
              <span className="relative inline-block">
                <span className="relative bg-gradient-to-r from-primary-glow via-primary to-primary-glow bg-clip-text text-transparent">
                  closed.
                </span>
              </span>
              <br />
              <span className="text-white/70 text-[26px] xl:text-[30px] font-semibold">
                Even at 3 AM.
              </span>
            </h2>

            <p className="text-[14px] text-white/60 leading-relaxed max-w-md">
              Watch how AddisonX turns a WhatsApp ping into a paid customer — without a human lifting a finger.
            </p>

            {/* Mini stats row */}
            <div className="grid grid-cols-3 gap-2.5 max-w-md pt-2">
              <Stat label="Generated" value="₹47K" sub="+312%" tone="money" />
              <Stat label="Hot leads" value="28" sub="ready" tone="hot" />
              <Stat label="AI reply" value="1.4s" sub="avg" tone="info" />
            </div>
          </div>

          {/* Right: animated chat phone */}
          <div className="relative flex justify-center">
            {/* Glow behind phone */}
            <div className="absolute inset-0 bg-primary/30 blur-3xl rounded-full" />

            <div className="relative w-[280px] xl:w-[300px] rounded-[36px] bg-gradient-to-b from-[hsl(220_25%_12%)] to-[hsl(220_28%_8%)] border border-white/10 shadow-2xl shadow-black/60 overflow-hidden animate-float">
              {/* Status bar */}
              <div className="flex items-center justify-between px-5 pt-3 pb-1 text-[10px] text-white/60">
                <span>9:41</span>
                <div className="flex items-center gap-1">
                  <span className="w-3 h-1.5 bg-white/60 rounded-sm" />
                </div>
              </div>

              {/* Chat header */}
              <div className="flex items-center gap-2.5 px-4 py-3 border-b border-white/8 bg-white/[0.03]">
                <div className="relative">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center text-[12px] font-bold">
                    PR
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-primary rounded-full border-2 border-[hsl(220_25%_12%)]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-semibold leading-tight">Priya M.</p>
                  <p className="text-[9.5px] text-white/50 flex items-center gap-1">
                    <Sparkles className="w-2.5 h-2.5 text-primary-glow" />
                    AddisonX is replying
                  </p>
                </div>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-primary/20 text-primary-glow font-bold uppercase tracking-wider">
                  Hot
                </span>
              </div>

              {/* Messages */}
              <div className="px-3.5 py-3 space-y-2 min-h-[290px] bg-[hsl(220_30%_5%)]">
                {CHAT_SCRIPT.map((m, i) => {
                  if (i >= visibleMsgs) return null;
                  const isAi = m.from === "ai";
                  return (
                    <div
                      key={i}
                      className={`flex ${isAi ? "justify-end" : "justify-start"} animate-bubble-pop`}
                    >
                      <div
                        className={`max-w-[80%] px-3 py-1.5 rounded-2xl text-[11px] leading-snug ${
                          isAi
                            ? "bg-gradient-to-br from-primary to-primary-glow text-primary-foreground rounded-br-sm shadow-lg shadow-primary/30"
                            : "bg-white/8 text-white/90 rounded-bl-sm border border-white/5"
                        }`}
                      >
                        {m.text}
                        {isAi && (
                          <div className="flex items-center justify-end gap-0.5 mt-0.5 opacity-70">
                            <CheckCheck className="w-2.5 h-2.5" />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {visibleMsgs > 0 && visibleMsgs < CHAT_SCRIPT.length && (
                  <div className="flex justify-end">
                    <div className="bg-white/5 rounded-2xl rounded-br-sm px-3 py-2 flex gap-1">
                      <span className="typing-dot" />
                      <span className="typing-dot" />
                      <span className="typing-dot" />
                    </div>
                  </div>
                )}

                {visibleMsgs === CHAT_SCRIPT.length && (
                  <div className="mt-2 mx-1 p-2.5 rounded-xl bg-gradient-to-r from-primary/20 to-primary-glow/10 border border-primary/30 animate-fade-in">
                    <p className="text-[10px] uppercase tracking-wider text-primary-glow font-bold">
                      ✨ Deal closed automatically
                    </p>
                    <p className="text-[14px] font-bold mt-0.5">+ ₹8,500 · 12s</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom: ticker + trust */}
        <div className="space-y-4">
          {/* Live ticker */}
          <div className="flex items-center gap-2.5 bg-white/5 backdrop-blur-md border border-white/10 rounded-xl px-3.5 py-2.5">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse flex-shrink-0" />
            <div className="flex-1 relative h-4 overflow-hidden">
              {TICKER.map((item, i) => {
                const Icon = item.icon;
                return (
                  <div
                    key={i}
                    className="absolute inset-0 flex items-center gap-1.5 text-[12px] font-medium text-white/85 transition-all duration-500"
                    style={{
                      transform: `translateY(${(i - tick) * 100}%)`,
                      opacity: i === tick ? 1 : 0,
                    }}
                  >
                    <Icon className="w-3.5 h-3.5 flex-shrink-0 text-primary-glow" />
                    <span className="truncate">{item.text}</span>
                  </div>
                );
              })}
            </div>
            <span className="text-[10px] text-white/40 uppercase tracking-wider font-bold flex-shrink-0">live</span>
          </div>

          {/* Trust strip */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <div className="flex -space-x-1.5">
                {["PM", "RK", "AS", "VG"].map((init, k) => (
                  <div
                    key={k}
                    className="w-7 h-7 rounded-full bg-gradient-to-br from-primary/40 to-accent/40 border-2 border-[hsl(220_28%_6%)] flex items-center justify-center text-[9px] font-bold"
                  >
                    {init}
                  </div>
                ))}
              </div>
              <div>
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, k) => (
                    <Star key={k} className="w-3 h-3 fill-warning text-warning" />
                  ))}
                  <span className="text-[11px] font-bold ml-1">4.9</span>
                </div>
                <p className="text-[10px] text-white/50">1,200+ businesses earning</p>
              </div>
            </div>

            <div className="text-right">
              <p className="text-[10px] uppercase tracking-wider text-white/40 font-bold">Today</p>
              <p className="text-[14px] font-bold flex items-center gap-1 justify-end">
                <ArrowUpRight className="w-3.5 h-3.5 text-primary-glow" />
                ₹<CountUp end={47250} duration={2200} /> earned
              </p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};

const Stat = ({ label, value, sub, tone }: { label: string; value: string; sub: string; tone: "money" | "hot" | "info" }) => {
  const toneClasses = {
    money: "text-primary-glow",
    hot: "text-warning",
    info: "text-accent",
  };
  return (
    <div className="bg-white/5 backdrop-blur border border-white/10 rounded-xl p-2.5 hover:bg-white/8 transition-colors">
      <p className="text-[9px] uppercase tracking-wider text-white/50 font-bold">{label}</p>
      <p className={`text-[18px] font-bold tracking-tight mt-0.5 ${toneClasses[tone]}`}>{value}</p>
      <p className="text-[9px] text-white/40 font-medium">{sub}</p>
    </div>
  );
};
