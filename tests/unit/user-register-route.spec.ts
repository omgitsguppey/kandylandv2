import { NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

type MockDocRef = {
    path: string;
    get: () => Promise<{ exists: boolean; data: () => Record<string, unknown> | undefined }>;
    set: (data: Record<string, unknown>, options?: { merge?: boolean }) => Promise<void>;
};

const mockState = vi.hoisted(() => {
    const documents = new Map<string, Record<string, unknown>>();

    const buildDocRef = (path: string): MockDocRef => ({
        path,
        async get() {
            return {
                exists: documents.has(path),
                data: () => documents.get(path),
            };
        },
        async set(data: Record<string, unknown>, options?: { merge?: boolean }) {
            const current = options?.merge ? (documents.get(path) ?? {}) : {};
            documents.set(path, {
                ...current,
                ...data,
            });
        },
    });

    const adminDb = {
        collection(name: string) {
            return {
                doc(id: string) {
                    return buildDocRef(`${name}/${id}`);
                },
            };
        },
        runTransaction: vi.fn(),
    };

    return {
        documents,
        adminDb,
        guardApiRequest: vi.fn(),
        handleApiError: vi.fn(),
        generateUniqueUsernameSuggestion: vi.fn(async () => "creator-one"),
        trackServerEvent: vi.fn(async () => undefined),
        ensureCreatorOnboardingSubmission: vi.fn(),
        sendCreatorOnboardingAdminNotification: vi.fn(async () => ({
            delivered: true,
            duplicate: false,
            adminCount: 1,
        })),
        reset() {
            documents.clear();
            adminDb.runTransaction.mockReset();
            this.guardApiRequest.mockReset();
            this.handleApiError.mockReset();
            this.generateUniqueUsernameSuggestion.mockReset();
            this.trackServerEvent.mockReset();
            this.ensureCreatorOnboardingSubmission.mockReset();
            this.sendCreatorOnboardingAdminNotification.mockReset();
            this.generateUniqueUsernameSuggestion.mockResolvedValue("creator-one");
            this.sendCreatorOnboardingAdminNotification.mockResolvedValue({
                delivered: true,
                duplicate: false,
                adminCount: 1,
            });
        },
    };
});

vi.mock("@/lib/server/firebase-admin", () => ({
    adminDb: mockState.adminDb,
}));

vi.mock("@/lib/server/auth", () => ({
    handleApiError: mockState.handleApiError,
}));

vi.mock("@/lib/server/request-guard", () => ({
    guardApiRequest: mockState.guardApiRequest,
}));

vi.mock("@/lib/server/username-suggestions", () => ({
    generateUniqueUsernameSuggestion: mockState.generateUniqueUsernameSuggestion,
}));

vi.mock("@/lib/server/rate-limit", () => ({
    STRICT: {},
}));

vi.mock("@/lib/privacy-policy", () => ({
    PRIVACY_POLICY_VERSION: "test-privacy-version",
}));

vi.mock("@/lib/server/analytics", () => ({
    trackServerEvent: mockState.trackServerEvent,
}));

vi.mock("@/lib/user-profile-validation", () => ({
    parseAdultDateOfBirth: vi.fn(() => ({ ok: true, value: "1990-01-01" })),
}));

vi.mock("@/lib/gumdrop-ledger", () => ({
    buildSourceAwareBalancePatch: vi.fn(() => ({})),
    creditSourceAwareGumdrops: vi.fn(() => ({ total: 0 })),
    normalizeGumdropBalance: vi.fn((value: unknown) => Number(value) || 0),
    readSourceAwareBalance: vi.fn(() => ({ total: 0 })),
}));

vi.mock("@/lib/server/gumdrop-ledger", () => ({
    buildCompletedGumdropTransaction: vi.fn(() => ({})),
}));

vi.mock("@/lib/server/user-runtime", () => ({
    touchUserRuntime: vi.fn(async () => undefined),
}));

vi.mock("@/lib/server/creator-onboarding", () => ({
    ensureCreatorOnboardingSubmission: mockState.ensureCreatorOnboardingSubmission,
}));

vi.mock("@/lib/server/creator-onboarding-alerts", () => ({
    sendCreatorOnboardingAdminNotification: mockState.sendCreatorOnboardingAdminNotification,
}));

import { POST } from "@/app/api/user/register/route";

describe("POST /api/user/register", () => {
    beforeEach(() => {
        mockState.reset();
        mockState.guardApiRequest.mockResolvedValue({
            uid: "creator_1",
            email: "creator@example.com",
        });
        mockState.handleApiError.mockImplementation((error: Error) => NextResponse.json({
            error: error.message,
        }, { status: 500 }));
    });

    it("creates a new creator signup and emits onboarding submission signals only once", async () => {
        mockState.ensureCreatorOnboardingSubmission.mockResolvedValue({
            created: true,
            creatorApplication: {
                creatorDisplayName: "Creator One",
                queuePosition: 42,
            },
        });

        const request = new NextRequest("http://localhost/api/user/register", {
            method: "POST",
            body: JSON.stringify({
                signupIntent: "creator",
                username: "creatorone",
                displayName: "Creator One",
                creatorDisplayName: "Creator One",
                creatorPrimaryPlatform: "TikTok",
                creatorContentFocus: "Launch drops",
            }),
        });

        const response = await POST(request);
        const payload = await response.json();

        expect(response.status).toBe(200);
        expect(payload).toMatchObject({
            success: true,
            welcomeBonus: 0,
        });
        expect(mockState.documents.get("users/creator_1")).toMatchObject({
            username: "creator-one",
            onboardingCompleted: false,
        });
        expect(mockState.ensureCreatorOnboardingSubmission).toHaveBeenCalledWith(expect.objectContaining({
            userId: "creator_1",
            creatorDisplayName: "Creator One",
            creatorPrimaryPlatform: "TikTok",
        }));
        expect(mockState.trackServerEvent).toHaveBeenCalledWith("creator_onboarding_submitted", expect.any(Object), "creator_1");
        expect(mockState.trackServerEvent).toHaveBeenCalledWith("creator_admin_queue_materialized", expect.any(Object), "creator_1");
        expect(mockState.sendCreatorOnboardingAdminNotification).toHaveBeenCalledWith(expect.objectContaining({
            eventKey: "creator_onboarding_submitted:creator_1",
            link: "/admin/user/creator_1",
        }));
    });

    it("does not emit duplicate creator submission signals when the canonical onboarding record already exists", async () => {
        mockState.documents.set("users/creator_1", {
            uid: "creator_1",
            email: "creator@example.com",
            displayName: "Existing Creator",
            username: "creator-one",
            role: "user",
            createdAt: 1_710_000_000_000,
        });
        mockState.ensureCreatorOnboardingSubmission.mockResolvedValue({
            created: false,
            creatorApplication: {
                creatorDisplayName: "Existing Creator",
                queuePosition: 88,
            },
        });

        const request = new NextRequest("http://localhost/api/user/register", {
            method: "POST",
            body: JSON.stringify({
                signupIntent: "creator",
                displayName: "Existing Creator",
                creatorDisplayName: "Existing Creator",
            }),
        });

        const response = await POST(request);
        const payload = await response.json();

        expect(response.status).toBe(200);
        expect(payload).toMatchObject({
            success: true,
            existing: true,
        });
        expect(mockState.ensureCreatorOnboardingSubmission).toHaveBeenCalledTimes(1);
        expect(mockState.trackServerEvent).not.toHaveBeenCalled();
        expect(mockState.sendCreatorOnboardingAdminNotification).not.toHaveBeenCalled();
    });
});
