import { Link } from "react-router-dom";
import { useEffect } from "react";
import { MessageCircle, Scale, Mail, MapPin, Crown, Shield } from "lucide-react";
import { BrandLockup } from "@/components/brand/AddisonLogo";

const LAST_UPDATED = "18 May 2026";
const EFFECTIVE = "18 May 2026";

const usePageMeta = (title: string, description: string) => {
  useEffect(() => {
    const prevTitle = document.title;
    document.title = title;
    const desc = document.querySelector('meta[name="description"]');
    const prevDesc = desc?.getAttribute("content") ?? null;
    desc?.setAttribute("content", description);
    const root = document.documentElement;
    const wasDark = root.classList.contains("dark");
    root.classList.remove("dark");
    return () => {
      document.title = prevTitle;
      if (prevDesc) desc?.setAttribute("content", prevDesc);
      if (wasDark) root.classList.add("dark");
    };
  }, [title, description]);
};

const TOC = [
  { id: "acceptance", label: "Acceptance" },
  { id: "eligibility", label: "Eligibility" },
  { id: "account", label: "Your account" },
  { id: "services", label: "Services scope" },
  { id: "acceptable-use", label: "Acceptable use" },
  { id: "whatsapp-compliance", label: "WhatsApp & Meta compliance" },
  { id: "customer-data", label: "Customer data & ownership" },
  { id: "subscriptions", label: "Subscriptions & billing" },
  { id: "trial", label: "Free trial" },
  { id: "cancellation", label: "Cancellation & refunds" },
  { id: "suspension", label: "Suspension & termination" },
  { id: "ip", label: "Intellectual property" },
  { id: "confidentiality", label: "Confidentiality" },
  { id: "disclaimers", label: "Disclaimers" },
  { id: "liability", label: "Limitation of liability" },
  { id: "indemnity", label: "Indemnity" },
  { id: "force-majeure", label: "Force majeure" },
  { id: "governing-law", label: "Governing law & jurisdiction" },
  { id: "disputes", label: "Dispute resolution" },
  { id: "modifications", label: "Modifications" },
  { id: "contact", label: "Contact" },
];

const Terms = () => {
  usePageMeta(
    "Terms of Service — AddisonX | WhatsApp Business CRM India",
    "AddisonX Terms of Service for India. Governed by Indian law and jurisdiction of courts in Ranchi, Jharkhand. Compliant with Meta WhatsApp Business Platform terms and the DPDP Act 2023."
  );

  return (
    <div className="min-h-screen w-full bg-[#FFF6E8] text-foreground">
      {/* ============ TOP NAV ============ */}
      <header className="h-[80px] flex items-center justify-between px-5 sm:px-8 border-b-2 border-[#E8B968] bg-white sticky top-0 z-30 overflow-visible">
        <Link to="/" className="flex items-center pt-1" aria-label="Addison X Media home">
          <BrandLockup size={25} />
        </Link>
        <div className="hidden sm:flex items-center gap-5 text-[12px] font-semibold">
          <Link to="/privacy" className="text-foreground/70 hover:text-[#FF6A1F] transition">Privacy</Link>
          <Link to="/auth" className="text-foreground/70 hover:text-[#FF6A1F] transition">Sign in</Link>
          <Link
            to="/auth"
            className="bg-[#FF6A1F] text-white px-4 py-2 rounded-xl font-extrabold shadow-[0_3px_0_0_#B8420A] hover:shadow-[0_1px_0_0_#B8420A] hover:translate-y-[2px] transition"
          >
            Free trial
          </Link>
        </div>
      </header>

      {/* ============ HERO ============ */}
      <section className="bg-gradient-to-br from-[#0A3D24] via-[#0D4E2E] to-[#0A3D24] text-white relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
            backgroundSize: "20px 20px",
          }}
        />
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-[#FFD23F]/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-[#FF6A1F]/20 rounded-full blur-3xl" />

        <div className="max-w-5xl mx-auto px-5 sm:px-8 py-12 lg:py-16 relative">
          <div className="flex items-center gap-2 flex-wrap mb-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#FFD23F] text-[#7A4A00] text-[11px] font-extrabold">
              <Crown className="w-3.5 h-3.5" />
              Meta Business Partner
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/15 backdrop-blur text-white text-[11px] font-extrabold border border-white/20">
              <Shield className="w-3.5 h-3.5" />
              Indian jurisdiction
            </span>
          </div>
          <h1 className="text-[2.5rem] sm:text-5xl font-black tracking-tight leading-[1.02]">
            Terms of <span className="text-[#FFD23F]">Service</span>
          </h1>
          <p className="mt-4 text-base lg:text-lg text-white/85 leading-relaxed max-w-2xl font-medium">
            Plain-English (with thoda Hinglish) — kya aapko milta hai, kya aap karte ho, kya hum karte ho.
            Governed by Indian law and the courts at Ranchi, Jharkhand.
          </p>
          <div className="mt-6 flex items-center gap-4 text-[12px] text-white/70 font-medium">
            <span>Last updated: <span className="text-[#FFD23F] font-extrabold">{LAST_UPDATED}</span></span>
            <span>·</span>
            <span>Effective: <span className="text-[#FFD23F] font-extrabold">{EFFECTIVE}</span></span>
          </div>
        </div>
      </section>

      {/* ============ BODY ============ */}
      <main className="max-w-5xl mx-auto px-5 sm:px-8 py-10 sm:py-14 grid lg:grid-cols-[220px_1fr] gap-10">
        <aside className="hidden lg:block">
          <div className="sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#B8651A] mb-3">
              On this page
            </p>
            <ul className="space-y-1">
              {TOC.map((t, i) => (
                <li key={t.id}>
                  <a
                    href={`#${t.id}`}
                    className="block text-[12px] font-semibold text-foreground/70 hover:text-[#FF6A1F] py-1.5 transition"
                  >
                    {String(i + 1).padStart(2, "0")} · {t.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </aside>

        <article className="prose-content text-[14px] leading-[1.75] text-foreground/85 space-y-10">
          <Section id="acceptance" n={1} title="Acceptance of these Terms">
            <p>
              These Terms of Service ("Terms") form a binding agreement between you ("Customer", "you")
              and <strong>Addison X Media Pvt. Ltd.</strong>, a private limited company incorporated under
              the Companies Act, 2013 of India, with its registered office at Itki Road, Piska More,
              1st Floor, Vaishwakarma Complex, Hehal, Ranchi 834005, Jharkhand, India · GST 20IARPK8159R1ZN
              ("Addison X Media", "AddisonX", "we", "us", "our").
            </p>
            <p className="mt-3">
              By creating an account, clicking "Sign up", "Start free trial", or by accessing or using
              the Service, you confirm that you have read, understood and agree to be bound by these
              Terms and our <Link to="/privacy" className="text-[#FF6A1F] font-bold underline underline-offset-2">Privacy Policy</Link>.
              If you do not agree, do not use the Service.
            </p>
          </Section>

          <Section id="eligibility" n={2} title="Eligibility">
            <ul className="list-disc pl-5 space-y-1.5">
              <li>You must be at least <strong>18 years of age</strong> and capable of entering a legally binding contract under Indian law</li>
              <li>If you are using AddisonX on behalf of a business, you represent that you are authorised to bind that business</li>
              <li>You must not be barred from using the Service under applicable law (including OFAC, EU or Indian sanctions lists)</li>
              <li>You must comply with Meta's WhatsApp Business Platform eligibility (legitimate business, valid GST/PAN if applicable)</li>
            </ul>
          </Section>

          <Section id="account" n={3} title="Your account">
            <ul className="list-disc pl-5 space-y-1.5">
              <li>You are responsible for all activity that occurs under your account</li>
              <li>Keep your password and access tokens confidential — share them with no one</li>
              <li>Notify us at <a href="mailto:Contact@addisonxmedia.com" className="text-[#FF6A1F] font-bold underline">Contact@addisonxmedia.com</a> within 24 hours of any unauthorised access</li>
              <li>One account per legal entity; team members must be invited under your workspace</li>
            </ul>
          </Section>

          <Section id="services" n={4} title="What the Service includes">
            <p>AddisonX provides a SaaS platform for managing customer messaging over WhatsApp. The Service includes:</p>
            <ul className="list-disc pl-5 space-y-1.5 mt-2">
              <li>Shared team inbox for the WhatsApp Business API (via Meta)</li>
              <li>AI-assisted reply suggestions and automated responses (Addison AI)</li>
              <li>Broadcast/campaign tooling using Meta-approved message templates</li>
              <li>Lightweight CRM: contacts, deals, follow-up tasks, analytics</li>
              <li>Payment-link creation via Razorpay, Cashfree and UPI</li>
              <li>Optional Click-to-WhatsApp and Google Ads management (Ads Marketing)</li>
              <li>GST-compliant invoicing</li>
            </ul>
            <p className="mt-3">
              We may add, modify or discontinue features. Material reductions in functionality will be
              announced at least <strong>30 days in advance</strong>.
            </p>
          </Section>

          <Section id="acceptable-use" n={5} title="Acceptable use">
            <p>You must not, and must not permit anyone to:</p>
            <ul className="list-disc pl-5 space-y-1.5 mt-2">
              <li>Use the Service to send spam, unsolicited promotional messages, or messages to people who have not opted in</li>
              <li>Send any content that is illegal, hateful, harassing, defamatory, obscene, or that violates third-party rights</li>
              <li>Send phishing, fraud, scam, or impersonation messages</li>
              <li>Use the Service for political campaigns, gambling, adult content, or sale of regulated products (alcohol, tobacco, weapons, drugs, financial schemes) except as expressly permitted by Meta</li>
              <li>Reverse engineer, decompile, scrape, or attempt to extract source code from the Service</li>
              <li>Circumvent rate limits, security measures or usage caps</li>
              <li>Use the Service to build a competing product</li>
              <li>Upload viruses, malware or harmful code</li>
              <li>Use bots or automation to abuse free trials</li>
            </ul>
            <Callout color="warning">
              Violations may result in immediate suspension and termination of your account with no refund.
              Serious violations will be reported to Meta and to applicable Indian authorities.
            </Callout>
          </Section>

          <Section id="whatsapp-compliance" n={6} title="WhatsApp Business Platform & Meta compliance">
            <p>The Service uses the official Meta WhatsApp Business Platform. You acknowledge and agree that:</p>
            <ul className="list-disc pl-5 space-y-1.5 mt-2">
              <li>You are independently bound by Meta's <a href="https://www.whatsapp.com/legal/business-terms" target="_blank" rel="noopener noreferrer" className="text-[#FF6A1F] font-bold underline">WhatsApp Business Terms of Service</a>, <a href="https://www.whatsapp.com/legal/commerce-policy" target="_blank" rel="noopener noreferrer" className="text-[#FF6A1F] font-bold underline">Commerce Policy</a>, and <a href="https://www.whatsapp.com/legal/business-policy" target="_blank" rel="noopener noreferrer" className="text-[#FF6A1F] font-bold underline">Business Policy</a></li>
              <li>You will only message recipients who have provided <strong>verifiable opt-in</strong> through a legitimate business interaction</li>
              <li>You will respect WhatsApp's 24-hour customer service window — outside that window you may only send approved template messages</li>
              <li>You will not use the Service in any way that could cause Meta to ban or rate-limit your WhatsApp Business Account</li>
              <li>WhatsApp messaging fees (conversation fees) charged by Meta are passed through to you at cost — they are billed separately from AddisonX subscription fees</li>
              <li>Meta may suspend, throttle or terminate access at any time outside our control; AddisonX is not liable for Meta-side outages or policy enforcement</li>
            </ul>
          </Section>

          <Section id="customer-data" n={7} title="Customer data & ownership">
            <ul className="list-disc pl-5 space-y-1.5">
              <li><strong>You own your data.</strong> Your contacts, messages, templates, and configurations are yours.</li>
              <li>You grant AddisonX a limited, non-exclusive, royalty-free licence to host, process, transmit and display your data <strong>solely</strong> to provide the Service.</li>
              <li>You can export your data anytime as CSV or JSON from Settings → Export, or by writing to <a href="mailto:Contact@addisonxmedia.com" className="text-[#FF6A1F] font-bold underline">Contact@addisonxmedia.com</a>.</li>
              <li>We do not use your messaging data to train shared AI models. Workspace-specific AI training is opt-in and confined to your workspace.</li>
              <li>You represent that you have all necessary rights, consents and authorisations from your contacts to send them WhatsApp messages.</li>
            </ul>
          </Section>

          <Section id="subscriptions" n={8} title="Subscriptions, billing & GST">
            <ul className="list-disc pl-5 space-y-1.5">
              <li>Plans are billed monthly or annually in advance via Razorpay (cards, UPI, NetBanking, wallets) or Cashfree</li>
              <li>All prices are in Indian Rupees (₹) and <strong>exclusive of GST</strong>. GST is added at the rate prevailing at the time of invoicing (currently 18%)</li>
              <li>We issue a GST-compliant invoice on the 1st of each billing cycle, downloadable from Settings → Billing</li>
              <li>Failed payments: we will retry payment 3 times over 7 days, then suspend the workspace until the balance is cleared</li>
              <li>WhatsApp conversation fees billed by Meta are passed through at cost with no markup</li>
            </ul>
          </Section>

          <Section id="trial" n={9} title="Free trial">
            <p>
              We offer a <strong>7-day free trial</strong> on our Growth plan, no credit card required. At the
              end of the trial, your workspace switches to read-only until you choose a plan. Trial
              benefits cannot be combined with other offers. Abuse of trials (multiple workspaces by
              the same legal entity to extend the trial) is prohibited.
            </p>
          </Section>

          <Section id="cancellation" n={10} title="Cancellation & refunds">
            <ul className="list-disc pl-5 space-y-1.5">
              <li>You may cancel anytime from Settings → Billing. Cancellation takes effect at the end of the current billing cycle</li>
              <li><strong>Monthly plans:</strong> no refunds for partial months</li>
              <li><strong>Annual plans:</strong> pro-rata refund for unused months minus a ₹2,000 service fee, provided no terms violation has occurred</li>
              <li><strong>WhatsApp conversation fees</strong> already incurred with Meta are non-refundable</li>
              <li>Workspace data retained for 30 days after cancellation, then permanently deleted</li>
            </ul>
          </Section>

          <Section id="suspension" n={11} title="Suspension & termination">
            <p>We may suspend or terminate your account immediately, with or without notice, if:</p>
            <ul className="list-disc pl-5 space-y-1.5 mt-2">
              <li>You materially breach these Terms, our Privacy Policy, or Meta's policies</li>
              <li>You fail to pay invoices on time and the balance remains unpaid for 14 days</li>
              <li>Required by law or court order</li>
              <li>Your use poses a security risk to other customers or to the Service</li>
              <li>Meta terminates or restricts your WhatsApp Business Account</li>
            </ul>
          </Section>

          <Section id="ip" n={12} title="Intellectual property">
            <p>
              AddisonX, the Addison AI agent, the AddisonX logo and all related software, designs, text,
              graphics, templates and trade dress are the property of AddisonX Media Pvt. Ltd. or its
              licensors and protected by Indian and international IP law. Nothing in these Terms transfers
              any IP to you except a non-transferable, non-exclusive licence to use the Service.
            </p>
            <p className="mt-3">
              You may not copy, reproduce, distribute, publicly display, modify or create derivative works
              of the Service except as expressly authorised in writing.
            </p>
          </Section>

          <Section id="confidentiality" n={13} title="Confidentiality">
            <p>
              Each party will protect the Confidential Information of the other with the same degree of
              care it uses for its own confidential information, and no less than reasonable care.
              Customer data is treated as your Confidential Information. Aggregated, de-identified
              metrics may be used by AddisonX for benchmarking and product improvement.
            </p>
          </Section>

          <Section id="disclaimers" n={14} title="Disclaimers">
            <p className="uppercase text-[11px] font-extrabold tracking-wider text-[#B8230C]">
              The Service is provided "as is" and "as available".
            </p>
            <p className="mt-2">
              To the maximum extent permitted by law, AddisonX disclaims all warranties, express or
              implied, including merchantability, fitness for a particular purpose and non-infringement.
              We do not warrant that the Service will be uninterrupted, error-free, secure, or that
              messages will always be delivered (delivery depends on Meta, telecom networks and recipient
              device state, which are outside our control).
            </p>
          </Section>

          <Section id="liability" n={15} title="Limitation of liability">
            <p className="uppercase text-[11px] font-extrabold tracking-wider text-[#B8230C]">
              Important — read carefully.
            </p>
            <p className="mt-2">To the maximum extent permitted by Indian law:</p>
            <ul className="list-disc pl-5 space-y-1.5 mt-2">
              <li>Neither party will be liable for indirect, incidental, special, consequential or punitive damages, or for lost profits, revenue, goodwill or data</li>
              <li>AddisonX's total aggregate liability under or in connection with these Terms shall not exceed the amount you paid AddisonX in the <strong>twelve (12) months immediately preceding</strong> the event giving rise to the claim</li>
              <li>The above limits apply regardless of the form of action (contract, tort, statute or otherwise)</li>
            </ul>
          </Section>

          <Section id="indemnity" n={16} title="Indemnity">
            <p>
              You agree to defend, indemnify and hold harmless AddisonX, its affiliates, officers,
              directors, employees and agents from any claims, damages, losses, liabilities, costs
              and expenses (including reasonable lawyers' fees) arising out of or relating to:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 mt-2">
              <li>Your messages or content sent through the Service</li>
              <li>Your breach of these Terms, Meta's policies, or applicable law</li>
              <li>Your infringement of any third-party rights</li>
              <li>Disputes between you and your customers</li>
            </ul>
          </Section>

          <Section id="force-majeure" n={17} title="Force majeure">
            <p>
              Neither party will be liable for delays or failures caused by events beyond reasonable
              control, including acts of God, natural disasters, war, terrorism, riots, government
              action, internet/telecom outages, third-party service outages (including Meta, AWS,
              Razorpay), pandemics, strikes, or labour disputes.
            </p>
          </Section>

          <Section id="governing-law" n={18} title="Governing law & jurisdiction">
            <p>
              These Terms are governed by the laws of India, without regard to conflicts-of-law principles.
              Subject to the dispute-resolution clause below, the courts at <strong>Ranchi, Jharkhand</strong> shall
              have exclusive jurisdiction over any dispute, claim or controversy arising out of or
              relating to these Terms.
            </p>
          </Section>

          <Section id="disputes" n={19} title="Dispute resolution">
            <ol className="list-decimal pl-5 space-y-1.5">
              <li><strong>Good faith negotiation</strong> — both parties will first attempt to resolve any dispute through good-faith negotiation for 30 days</li>
              <li><strong>Mediation</strong> — if unresolved, the parties will refer the dispute to mediation under the Mediation Act, 2023</li>
              <li><strong>Arbitration</strong> — if mediation fails, the dispute will be referred to arbitration under the Arbitration and Conciliation Act, 1996, by a sole arbitrator appointed mutually. The seat and venue of arbitration shall be <strong>Ranchi, Jharkhand</strong>. Proceedings shall be in English.</li>
            </ol>
          </Section>

          <Section id="modifications" n={20} title="Modifications to these Terms">
            <p>
              We may update these Terms from time to time. Material changes will be notified at least
              <strong> 30 days in advance</strong> by email and via an in-app banner. Continued use of the Service
              after the effective date of changes constitutes acceptance. If you do not agree, you may
              cancel and request a pro-rata refund as per Section 10.
            </p>
          </Section>

          <Section id="contact" n={21} title="Contact us">
            <ContactCard
              role="Legal & Contracts · GST 20IARPK8159R1ZN"
              address="Addison X Media Pvt. Ltd., Itki Road, Piska More, 1st Floor, Vaishwakarma Complex, Hehal, Ranchi 834005, Jharkhand, India"
              email="Contact@addisonxmedia.com"
              phone="+91-9709707311"
            />
          </Section>

          {/* TL;DR */}
          <div className="mt-12 p-5 rounded-2xl bg-[#FFF1D6] border-2 border-[#E8B968] shadow-[0_3px_0_0_#E8B968]">
            <p className="text-[12px] uppercase tracking-[0.15em] text-[#B8651A] font-extrabold mb-2">TL;DR</p>
            <p className="text-[13px] font-semibold leading-relaxed">
              Don't spam, follow Meta's rules, pay your bills, and we'll keep the lights on. Indian law
              applies, Ranchi courts have jurisdiction. Cancel anytime. Questions? Email{" "}
              <a href="mailto:Contact@addisonxmedia.com" className="text-[#FF6A1F] font-extrabold underline">Contact@addisonxmedia.com</a>.
            </p>
          </div>

          <p className="text-[11px] text-foreground/50 font-medium pt-4 border-t border-[#E8B968]/40">
            © {new Date().getFullYear()} Addison X Media Pvt. Ltd. · Ranchi, Jharkhand · India · GST 20IARPK8159R1ZN
          </p>
        </article>
      </main>
    </div>
  );
};

/* ============ helpers ============ */

const Section = ({ id, n, title, children }: { id: string; n: number; title: string; children: React.ReactNode }) => (
  <section id={id} className="scroll-mt-24">
    <h2 className="text-[20px] font-black tracking-tight flex items-baseline gap-2.5 mb-3">
      <span className="text-[#FF6A1F] text-base font-black tabular-nums">{String(n).padStart(2, "0")}</span>
      {title}
    </h2>
    <div className="space-y-1">{children}</div>
  </section>
);

const Callout = ({ color, children }: { color: "primary" | "warning"; children: React.ReactNode }) => {
  const styles = color === "primary"
    ? { border: "border-[#0E8A4B]", bg: "bg-[#E6F7EE]", text: "text-[#0A6E3C]" }
    : { border: "border-[#FFD23F]", bg: "bg-[#FFF8DD]", text: "text-[#7A4A00]" };
  return (
    <div className={`mt-4 p-4 rounded-2xl border-2 ${styles.border} ${styles.bg}`}>
      <p className={`text-[13px] font-extrabold ${styles.text}`}>{children}</p>
    </div>
  );
};

const ContactCard = ({ role, address, email, phone }: {
  role: string; address: string; email: string; phone: string;
}) => (
  <div className="mt-4 p-5 rounded-2xl bg-white border-2 border-[#0E8A4B] shadow-[0_4px_0_0_#0A6E3C]">
    <div className="flex items-center gap-3 mb-3">
      <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#0E8A4B] to-[#16C172] text-white flex items-center justify-center shadow-md">
        <Scale className="w-5 h-5" strokeWidth={2.5} />
      </div>
      <div>
        <p className="text-[14px] font-black">AddisonX Media Pvt. Ltd.</p>
        <p className="text-[11px] uppercase tracking-wider text-[#0E8A4B] font-extrabold">{role}</p>
      </div>
    </div>
    <div className="space-y-2 text-[13px] font-medium">
      <p className="flex items-start gap-2">
        <MapPin className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-[#B8651A]" />
        {address}
      </p>
      <p className="flex items-center gap-2">
        <Mail className="w-3.5 h-3.5 flex-shrink-0 text-[#B8651A]" />
        <a href={`mailto:${email}`} className="text-[#FF6A1F] font-extrabold underline underline-offset-2">{email}</a>
      </p>
      <p className="flex items-center gap-2 font-mono text-[12px]">{phone}</p>
    </div>
  </div>
);

export default Terms;
