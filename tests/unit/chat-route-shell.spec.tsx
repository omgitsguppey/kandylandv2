// @vitest-environment happy-dom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type MatchMediaController = {
    setMatches: (matches: boolean) => void;
};

function installMatchMedia(initialMatches: boolean): MatchMediaController {
    let matches = initialMatches;
    const listeners = new Set<(event: MediaQueryListEvent) => void>();

    Object.defineProperty(window, "matchMedia", {
        configurable: true,
        writable: true,
        value: vi.fn().mockImplementation(() => ({
            get matches() {
                return matches;
            },
            media: "(max-width: 767px)",
            onchange: null,
            addEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) => {
                listeners.add(listener);
            },
            removeEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) => {
                listeners.delete(listener);
            },
            addListener: (listener: (event: MediaQueryListEvent) => void) => {
                listeners.add(listener);
            },
            removeListener: (listener: (event: MediaQueryListEvent) => void) => {
                listeners.delete(listener);
            },
            dispatchEvent: () => true,
        })),
    });

    return {
        setMatches(nextMatches: boolean) {
            matches = nextMatches;
            const event = { matches } as MediaQueryListEvent;
            listeners.forEach((listener) => listener(event));
        },
    };
}

describe("ChatRouteShell", () => {
    const originalBodyOverflow = document.body.style.overflow;
    const originalDocumentOverflow = document.documentElement.style.overflow;
    let container: HTMLDivElement | null = null;
    let root: Root | null = null;

    beforeEach(() => {
        document.body.style.overflow = "";
        document.body.style.overscrollBehaviorY = "";
        document.documentElement.style.overflow = "";
        document.documentElement.style.overscrollBehaviorY = "";
        document.body.innerHTML = "<main></main>";
        container = document.createElement("div");
        document.body.appendChild(container);
        root = createRoot(container);
    });

    afterEach(() => {
        act(() => {
            root?.unmount();
        });
        root = null;
        container?.remove();
        container = null;
        document.body.style.overflow = originalBodyOverflow;
        document.body.style.overscrollBehaviorY = "";
        document.documentElement.style.overflow = originalDocumentOverflow;
        document.documentElement.style.overscrollBehaviorY = "";
        document.body.innerHTML = "";
        vi.restoreAllMocks();
    });

    it("does not lock document scrolling on compact viewports", async () => {
        installMatchMedia(true);
        const { ChatRouteShell } = await import("@/components/Chat/ChatRouteShell");

        act(() => {
            root?.render(
                <ChatRouteShell>
                    <div>chat</div>
                </ChatRouteShell>,
            );
        });

        expect(document.documentElement.style.overflow).toBe("");
        expect(document.body.style.overflow).toBe("");
    });

    it("locks document scrolling on non-compact viewports and restores on unmount", async () => {
        installMatchMedia(false);
        const { ChatRouteShell } = await import("@/components/Chat/ChatRouteShell");

        act(() => {
            root?.render(
                <ChatRouteShell>
                    <div>chat</div>
                </ChatRouteShell>,
            );
        });

        expect(document.documentElement.style.overflow).toBe("hidden");
        expect(document.body.style.overflow).toBe("hidden");

        act(() => {
            root?.unmount();
        });
        root = null;

        expect(document.documentElement.style.overflow).toBe("");
        expect(document.body.style.overflow).toBe("");
    });
});
