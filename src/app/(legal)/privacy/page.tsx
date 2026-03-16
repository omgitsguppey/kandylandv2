import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ExternalLink, FileText, Lock, ShieldCheck } from "lucide-react";

import { PRIVACY_POLICY_LAST_UPDATED, PRIVACY_SUPPORT_EMAIL } from "@/lib/privacy-policy";
import { SITE_ORIGIN } from "@/lib/site-origin";

export const metadata: Metadata = {
  title: "Privacy Policy | KandyDrops",
  description: "How KandyDrops collects, uses, shares, and protects personal data.",
};

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3 rounded-[1.8rem] border border-white/10 bg-black/30 p-5">
      <h2 className="text-lg font-bold text-white">{title}</h2>
      <div className="space-y-3 text-sm leading-7 text-gray-300">{children}</div>
    </section>
  );
}

export default function PrivacyPage() {
  return (
    <div className="w-full px-6 py-10 text-gray-300">
      <div className="mx-auto max-w-4xl space-y-6">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-brand-purple transition-colors hover:text-white">
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </Link>

        <div className="space-y-4 rounded-[2rem] border border-white/10 bg-black/35 p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-brand-purple">Privacy Policy</p>
              <h1 className="mt-2 text-3xl font-black text-white md:text-4xl">How KandyDrops handles your data</h1>
            </div>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-gray-400">
              Last updated {PRIVACY_POLICY_LAST_UPDATED}
            </span>
          </div>

          <p className="max-w-3xl text-sm leading-7 text-gray-300">
            This notice explains what KandyDrops collects, why we use it, when data is optional, and what controls you have.
            Optional analytics and recommendation features stay off until you turn them on. Core security, sign-in, payment, and service-storage functions remain enabled because the site cannot operate safely without them.
          </p>

          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-[1.3rem] border border-white/10 bg-black/25 p-4">
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-white">
                <Lock className="h-4 w-4 text-brand-purple" />
                Always-on essentials
              </div>
              <p className="text-xs leading-6 text-gray-400">Authentication, fraud prevention, payment confirmation, session security, and required storage.</p>
            </div>
            <div className="rounded-[1.3rem] border border-white/10 bg-black/25 p-4">
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-white">
                <FileText className="h-4 w-4 text-brand-purple" />
                User controls
              </div>
              <p className="text-xs leading-6 text-gray-400">Profile Settings lets you withdraw optional analytics consent, download your data, and manage notification choices.</p>
            </div>
            <div className="rounded-[1.3rem] border border-white/10 bg-black/25 p-4">
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-white">
                <ShieldCheck className="h-4 w-4 text-brand-purple" />
                Support contact
              </div>
              <p className="text-xs leading-6 text-gray-400">
                Privacy and data-rights requests can be sent to{" "}
                <a href={`mailto:${PRIVACY_SUPPORT_EMAIL}`} className="text-brand-purple hover:underline">
                  {PRIVACY_SUPPORT_EMAIL}
                </a>.
              </p>
            </div>
          </div>
        </div>

        <Section title="1. Who this notice covers">
          <p>
            This notice applies to KandyDrops websites, authenticated dashboard experiences, creator drop browsing, purchases, support interactions, and related services available at{" "}
            <a href={SITE_ORIGIN} className="text-brand-purple hover:underline" target="_blank" rel="noreferrer">
              {SITE_ORIGIN}
            </a>.
          </p>
          <p>
            KandyDrops is intended for adults only. Registration checks age eligibility before an account can be activated.
          </p>
        </Section>

        <Section title="2. Data we collect">
          <ul className="list-disc space-y-2 pl-5">
            <li><strong>Account data:</strong> email address, display name, username, avatar, date of birth if provided, role, and profile settings.</li>
            <li><strong>Service activity:</strong> unlocked drops, balances, check-ins, task progress, referrals, notifications, and content-viewing activity.</li>
            <li><strong>Commerce data:</strong> Gum Drop purchase records, package details, transaction timestamps, payment status, and derived revenue or fee summaries. Payment cards are processed by PayPal, not stored by KandyDrops.</li>
            <li><strong>Optional analytics data:</strong> page paths, clicks, scroll depth, viewer performance, device dimensions, and event telemetry when you allow analytics.</li>
            <li><strong>Security data:</strong> abuse-prevention events, protection warnings, fraud signals, and session-related records needed to protect creators and the platform.</li>
            <li><strong>Notification data:</strong> browser permission state, push-token data, and notification preference settings when reminders are enabled.</li>
          </ul>
        </Section>

        <Section title="3. Why we use the data">
          <ul className="list-disc space-y-2 pl-5">
            <li><strong>To perform the service:</strong> create accounts, authenticate users, deliver drops, maintain balances, process check-ins, and support creator content access.</li>
            <li><strong>To process purchases:</strong> verify Gum Drop transactions, record completed orders, and prevent duplicate or fraudulent payment captures.</li>
            <li><strong>To secure the platform:</strong> detect abuse, enforce viewer protections, investigate suspicious activity, and maintain audit trails.</li>
            <li><strong>To improve the product:</strong> analyze optional usage data, diagnose performance issues, and understand site flows when analytics consent is granted.</li>
            <li><strong>To personalize optional features:</strong> improve recommendations or aggregated trend reporting only when the related privacy toggles are enabled.</li>
            <li><strong>To meet legal and accounting obligations:</strong> retain records required for tax, payment, fraud, or dispute handling.</li>
          </ul>
        </Section>

        <Section title="4. Legal bases and consent">
          <p>
            Some processing is necessary to provide the service you request, such as authentication, core security, payment verification, and required session storage.
          </p>
          <p>
            Optional analytics and recommendation features rely on your choices. KandyDrops keeps those settings separated by purpose inside Profile Settings so consent can be specific and easy to change.
          </p>
          <ul className="list-disc space-y-2 pl-5">
            <li><strong>Anonymous product analytics:</strong> optional and off until you enable it.</li>
            <li><strong>Account-linked analytics:</strong> optional and off until you enable it.</li>
            <li><strong>Recommendations and anonymous trend reporting:</strong> optional and dependent on the related analytics settings.</li>
            <li><strong>Global Privacy Control:</strong> if enabled in your browser and honored in settings, KandyDrops turns off optional analytics automatically.</li>
          </ul>
          <p>
            You can withdraw optional consent at any time in <Link href="/dashboard/profile" className="text-brand-purple hover:underline">Profile Settings</Link>. Withdrawing consent does not turn off strictly necessary security and service-storage functions.
          </p>
        </Section>

        <Section title="5. Cookies, local storage, and similar technologies">
          <p>
            KandyDrops uses essential storage for sign-in, session continuity, fraud prevention, and security controls. Optional analytics cookies or storage are used only when analytics consent is granted.
          </p>
          <p>
            The guest privacy banner lets visitors choose between essential-only use and optional analytics. Signed-in users can later review or change those choices in settings.
          </p>
        </Section>

        <Section title="6. Third parties and service providers">
          <ul className="list-disc space-y-2 pl-5">
            <li><strong>Firebase / Google Cloud:</strong> authentication, Firestore data storage, hosting, storage, and messaging infrastructure.</li>
            <li><strong>Google Analytics 4:</strong> optional analytics measurement when enabled.</li>
            <li><strong>PayPal:</strong> payment processing and payment verification.</li>
            <li><strong>Browser notification services:</strong> delivery support when push notifications are enabled.</li>
          </ul>
          <p>
            We do not sell your personal data. We share data only as needed to run the service, process payments, protect the platform, or comply with legal obligations.
          </p>
        </Section>

        <Section title="7. Retention">
          <p>
            We keep account, transaction, and security information for as long as needed to operate the service, resolve disputes, prevent fraud, and satisfy legal or accounting obligations.
          </p>
          <p>
            Optional analytics and telemetry are retained only as long as operationally necessary for performance, reporting, and abuse prevention, then deleted, aggregated, or de-identified where appropriate.
          </p>
          <p>
            If you delete your account, KandyDrops removes or de-identifies data that is no longer required for fraud prevention, legal compliance, payment reconciliation, or recordkeeping.
          </p>
        </Section>

        <Section title="8. Your rights and choices">
          <ul className="list-disc space-y-2 pl-5">
            <li><strong>Access and portability:</strong> use the “Download My Data” action in Profile Settings.</li>
            <li><strong>Correction:</strong> update your profile details and settings from your dashboard.</li>
            <li><strong>Withdrawal of consent:</strong> turn off optional analytics or recommendation settings at any time.</li>
            <li><strong>Deletion:</strong> use the account deletion flow in the dashboard, or contact support if you cannot access your account.</li>
            <li><strong>Complaints or requests:</strong> email{" "}
              <a href={`mailto:${PRIVACY_SUPPORT_EMAIL}`} className="text-brand-purple hover:underline">
                {PRIVACY_SUPPORT_EMAIL}
              </a>.
            </li>
            <li><strong>Supervisory authority:</strong> if you believe your data has been handled unlawfully, you may also raise a complaint with your local data protection authority.</li>
          </ul>
        </Section>

        <Section title="9. Contact">
          <p>
            For privacy, data-rights, or account-security questions, email{" "}
            <a href={`mailto:${PRIVACY_SUPPORT_EMAIL}`} className="text-brand-purple hover:underline">
              {PRIVACY_SUPPORT_EMAIL}
            </a>.
          </p>
          <p>
            If you are contacting us about a data request, include the email address tied to your account so we can verify the request safely before acting on it.
          </p>
        </Section>

        <div className="rounded-[1.8rem] border border-white/10 bg-black/30 p-5 text-sm text-gray-400">
          <p>
            Operational pages:
            {" "}
            <Link href="/dashboard/profile" className="text-brand-purple hover:underline">
              Profile Settings
            </Link>
            {" · "}
            <Link href="/faq" className="text-brand-purple hover:underline">
              FAQ
            </Link>
            {" · "}
            <a href={`mailto:${PRIVACY_SUPPORT_EMAIL}`} className="text-brand-purple hover:underline">
              Contact Support
            </a>
            {" · "}
            <a href={SITE_ORIGIN} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-brand-purple hover:underline">
              Visit site
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
