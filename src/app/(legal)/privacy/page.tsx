"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function PrivacyPage() {
    return (
        <main className="min-h-screen bg-black text-gray-300 pt-32 pb-20 px-6">
            <div className="max-w-3xl mx-auto space-y-8">
                <Link href="/" className="inline-flex items-center gap-2 text-brand-pink hover:text-white transition-colors">
                    <ArrowLeft className="w-4 h-4" />
                    Back to Home
                </Link>

                <h1 className="text-4xl font-bold text-white mb-8">Privacy Policy</h1>
                <p className="text-sm text-gray-500">Last Updated: February 12, 2026</p>

                <section className="space-y-4">
                    <h2 className="text-xl font-bold text-white">1. Information We Collect</h2>
                    <ul className="list-disc pl-5 space-y-2">
                        <li><strong>Account Information</strong>: Email address, Username, Date of Birth.</li>
                        <li><strong>Transaction Data</strong>: Purchase history of Gum Drops (processed via PayPal). We do NOT store credit card details.</li>
                        <li><strong>Usage Data</strong>: Drops unlocked, Creator interactions.</li>
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
                    </ul>
                </section>

                <section className="space-y-4">
                    <h2 className="text-xl font-bold text-white">3. Third-Party Services</h2>
                    <p>
                        We share data with trusted third-party service providers solely for the purpose of operating the Service:
                    </p>
                    <ul className="list-disc pl-5 space-y-2">
                        <li><strong>Firebase (Google)</strong>: Authentication, Database, and Hosting.</li>
                        <li><strong>PayPal</strong>: Payment processing.</li>
                    </ul>
                </section>

                <section className="space-y-4">
                    <h2 className="text-xl font-bold text-white">4. Cookies</h2>
                    <p>
                        We use essential cookies to maintain your session. You can manage your preferences via our Cookie Banner.
                    </p>
                </section>

                <section className="space-y-4">
                    <h2 className="text-xl font-bold text-white">5. Your Rights</h2>
                    <p>
                        You have the right to request access to or deletion of your personal data. Contact support@kandydrops.com for assistance.
                    </p>
                </section>
            </div>
        </main>
    );
}
