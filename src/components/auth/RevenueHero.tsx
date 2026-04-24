import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { MessageCircle, Sparkles, TrendingUp, Flame, Star, IndianRupee, Zap, Users, ArrowUpRight } from "lucide-react";
import { CountUp } from "@/components/landing/CountUp";

const TICKER = [
  { icon: IndianRupee, text: "₹2,000 sale just now", tone: "money" },
  { icon: Flame, text: "New hot lead detected", tone: "hot" },
  { icon: MessageCircle, text: "5 new leads in last hour", tone: "info" },
  { icon: TrendingUp, text: "Deal closed — ₹12,500", tone: "money" },
  { icon: Zap, text: "AI replied in 1.4s", tone: "info" },
];

export const RevenueHero = () => {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => (t + 1) % TICKER.length), 2600);
    return () => clearInterval(id);
  }, []);

  return (
    <aside className="hidden lg:flex relative flex-1 overflow-hidden bg-gradient-to-br from-primary via-primary-glow to-accent text-primary-foreground">
      {/* animated gradient sheen */}
      <div className="absolute inset-0 bg-[linear-gradient(120deg,transparent_30%,hsl(var(--primary-foreground)/0.08)_50%,transparent_70%)] bg-[length:200%_100%] animate-[shine_8s_linear_infinite] pointer-events-none" />
      <div
        className="absolute -top-32 -left-32 w-[420px] h-[420px] rounded-full bg-primary-foreground/10 blur-3xl"
        style={{ animation: "blob 14s ease-in-out infinite" }}
      />
      <div
        className="absolute bottom-0 -right-24 w-[480px] h-[480px] rounded-full bg-success/30 blur-3xl"
        style={{ animation: "blob 18s ease-in-out infinite reverse" }}
      />
      <div className="absolute inset-0 dot-pattern opacity-20 mix-blend-overlay" />

      {/* floating UI peek — chat bubble */}
      <div className="absolute top-[28%] -right-10 w-[260px] rotate-[8deg] opacity-60 animate-float pointer-events-none">
        <div className="bg-primary-foreground/10 backdrop-blur-xl border border-primary-foreground/20 rounded-2xl p-3 shadow-2xl">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-full bg-success/30 flex items-center justify-center text-[10px] font-bold">PR</div>
            <div>
              <p className="text-[11px] font-bold leading-none">Priya • New lead</p>
              <p className="text-[9px] opacity-70 mt-0.5">just now</p>
            </div>
          </div>
          <div className="bg-primary-foreground/15 rounded-lg p-2 text-[11px] leading-snug">
            "I want to enroll my son. Fees?"
          </div>
          <div className="mt-1.5 bg-success/25 rounded-lg p-2 text-[11px] leading-snug ml-4">
            ✨ AI: "Hi Priya! Fees are ₹8,500/mo. Pay here →"
          </div>
        </div>
      </div>

      {/* floating UI peek — revenue dashboard */}
      <div className="absolute bottom-[18%] -left-8 w-[220px] -rotate-[6deg] opacity-55 animate-float pointer-events-none" style={{ animationDelay: "1.2s" }}>
        <div className="bg-primary-foreground/10 backdrop-blur-xl border border-primary-foreground/20 rounded-2xl p-3 shadow-2xl">
          <p className="text-[9px] uppercase tracking-wider opacity-70 font-bold">Today's revenue</p>
          <p className="text-2xl font-bold tracking-tight mt-1">₹47,250</p>
          <div className="flex items-center gap-1 mt-1 text-[10px] text-success-foreground/90">
            <ArrowUpRight className="w-3 h-3" /> +312% vs last week
          </div>
          <div className="mt-2 flex items-end gap-0.5 h-8">
            {[40, 55, 35, 70, 50, 85, 100].map((h, i) => (
              <div key={i} className="flex-1 bg-gradient-to-t from-success/40 to-success rounded-sm" style={{ height: `${h}%` }} />
            ))}
          </div>
        </div>
      </div>

      <div className="relative z-10 flex flex-col justify-between p-12 xl:p-14 w-full">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 w-fit group">
          <div className="relative w-10 h-10 rounded-xl bg-primary-foreground/15 backdrop-blur-md border border-primary-foreground/20 flex items-center justify-center group-hover:scale-105 transition-transform">
            <MessageCircle className="w-5 h-5" fill="currentColor" strokeWidth={0} />
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-success rounded-full border-2 border-primary animate-pulse" />
          </div>
          <div>
            <p className="font-bold tracking-tight text-[15px] leading-none">AddisonX Media</p>
            <p className="text-[10px] uppercase tracking-[0.18em] opacity-70 mt-1">Revenue Engine</p>
          </div>
        </Link>

        {/* Center pitch */}
        <div className="max-w-md space-y-6">
          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-success/25 backdrop-blur-md border border-success/40 text-[11px] font-bold uppercase tracking-wider">
            <Sparkles className="w-3 h-3" />
            AI Revenue Co-Pilot
          </span>

          <h2 className="text-[34px] xl:text-[40px] font-bold tracking-tight leading-[1.05]">
            Turn WhatsApp chats into{" "}
            <span className="relative inline-block">
              <span className="absolute inset-x-0 bottom-1 h-3 bg-success/40 -skew-x-6 rounded" />
              <span className="relative">paying customers</span>
            </span>{" "}
            — automatically.
          </h2>

          {/* Revenue proof box */}
          <div className="bg-primary-foreground/10 backdrop-blur-xl border border-primary-foreground/25 rounded-2xl p-5 shadow-2xl shadow-black/10 space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-primary-foreground/15">
              <p className="text-[10px] uppercase tracking-wider font-bold opacity-80">Live results · last 30 days</p>
              <span className="flex items-center gap-1 text-[10px] font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" /> LIVE
              </span>
            </div>

            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-wider opacity-70 font-bold mb-1">💰 Generated</p>
                <p className="text-3xl xl:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-warning via-warning to-success-foreground bg-clip-text text-transparent">
                  ₹<CountUp end={47000} duration={2200} />
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] uppercase tracking-wider opacity-70 font-bold mb-1">📈 Conversions</p>
                <p className="text-2xl font-bold tracking-tight text-success-foreground flex items-center gap-1">
                  +<CountUp end={312} duration={1800} />%
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-primary-foreground/15">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-warning/30 flex items-center justify-center">
                  <Flame className="w-3.5 h-3.5" />
                </div>
                <p className="text-[12px] font-semibold">
                  <CountUp end={28} duration={1400} className="font-extrabold" /> hot leads ready to buy
                </p>
              </div>
              <ArrowUpRight className="w-4 h-4 opacity-60" />
            </div>
          </div>

          {/* Live ticker */}
          <div className="flex items-center gap-2 bg-primary-foreground/10 backdrop-blur border border-primary-foreground/15 rounded-xl px-3 py-2.5 overflow-hidden">
            <span className="w-2 h-2 rounded-full bg-success animate-pulse flex-shrink-0" />
            <div className="flex-1 relative h-5 overflow-hidden">
              {TICKER.map((item, i) => {
                const Icon = item.icon;
                return (
                  <div
                    key={i}
                    className="absolute inset-0 flex items-center gap-1.5 text-[12px] font-medium transition-all duration-500"
                    style={{
                      transform: `translateY(${(i - tick) * 100}%)`,
                      opacity: i === tick ? 1 : 0,
                    }}
                  >
                    <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="truncate">{item.text}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Trust footer */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex gap-0.5">
              {[...Array(5)].map((_, k) => (
                <Star key={k} className="w-3.5 h-3.5 fill-warning text-warning" />
              ))}
            </div>
            <span className="text-[11px] opacity-80">4.9 / 5 · 1,200+ businesses</span>
          </div>
          <p className="text-[13px] leading-relaxed opacity-90 max-w-md">
            "We closed ₹47L in the first 30 days. Feels like having a senior closer on every chat."
          </p>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-primary-foreground/20 backdrop-blur border border-primary-foreground/20 flex items-center justify-center text-[11px] font-bold">
              PM
            </div>
            <div>
              <p className="text-[12px] font-bold leading-tight">Priya Mehta</p>
              <p className="text-[10px] opacity-70 flex items-center gap-1">
                <Users className="w-2.5 h-2.5" /> Founder, Mehta Tutorials
              </p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};
