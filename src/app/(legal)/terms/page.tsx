"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function TermsPage() {
    return (
        <main className="min-h-screen bg-black text-gray-300 pt-32 pb-20 px-6">
            <div className="max-w-3xl mx-auto space-y-8">
                <Link href="/" className="inline-flex items-center gap-2 text-brand-pink hover:text-white transition-colors">
                    <ArrowLeft className="w-4 h-4" />
                    Back to Home
                </Link>

                <h1 className="text-4xl font-bold text-white mb-8">Terms of Service</h1>
                <p className="text-sm text-gray-500">Last Updated: February 12, 2026</p>

                <section className="space-y-4">
                    <h2 className="text-xl font-bold text-white">1. Introduction</h2>
                    <p>
                        Welcome to KandyDrops. These Terms of Service ("Terms") govern your access to and use of the KandyDrops platform.
                        By accessing or using the Service, you agree to be bound by these Terms.
                    </p>
                    <p>
                        <strong>KandyDrops is operated by iKandy</strong>, a wholly-owned subsidiary of **Dollars not Sense**. throughout these Terms, "we", "us", and "our" refer to iKandy.
                    </p>
                </section>

                <section className="space-y-4">
                    <h2 className="text-xl font-bold text-white">2. Platform Nature</h2>
                    <p>
                        KandyDrops is a <strong>digital access platform</strong>. We provide the infrastructure for Creators to share content with Users.
                        <strong>We do not create, sell, or own the content</strong> provided by Creators on the platform. We act solely as a facilitator for access.
                    </p>
                </section>

                <section className="space-y-4">
                    <h2 className="text-xl font-bold text-white">3. Virtual Currency ("Gum Drops")</h2>
                    <p>
                        "Gum Drops" are a limited, non-transferable, revocable license to access digital content on our platform.
                        <strong>Gum Drops are NOT real currency</strong>, have no monetary value, and cannot be redeemed for cash or refunded once purchased.
                    </p>
                    <p>
                        We reserve the right to modify, suspend, or terminate the Gum Drops system at any time without liability.
                    </p>
                </section>

                <section className="space-y-4">
                    <h2 className="text-xl font-bold text-white">4. User Conduct</h2>
                    <p>
                        You agree not to misuse the Service or help anyone else do so. You are solely responsible for your interactions with other users and Creators.
                    </p>
                </section>

                <section className="space-y-4">
                    <h2 className="text-xl font-bold text-white">5. Disclaimer of Warranties</h2>
                    <p>
                        The Service is provided "AS IS" and "AS AVAILABLE". iKandy explicitly disclaims all warranties of any kind, whether express or implied.
                    </p>
                </section>

                <section className="space-y-4">
                    <h2 className="text-xl font-bold text-white">6. Limitation of Liability</h2>
                    <p>
                        To the maximum extent permitted by law, iKandy and Dollars not Sense shall not be liable for any indirect, incidental, special, consequential, or punitive damages.
                    </p>
                </section>

                <section className="space-y-4">
                    <h2 className="text-xl font-bold text-white">7. Contact</h2>
                    <p>
                        For legal inquiries, please contact us at legal@kandydrops.com.
                    </p>
                </section>
            </div>
        </main>
    );
}
