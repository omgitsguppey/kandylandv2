// @vitest-environment jsdom

import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockState = vi.hoisted(() => {
    let authValue: {
        user: { uid: string } | null;
        userProfile: Record<string, unknown> | null;
    } = {
        user: null,
        userProfile: null,
    };
    let pathname = "/dashboard/chat";

    let snapshotListener: ((snapshot: { docs: Array<{ data: () => unknown }> }) => void) | null = null;
    let snapshotErrorListener: ((error: unknown) => void) | null = null;
    let lastWhereField: string | null = null;

    return {
        db: { id: "mock-db" },
        reportRealtimeIssue: vi.fn(),
        collection: vi.fn((_db: unknown, name: string) => ({ type: "collection", name })),
        authFetch: vi.fn(),
        where: vi.fn((field: string, operator: string, value: string) => {
            lastWhereField = field;
            return { type: "where", field, operator, value };
        }),
        query: vi.fn((...parts: unknown[]) => ({ type: "query", parts })),
        onSnapshot: vi.fn((_query: unknown, next: typeof snapshotListener, error: typeof snapshotErrorListener) => {
            snapshotListener = next;
            snapshotErrorListener = error;
            return () => {
                snapshotListener = null;
                snapshotErrorListener = null;
            };
        }),
        setAuth(next: {
            user: { uid: string } | null;
            userProfile: Record<string, unknown> | null;
        }) {
            authValue = next;
        },
        setPathname(next: string) {
            pathname = next;
        },
        getAuth() {
            return authValue;
        },
        getPathname() {
            return pathname;
        },
        emitSnapshot(docs: Array<Record<string, unknown>>) {
            if (!snapshotListener) {
                throw new Error("Snapshot listener is not registered.");
            }

            snapshotListener({
                docs: docs.map((doc) => ({
                    data: () => doc,
                })),
            });
        },
        emitError(error: unknown) {
            if (!snapshotErrorListener) {
                throw new Error("Snapshot error listener is not registered.");
            }

            snapshotErrorListener(error);
        },
        getLastWhereField() {
            return lastWhereField;
        },
        reset() {
            authValue = { user: null, userProfile: null };
            pathname = "/dashboard/chat";
            snapshotListener = null;
            snapshotErrorListener = null;
            lastWhereField = null;
            this.reportRealtimeIssue.mockReset();
            this.authFetch.mockReset();
            this.authFetch.mockResolvedValue({
                ok: true,
                async json() {
                    return { threads: [] };
                },
            });
            this.collection.mockClear();
            this.where.mockClear();
            this.query.mockClear();
            this.onSnapshot.mockClear();
        },
    };
});

vi.mock("@/context/AuthContext", () => ({
    useAuth: () => mockState.getAuth(),
}));
vi.mock("next/navigation", () => ({
    usePathname: () => mockState.getPathname(),
}));

vi.mock("@/lib/firebase-data", () => ({
    db: mockState.db,
}));
vi.mock("@/lib/authFetch", () => ({
    authFetch: mockState.authFetch,
}));

vi.mock("firebase/firestore", () => ({
    collection: mockState.collection,
    onSnapshot: mockState.onSnapshot,
    query: mockState.query,
    where: mockState.where,
}));

vi.mock("@/lib/client-error-reporting", () => ({
    reportRealtimeIssue: mockState.reportRealtimeIssue,
}));

import { useChatUnreadStatus } from "@/hooks/useChatUnreadStatus";
import { renderHook } from "./utils/renderHook";

describe("useChatUnreadStatus", () => {
    afterEach(() => {
        document.body.innerHTML = "";
    });

    beforeEach(() => {
        mockState.reset();
    });

    it("subscribes on the creator lane for approved legacy creators and reports unread state", () => {
        mockState.setAuth({
            user: { uid: "creator_legacy" },
            userProfile: {
                role: "user",
                status: "active",
                creatorApplication: {
                    approvalStatus: "creator_approved",
                },
            },
        });

        const hook = renderHook(() => useChatUnreadStatus());

        expect(mockState.getLastWhereField()).toBe("creatorId");

        act(() => {
            mockState.emitSnapshot([{
                creatorId: "creator_legacy",
                userId: "fan_1",
                unreadCountForCreator: 2,
                unreadCountForUser: 0,
            }]);
        });

        expect(hook.result.current.hasUnreadMessages).toBe(true);

        hook.unmount();
    });

    it("clears the unread badge state when the realtime subscription errors", () => {
        mockState.setAuth({
            user: { uid: "fan_1" },
            userProfile: {
                role: "user",
                status: "active",
            },
        });

        const hook = renderHook(() => useChatUnreadStatus());

        act(() => {
            mockState.emitSnapshot([{
                creatorId: "creator_1",
                userId: "fan_1",
                unreadCountForCreator: 0,
                unreadCountForUser: 1,
            }]);
        });
        expect(hook.result.current.hasUnreadMessages).toBe(true);

        act(() => {
            mockState.emitError(new Error("permission denied"));
        });

        expect(hook.result.current.hasUnreadMessages).toBe(false);
        expect(mockState.reportRealtimeIssue).toHaveBeenCalledWith(
            "chat unread status",
            expect.any(Error),
            expect.objectContaining({ userId: "fan_1" }),
        );

        hook.unmount();
    });

    it("falls back to the server thread list when the realtime subscription fails", async () => {
        mockState.setAuth({
            user: { uid: "fan_1" },
            userProfile: {
                role: "user",
                status: "active",
            },
        });
        mockState.authFetch.mockResolvedValue({
            ok: true,
            async json() {
                return {
                    threads: [{
                        id: "creator_creator_1__user_fan_1",
                        creatorId: "creator_1",
                        userId: "fan_1",
                        viewerRole: "user",
                        unreadCountForCreator: 0,
                        unreadCountForUser: 2,
                    }],
                };
            },
        });

        const hook = renderHook(() => useChatUnreadStatus());

        await act(async () => {
            mockState.emitError(new Error("FIRESTORE (12.11.0) INTERNAL ASSERTION FAILED: Unexpected state (ID: b815) CONTEXT: {\"Pc\":\"FIRESTORE (12.11.0) INTERNAL ASSERTION FAILED: Unexpected state (ID: ca9) CONTEXT: {\\\"ve\\\":-1}\"}"));
            await Promise.resolve();
            await Promise.resolve();
        });

        expect(mockState.authFetch).toHaveBeenCalledWith("/api/chat/threads");
        expect(hook.result.current.hasUnreadMessages).toBe(true);

        hook.unmount();
    });

    it("returns a false unread state after auth is removed on rerender", () => {
        mockState.setAuth({
            user: { uid: "fan_1" },
            userProfile: {
                role: "user",
                status: "active",
            },
        });

        const hook = renderHook(() => useChatUnreadStatus());

        act(() => {
            mockState.emitSnapshot([{
                creatorId: "creator_1",
                userId: "fan_1",
                unreadCountForCreator: 0,
                unreadCountForUser: 1,
            }]);
        });
        expect(hook.result.current.hasUnreadMessages).toBe(true);

        mockState.setAuth({
            user: null,
            userProfile: null,
        });
        hook.rerender();

        expect(hook.result.current.hasUnreadMessages).toBe(false);

        hook.unmount();
    });

    it("uses polling instead of a Firestore listener outside the chat route", async () => {
        mockState.setPathname("/creators/jessica");
        mockState.setAuth({
            user: { uid: "fan_1" },
            userProfile: {
                role: "user",
                status: "active",
            },
        });
        mockState.authFetch.mockResolvedValue({
            ok: true,
            async json() {
                return {
                    threads: [{
                        id: "creator_creator_1__user_fan_1",
                        creatorId: "creator_1",
                        userId: "fan_1",
                        viewerRole: "user",
                        unreadCountForCreator: 0,
                        unreadCountForUser: 1,
                    }],
                };
            },
        });

        const hook = renderHook(() => useChatUnreadStatus());

        await act(async () => {
            await Promise.resolve();
            await Promise.resolve();
        });

        expect(mockState.onSnapshot).not.toHaveBeenCalled();
        expect(mockState.authFetch).toHaveBeenCalledWith("/api/chat/threads");
        expect(hook.result.current.hasUnreadMessages).toBe(true);

        hook.unmount();
    });
});
