import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Crown, Check, MessageCircle } from "lucide-react";

const PLANS = [
  {
    name: "Starter",
    tag: "Solo founders, kirana, single-clinic",
    price: "₹999",
    cta: "Start free trial",
    featured: false,
    features: [
      "2,000 conversations/mo",
      "500 AI actions/mo (Hinglish replies)",
      "UPI live mode — actually collect payments",
      "3 team members",
      "Broadcasts + templates",
      "Email + WhatsApp support",
    ],
  },
  {
    name: "Growth",
    tag: "D2C, coaching, multi-branch — most popular",
    price: "₹2,999",
    cta: "Start free trial",
    featured: true,
    features: [
      "10,000 conversations/mo",
      "5,000 AI actions/mo · all features unlocked",
      "Meta Ads in-app · CTW campaigns",
      "Ad-to-Sale ROAS attribution (exclusive)",
      "AI insights · follow-up automation",
      "10 team members · custom domain",
      "Priority WhatsApp + call support",
    ],
  },
  {
    name: "Scale",
    tag: "High-volume D2C, agencies, multi-location",
    price: "₹7,999",
    cta: "Start free trial",
    featured: false,
    features: [
      "50,000 conversations/mo",
      "25,000 AI actions/mo",
      "Up to 3 workspaces (one bill)",
      "API access · webhooks",
      "White-label (custom sender domain)",
      "25 team members",
      "Dedicated CSM (IST hours)",
    ],
  },
];

// ─── Honest cost calculator ──────────────────────────────────────────────────
// Lets prospects price out their monthly bill = AddisonX software + Meta fees.
// Meta rates are India 2026 rates passed through at cost.
// PLAN_FEES are the displayed ₹ values from PLANS above.
const META_RATE_MARKETING = 0.78;
const META_RATE_UTILITY = 0.115;

const PLAN_FEES: { id: "starter" | "growth" | "scale"; label: string; price: number; convCap: number }[] = [
  { id: "starter", label: "Starter", price: 999,  convCap: 2_000 },
  { id: "growth",  label: "Growth",  price: 2999, convCap: 10_000 },
  { id: "scale",   label: "Scale",   price: 7999, convCap: 50_000 },
];

const CostCalculator = () => {
  const [planId, setPlanId] = useState<"starter" | "growth" | "scale">("growth");
  const [marketing, setMarketing] = useState(2000);
  const [utility, setUtility] = useState(3000);

  const plan = PLAN_FEES.find((p) => p.id === planId)!;
  const metaMarketing = marketing * META_RATE_MARKETING;
  const metaUtility = utility * META_RATE_UTILITY;
  const metaTotal = metaMarketing + metaUtility;
  const total = plan.price + metaTotal;
  const totalConv = marketing + utility;
  const overCap = totalConv > plan.convCap;
  const avgPerMsg = totalConv > 0 ? total / totalConv : 0;

  return (
    <div className="mt-12 rounded-2xl bg-[#FFF6E8] border-2 border-[#E8B968] p-5 lg:p-7 shadow-[0_4px_0_0_#E8B968]">
      <div className="flex flex-col lg:flex-row lg:items-end gap-2 mb-5">
        <div className="flex-1">
          <span className="inline-block px-2.5 py-0.5 bg-[#FF6A1F] text-white text-[10px] uppercase tracking-[0.18em] font-extrabold rounded-full mb-2">
            Transparent calculator
          </span>
          <h3 className="text-2xl lg:text-3xl font-black tracking-tight leading-tight">
            Aapka monthly bill exactly kitna hoga?
          </h3>
          <p className="text-sm text-foreground/65 font-medium mt-1">
            Software fee + Meta fees · No hidden markup · No surprise charges
          </p>
        </div>
      </div>

      {/* Plan picker */}
      <div className="grid grid-cols-3 gap-2 mb-5">
        {PLAN_FEES.map((p) => {
          const active = p.id === planId;
          return (
            <button
              key={p.id}
              onClick={() => setPlanId(p.id)}
              className={`rounded-xl border-2 p-3 text-left transition-all ${
                active
                  ? "border-[#0E8A4B] bg-[#E6F7EE] shadow-[0_3px_0_0_#0E8A4B]"
                  : "border-[#E8B968] bg-white hover:border-[#FF6A1F]/40"
              }`}
            >
              <p className="text-[12px] font-extrabold">{p.label}</p>
              <p className="text-[15px] font-black tabular-nums leading-tight">₹{p.price.toLocaleString("en-IN")}</p>
              <p className="text-[9.5px] text-foreground/55 font-bold">{p.convCap.toLocaleString("en-IN")} conv/mo</p>
            </button>
          );
        })}
      </div>

      {/* Sliders */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
        <SliderBlock
          label="Marketing broadcasts / month"
          subLabel={`@ ₹${META_RATE_MARKETING}/msg (Meta direct)`}
          value={marketing}
          onChange={setMarketing}
          max={50000}
          step={500}
          tone="warn"
        />
        <SliderBlock
          label="Utility messages / month"
          subLabel={`@ ₹${META_RATE_UTILITY}/msg (Meta direct) — order updates, reminders`}
          value={utility}
          onChange={setUtility}
          max={50000}
          step={500}
          tone="ok"
        />
      </div>

      {/* Breakdown */}
      <div className="rounded-xl bg-white border-2 border-[#E8B968] overflow-hidden mb-3">
        <BillRow label={`AddisonX ${plan.label} subscription`} subLabel="Paid to us · GST included" value={plan.price} bold />
        <BillRow label={`Meta marketing fees (${marketing.toLocaleString("en-IN")} msgs)`} subLabel="Paid directly to Meta · no markup from us" value={Math.round(metaMarketing)} />
        <BillRow label={`Meta utility fees (${utility.toLocaleString("en-IN")} msgs)`} subLabel="Paid directly to Meta · 85% cheaper than marketing" value={Math.round(metaUtility)} />
        <div className="px-4 py-3 bg-[#0A3D24] text-white flex items-center justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-wider font-extrabold opacity-80">Total monthly cost</p>
            {totalConv > 0 && (
              <p className="text-[10px] opacity-70 font-medium">
                ~₹{avgPerMsg.toFixed(2)} per message · {totalConv.toLocaleString("en-IN")} total conv
              </p>
            )}
          </div>
          <p className="text-3xl font-black tabular-nums">₹{Math.round(total).toLocaleString("en-IN")}</p>
        </div>
      </div>

      {overCap && (
        <div className="mt-3 rounded-xl border-2 border-[#FF6A1F] bg-[#FFEFE0] p-3 flex items-start gap-2.5">
          <Crown className="w-4 h-4 text-[#FF6A1F] flex-shrink-0 mt-0.5" />
          <p className="text-[12px] leading-snug text-[#7A1500]">
            <span className="font-extrabold">{totalConv.toLocaleString("en-IN")} conversations exceeds {plan.label}'s {plan.convCap.toLocaleString("en-IN")} cap.</span> Consider {plan.id === "starter" ? "Growth" : "Scale"} plan for higher allowance.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-3">
        <TrustBadge label="No message markup" desc="Meta charges your account directly" />
        <TrustBadge label="No setup fees" desc="Connect WhatsApp in 15 min" />
        <TrustBadge label="No lock-in" desc="Your WABA, your customers — leave anytime" />
      </div>
    </div>
  );
};

const SliderBlock = ({
  label, subLabel, value, onChange, max, step, tone,
}: { label: string; subLabel: string; value: number; onChange: (n: number) => void; max: number; step: number; tone: "ok" | "warn" }) => {
  const accent = tone === "ok" ? "accent-[#0E8A4B]" : "accent-[#FF6A1F]";
  const badgeColor = tone === "ok" ? "text-[#0E8A4B] bg-[#E6F7EE]" : "text-[#FF6A1F] bg-[#FFEFE0]";
  return (
    <div className="rounded-xl bg-white border-2 border-[#E8B968] p-4">
      <div className="flex items-center justify-between mb-2">
        <div>
          <p className="text-[11.5px] font-extrabold uppercase tracking-wider text-foreground/70">{label}</p>
          <p className="text-[10px] text-foreground/55">{subLabel}</p>
        </div>
        <span className={`text-[14px] font-black tabular-nums px-2 py-0.5 rounded ${badgeColor}`}>
          {value.toLocaleString("en-IN")}
        </span>
      </div>
      <input
        type="range"
        min={0}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className={`w-full ${accent} cursor-pointer`}
      />
      <div className="flex justify-between text-[9.5px] text-foreground/45 font-bold mt-1 tabular-nums">
        <span>0</span>
        <span>{max.toLocaleString("en-IN")}</span>
      </div>
    </div>
  );
};

const BillRow = ({ label, subLabel, value, bold }: { label: string; subLabel: string; value: number; bold?: boolean }) => (
  <div className={`px-4 py-3 flex items-center justify-between border-b border-[#E8B968]/40 last:border-b-0 ${bold ? "bg-[#FFF6E8]" : ""}`}>
    <div className="min-w-0 flex-1">
      <p className={`text-[12.5px] ${bold ? "font-extrabold" : "font-bold"} truncate`}>{label}</p>
      <p className="text-[10px] text-foreground/55">{subLabel}</p>
    </div>
    <p className={`text-[14px] tabular-nums ${bold ? "font-black" : "font-bold"} ml-2`}>
      ₹{value.toLocaleString("en-IN")}
    </p>
  </div>
);

const TrustBadge = ({ label, desc }: { label: string; desc: string }) => (
  <div className="rounded-lg bg-white border border-[#E8B968] px-3 py-2 flex items-start gap-2">
    <Check className="w-3.5 h-3.5 text-[#0E8A4B] flex-shrink-0 mt-0.5" strokeWidth={3} />
    <div className="min-w-0">
      <p className="text-[11.5px] font-extrabold leading-tight">{label}</p>
      <p className="text-[9.5px] text-foreground/55 leading-snug">{desc}</p>
    </div>
  </div>
);

export default function Pricing() {
  return (
    <section className="py-20 lg:py-24 bg-white border-y-2 border-[#E8B968]">
      <div className="max-w-6xl mx-auto px-5 lg:px-8">
        <div className="text-center mb-10">
          <span className="inline-block px-3 py-1 bg-[#FFD23F] text-[#7A4A00] text-[11px] uppercase tracking-[0.2em] font-extrabold rounded-full mb-4">
            ₹ mein pricing · Saaf-saaf
          </span>
          <h2 className="text-3xl lg:text-5xl font-black tracking-tight leading-[1.05] mb-3">
            Simple plans, no surprises
          </h2>
          <p className="text-muted-foreground font-medium">Free start karo · Jab grow ho, upgrade karo · GST invoice har mahine</p>
        </div>

        {/* FREE BANNER — primary lead-gen funnel. No card, no time limit. */}
        <div className="relative rounded-2xl bg-gradient-to-br from-[#0E8A4B] to-[#0A6E3C] text-white p-6 lg:p-8 mb-5 shadow-[0_6px_0_0_#073D22] overflow-hidden">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-[#FFD23F]/20 rounded-full blur-2xl" />
          <div className="relative flex flex-col lg:flex-row lg:items-center gap-6">
            <div className="flex-1 min-w-0">
              <span className="inline-block px-2.5 py-0.5 bg-[#FFD23F] text-[#7A4A00] text-[10px] uppercase tracking-[0.18em] font-extrabold rounded-full mb-2">
                Free forever · No card needed
              </span>
              <h3 className="text-2xl lg:text-3xl font-black tracking-tight leading-tight mb-1">
                Free start karo — abhi
              </h3>
              <p className="text-[13.5px] lg:text-sm text-white/90 font-medium leading-snug">
                100 conversations/mo · 20 AI actions · CRM + inbox + templates. UPI live mode upgrade pe milta hai.
              </p>
            </div>
            <Link
              to="/auth"
              className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-[#FFD23F] text-[#7A4A00] font-extrabold text-sm hover:bg-white transition shadow-[0_4px_0_0_#B8911A] hover:shadow-[0_2px_0_0_#B8911A] hover:translate-y-[2px] whitespace-nowrap flex-shrink-0"
            >
              Free signup
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* FIRST-100 FOUNDERS — urgency band. Remove after 100 signups. */}
        <div className="rounded-xl border-2 border-dashed border-[#FF6A1F] bg-[#FFEFE0] px-4 py-2.5 mb-6 flex items-center justify-center gap-2 text-center">
          <Crown className="w-3.5 h-3.5 text-[#FF6A1F] flex-shrink-0" />
          <p className="text-[12px] lg:text-[12.5px] font-extrabold text-[#7A1500]">
            First 100 founders only — <span className="text-[#FF6A1F]">lifetime ₹499 price lock on Starter</span>. Aage ₹999 hoga.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-5 mt-2">
          {PLANS.map((p) => (
            <div
              key={p.name}
              className={`relative p-7 rounded-2xl bg-white transition-all border-2 ${
                p.featured
                  ? "border-[#0E8A4B] shadow-[0_8px_0_0_#0A6E3C] lg:scale-105 lg:-rotate-[0.5deg]"
                  : "border-[#E8B968] shadow-[0_4px_0_0_#E8B968] hover:-translate-y-1"
              }`}
            >
              {p.featured && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-[#FF6A1F] text-white text-[10px] font-extrabold uppercase tracking-wider rounded-full shadow-md flex items-center gap-1">
                  <Crown className="w-3 h-3" /> Most popular
                </span>
              )}
              <h3 className="font-extrabold text-xl tracking-tight">{p.name}</h3>
              <p className="text-xs text-muted-foreground mt-1 font-medium">{p.tag}</p>
              <div className="mt-6 flex items-baseline gap-1">
                <span className="text-5xl font-black tracking-tight text-foreground">{p.price}</span>
                <span className="text-sm text-muted-foreground font-semibold">/mo</span>
              </div>
              <Link
                to="/auth"
                className={`mt-5 w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-extrabold text-sm transition ${
                  p.featured
                    ? "bg-[#FF6A1F] text-white hover:bg-[#E85C12] shadow-[0_4px_0_0_#B8420A] hover:shadow-[0_2px_0_0_#B8420A] hover:translate-y-[2px]"
                    : "bg-[#FFF1D6] text-foreground hover:bg-[#FFE8C7]"
                }`}
              >
                {p.cta}
              </Link>
              <ul className="mt-6 space-y-2.5">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-foreground/80 font-medium">
                    <div className="w-4 h-4 rounded-full bg-[#0E8A4B] flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="w-2.5 h-2.5 text-white" strokeWidth={4} />
                    </div>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* ENTERPRISE STRIP — kept lean so it doesn't compete with Growth/Scale */}
        <div className="mt-5 rounded-2xl border-2 border-[#0A3D24] bg-[#0A3D24] text-white p-5 lg:p-6 flex flex-col lg:flex-row lg:items-center gap-4 shadow-[0_4px_0_0_#072917]">
          <div className="flex-1 min-w-0">
            <span className="inline-block px-2.5 py-0.5 bg-[#FFD23F] text-[#7A4A00] text-[10px] uppercase tracking-[0.18em] font-extrabold rounded-full mb-2">
              Enterprise
            </span>
            <p className="text-lg lg:text-xl font-black tracking-tight leading-tight">
              Listed companies, agencies with 10+ workspaces, SSO + DPDP DPO assistance
            </p>
            <p className="text-[12.5px] text-white/80 font-medium mt-1">
              Unlimited everything · Dedicated CSM · Custom integrations (Tally, ERP) · SLA 99.9% · From ₹19,999/mo
            </p>
          </div>
          <a
            href="https://wa.me/916206153116"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#FFD23F] text-[#7A4A00] font-extrabold text-sm hover:bg-white transition shadow-[0_3px_0_0_#B8911A] hover:shadow-[0_1px_0_0_#B8911A] hover:translate-y-[2px] whitespace-nowrap flex-shrink-0"
          >
            <MessageCircle className="w-4 h-4" fill="currentColor" strokeWidth={0} />
            Contact sales
          </a>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-8 font-medium">
          Annual: 12 months pay karo, 14 mahine ke liye milega · WhatsApp BSP fees at cost · GST invoice · No setup fees
        </p>

        {/* Honest cost calculator — shows software + Meta fees side-by-side
            so prospects can budget exactly. No "you save vs competitor"
            claims — just transparent math. */}
        <CostCalculator />
      </div>
    </section>
  );
}
