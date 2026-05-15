import { Link } from "react-router-dom";
import { MessageCircle } from "lucide-react";

const Terms = () => (
  <div className="min-h-screen w-full bg-background text-foreground flex flex-col">
    <header className="h-14 flex items-center justify-between px-5 sm:px-8 border-b border-border">
      <Link to="/" className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
          <MessageCircle className="w-3.5 h-3.5 text-primary-foreground" fill="currentColor" strokeWidth={0} />
        </div>
        <span className="font-semibold text-[14px] tracking-tight">AddisonX</span>
      </Link>
      <div className="flex items-center gap-5">
        <Link to="/privacy" className="text-[12px] text-muted-foreground hover:text-foreground transition-colors">
          Privacy
        </Link>
        <Link to="/auth" className="text-[12px] text-muted-foreground hover:text-foreground transition-colors">
          Sign in
        </Link>
      </div>
    </header>

    <main className="flex-1 px-5 sm:px-8 py-10 sm:py-14">
      <article className="max-w-[720px] mx-auto">
        <div className="mb-8">
          <h1 className="text-[28px] font-semibold tracking-tight">Terms of Service</h1>
          <p className="text-[12px] text-muted-foreground mt-1.5">Last updated: 10 May 2026</p>
        </div>

        <div className="prose-content text-[14px] leading-[1.7] text-foreground/90 space-y-6">
          <section>
            <h2 className="text-[16px] font-semibold text-foreground mb-2">Agreement</h2>
            <p>
              By creating an account or using AddisonX, you agree to these terms. If you are signing
              up on behalf of a company, you confirm you have authority to bind that company.
            </p>
          </section>

          <section>
            <h2 className="text-[16px] font-semibold text-foreground mb-2">The service</h2>
            <p>
              AddisonX is a customer messaging platform that lets you send and receive WhatsApp
              messages, manage contacts, run broadcasts, and track deals. Sending WhatsApp messages
              requires you to connect your own Meta WhatsApp Business Account; you remain the sender
              of record for all messages dispatched through the platform.
            </p>
          </section>

          <section>
            <h2 className="text-[16px] font-semibold text-foreground mb-2">Your account</h2>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>Keep your login credentials confidential. You are responsible for activity on your account.</li>
              <li>Provide accurate information when signing up and keep it current.</li>
              <li>Notify us promptly if you suspect unauthorized access.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-[16px] font-semibold text-foreground mb-2">Acceptable use</h2>
            <p>You agree not to use AddisonX to:</p>
            <ul className="list-disc pl-5 space-y-1.5 mt-2">
              <li>Send unsolicited messages or spam, or message recipients who have not opted in.</li>
              <li>Violate the Meta WhatsApp Business Messaging Policy, the Meta Platform Terms, or applicable law (including the DPDP Act, 2023 in India and similar laws elsewhere).</li>
              <li>Send harassing, fraudulent, deceptive, illegal, or harmful content.</li>
              <li>Attempt to reverse engineer, scrape, overload, or interfere with the service.</li>
              <li>Resell access to AddisonX without our written permission.</li>
            </ul>
            <p className="mt-3">
              We may suspend accounts that violate these rules or that put our infrastructure or our
              relationship with Meta at risk.
            </p>
          </section>

          <section>
            <h2 className="text-[16px] font-semibold text-foreground mb-2">Your data and content</h2>
            <p>
              You own the contacts, messages, and other content you provide to AddisonX. You grant
              us a limited license to host, process, and transmit that content as needed to operate
              the service for you.
            </p>
            <p className="mt-3">
              You are responsible for obtaining the consent required from your contacts before
              messaging them, and for honouring opt-out requests.
            </p>
          </section>

          <section>
            <h2 className="text-[16px] font-semibold text-foreground mb-2">Meta WhatsApp Business Platform</h2>
            <p>
              Messages sent through AddisonX are delivered through Meta's WhatsApp Business
              Platform. Conversation-based pricing, template approval, quality ratings, and
              messaging limits are determined by Meta and are outside our control. You agree to the
              applicable Meta terms when you connect your account.
            </p>
          </section>

          <section>
            <h2 className="text-[16px] font-semibold text-foreground mb-2">Fees</h2>
            <p>
              Plan pricing is shown in-app at the time of signup or upgrade. Meta charges separately
              for WhatsApp conversations; those charges are billed directly to your Meta Business
              Account, not by us.
            </p>
          </section>

          <section>
            <h2 className="text-[16px] font-semibold text-foreground mb-2">Termination</h2>
            <p>
              You may close your account at any time from Settings. We may suspend or terminate
              accounts that violate these terms, that are inactive for extended periods, or where
              required by law. Upon termination, your data is deleted as described in our Privacy
              Policy.
            </p>
          </section>

          <section>
            <h2 className="text-[16px] font-semibold text-foreground mb-2">Service availability</h2>
            <p>
              We work hard to keep AddisonX available and reliable but do not guarantee uninterrupted
              service. Maintenance, third-party outages (including Meta), or other events may cause
              downtime.
            </p>
          </section>

          <section>
            <h2 className="text-[16px] font-semibold text-foreground mb-2">Disclaimers</h2>
            <p>
              The service is provided on an "as is" and "as available" basis. To the maximum extent
              permitted by law, we disclaim all warranties, express or implied, including
              merchantability, fitness for a particular purpose, and non-infringement.
            </p>
          </section>

          <section>
            <h2 className="text-[16px] font-semibold text-foreground mb-2">Limitation of liability</h2>
            <p>
              To the maximum extent permitted by law, AddisonX shall not be liable for any indirect,
              incidental, consequential, or punitive damages, or for lost profits, revenue, or data,
              arising from your use of the service. Our total liability for any claim shall not
              exceed the fees you paid us in the 3 months before the event giving rise to the claim.
            </p>
          </section>

          <section>
            <h2 className="text-[16px] font-semibold text-foreground mb-2">Governing law</h2>
            <p>
              These terms are governed by the laws of India. Disputes will be resolved in the courts
              of Mumbai, Maharashtra, unless we agree otherwise in writing.
            </p>
          </section>

          <section>
            <h2 className="text-[16px] font-semibold text-foreground mb-2">Changes</h2>
            <p>
              We may update these terms as the product evolves. Material changes will be announced
              in-app or by email at least 14 days before they take effect. Continued use of the
              service after that constitutes acceptance.
            </p>
          </section>

          <section>
            <h2 className="text-[16px] font-semibold text-foreground mb-2">Contact</h2>
            <p>
              Questions about these terms can be sent to{" "}
              <a href="mailto:legal@addisonx.com" className="text-primary hover:underline">legal@addisonx.com</a>.
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

export default Terms;
