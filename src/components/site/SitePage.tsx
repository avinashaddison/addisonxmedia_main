/**
 * Website builder shell.
 *
 * Routes:
 *   /app/site                    → overview ("My Website")
 *   /app/site/pages              → pages manager
 *   /app/site/theme              → theme editor
 *   /app/site/sections           → section library
 *   /app/site/products           → products on site (uses existing catalog)
 *   /app/site/orders             → orders (e-commerce)
 *   /app/site/customers          → buyers
 *   /app/site/payments           → payments + payouts
 *   /app/site/shipping           → shipping zones / partners
 *   /app/site/coupons            → discount codes
 *   /app/site/leads              → lead form submissions
 *   /app/site/seo                → meta tags, sitemap
 *   /app/site/analytics          → site analytics
 *   /app/site/domain             → subdomain + custom domain
 *   /app/site/settings           → site settings
 *
 * The actual builder is being built in phases — this file currently renders a
 * shell with friendly "coming soon" placeholders. The sidebar menu + routing
 * are live so the team can see the shape of the product.
 */

import { useMemo } from "react";
import {
  Globe, FileText, Palette, LayoutGrid, Package, ShoppingCart, Users,
  CreditCard, Truck, Ticket, ClipboardList, Search, BarChart3, Settings,
  Rocket, ExternalLink, ArrowRight, CheckCircle2, Sparkles, Wand2,
} from "lucide-react";

type Props = { subPath: string };

const PAGE_CONFIG: Record<string, { icon: any; title: string; subtitle: string; accent: string; bullets: string[] }> = {
  overview: {
    icon: Globe,
    title: "My Website",
    subtitle: "Your business homepage, ready to launch in minutes.",
    accent: "#0E8A4B",
    bullets: [
      "Pick from 4 industry templates (Kirana, Salon, Restaurant, Services)",
      "Auto-fills from your WhatsApp Business Profile + UPI + product catalog",
      "Live at addisonxmedia.site/<your-slug> instantly — custom domain later",
    ],
  },
  pages: {
    icon: FileText,
    title: "Pages",
    subtitle: "Add, reorder and edit the pages of your site.",
    accent: "#3C50E0",
    bullets: ["Home, About, Products, Contact ship by default", "Add custom pages with the section library", "Each page has its own SEO settings"],
  },
  theme: {
    icon: Palette,
    title: "Theme",
    subtitle: "Brand colors, fonts and logo — applied everywhere instantly.",
    accent: "#D4308E",
    bullets: ["Auto-picked from your AddisonX brand colors", "Override per-page if needed", "Light + dark mode handled for you"],
  },
  sections: {
    icon: LayoutGrid,
    title: "Sections",
    subtitle: "The building blocks of your site. Add, reorder, customize.",
    accent: "#FF6A1F",
    bullets: ["Hero, Gallery, Testimonials, FAQ, Hours, Map, Contact", "Each section is mobile-first by default", "Drop into any page in one click"],
  },
  products: {
    icon: Package,
    title: "Products & Inventory",
    subtitle: "Same catalog that powers your WhatsApp Send Product feature.",
    accent: "#0E8A4B",
    bullets: ["Display on storefront with photos + prices", "Track stock (low-stock alerts via WhatsApp)", "Variants: size, color, weight"],
  },
  orders: {
    icon: ShoppingCart,
    title: "Orders",
    subtitle: "New / processing / shipped / delivered / returns — all here.",
    accent: "#FF6A1F",
    bullets: ["Auto WhatsApp confirmation on new order", "Shipping label printing", "Order status updates trigger automated follow-ups"],
  },
  customers: {
    icon: Users,
    title: "Customers",
    subtitle: "Buyers (different from leads) with repeat-order analytics.",
    accent: "#3C50E0",
    bullets: ["Lifetime value, repeat rate, last order", "Auto-segment: VIP / Repeat / At-risk", "WhatsApp re-engage campaigns built-in"],
  },
  payments: {
    icon: CreditCard,
    title: "Payments",
    subtitle: "UPI + Cashfree + manual COD — all in one ledger.",
    accent: "#0E8A4B",
    bullets: ["Auto-reconcile UPI payments", "Cashfree for card / wallet / netbanking", "Payouts to your bank in T+1"],
  },
  shipping: {
    icon: Truck,
    title: "Shipping",
    subtitle: "Connect Delhivery / Shiprocket or do self-pickup zones.",
    accent: "#B8651A",
    bullets: ["Pincode-based rate calculator", "Auto-generate AWB + label on order", "Track-link auto-sent on WhatsApp"],
  },
  coupons: {
    icon: Ticket,
    title: "Coupons",
    subtitle: "Discount codes, free-shipping promos, first-time-buyer offers.",
    accent: "#D4308E",
    bullets: ["Code-based + auto-applied", "Min cart value + max usage caps", "Auto-share via WhatsApp campaigns"],
  },
  leads: {
    icon: ClipboardList,
    title: "Lead Forms",
    subtitle: "Capture leads from your site — straight into the CRM.",
    accent: "#3C50E0",
    bullets: ["Drag-drop form builder", "Auto-WhatsApp welcome on submission", "Push into Contacts + auto-assign to agents"],
  },
  seo: {
    icon: Search,
    title: "SEO",
    subtitle: "Get found on Google — meta tags, sitemap, schema, all auto.",
    accent: "#FF6A1F",
    bullets: ["AI-generated meta titles + descriptions per page", "schema.org markup for local business / products", "Google Search Console verification in one click"],
  },
  analytics: {
    icon: BarChart3,
    title: "Site Analytics",
    subtitle: "Pageviews, conversions, top sources — all real-time.",
    accent: "#0E8A4B",
    bullets: ["Top pages + top sources (Google, Meta ads, WhatsApp)", "Conversion funnel: view → lead → sale", "Plugs into existing Meta CAPI for ad attribution"],
  },
  domain: {
    icon: Globe,
    title: "Domain",
    subtitle: "Free subdomain instantly. Connect your own domain when ready.",
    accent: "#B8651A",
    bullets: ["<slug>.addisonxmedia.site — live in seconds", "Custom domain via CNAME + auto-SSL", "Multiple domains supported on Pro+"],
  },
  settings: {
    icon: Settings,
    title: "Site Settings",
    subtitle: "Business info, tax, returns policy, legal pages.",
    accent: "#0A3D24",
    bullets: ["GST + tax configuration", "Return + refund policy templates", "Privacy + Terms auto-generated for India + EU"],
  },
};

export const SitePage = ({ subPath }: Props) => {
  const key = (subPath || "overview").toLowerCase();
  const cfg = useMemo(() => PAGE_CONFIG[key] ?? PAGE_CONFIG.overview, [key]);
  const Icon = cfg.icon;

  return (
    <div className="flex-1 overflow-y-auto bg-[#FFF6E8]">
      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-start gap-4 mb-8">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg flex-shrink-0"
            style={{ backgroundColor: cfg.accent }}
          >
            <Icon className="w-7 h-7" strokeWidth={2.5} />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-[24px] font-black leading-tight">{cfg.title}</h1>
            <p className="text-[14px] text-foreground/70 font-medium mt-1">{cfg.subtitle}</p>
          </div>
          {key === "overview" && (
            <button
              className="hidden sm:inline-flex items-center gap-2 h-11 px-5 rounded-xl bg-[#0E8A4B] text-white font-extrabold text-[13px] shadow-[0_4px_0_0_#073D22] hover:bg-[#0A6E3C] active:translate-y-0.5 active:shadow-[0_2px_0_0_#073D22] transition flex-shrink-0"
              disabled
              title="Coming soon"
            >
              <Rocket className="w-4 h-4" strokeWidth={2.5} />
              Launch website
            </button>
          )}
        </div>

        {/* Banner — phase indicator */}
        <div className="mb-6 p-4 rounded-2xl border-2 border-[#FFD23F]/70 bg-gradient-to-br from-[#FFF6E8] to-[#FFE8B8] flex items-start gap-3 shadow-[0_3px_0_0_rgba(232,185,104,0.4)]">
          <Sparkles className="w-5 h-5 text-[#B8651A] flex-shrink-0 mt-0.5" strokeWidth={2.5} />
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-extrabold text-[#3D1A00]">Phase 1 — Foundation in progress</p>
            <p className="text-[11.5px] text-foreground/75 mt-0.5 leading-relaxed">
              The website builder is being built in 4 phases. This menu shows the full shape — actual editor + renderer
              shipping over the next 2–3 weeks. Reach out on WhatsApp if you want early access.
            </p>
          </div>
        </div>

        {/* Feature bullets */}
        <div className="bg-white rounded-2xl border-2 border-[#E8B968] shadow-[0_3px_0_0_#E8B968] p-6 mb-6">
          <h2 className="text-[13px] font-extrabold uppercase tracking-[0.15em] text-foreground/55 mb-4">What this will do</h2>
          <ul className="space-y-3">
            {cfg.bullets.map((b) => (
              <li key={b} className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: cfg.accent }} strokeWidth={2.5} />
                <span className="text-[14px] font-medium leading-relaxed">{b}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Overview-only: quick links to the other sections */}
        {key === "overview" && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[
              { id: "pages", label: "Edit pages", icon: FileText },
              { id: "theme", label: "Theme", icon: Palette },
              { id: "products", label: "Products", icon: Package },
              { id: "leads", label: "Lead forms", icon: ClipboardList },
              { id: "domain", label: "Domain", icon: Globe },
              { id: "analytics", label: "Analytics", icon: BarChart3 },
            ].map((q) => (
              <a
                key={q.id}
                href={`/app/site/${q.id}`}
                className="p-3 rounded-xl bg-white border-2 border-[#E8B968]/70 hover:border-[#0E8A4B] hover:shadow-[0_3px_0_0_#0A6E3C] hover:-translate-y-0.5 transition flex items-center gap-2.5 group"
              >
                <q.icon className="w-4 h-4 text-[#0E8A4B] flex-shrink-0" strokeWidth={2.5} />
                <span className="flex-1 text-[12.5px] font-extrabold text-foreground truncate">{q.label}</span>
                <ArrowRight className="w-3.5 h-3.5 text-foreground/35 group-hover:text-[#0E8A4B] group-hover:translate-x-0.5 transition" />
              </a>
            ))}
          </div>
        )}

        {/* Footer hint */}
        <div className="mt-8 text-center">
          <a
            href="https://wa.me/919142647797"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-[12px] text-foreground/55 hover:text-foreground/85 font-semibold transition"
          >
            <Wand2 className="w-3.5 h-3.5" />
            Want early access? Ping us on WhatsApp
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
};
