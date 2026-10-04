// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { PublicHomeExperience } from "@/components/Landing/PublicHomeExperience";
import { PublicHomeActions } from "@/components/Landing/PublicHomeActions";
import { PublicDropShelf } from "@/components/Landing/PublicDropShelf";
import type { Drop } from "@/types/db";
import { getKandyDropsMswScenario } from "../mocks/scenarios";

const state = vi.hoisted(() => ({
    user: null as { uid: string } | null,
    userProfile: null as { unlockedContent: string[] } | null,
    loading: false,
    openAuthModal: vi.fn(),
    trackEvent: vi.fn(),
    push: vi.fn(),
}));

vi.mock("@/context/AuthContext", () => ({
    useAuthIdentity: () => ({ user: state.user }),
    useAuthLoading: () => ({ loading: state.loading }),
    useUserProfile: () => ({ userProfile: state.userProfile }),
}));

vi.mock("@/context/UIContext", () => ({
    useUIActions: () => ({ openAuthModal: state.openAuthModal }),
}));

vi.mock("next/navigation", () => ({
    useRouter: () => ({ push: state.push }),
}));

vi.mock("@/lib/telemetry", () => ({
    trackEvent: (...args: unknown[]) => state.trackEvent(...args),
}));

vi.mock("@/components/CreatorDiscoveryRail", () => ({
    CreatorDiscoveryRail: () => <div data-testid="creator-rail" />,
}));

// This fixture isolates the homepage-to-card contract. Actual locked media,
// server entitlement and impression ingestion keep their existing test owners.
vi.mock("@/components/DropCard", () => ({
    DropCard: ({
        drop,
        onPreview,
        isUnlocked,
        user,
        impressionTrackingSurface,
        impressionTrackingPosition,
    }: {
        drop: Drop;
        onPreview: (drop: Drop) => void;
        isUnlocked: boolean;
        user: { uid: string } | null;
        impressionTrackingSurface: string;
        impressionTrackingPosition: number;
    }) => (
        <article
            data-testid={"drop-" + drop.id}
            data-unlocked={String(isUnlocked)}
            data-actor={user?.uid ?? "guest"}
            data-impression-surface={impressionTrackingSurface}
            data-impression-position={impressionTrackingPosition}
        >
            <button type="button" onClick={() => onPreview(drop)}>Preview {drop.title}</button>
        </article>
    ),
}));

function buildDrop(id: string, type?: Drop["type"]): Drop {
    return {
        ...getKandyDropsMswScenario("guestBrowsingDrops").drops[0],
        id,
        title: "Drop " + id,
        description: "A public Drop description",
        imageUrl: "/public-cover.png",
        contentUrl: "/protected-content.png",
        unlockCost: 25,
        validFrom: 0,
        status: "active",
        totalUnlocks: 0,
        ...(type ? { type } : {}),
    };
}

beforeEach(() => {
    state.user = null;
    state.userProfile = null;
    state.loading = false;
    state.openAuthModal.mockReset();
    state.trackEvent.mockReset();
    state.push.mockReset();
});

afterEach(cleanup);

describe("actual public homepage actions", () => {
    it("keeps the action unavailable while account access is resolving", () => {
        state.user = { uid: "member" };
        state.loading = true;
        render(<PublicHomeActions />);

        const pending = screen.getByRole("button", { name: "Checking account access" });
        expect(pending).toBeDisabled();
        expect(pending).toHaveAttribute("aria-busy", "true");
        expect(screen.queryByRole("link", { name: /Go to Dashboard/i })).not.toBeInTheDocument();
        fireEvent.click(pending);
        expect(state.openAuthModal).not.toHaveBeenCalled();
        expect(state.trackEvent).not.toHaveBeenCalled();
    });

    it("opens signup with exactly one existing canonical guest CTA fact", () => {
        render(<PublicHomeActions />);
        fireEvent.click(screen.getByRole("button", { name: /Unwrap your KandyDrops/i }));

        expect(state.openAuthModal).toHaveBeenCalledExactlyOnceWith("signup");
        expect(state.trackEvent).toHaveBeenCalledExactlyOnceWith("hero_cta_clicked", {
            action: "open_signup",
            cta_id: "homepage_unwrap_cta_clicked",
            destination: "auth_signup",
            route: "/",
            source_component: "home_hero_actions",
        });
    });

    it("retains a real dashboard link and its one canonical member click fact", () => {
        state.user = { uid: "member" };
        render(<PublicHomeActions />);
        const link = screen.getByRole("link", { name: /Go to Dashboard/i });

        expect(link).toHaveAttribute("href", "/dashboard");
        fireEvent.click(link);
        expect(state.openAuthModal).not.toHaveBeenCalled();
        expect(state.trackEvent).toHaveBeenCalledExactlyOnceWith("hero_cta_clicked", {
            action: "homepage_dashboard_cta_clicked",
            destination: "/dashboard",
            route: "/",
            source_component: "home_hero_actions",
        });
    });
});

describe("actual public homepage featured source", () => {
    it("shows absence without advertising a live Drop or inventing a card action", () => {
        render(<PublicHomeExperience activeDrops={[]} initialCreators={[]} />);

        expect(screen.getByRole("heading", { level: 1, name: "Unwrap your KandyDrops" })).toBeInTheDocument();
        expect(screen.getByText("No featured Drop is available right now.")).toBeInTheDocument();
        expect(screen.queryByText(/\bLive\b/i)).not.toBeInTheDocument();
        expect(screen.queryByRole("button", { name: /^Preview / })).not.toBeInTheDocument();
        expect(screen.getByTestId("creator-rail")).toBeInTheDocument();
    });

    it("renders the actual featured Drop once and excludes its duplicates from the rest of the shelf", () => {
        const featured = buildDrop("featured");
        const other = buildDrop("other");
        render(<PublicHomeExperience activeDrops={[featured, other, featured]} initialCreators={[]} />);

        expect(screen.getAllByTestId("drop-featured")).toHaveLength(1);
        expect(screen.getByTestId("drop-featured")).toHaveAttribute("data-impression-surface", "home_featured_drop");
        expect(screen.getByTestId("drop-featured")).toHaveAttribute("data-impression-position", "1");
        expect(screen.getByTestId("drop-other")).toHaveAttribute("data-impression-surface", "home_public_drop_shelf");
    });
});

describe("homepage card handoff", () => {
    it("passes actual identity and unlocked state and encodes the featured preview target", () => {
        const drop = buildDrop("drop /?");
        state.user = { uid: "member" };
        state.userProfile = { unlockedContent: [drop.id] };
        render(<PublicDropShelf drops={[drop]} presentation="feature" />);

        expect(screen.getByTestId("drop-" + drop.id)).toHaveAttribute("data-unlocked", "true");
        expect(screen.getByTestId("drop-" + drop.id)).toHaveAttribute("data-actor", "member");
        fireEvent.click(screen.getByRole("button", { name: "Preview " + drop.title }));
        expect(state.push).toHaveBeenCalledExactlyOnceWith("/drops/drop%20%2F%3F/preview?source_component=public_home_featured_drop");
    });

    it("retains original impression positions when release and promotion groups are displayed separately", () => {
        const drops = [buildDrop("release-a"), buildDrop("promo", "promo"), buildDrop("release-b"), buildDrop("external", "external")];
        render(<PublicDropShelf drops={drops} presentation="shelf" />);

        drops.forEach((drop, index) => {
            expect(screen.getByTestId("drop-" + drop.id)).toHaveAttribute("data-impression-position", String(index + 1));
            expect(screen.getByTestId("drop-" + drop.id)).toHaveAttribute("data-impression-surface", "home_public_drop_shelf");
            expect(screen.getByTestId("drop-" + drop.id)).toHaveAttribute("data-unlocked", "false");
        });
        expect(screen.getByRole("complementary", { name: "Promotions" })).toContainElement(screen.getByTestId("drop-promo"));
        fireEvent.click(screen.getByRole("button", { name: "Preview Drop release-b" }));
        expect(state.push).toHaveBeenCalledExactlyOnceWith("/drops/release-b/preview?source_component=public_home_drop_shelf");
    });
});
