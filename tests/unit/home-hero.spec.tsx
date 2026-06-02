// @vitest-environment happy-dom

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import Hero from "@/components/Hero";
import { HomeHeroActions } from "@/components/Landing/HomeHeroActions";
import type { Drop } from "@/types/db";

const mockState = vi.hoisted(() => ({
    user: null as { uid: string } | null,
    loading: false,
    openAuthModal: vi.fn(),
    trackEvent: vi.fn(),
}));

vi.mock("@/context/AuthContext", () => ({
    useAuthIdentity: () => ({ user: mockState.user }),
    useAuthLoading: () => ({ loading: mockState.loading }),
}));

vi.mock("@/context/UIContext", () => ({
    useUIActions: () => ({ openAuthModal: mockState.openAuthModal }),
}));

vi.mock("@/lib/telemetry", () => ({
    trackEvent: (...args: unknown[]) => mockState.trackEvent(...args),
}));

vi.mock("@/components/Landing/DeferredHomeDropTicker", () => ({
    DeferredHomeDropTicker: ({ drops }: { drops: Drop[] }) => (
        <div data-testid="deferred-home-drop-ticker" data-drop-count={drops.length} />
    ),
}));

function buildDrop(id: string): Drop {
    return {
        id,
        title: `Drop ${id}`,
        description: "A test Drop",
        imageUrl: "/test.png",
        contentUrl: "/content.png",
        unlockCost: 25,
        validFrom: 0,
        status: "active",
        totalUnlocks: 0,
    };
}

describe("home hero", () => {
    beforeEach(() => {
        mockState.user = null;
        mockState.loading = false;
        mockState.openAuthModal.mockReset();
        mockState.trackEvent.mockReset();
    });

    it("renders the core hero copy without replacing the shell with live-status loading", () => {
        render(<Hero activeDrops={[]} />);

        expect(screen.getByText("Exclusive Creator Experiences")).toBeInTheDocument();
        expect(screen.getByText("KandyDrops")).toBeInTheDocument();
        expect(screen.getByText("for your eyes only.")).toBeInTheDocument();
        expect(screen.getByText("Unwrap KandyDrops from your favorite creators before they disappear!")).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /Unwrap Your KandyDrops/i })).toBeInTheDocument();
        expect(screen.getByRole("link", { name: /See How It Works/i })).toBeInTheDocument();
        expect(screen.getByText(/Live Now:/i)).toBeInTheDocument();
        expect(screen.queryByText(/skeleton/i)).not.toBeInTheDocument();
    });

    it("tracks the hero view and live chip exactly once across rerenders", async () => {
        const drops = Array.from({ length: 6 }, (_, index) => buildDrop(`drop-${index}`));
        const { rerender } = render(<Hero activeDrops={drops} />);

        await waitFor(() => {
            expect(mockState.trackEvent).toHaveBeenCalledWith("homepage_hero_viewed", expect.objectContaining({
                route: "/",
                source_component: "home_hero",
            }));
        });

        await waitFor(() => {
            expect(mockState.trackEvent).toHaveBeenCalledWith("homepage_live_chip_viewed", expect.objectContaining({
                drop_count: 6,
                route: "/",
                source_component: "home_hero_activity_ticker",
            }));
        });

        rerender(<Hero activeDrops={drops} />);

        expect(mockState.trackEvent.mock.calls.filter(([eventName]) => eventName === "homepage_hero_viewed")).toHaveLength(1);
        expect(mockState.trackEvent.mock.calls.filter(([eventName]) => eventName === "homepage_live_chip_viewed")).toHaveLength(1);
    });

    it("keeps the live chip dimensions stable for dynamic count hydration", () => {
        render(<Hero activeDrops={Array.from({ length: 6 }, (_, index) => buildDrop(`drop-${index}`))} />);

        const liveChip = screen.getByTestId("home-hero-live-chip");

        expect(liveChip).toHaveAttribute("data-home-live-chip-state", "ready");
        expect(liveChip.className).toContain("min-h-");
        expect(liveChip.textContent).toContain("Live Now: 6 KandyDrops are ready to unwrap!");
    });
});

describe("home hero actions", () => {
    beforeEach(() => {
        mockState.user = null;
        mockState.loading = false;
        mockState.openAuthModal.mockReset();
        mockState.trackEvent.mockReset();
    });

    it("emits exactly one canonical primary CTA click event", () => {
        render(<HomeHeroActions />);

        fireEvent.click(screen.getByRole("button", { name: /Unwrap Your KandyDrops/i }));

        expect(mockState.trackEvent.mock.calls.filter(([eventName]) => eventName === "hero_cta_clicked")).toHaveLength(1);
        expect(mockState.trackEvent).toHaveBeenCalledWith("hero_cta_clicked", expect.objectContaining({
            action: "open_signup",
            cta_id: "homepage_unwrap_cta_clicked",
            destination: "auth_signup",
            route: "/",
            source_component: "home_hero_actions",
        }));
        expect(mockState.openAuthModal).toHaveBeenCalledWith("signup");
    });

    it("emits exactly one canonical secondary CTA click event", () => {
        render(<HomeHeroActions />);

        fireEvent.click(screen.getByRole("link", { name: /See How It Works/i }));

        expect(mockState.trackEvent.mock.calls.filter(([eventName]) => eventName === "hero_cta_clicked")).toHaveLength(1);
        expect(mockState.trackEvent).toHaveBeenCalledWith("hero_cta_clicked", expect.objectContaining({
            action: "homepage_how_it_works_clicked",
            destination: "/faq",
            route: "/",
            source_component: "home_hero_actions",
        }));
    });
});
