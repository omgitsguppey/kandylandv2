// @vitest-environment happy-dom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockState = vi.hoisted(() => ({
    pathname: "/",
    recordClientDiagnostic: vi.fn(),
}));

vi.mock("next/navigation", () => ({
    usePathname: () => mockState.pathname,
}));

vi.mock("@/lib/client-diagnostics", () => ({
    recordClientDiagnostic: (...args: unknown[]) => mockState.recordClientDiagnostic(...args),
}));

import { AutoScrollToTop } from "@/components/Navigation/AutoScrollToTop";

describe("AutoScrollToTop", () => {
    let container: HTMLDivElement;
    let root: Root;
    let scrollToSpy: ReturnType<typeof vi.fn>;
    let rafSpy: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        container = document.createElement("div");
        document.body.appendChild(container);
        root = createRoot(container);
        mockState.pathname = "/";
        mockState.recordClientDiagnostic.mockReset();
        scrollToSpy = vi.fn();
        rafSpy = vi.fn((callback: FrameRequestCallback) => {
            callback(16);
            return 1;
        });
        window.scrollTo = scrollToSpy as typeof window.scrollTo;
        window.requestAnimationFrame = rafSpy as typeof window.requestAnimationFrame;
        window.cancelAnimationFrame = vi.fn() as typeof window.cancelAnimationFrame;
    });

    afterEach(() => {
        act(() => {
            root.unmount();
        });
        container.remove();
    });

    it("skips the initial mount and only resets on real route transitions", async () => {
        await act(async () => {
            root.render(<AutoScrollToTop />);
        });

        expect(scrollToSpy).not.toHaveBeenCalled();

        mockState.pathname = "/drops";
        await act(async () => {
            root.render(<AutoScrollToTop />);
        });

        expect(scrollToSpy).toHaveBeenCalledTimes(2);

        await act(async () => {
            root.render(<AutoScrollToTop />);
        });

        expect(scrollToSpy).toHaveBeenCalledTimes(2);
    });

    it("records homepage resets when returning to the homepage", async () => {
        mockState.pathname = "/drops";
        await act(async () => {
            root.render(<AutoScrollToTop />);
        });

        mockState.pathname = "/";
        await act(async () => {
            root.render(<AutoScrollToTop />);
        });

        expect(scrollToSpy).toHaveBeenCalledTimes(2);
        expect(mockState.recordClientDiagnostic).toHaveBeenCalledWith(
            "ui",
            "Homepage scroll reset executed",
            expect.objectContaining({
                surface: "home",
                pathname: "/",
                qualityLabel: "live",
            }),
        );
    });
});
