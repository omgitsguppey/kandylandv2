// @vitest-environment happy-dom

import { cleanup, render } from "@testing-library/react";
import { StrictMode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import DashboardClient from "@/app/dashboard/DashboardClient";
import { LibraryClient } from "@/app/dashboard/library/LibraryClient";
import { PageViewEvent } from "@/components/Analytics/PageViewEvent";
import type { UserProfile } from "@/types/db";
import { buildCanonicalUserFixture } from "@/lib/testing/canonical-test-factories";

const state = vi.hoisted(() => ({
    user: null as { uid: string } | null,
    userProfile: null as Partial<UserProfile> | null,
    loading: false,
    trackEvent: vi.fn(),
    openPurchaseModal: vi.fn(),
    replace: vi.fn(),
    push: vi.fn(),
}));

vi.mock("@/context/AuthContext", () => ({ useAuth: () => ({ user: state.user, userProfile: state.userProfile, loading: state.loading }) }));
vi.mock("@/context/UIContext", () => ({ useUI: () => ({ openPurchaseModal: state.openPurchaseModal }) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: state.replace, push: state.push }), useSearchParams: () => new URLSearchParams() }));
vi.mock("next/dynamic", () => ({ default: () => () => null }));
vi.mock("@/hooks/useDrops", () => ({ useDrops: () => ({ drops: [], nowMs: 1_000 }) }));
vi.mock("@/lib/telemetry", () => ({ trackEvent: (...args: unknown[]) => state.trackEvent(...args) }));
vi.mock("@/components/CreatorDiscoveryRail", () => ({ CreatorDiscoveryRail: () => null }));
vi.mock("@/components/Dashboard/DailyCheckIn", () => ({ DailyCheckIn: () => null }));
vi.mock("@/components/Dashboard/CollectionList", () => ({ CollectionList: () => null }));
vi.mock("@/components/Dashboard/OwnedDropGalleryCard", () => ({ OwnedDropGalleryCard: () => null }));
vi.mock("@/components/creative-tim/kandydrops/signed-in/SignedInDashboardHeader", () => ({ SignedInDashboardHeader: () => null }));
vi.mock("@/components/creative-tim/kandydrops/signed-in/SignedInDashboardJourney", () => ({ SignedInDashboardJourney: () => null }));
vi.mock("@/components/creative-tim/kandydrops/signed-in/SignedInLibraryCollectionWall", () => ({ SignedInLibraryCollectionWall: () => null }));

function account(uid: string) {
    state.user = { uid };
    state.userProfile = buildCanonicalUserFixture({ uid, unlockedContent: [], gumDropsBalance: 50 });
    state.loading = false;
}

const surfaces = [
    { name: "Dashboard", eventName: "dashboard_viewed", render: () => <DashboardClient drops={[]} creatorRailProfiles={[]} /> },
    { name: "Library", eventName: "library_viewed", render: () => <LibraryClient drops={[]} /> },
];

beforeEach(() => {
    state.user = null;
    state.userProfile = null;
    state.loading = false;
    state.trackEvent.mockReset();
    state.replace.mockReset();
});
afterEach(cleanup);

describe.each(surfaces)("$name uses the shared page-view lifecycle", (surface) => {
    it("waits for the profile to belong to the resolved actor", () => {
        account("member-a");
        state.userProfile = buildCanonicalUserFixture({ uid: "member-b" });
        const view = render(surface.render());
        expect(state.trackEvent).not.toHaveBeenCalled();
        account("member-a");
        view.rerender(surface.render());
        expect(state.trackEvent).toHaveBeenCalledTimes(1);
        expect(state.trackEvent.mock.calls[0]?.[0]).toBe(surface.eventName);
    });

    it("does not count the previous actor's profile during an account switch", () => {
        account("member-a");
        const view = render(surface.render());
        state.user = { uid: "member-b" };
        view.rerender(surface.render());
        expect(state.trackEvent).toHaveBeenCalledTimes(1);
        account("member-b");
        view.rerender(surface.render());
        expect(state.trackEvent).toHaveBeenCalledTimes(2);
        state.userProfile = { ...state.userProfile, displayName: "Updated B" };
        view.rerender(surface.render());
        expect(state.trackEvent).toHaveBeenCalledTimes(2);
    });

    it("does not turn balance, check-in, settings or collection updates into visits", () => {
        account("member-a");
        const view = render(surface.render());
        state.userProfile = { ...state.userProfile, gumDropsBalance: 75 };
        view.rerender(surface.render());
        state.userProfile = { ...state.userProfile, lastCheckIn: 1_000, streakCount: 3 };
        view.rerender(surface.render());
        state.userProfile = { ...state.userProfile, displayName: "Updated name" };
        view.rerender(surface.render());
        state.userProfile = { ...state.userProfile, unlockedContent: ["new-drop"] };
        view.rerender(surface.render());
        expect(state.trackEvent).toHaveBeenCalledTimes(1);
        expect(state.trackEvent.mock.calls[0]?.[0]).toBe(surface.eventName);
    });

    it("waits for auth and profile, then preserves the visit through unresolved auth and profile gaps", () => {
        state.loading = true;
        const view = render(surface.render());
        expect(state.trackEvent).not.toHaveBeenCalled();
        state.user = { uid: "member-a" };
        state.loading = false;
        view.rerender(surface.render());
        expect(state.trackEvent).not.toHaveBeenCalled();
        account("member-a");
        view.rerender(surface.render());
        expect(state.trackEvent).toHaveBeenCalledTimes(1);
        expect(state.trackEvent.mock.calls[0]?.[0]).toBe(surface.eventName);

        state.loading = true;
        state.user = null;
        state.userProfile = null;
        view.rerender(surface.render());
        account("member-a");
        view.rerender(surface.render());
        state.userProfile = null;
        view.rerender(surface.render());
        account("member-a");
        view.rerender(surface.render());
        expect(state.trackEvent).toHaveBeenCalledTimes(1);
        expect(state.trackEvent.mock.calls[0]?.[0]).toBe(surface.eventName);
    });

    it("counts actor changes, resolved logout then login, and real visit remounts", () => {
        account("member-a");
        const view = render(surface.render());
        account("member-b");
        view.rerender(surface.render());
        expect(state.trackEvent).toHaveBeenCalledTimes(2);
        state.user = null;
        state.userProfile = null;
        view.rerender(surface.render());
        account("member-a");
        view.rerender(surface.render());
        expect(state.trackEvent).toHaveBeenCalledTimes(3);
        view.unmount();
        render(surface.render());
        expect(state.trackEvent).toHaveBeenCalledTimes(4);
    });

    it("keeps StrictMode effect replay from duplicating a visit", () => {
        account("member-a");
        render(<StrictMode>{surface.render()}</StrictMode>);
        expect(state.trackEvent).toHaveBeenCalledTimes(1);
        expect(state.trackEvent.mock.calls[0]?.[0]).toBe(surface.eventName);
    });
});

describe("legacy PageViewEvent defaults", () => {
    it("keeps one fact per mount even when inline params or the event name change", () => {
        const view = render(<PageViewEvent eventName="settings_surface_viewed" eventParams={{ section: "account" }} />);
        view.rerender(<PageViewEvent eventName="settings_surface_viewed" eventParams={{ section: "account", refreshed: true }} />);
        view.rerender(<PageViewEvent eventName="another_view" eventParams={{ section: "account" }} />);
        expect(state.trackEvent).toHaveBeenCalledExactlyOnceWith("settings_surface_viewed", { section: "account" });
        view.unmount();
        render(<PageViewEvent eventName="settings_surface_viewed" eventParams={{ section: "account" }} />);
        expect(state.trackEvent).toHaveBeenCalledTimes(2);
    });

    it("preserves the default once-per-mount behavior under StrictMode", () => {
        render(<StrictMode><PageViewEvent eventName="support_inbox_viewed" /></StrictMode>);
        expect(state.trackEvent).toHaveBeenCalledExactlyOnceWith("support_inbox_viewed", undefined);
    });
});

describe("explicit target and projection visits", () => {
    it("counts target or projection navigation while ignoring fresh objects within the same visit", () => {
        const props = { eventName: "creator_dashboard_settings_viewed", actor: { id: "admin-a", loading: false }, ready: true };
        const view = render(<PageViewEvent {...props} visitKey="creator-a:projection-1" eventParams={{ target_creator_id: "creator-a" }} />);
        view.rerender(<PageViewEvent {...props} visitKey="creator-a:projection-1" eventParams={{ target_creator_id: "creator-a", refreshed: true }} />);
        expect(state.trackEvent).toHaveBeenCalledTimes(1);
        view.rerender(<PageViewEvent {...props} visitKey="creator-b:projection-2" eventParams={{ target_creator_id: "creator-b" }} />);
        view.rerender(<PageViewEvent {...props} visitKey="creator-a:projection-3" eventParams={{ target_creator_id: "creator-a" }} />);
        expect(state.trackEvent).toHaveBeenCalledTimes(3);
        expect(state.trackEvent.mock.calls.map(([, params]) => params.target_creator_id)).toEqual(["creator-a", "creator-b", "creator-a"]);
    });
});
