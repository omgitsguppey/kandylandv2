import { beforeEach, describe, expect, it, vi } from "vitest";

const mockState = vi.hoisted(() => ({
    adminAuthGetUser: vi.fn(),
    adminDbCollection: vi.fn(),
    getDrop: vi.fn(),
    getDropRaw: vi.fn(),
    getViewerProfile: vi.fn(),
    cookies: vi.fn(),
    redirect: vi.fn(),
    resolveDropViewAccess: vi.fn(),
    sanitizeDropForClient: vi.fn(),
    toLockedDropPreviewSafeDrop: vi.fn(),
    verifyNavigationSessionCookieValue: vi.fn(),
}));

vi.mock("@/lib/server/drops", () => ({
    getDrop: mockState.getDrop,
    getDropRaw: mockState.getDropRaw,
    sanitizeDropForClient: mockState.sanitizeDropForClient,
}));

vi.mock("@/lib/server/firebase-admin", () => ({
    adminAuth: {
        getUser: mockState.adminAuthGetUser,
    },
    adminDb: {
        collection: mockState.adminDbCollection,
    },
}));

vi.mock("@/lib/navigation-session", () => ({
    NAV_SESSION_COOKIE: "kandydrops_nav_session",
    verifyNavigationSessionCookieValue: mockState.verifyNavigationSessionCookieValue,
}));

vi.mock("@/lib/drop-view-access", () => ({
    resolveDropViewAccess: mockState.resolveDropViewAccess,
}));

vi.mock("@/lib/locked-drop-preview-truth", () => ({
    toLockedDropPreviewSafeDrop: mockState.toLockedDropPreviewSafeDrop,
}));

vi.mock("next/headers", () => ({
    cookies: mockState.cookies,
}));

vi.mock("next/navigation", () => ({
    notFound: vi.fn(() => {
        throw new Error("not_found");
    }),
    redirect: mockState.redirect,
}));

vi.mock("@/components/Drops/LockedDropPreviewClient", () => ({
    LockedDropPreviewClient: () => null,
}));

import ViewerPage from "@/app/dashboard/viewer/page";
import { generateMetadata } from "@/app/drops/[id]/preview/page";

describe("dashboard viewer page", () => {
    beforeEach(() => {
        mockState.adminAuthGetUser.mockReset();
        mockState.adminDbCollection.mockReset();
        mockState.cookies.mockReset();
        mockState.getDrop.mockReset();
        mockState.getDropRaw.mockReset();
        mockState.getViewerProfile.mockReset();
        mockState.redirect.mockReset();
        mockState.redirect.mockImplementation((href: string) => {
            throw new Error(`redirect:${href}`);
        });
        mockState.resolveDropViewAccess.mockReset();
        mockState.sanitizeDropForClient.mockReset();
        mockState.toLockedDropPreviewSafeDrop.mockReset();
        mockState.verifyNavigationSessionCookieValue.mockReset();

        mockState.cookies.mockResolvedValue({
            get: vi.fn(() => ({ value: "signed-navigation-session" })),
        });
        mockState.verifyNavigationSessionCookieValue.mockResolvedValue({
            uid: "viewer_123",
            role: "user",
            state: "default",
            expiresAtMs: Date.now() + 60_000,
        });
        mockState.adminDbCollection.mockReturnValue({
            doc: vi.fn(() => ({ get: mockState.getViewerProfile })),
        });
        mockState.getViewerProfile.mockResolvedValue({
            exists: true,
            data: () => ({
                role: "user",
                status: "active",
                unlockedContent: ["drop_1"],
                unlockedContentTimestamps: { drop_1: 1 },
            }),
        });
        mockState.adminAuthGetUser.mockResolvedValue({ disabled: false });
        mockState.resolveDropViewAccess.mockReturnValue({ allowed: true });
    });

    it("requires the signed navigation session and entitlement before serializing a Drop", async () => {
        const rawDrop = { id: "drop_1", approvalStatus: "pending_review" };
        const safeDrop = { id: "drop_1", approvalStatus: "pending_review", contentUrl: "" };

        mockState.getDropRaw.mockResolvedValue(rawDrop);
        mockState.sanitizeDropForClient.mockReturnValue(safeDrop);

        const element = await ViewerPage({
            searchParams: Promise.resolve({ id: "drop_1" }),
        });

        expect(mockState.verifyNavigationSessionCookieValue).toHaveBeenCalledWith("signed-navigation-session");
        expect(mockState.getDropRaw).toHaveBeenCalledWith("drop_1");
        expect(mockState.resolveDropViewAccess).toHaveBeenCalledWith(expect.objectContaining({
            drop: rawDrop,
            requestedDropId: "drop_1",
            userId: "viewer_123",
            userProfile: expect.objectContaining({
                uid: "viewer_123",
                unlockedContent: ["drop_1"],
            }),
        }));
        expect(mockState.sanitizeDropForClient).toHaveBeenCalledWith(rawDrop);
        expect(element.props).toMatchObject({
            drop: safeDrop,
            requestedDropId: "drop_1",
            initialCreatorProfile: null,
        });
    });

    it.each([
        ["missing", undefined],
        ["invalid", "invalid-navigation-session"],
    ])("redirects a %s navigation session before reading account or Drop data", async (_label, cookieValue) => {
        mockState.cookies.mockResolvedValue({
            get: vi.fn(() => cookieValue === undefined ? undefined : ({ value: cookieValue })),
        });
        mockState.verifyNavigationSessionCookieValue.mockResolvedValue(null);

        await expect(ViewerPage({
            searchParams: Promise.resolve({ id: "drop_1" }),
        })).rejects.toThrow("redirect:/drops/drop_1/preview?source_component=dashboard_viewer_access_denied");

        expect(mockState.adminDbCollection).not.toHaveBeenCalled();
        expect(mockState.adminAuthGetUser).not.toHaveBeenCalled();
        expect(mockState.getDropRaw).not.toHaveBeenCalled();
        expect(mockState.resolveDropViewAccess).not.toHaveBeenCalled();
        expect(mockState.sanitizeDropForClient).not.toHaveBeenCalled();
    });

    it.each(["suspended", "banned"] as const)("redirects a %s account before reading or sanitizing a Drop", async (status) => {
        mockState.getViewerProfile.mockResolvedValue({
            exists: true,
            data: () => ({
                role: "user",
                status,
                unlockedContent: ["drop_1"],
                unlockedContentTimestamps: { drop_1: 1 },
            }),
        });

        await expect(ViewerPage({
            searchParams: Promise.resolve({ id: "drop_1" }),
        })).rejects.toThrow("redirect:/drops/drop_1/preview?source_component=dashboard_viewer_access_denied");

        expect(mockState.adminAuthGetUser).toHaveBeenCalledWith("viewer_123");
        expect(mockState.getDropRaw).not.toHaveBeenCalled();
        expect(mockState.resolveDropViewAccess).not.toHaveBeenCalled();
        expect(mockState.sanitizeDropForClient).not.toHaveBeenCalled();
    });

    it.each([
        ["missing", undefined],
        ["unrecognized legacy", "legacy_status"],
    ])("allows a %s profile status when Firebase Auth is active and entitlement is allowed", async (_label, status) => {
        const rawDrop = { id: "drop_1" };
        const safeDrop = { id: "drop_1", contentUrl: "" };
        mockState.getViewerProfile.mockResolvedValue({
            exists: true,
            data: () => ({
                role: "user",
                ...(status === undefined ? {} : { status }),
                unlockedContent: ["drop_1"],
                unlockedContentTimestamps: { drop_1: 1 },
            }),
        });
        mockState.getDropRaw.mockResolvedValue(rawDrop);
        mockState.sanitizeDropForClient.mockReturnValue(safeDrop);

        const element = await ViewerPage({
            searchParams: Promise.resolve({ id: "drop_1" }),
        });

        expect(mockState.adminAuthGetUser).toHaveBeenCalledWith("viewer_123");
        expect(mockState.getDropRaw).toHaveBeenCalledWith("drop_1");
        expect(mockState.resolveDropViewAccess).toHaveBeenCalledWith(expect.objectContaining({
            drop: rawDrop,
            userId: "viewer_123",
        }));
        expect(mockState.sanitizeDropForClient).toHaveBeenCalledWith(rawDrop);
        expect(element.props).toMatchObject({ drop: safeDrop });
    });

    it.each([
        ["disabled Firebase Auth account", () => mockState.adminAuthGetUser.mockResolvedValue({ disabled: true })],
        ["deleted Firebase Auth account", () => mockState.adminAuthGetUser.mockRejectedValue({ code: "auth/user-not-found" })],
    ])("redirects a %s before resolving entitlement", async (_label, arrange) => {
        arrange();

        await expect(ViewerPage({
            searchParams: Promise.resolve({ id: "drop_1" }),
        })).rejects.toThrow("redirect:/drops/drop_1/preview?source_component=dashboard_viewer_access_denied");

        expect(mockState.getDropRaw).not.toHaveBeenCalled();
        expect(mockState.resolveDropViewAccess).not.toHaveBeenCalled();
        expect(mockState.sanitizeDropForClient).not.toHaveBeenCalled();
    });

    it("redirects unentitled viewers before the raw Drop is sanitized", async () => {
        mockState.getDropRaw.mockResolvedValue({ id: "drop_1" });
        mockState.resolveDropViewAccess.mockReturnValue({ allowed: false });

        await expect(ViewerPage({
            searchParams: Promise.resolve({ id: "drop_1" }),
        })).rejects.toThrow("redirect:/drops/drop_1/preview?source_component=dashboard_viewer_access_denied");

        expect(mockState.sanitizeDropForClient).not.toHaveBeenCalled();
    });

    it("builds preview metadata from the locked-preview safe projection", async () => {
        const rawDrop = {
            id: "drop_1",
            title: "Internal title",
            description: "Internal description",
            imageUrl: "https://private.example/internal-cover.png",
        };
        const safePreviewDrop = {
            id: "drop_1",
            title: "Safe title",
            description: "Safe description",
            imageUrl: "https://cdn.example/public-cover.png",
        };
        mockState.getDrop.mockResolvedValue(rawDrop);
        mockState.toLockedDropPreviewSafeDrop.mockReturnValue(safePreviewDrop);

        const metadata = await generateMetadata({
            params: Promise.resolve({ id: "drop_1" }),
        });

        expect(mockState.toLockedDropPreviewSafeDrop).toHaveBeenCalledWith(rawDrop);
        expect(metadata).toMatchObject({
            title: "Safe title Preview",
            description: "Safe description",
            openGraph: {
                title: "Safe title Preview",
                description: "Safe description",
                images: [{ url: "https://cdn.example/public-cover.png", alt: "Safe title" }],
            },
        });
        expect(JSON.stringify(metadata)).not.toContain("Internal description");
        expect(JSON.stringify(metadata)).not.toContain("private.example");
    });
});
