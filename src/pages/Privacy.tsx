import { Link } from "react-router-dom";
import { useEffect } from "react";
import { MessageCircle, ShieldCheck, FileCheck2, Mail, Phone, MapPin, Crown } from "lucide-react";
import { AddisonLogo } from "@/components/brand/AddisonLogo";

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
  { id: "intro", label: "Introduction" },
  { id: "definitions", label: "Definitions" },
  { id: "collect", label: "Information we collect" },
  { id: "use", label: "How we use your data" },
  { id: "legal-basis", label: "Legal basis under DPDP Act 2023" },
  { id: "sharing", label: "Sharing with third parties" },
  { id: "retention", label: "Data retention" },
  { id: "transfers", label: "International data transfers" },
  { id: "security", label: "Security measures" },
  { id: "rights", label: "Your rights (DPDP Act)" },
  { id: "cookies", label: "Cookies & tracking" },
  { id: "children", label: "Children's privacy" },
  { id: "changes", label: "Changes to this policy" },
  { id: "contact", label: "Grievance Officer & DPO" },
];

const Privacy = () => {
  usePageMeta(
    "Privacy Policy — AddisonX | WhatsApp Business CRM India",
    "AddisonX Privacy Policy. DPDP Act 2023 compliant. We host data in Mumbai, AES-256 encrypt WhatsApp tokens, and never sell your information. Grievance Officer based in Ranchi, Jharkhand."
  );

  return (
    <div className="min-h-screen w-full bg-[#FFF6E8] text-foreground">
      {/* ============ TOP NAV ============ */}
      <header className="h-16 flex items-center justify-between px-5 sm:px-8 border-b-2 border-[#E8B968] bg-white sticky top-0 z-30">
        <Link to="/" className="flex items-center hover:opacity-90 transition" aria-label="AddisonX home">
          <AddisonLogo size={38} />
        </Link>
        <div className="hidden sm:flex items-center gap-5 text-[12px] font-semibold">
          <Link to="/terms" className="text-foreground/70 hover:text-[#FF6A1F] transition">Terms</Link>
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
              <ShieldCheck className="w-3.5 h-3.5" />
              DPDP Act 2023 compliant
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/15 backdrop-blur text-white text-[11px] font-extrabold border border-white/20">
              <Crown className="w-3.5 h-3.5" />
              Meta Business Partner
            </span>
          </div>
          <h1 className="text-[2.5rem] sm:text-5xl font-black tracking-tight leading-[1.02]">
            Privacy <span className="text-[#FFD23F]">Policy</span>
          </h1>
          <p className="mt-4 text-base lg:text-lg text-white/85 leading-relaxed max-w-2xl font-medium">
            Aapka data aapka hai. Hum ise sirf service chalane ke liye use karte hain — kabhi bechte nahi,
            kabhi train karne ke liye share nahi karte. India mein hosted, DPDP-compliant.
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
        {/* TOC sidebar */}
        <aside className="hidden lg:block">
          <div className="sticky top-24">
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

        {/* Content */}
        <article className="prose-content text-[14px] leading-[1.75] text-foreground/85 space-y-10">
          <Section id="intro" n={1} title="Introduction">
            <p>
              This Privacy Policy explains how <strong>AddisonX Media Pvt. Ltd.</strong>
              (CIN under registration, "AddisonX", "we", "us", or "our") collects, uses, stores,
              shares and protects information when you use our WhatsApp Business CRM platform
              available at <Link to="/" className="text-[#FF6A1F] font-bold underline underline-offset-2">addisonx.in</Link>
              {" "}and at the application accessible under the same domain (the "Service").
            </p>
            <p className="mt-3">
              We comply with the <strong>Digital Personal Data Protection Act, 2023</strong> ("DPDP Act"),
              the Information Technology Act, 2000 and the rules thereunder, and Meta's WhatsApp
              Business Platform terms. Our registered office is in <strong>Ranchi, Jharkhand, India</strong>{" "}
              and our operations are split between Ranchi and Bengaluru.
            </p>
          </Section>

          <Section id="definitions" n={2} title="Definitions">
            <DefinitionList
              items={[
                ["Personal Data", "Any data about an individual who is identifiable by or in relation to such data, as defined under Section 2(t) of the DPDP Act."],
                ["Data Principal", "The individual to whom the personal data relates (i.e., you)."],
                ["Data Fiduciary", "AddisonX, when we determine the purpose and means of processing your data."],
                ["Data Processor", "Any third party processing data on our behalf (e.g., Meta, Razorpay, Neon Database)."],
                ["Service", "The AddisonX WhatsApp CRM platform, web app, mobile apps and APIs."],
                ["WhatsApp Business Platform", "The official messaging API operated by WhatsApp LLC and Meta Platforms, Inc."],
              ]}
            />
          </Section>

          <Section id="collect" n={3} title="Information we collect">
            <p>We collect only what we need to run the Service:</p>
            <h3 className="text-[14px] font-extrabold text-foreground mt-5 mb-2">a) Account information</h3>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>Full name, business name, work email, phone number</li>
              <li>Password (stored as a salted bcrypt hash — we never see plaintext)</li>
              <li>Profile picture (optional)</li>
              <li>Role and permissions within your workspace</li>
            </ul>

            <h3 className="text-[14px] font-extrabold text-foreground mt-5 mb-2">b) Business contacts you import or capture</h3>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>Name, phone number (E.164 format), email, source, tags and notes</li>
              <li>WhatsApp opt-in status as captured by you or by Meta</li>
            </ul>

            <h3 className="text-[14px] font-extrabold text-foreground mt-5 mb-2">c) Messages and conversations</h3>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>Message body (text, media references, template variables), direction, status, timestamps</li>
              <li>WhatsApp message IDs and delivery receipts from Meta</li>
            </ul>

            <h3 className="text-[14px] font-extrabold text-foreground mt-5 mb-2">d) Meta WhatsApp Business credentials</h3>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>WhatsApp Business Account ID (WABA), phone number ID, display phone number</li>
              <li>Permanent access token — <strong>encrypted at rest using AES-256-GCM</strong> with a key that
              never leaves our key vault</li>
            </ul>

            <h3 className="text-[14px] font-extrabold text-foreground mt-5 mb-2">e) Payment information</h3>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>Subscription plan, GSTIN, billing address — required for Indian GST-compliant invoicing</li>
              <li>Payment metadata returned by Razorpay (transaction ID, status). <strong>We never store
              card numbers, UPI PINs or CVVs.</strong></li>
            </ul>

            <h3 className="text-[14px] font-extrabold text-foreground mt-5 mb-2">f) Technical & usage data</h3>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>IP address, browser type, operating system, time of access, pages visited</li>
              <li>API request logs and error logs (retained 30 days for security/diagnostics)</li>
              <li>Performance metrics (anonymous, aggregated)</li>
            </ul>
          </Section>

          <Section id="use" n={4} title="How we use your data">
            <p>We use your data <strong>only</strong> to operate the Service you signed up for:</p>
            <ul className="list-disc pl-5 space-y-1.5 mt-2">
              <li>Send and receive WhatsApp messages through the Meta WhatsApp Business Platform on your behalf</li>
              <li>Display your inbox, contacts, deals, broadcasts, campaigns and analytics</li>
              <li>Authenticate you, manage sessions, and protect your account (BetterAuth)</li>
              <li>Process payments for your subscription and generate GST-compliant invoices</li>
              <li>Diagnose problems, monitor reliability and improve performance</li>
              <li>Send transactional emails (login alerts, billing receipts, security notifications)</li>
              <li>Provide customer support when you contact us</li>
              <li>Comply with legal obligations (income tax, GST, court orders)</li>
            </ul>
            <Callout color="primary">
              We <strong>never</strong> sell your data, never train shared AI models on your customer conversations,
              and never share your contacts with anyone for marketing.
            </Callout>
          </Section>

          <Section id="legal-basis" n={5} title="Legal basis under DPDP Act 2023">
            <p>Under the DPDP Act 2023, we process personal data on the following legal grounds:</p>
            <ul className="list-disc pl-5 space-y-1.5 mt-2">
              <li><strong>Consent</strong> — you accept this Privacy Policy at signup; you can withdraw consent any time</li>
              <li><strong>Legitimate Use</strong> — performing our contract with you (the Service)</li>
              <li><strong>Legal Obligation</strong> — Indian tax law, anti-money-laundering, court orders</li>
              <li><strong>Vital Interest</strong> — security, fraud prevention, protecting your account</li>
            </ul>
          </Section>

          <Section id="sharing" n={6} title="Sharing with third parties">
            <p>
              We share data only with the following processors, strictly to operate the Service:
            </p>
            <div className="mt-4 grid sm:grid-cols-2 gap-3">
              <ProcessorCard name="Meta Platforms, Inc." purpose="WhatsApp Business Platform · message delivery" region="Global · Meta data centres" />
              <ProcessorCard name="Neon Database Inc." purpose="Managed Postgres hosting · workspace data" region="AWS Mumbai (ap-south-1)" />
              <ProcessorCard name="Razorpay Software Pvt. Ltd." purpose="Payment processing · subscription billing" region="India" />
              <ProcessorCard name="Cashfree Payments India" purpose="Alternate UPI processing" region="India" />
              <ProcessorCard name="Resend / SendGrid" purpose="Transactional email delivery" region="Global" />
              <ProcessorCard name="BetterAuth" purpose="Open-source authentication library (self-hosted)" region="Self-hosted on AWS Mumbai" />
            </div>
            <p className="mt-4">
              We do not sell, rent or trade your personal data. We may disclose data when required
              by law, by a court of competent jurisdiction in India, or to protect the rights, property
              or safety of AddisonX, our customers, or the public.
            </p>
          </Section>

          <Section id="retention" n={7} title="Data retention">
            <ul className="list-disc pl-5 space-y-1.5">
              <li><strong>Account data</strong> — retained while your account is active and for 90 days after deletion (so you can recover an account deleted by accident)</li>
              <li><strong>Contacts and messages</strong> — retained while your workspace is active; deleted within 30 days of workspace deletion</li>
              <li><strong>Billing and invoice records</strong> — retained for 8 years as required by the Indian Income Tax Act and GST Act</li>
              <li><strong>API logs</strong> — 30 days rolling window</li>
              <li><strong>Backups</strong> — encrypted snapshots retained for 35 days for disaster recovery</li>
            </ul>
          </Section>

          <Section id="transfers" n={8} title="International data transfers">
            <p>
              Your data is primarily hosted in <strong>AWS Mumbai (ap-south-1)</strong>. Some processors
              (Meta, Resend) may process certain message metadata outside India. When this happens, we
              ensure the transfer is governed by appropriate contractual safeguards and complies with
              the DPDP Act 2023 Section 16 rules on cross-border transfers.
            </p>
          </Section>

          <Section id="security" n={9} title="Security measures">
            <ul className="list-disc pl-5 space-y-1.5">
              <li>TLS 1.3 in transit; AES-256-GCM encryption at rest for sensitive fields (Meta tokens, webhook secrets)</li>
              <li>Per-workspace row-level isolation in the database</li>
              <li>Salted bcrypt password hashing; no plaintext passwords stored or logged</li>
              <li>Hardware-backed secret storage; key rotation every 90 days</li>
              <li>Rate limiting and bot detection on all auth endpoints</li>
              <li>SOC 2 Type II audit in progress; ISO 27001 controls implemented</li>
              <li>Regular third-party penetration testing</li>
              <li>Incident response: in the event of a breach affecting your data, we will notify the
              Data Protection Board of India and you within 72 hours, as required by the DPDP Act</li>
            </ul>
          </Section>

          <Section id="rights" n={10} title="Your rights as a Data Principal">
            <p>Under the DPDP Act 2023, you have the following rights:</p>
            <ul className="list-disc pl-5 space-y-1.5 mt-2">
              <li><strong>Right to access</strong> — request a copy of the personal data we hold about you</li>
              <li><strong>Right to correction</strong> — correct inaccurate or incomplete data</li>
              <li><strong>Right to erasure</strong> — request deletion of your data (subject to legal retention)</li>
              <li><strong>Right to grievance redressal</strong> — file a complaint with our Grievance Officer (see below)</li>
              <li><strong>Right to nominate</strong> — nominate another individual to exercise these rights in case of incapacity or death</li>
              <li><strong>Right to withdraw consent</strong> — withdraw your consent at any time</li>
              <li><strong>Right to data portability</strong> — export your data as CSV/JSON from Settings → Export</li>
            </ul>
            <p className="mt-3">
              To exercise any right, write to <a href="mailto:privacy@addisonx.in" className="text-[#FF6A1F] font-bold underline underline-offset-2">privacy@addisonx.in</a>.
              We respond within 30 days.
            </p>
          </Section>

          <Section id="cookies" n={11} title="Cookies & tracking">
            <p>We use minimal cookies, strictly for:</p>
            <ul className="list-disc pl-5 space-y-1.5 mt-2">
              <li><strong>Authentication</strong> — keeping you signed in (BetterAuth session cookie, httpOnly, secure, SameSite=Lax)</li>
              <li><strong>Preferences</strong> — sidebar collapsed state, theme (saved in localStorage, not transmitted)</li>
              <li><strong>Security</strong> — CSRF tokens</li>
            </ul>
            <p className="mt-3">
              We do <strong>not</strong> use third-party advertising trackers on the application. The marketing
              site may use privacy-friendly analytics (Plausible or Vercel Analytics) which do not set
              identifying cookies.
            </p>
          </Section>

          <Section id="children" n={12} title="Children's privacy">
            <p>
              The Service is not directed to children under <strong>18 years</strong>. We do not knowingly
              collect personal data from minors. If you believe a minor has provided us with personal
              data, contact our Grievance Officer and we will delete it.
            </p>
          </Section>

          <Section id="changes" n={13} title="Changes to this policy">
            <p>
              We may update this policy from time to time. When we make material changes we will notify
              you via email and in-app banner at least <strong>30 days before</strong> the changes take effect.
              Continued use of the Service after the effective date constitutes acceptance.
            </p>
          </Section>

          <Section id="contact" n={14} title="Grievance Officer & Data Protection Officer">
            <p>
              In compliance with the Information Technology Rules, 2011 and the DPDP Act 2023, we have
              appointed a Grievance Officer and Data Protection Officer based in our Ranchi office:
            </p>
            <ContactCard
              name="Mr. Ajay Kumar"
              role="Grievance Officer & Data Protection Officer"
              address="AddisonX Media Pvt. Ltd., Main Road, Lalpur, Ranchi 834001, Jharkhand, India"
              email="grievance@addisonx.in"
              phone="+91-80-4567-8910"
              hours="Mon–Sat, 9:00 AM – 9:00 PM IST"
            />
            <p className="mt-5">
              You may also contact the <strong>Data Protection Board of India</strong> directly if you
              feel your grievance is not addressed within 30 days.
            </p>
          </Section>

          {/* Footer summary card */}
          <div className="mt-12 p-5 rounded-2xl bg-[#FFF1D6] border-2 border-[#E8B968] shadow-[0_3px_0_0_#E8B968]">
            <p className="text-[12px] uppercase tracking-[0.15em] text-[#B8651A] font-extrabold mb-2">TL;DR</p>
            <p className="text-[13px] font-semibold leading-relaxed">
              We collect what we need to run AddisonX. We host in Mumbai, encrypt sensitive data, never
              sell your information, and let you export or delete everything anytime. Questions? Email{" "}
              <a href="mailto:privacy@addisonx.in" className="text-[#FF6A1F] font-extrabold underline">privacy@addisonx.in</a>.
            </p>
          </div>

          <p className="text-[11px] text-foreground/50 font-medium pt-4 border-t border-[#E8B968]/40">
            © {new Date().getFullYear()} AddisonX Media Pvt. Ltd. · Ranchi, Jharkhand · India · CIN under registration
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

const DefinitionList = ({ items }: { items: [string, string][] }) => (
  <dl className="grid gap-3 mt-2">
    {items.map(([term, def]) => (
      <div key={term} className="p-3 rounded-xl bg-white border-2 border-[#E8B968]">
        <dt className="text-[12px] font-extrabold text-[#0E8A4B] uppercase tracking-wider">{term}</dt>
        <dd className="text-[13px] mt-1 font-medium">{def}</dd>
      </div>
    ))}
  </dl>
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

const ProcessorCard = ({ name, purpose, region }: { name: string; purpose: string; region: string }) => (
  <div className="p-3 rounded-xl bg-white border-2 border-[#E8B968]">
    <p className="text-[13px] font-extrabold">{name}</p>
    <p className="text-[12px] text-foreground/70 mt-0.5 font-medium">{purpose}</p>
    <p className="text-[10px] uppercase tracking-wider text-[#B8651A] font-extrabold mt-2">{region}</p>
  </div>
);

const ContactCard = ({ name, role, address, email, phone, hours }: {
  name: string; role: string; address: string; email: string; phone: string; hours: string;
}) => (
  <div className="mt-4 p-5 rounded-2xl bg-white border-2 border-[#0E8A4B] shadow-[0_4px_0_0_#0A6E3C]">
    <div className="flex items-center gap-3 mb-3">
      <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#0E8A4B] to-[#16C172] text-white flex items-center justify-center shadow-md">
        <FileCheck2 className="w-5 h-5" strokeWidth={2.5} />
      </div>
      <div>
        <p className="text-[14px] font-black">{name}</p>
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
      <p className="flex items-center gap-2">
        <Phone className="w-3.5 h-3.5 flex-shrink-0 text-[#B8651A]" />
        <a href={`tel:${phone.replace(/\D/g, "")}`} className="font-extrabold">{phone}</a>
      </p>
      <p className="text-[11px] text-foreground/60 mt-2 font-semibold">Hours: {hours}</p>
    </div>
  </div>
);

export default Privacy;
