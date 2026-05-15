import { Link } from "react-router-dom";
import { MessageCircle } from "lucide-react";

const Privacy = () => (
  <div className="min-h-screen w-full bg-background text-foreground flex flex-col">
    <header className="h-14 flex items-center justify-between px-5 sm:px-8 border-b border-border">
      <Link to="/" className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
          <MessageCircle className="w-3.5 h-3.5 text-primary-foreground" fill="currentColor" strokeWidth={0} />
        </div>
        <span className="font-semibold text-[14px] tracking-tight">AddisonX</span>
      </Link>
      <div className="flex items-center gap-5">
        <Link to="/terms" className="text-[12px] text-muted-foreground hover:text-foreground transition-colors">
          Terms
        </Link>
        <Link to="/auth" className="text-[12px] text-muted-foreground hover:text-foreground transition-colors">
          Sign in
        </Link>
      </div>
    </header>

    <main className="flex-1 px-5 sm:px-8 py-10 sm:py-14">
      <article className="max-w-[720px] mx-auto">
        <div className="mb-8">
          <h1 className="text-[28px] font-semibold tracking-tight">Privacy Policy</h1>
          <p className="text-[12px] text-muted-foreground mt-1.5">Last updated: 10 May 2026</p>
        </div>

        <div className="prose-content text-[14px] leading-[1.7] text-foreground/90 space-y-6">
          <section>
            <h2 className="text-[16px] font-semibold text-foreground mb-2">Who we are</h2>
            <p>
              AddisonX is a customer messaging platform that helps businesses send and receive
              WhatsApp messages through the Meta WhatsApp Business Platform. This policy explains
              what we collect, how we use it, and the choices you have.
            </p>
          </section>

          <section>
            <h2 className="text-[16px] font-semibold text-foreground mb-2">What we collect</h2>
            <ul className="list-disc pl-5 space-y-1.5">
              <li><span className="font-medium">Account information</span> — name, email, password (hashed), and role you set when signing up.</li>
              <li><span className="font-medium">Business contacts you import</span> — name, phone number, email, tags, notes you choose to associate with each contact.</li>
              <li><span className="font-medium">Messages you send and receive</span> — message body, media references, timestamps, and delivery status.</li>
              <li><span className="font-medium">Meta WhatsApp credentials</span> — access token (encrypted at rest using AES-256-GCM), phone number ID, and WABA ID you connect.</li>
              <li><span className="font-medium">Usage data</span> — basic logs of API requests and errors needed to operate and secure the service.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-[16px] font-semibold text-foreground mb-2">How we use your data</h2>
            <p>We use the data you provide solely to operate the service you signed up for:</p>
            <ul className="list-disc pl-5 space-y-1.5 mt-2">
              <li>Send and deliver messages through the Meta WhatsApp Business Platform on your behalf.</li>
              <li>Show you your inbox, contacts, deals, broadcasts, and analytics.</li>
              <li>Authenticate you and keep your account secure.</li>
              <li>Diagnose problems and improve reliability.</li>
            </ul>
            <p className="mt-3">
              We do not sell your data, do not use it to train external AI models, and do not share
              it with advertisers.
            </p>
          </section>

          <section>
            <h2 className="text-[16px] font-semibold text-foreground mb-2">Sharing with third parties</h2>
            <p>We share data only with the providers required to run the service:</p>
            <ul className="list-disc pl-5 space-y-1.5 mt-2">
              <li><span className="font-medium">Meta Platforms, Inc.</span> — to deliver WhatsApp messages on your behalf via the WhatsApp Business Platform. Meta's handling is governed by their own terms and privacy policy.</li>
              <li><span className="font-medium">Neon (database hosting)</span> — encrypted Postgres database located in the Singapore region.</li>
              <li><span className="font-medium">Hosting and CDN providers</span> — to serve the application.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-[16px] font-semibold text-foreground mb-2">Data security</h2>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>Data is transmitted over TLS.</li>
              <li>Meta access tokens are encrypted with AES-256-GCM before being written to the database.</li>
              <li>Passwords are hashed with bcrypt-equivalent algorithms; we never store them in plaintext.</li>
              <li>Access to production systems is restricted and audited.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-[16px] font-semibold text-foreground mb-2">Data retention</h2>
            <p>
              We retain your account, contact, and message data for as long as your account is
              active. If you delete your account, we delete your data within 30 days, except for
              records we are required to keep to comply with law or resolve disputes.
            </p>
          </section>

          <section>
            <h2 className="text-[16px] font-semibold text-foreground mb-2">Your rights</h2>
            <p>You can:</p>
            <ul className="list-disc pl-5 space-y-1.5 mt-2">
              <li>Access, export, or correct your data at any time from inside the app.</li>
              <li>Delete contacts, conversations, or your entire account.</li>
              <li>Disconnect your Meta WhatsApp integration, which removes the stored access token.</li>
              <li>Email us at <a href="mailto:privacy@addisonx.com" className="text-primary hover:underline">privacy@addisonx.com</a> to request export or deletion of any data we hold.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-[16px] font-semibold text-foreground mb-2">Children</h2>
            <p>
              AddisonX is intended for businesses and is not directed to anyone under 18. We do not
              knowingly collect data from minors.
            </p>
          </section>

          <section>
            <h2 className="text-[16px] font-semibold text-foreground mb-2">Changes</h2>
            <p>
              We may update this policy as the product evolves. Material changes will be announced
              in-app or by email at least 14 days before they take effect.
            </p>
          </section>

          <section>
            <h2 className="text-[16px] font-semibold text-foreground mb-2">Contact</h2>
            <p>
              Questions or requests can be sent to{" "}
              <a href="mailto:privacy@addisonx.com" className="text-primary hover:underline">privacy@addisonx.com</a>.
            </p>
          </section>
        </div>
      </article>
    </main>

    <footer className="border-t border-border px-5 sm:px-8 py-5 text-[12px] text-muted-foreground flex items-center justify-between">
      <span>© {new Date().getFullYear()} AddisonX</span>
      <div className="flex items-center gap-5">
        <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
        <Link to="/terms" className="hover:text-foreground transition-colors">Terms</Link>
      </div>
    </footer>
  </div>
);

export default Privacy;
