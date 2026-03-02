import Link from "next/link";
import { ArrowLeft } from "lucide-react";


export default function PrivacyPage() {
    return (
        <div className="w-full text-gray-300 px-6">
            <div className="max-w-3xl mx-auto space-y-8">
                <Link href="/" className="inline-flex items-center gap-2 text-brand-pink transition-colors">
                    <ArrowLeft className="w-4 h-4" />
                    Back to Home
                </Link>

                <h1 className="text-4xl font-bold text-white mb-8">Privacy Policy</h1>
                <p className="text-sm text-gray-500">Last Updated: March 2, 2026</p>

                <section className="space-y-4">
                    <h2 className="text-xl font-bold text-white">1. Information We Collect</h2>
                    <ul className="list-disc pl-5 space-y-2">
                        <li><strong>Account Information</strong>: Email address, Username, Date of Birth.</li>
                        <li><strong>Transaction Data</strong>: Purchase history of Gum Drops (processed via PayPal). We do NOT store credit card details.</li>
                        <li><strong>Usage Data</strong>: Drops unlocked, Creator interactions.</li>
                        <li><strong>Behavioral Telemetry (First-Party Analytics)</strong>: We utilize Google Analytics 4 and Google BigQuery to track deep behavioral events. This includes click data, scroll depth, session durations, and interaction percentages (e.g., viewing drops vs. unlocking drops). This data is mapped to your user identifier to allow for tailored platform experiences and performance optimization.</li>
                    </ul>
                </section>

                <section className="space-y-4">
                    <h2 className="text-xl font-bold text-white">2. How We Use Your Information</h2>
                    <p>
                        We use your information to:
                    </p>
                    <ul className="list-disc pl-5 space-y-2">
                        <li>Provide and maintain the Service.</li>
                        <li>Process transactions and manage your "Gum Drops" balance.</li>
                        <li>Verify age eligibility (18+ content).</li>
                        <li>Improve platform performance and security.</li>
                        <li><strong>Behavioral Marketing:</strong> Apply interaction data to tailor content recommendations, promotions, and the overall user experience.</li>
                        <li><strong>Data Retention:</strong> Raw behavioral tracking data is retained securely in our data lake (Google BigQuery) for a standard rolling period of 60 days before automatic deletion, unless an account deletion request forces an immediate purge.</li>
                    </ul>
                </section>

                <section className="space-y-4">
                    <h2 className="text-xl font-bold text-white">3. Third-Party Services</h2>
                    <p>
                        We share data with trusted third-party service providers solely for the purpose of operating the Service:
                    </p>
                    <ul className="list-disc pl-5 space-y-2">
                        <li><strong>Firebase (Google)</strong>: Authentication, Database, and Hosting.</li>
                        <li><strong>Google Analytics & BigQuery</strong>: Behavioral Telemetry and Data Warehousing.</li>
                        <li><strong>PayPal</strong>: Payment processing.</li>
                    </ul>
                </section>

                <section className="space-y-4">
                    <h2 className="text-xl font-bold text-white">4. Cookies</h2>
                    <p>
                        We use essential cookies to maintain your session. You can manage your preferences via our Cookie Banner.
                    </p>
                </section>

                <section className="space-y-4 pb-12">
                    <h2 className="text-xl font-bold text-white">5. Your Rights & Data Autonomy (CCPA/GDPR)</h2>
                    <p>
                        We believe you own your data. To comply with global privacy regulations, we provide automated tools directly within your <strong>Profile Settings</strong>:
                    </p>
                    <ul className="list-disc pl-5 space-y-2">
                        <li><strong>Download Your Data</strong>: You may instantly securely export your entire profile identity and transaction history as a JSON file at any time.</li>
                        <li><strong>Right to be Forgotten (Account Deletion)</strong>: You may permanently and irreversibly delete your account. Doing so instantly purges your Firebase Authentication identity and destroys your Firestore database records. Historic, unlinked analytical data will be anonymized.</li>
                    </ul>
                    <p className="mt-4 text-sm text-gray-400">If you are unable to access your dashboard, you can contact support@kandydrops.com to process manual deletion requests.</p>
                </section>
            </div>
        </div>
    );
}
