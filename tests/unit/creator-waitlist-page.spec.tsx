import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { ReactNode } from "react";

const mockState = vi.hoisted(() => ({
    authValue: {
        user: {
            uid: "creator_1",
        },
        userProfile: {
            uid: "creator_1",
            username: "creator-one",
            role: "user",
            creatorApplication: {
                signupType: "creator",
                submissionStatus: "awaiting_manual_review",
                approvalStatus: "creator_pending",
                queuePosition: 777,
                onboardingStartedAt: 1_710_000_000_000,
                submittedAt: 1_710_000_000_000,
                onboardingSubmittedAt: 1_710_000_000_000,
                awaitingManualReviewAt: 1_710_000_000_000,
                updatedAt: 1_710_000_000_000,
                creatorDisplayName: "Creator One",
                creatorPrimaryPlatform: "TikTok",
                creatorContentFocus: "Pop culture creator notes",
                bypassFanOnboarding: true,
                legalStatus: "legal_pending",
                contractDocumentStatus: "contract_not_sent",
                creatorSignatureStatus: "signature_pending",
                adminSignatureStatus: "signature_pending",
                idVerificationStatus: "id_not_requested",
                segmentationStatus: "segment_unassigned",
                blockingReasons: ["awaiting_intro_acknowledgement", "awaiting_legal", "awaiting_id_request"],
                readyForApproval: false,
                creatorReviewQueueVisible: true,
            },
        },
        loading: false,
    },
    openAuthModal: vi.fn(),
}));

vi.mock("next/link", () => ({
    default: ({ href, children, ...props }: { href: string; children: ReactNode }) => (
        <a href={href} {...props}>{children}</a>
    ),
}));

vi.mock("@/components/Analytics/PageViewEvent", () => ({
    PageViewEvent: () => null,
}));

vi.mock("@/context/AuthContext", () => ({
    useAuth: () => mockState.authValue,
}));

vi.mock("@/context/UIContext", () => ({
    useUI: () => ({
        openAuthModal: mockState.openAuthModal,
    }),
}));

vi.mock("@/lib/authFetch", () => ({
    authFetch: vi.fn(),
}));

vi.mock("@/lib/client-error-reporting", () => ({
    reportClientIssue: vi.fn(),
}));

vi.mock("sonner", () => ({
    toast: {
        success: vi.fn(),
        error: vi.fn(),
    },
}));

import CreatorWaitlistPage from "@/app/creators/waitlist/page";

describe("CreatorWaitlistPage", () => {
    it("renders stage-based status without exposing a synthetic queue position", () => {
        const markup = renderToStaticMarkup(<CreatorWaitlistPage />);

        expect(markup).toContain("Stage: Application received");
        expect(markup).toContain("Creator intro");
        expect(markup).toContain("Acknowledge creator intro");
        expect(markup).toContain("Revise your application");
        expect(markup).toContain("No queue number is used on this page. Status is stage-based only.");
        expect(markup).not.toContain("777");
        expect(markup).not.toContain("in line");
    });

    it("renders the legal empty state and creator-specific support path truthfully", () => {
        const markup = renderToStaticMarkup(<CreatorWaitlistPage />);

        expect(markup).toContain("No documents have been sent yet.");
        expect(markup).toContain("Documents will appear here once your application reaches the legal review stage.");
        expect(markup).toContain("mailto:support@kandydrops.com?subject=Creator%20application%20support");
    });
});
