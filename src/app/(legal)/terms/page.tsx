import type { Metadata } from "next";
import { FileText } from "lucide-react";

import { PageViewEvent } from "@/components/Analytics/PageViewEvent";
import { LegalBackLink } from "@/components/Legal/LegalBackLink";
import {
    KandyLegalDocument,
    KandyLegalHero,
    KandyLegalSection,
} from "@/components/creative-tim/kandydrops/legal/KandyLegalDocument";
import { TERMS_LAST_UPDATED_LABEL } from "@/lib/platform-config";

export const metadata: Metadata = {
    title: "Terms of Service",
    description: "Terms of Service for using KandyDrops, including platform rules, virtual currency terms, and contact details.",
    alternates: {
        canonical: "/terms",
    },
};

export default function TermsPage() {
    return (
        <KandyLegalDocument className="max-w-4xl">
            <PageViewEvent eventName="terms_page_viewed" />
            <LegalBackLink />

            <KandyLegalHero
                eyebrow="Terms of Service"
                title="Terms of Service"
                updatedLabel={"Last Updated: " + TERMS_LAST_UPDATED_LABEL}
                icon={FileText}
            />

            <KandyLegalSection title="1. Introduction">
                    <p>
                        Welcome to KandyDrops. These Terms of Service (&ldquo;Terms&rdquo;) govern your access to and use of the KandyDrops platform.
                        By accessing or using the Service, you agree to be bound by these Terms.
                    </p>
                    <p>
                        <strong>KandyDrops is operated by iKandy</strong>, a wholly-owned subsidiary of <strong>Dollars not Sense</strong>. Throughout these Terms, &ldquo;we&rdquo;, &ldquo;us&rdquo;, and &ldquo;our&rdquo; refer to iKandy.
                    </p>
            </KandyLegalSection>

            <KandyLegalSection title="2. Platform Nature">
                    <p>
                        KandyDrops is a <strong>digital access platform</strong>. We provide the infrastructure for Creators to share content with Users.
                        <strong>We do not create, sell, or own the content</strong> provided by Creators on the platform. We act solely as a facilitator for access.
                    </p>
            </KandyLegalSection>

            <KandyLegalSection title="3. Virtual Currency (&ldquo;Gum Drops&rdquo;)">
                    <p>
                        &ldquo;Gum Drops&rdquo; are a limited, non-transferable, revocable license to access digital content on our platform.
                        <strong>Gum Drops are NOT real currency</strong>, have no monetary value, and cannot be redeemed for cash or refunded once purchased.
                    </p>
                    <p>
                        We reserve the right to modify, suspend, or terminate the Gum Drops system at any time without liability.
                    </p>
            </KandyLegalSection>

            <KandyLegalSection title="4. User Conduct">
                    <p>
                        You agree not to misuse the Service or help anyone else do so. You are solely responsible for your interactions with other users and Creators.
                    </p>
            </KandyLegalSection>

            <KandyLegalSection title="5. Disclaimer of Warranties">
                    <p>
                        The Service is provided &ldquo;AS IS&rdquo; and &ldquo;AS AVAILABLE&rdquo;. iKandy explicitly disclaims all warranties of any kind, whether express or implied.
                    </p>
            </KandyLegalSection>

            <KandyLegalSection title="6. Limitation of Liability">
                    <p>
                        To the maximum extent permitted by law, iKandy and Dollars not Sense shall not be liable for any indirect, incidental, special, consequential, or punitive damages.
                    </p>
            </KandyLegalSection>

            <KandyLegalSection title="7. Contact">
                    <p>
                        For legal inquiries, please contact us at legal@kandydrops.com.
                    </p>
            </KandyLegalSection>
        </KandyLegalDocument>
    );
}
