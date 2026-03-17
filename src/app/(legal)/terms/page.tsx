import { LegalBackLink } from "@/components/Legal/LegalBackLink";


export default function TermsPage() {
    return (
        <div
            className="w-full px-6 text-gray-300"
            style={{ paddingTop: "calc(2.5rem + var(--kandy-cookie-offset, 0px))" }}
        >
            <div className="max-w-3xl mx-auto space-y-8">
                <LegalBackLink />

                <h1 className="text-4xl font-bold text-white mb-8">Terms of Service</h1>
                <p className="text-sm text-gray-500">Last Updated: February 12, 2026</p>

                <section className="space-y-4">
                    <h2 className="text-xl font-bold text-white">1. Introduction</h2>
                    <p>
                        Welcome to KandyDrops. These Terms of Service (&ldquo;Terms&rdquo;) govern your access to and use of the KandyDrops platform.
                        By accessing or using the Service, you agree to be bound by these Terms.
                    </p>
                    <p>
                        <strong>KandyDrops is operated by iKandy</strong>, a wholly-owned subsidiary of <strong>Dollars not Sense</strong>. Throughout these Terms, &ldquo;we&rdquo;, &ldquo;us&rdquo;, and &ldquo;our&rdquo; refer to iKandy.
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
                    <h2 className="text-xl font-bold text-white">3. Virtual Currency (&ldquo;Gum Drops&rdquo;)</h2>
                    <p>
                        &ldquo;Gum Drops&rdquo; are a limited, non-transferable, revocable license to access digital content on our platform.
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
                        The Service is provided &ldquo;AS IS&rdquo; and &ldquo;AS AVAILABLE&rdquo;. iKandy explicitly disclaims all warranties of any kind, whether express or implied.
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
        </div>
    );
}
