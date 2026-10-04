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
    const originalMainHeight = document.querySelector("main") instanceof HTMLElement
        ? (document.querySelector("main") as HTMLElement).style.height
        : "";
    const originalMainBoxSizing = document.querySelector("main") instanceof HTMLElement
        ? (document.querySelector("main") as HTMLElement).style.boxSizing
        : "";
    const originalMainPaddingBottom = document.querySelector("main") instanceof HTMLElement
        ? (document.querySelector("main") as HTMLElement).style.paddingBottom
        : "";
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

    it("locks document scrolling on all viewports and restores on unmount", async () => {
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
        const main = document.querySelector("main") as HTMLElement | null;
        expect(main?.style.minHeight).toBe("0");
        expect(main?.style.boxSizing).toBe("border-box");
        expect(main?.style.paddingBottom).toBe("0px");

        act(() => {
            root?.unmount();
        });
        root = null;

        expect(document.documentElement.style.overflow).toBe("");
        expect(document.body.style.overflow).toBe("");
        expect(main?.style.height).toBe(originalMainHeight);
        expect(main?.style.boxSizing).toBe(originalMainBoxSizing);
        expect(main?.style.paddingBottom).toBe(originalMainPaddingBottom);
    });

    it("refreshes dock clearance after intrinsic height growth and restores previous shell state", async () => {
        vi.useFakeTimers();
        installMatchMedia(true);
        vi.spyOn(window.navigator, "userAgent", "get").mockReturnValue("Mozilla/5.0 (Linux; Android 15) AppleWebKit/537.36 Chrome/140 Mobile Safari/537.36");
        const viewportListeners = new Map<string, EventListener>();
        vi.stubGlobal("visualViewport", {
            height: 740,
            addEventListener: (type: string, listener: EventListener) => viewportListeners.set(type, listener),
            removeEventListener: (type: string) => viewportListeners.delete(type),
        });
        const observers: Array<{ callback: ResizeObserverCallback; disconnect: ReturnType<typeof vi.fn> }> = [];
        vi.stubGlobal("ResizeObserver", class {
            callback: ResizeObserverCallback;
            disconnect = vi.fn();
            observe = vi.fn();
            unobserve = vi.fn();
            constructor(callback: ResizeObserverCallback) { this.callback = callback; observers.push(this); }
        });
        const main = document.querySelector("main") as HTMLElement;
        main.style.paddingBottom = "7px";
        main.style.flex = "0 1 auto";
        main.style.setProperty("--user-mobile-chat-bottom-reserved-height", "31px");
        document.body.style.overflow = "clip";
        document.documentElement.style.setProperty("--kd-android-pwa-bottom-nav-height", "29px");
        const dock = document.createElement("nav");
        dock.setAttribute("aria-label", "Mobile navigation");
        document.body.appendChild(dock);
        let top = 650;
        vi.spyOn(dock, "getBoundingClientRect").mockImplementation(() => ({
            top, bottom: 720, left: 0, right: 360, width: 360, height: 720 - top, x: 0, y: top,
            toJSON: () => ({}),
        }));
        const { ChatRouteShell } = await import("@/components/Chat/ChatRouteShell");
        try {
            act(() => root?.render(<ChatRouteShell><div>chat</div></ChatRouteShell>));
            expect(document.documentElement.style.getPropertyValue("--kd-android-pwa-bottom-nav-height")).toBe("90px");
            expect(main.style.paddingBottom).toBe("0px");
            top = 610;
            await act(async () => {
                observers[0].callback([], {} as ResizeObserver);
                await vi.advanceTimersByTimeAsync(100);
            });
            expect(document.documentElement.style.getPropertyValue("--kd-android-pwa-bottom-nav-height")).toBe("130px");
            act(() => root?.unmount());
            root = null;
            expect(observers[0].disconnect).toHaveBeenCalledOnce();
            expect(viewportListeners.size).toBe(0);
            expect(document.documentElement.style.getPropertyValue("--kd-android-pwa-bottom-nav-height")).toBe("29px");
            expect(main.style.getPropertyValue("--user-mobile-chat-bottom-reserved-height")).toBe("31px");
            expect(main.style.paddingBottom).toBe("7px");
            expect(main.style.flex).toBe("0 1 auto");
            expect(document.body.style.overflow).toBe("clip");
        } finally {
            document.documentElement.style.removeProperty("--kd-android-pwa-bottom-nav-height");
            vi.useRealTimers();
            vi.unstubAllGlobals();
        }
    });


    it("recovers deferred dock mount, replacement and removal without observing unrelated content", async () => {
        vi.useFakeTimers();
        installMatchMedia(true);
        vi.spyOn(window.navigator, "userAgent", "get").mockReturnValue("Mozilla/5.0 (Linux; Android 15) AppleWebKit/537.36 Chrome/140 Mobile Safari/537.36");
        vi.stubGlobal("visualViewport", { height: 740, addEventListener: vi.fn(), removeEventListener: vi.fn() });
        const resizeObservers: Array<{ callback: ResizeObserverCallback; observe: ReturnType<typeof vi.fn>; unobserve: ReturnType<typeof vi.fn>; disconnect: ReturnType<typeof vi.fn> }> = [];
        vi.stubGlobal("ResizeObserver", class {
            callback: ResizeObserverCallback;
            observe = vi.fn(); unobserve = vi.fn(); disconnect = vi.fn();
            constructor(callback: ResizeObserverCallback) { this.callback = callback; resizeObservers.push(this); }
        });
        const makeDock = (top: number) => {
            const dock = document.createElement("nav");
            dock.setAttribute("aria-label", "Mobile navigation");
            vi.spyOn(dock, "getBoundingClientRect").mockReturnValue({
                top, bottom: 720, left: 0, right: 360, width: 360, height: 720 - top, x: 0, y: top, toJSON: () => ({}),
            });
            return dock;
        };
        const settle = () => act(async () => { await vi.advanceTimersByTimeAsync(100); });
        const { ChatRouteShell } = await import("@/components/Chat/ChatRouteShell");
        document.documentElement.style.setProperty("--kd-android-pwa-bottom-nav-height", "27px");
        const wrapper = document.createElement("div");
        try {
            act(() => root?.render(<ChatRouteShell><div>chat</div></ChatRouteShell>));
            expect(document.documentElement.style.getPropertyValue("--kd-android-pwa-bottom-nav-height")).toBe("0px");
            const query = vi.spyOn(document, "querySelector");
            const unrelated = document.createElement("article");
            document.body.appendChild(unrelated);
            unrelated.textContent = "message update";
            await settle();
            expect(query.mock.calls.filter(([selector]) => selector === 'nav[aria-label="Mobile navigation"]')).toHaveLength(0);
            const dock = makeDock(650);
            wrapper.appendChild(dock);
            document.body.appendChild(wrapper);
            await settle();
            expect(document.documentElement.style.getPropertyValue("--kd-android-pwa-bottom-nav-height")).toBe("90px");
            const successor = makeDock(620);
            dock.replaceWith(successor);
            await settle();
            expect(document.documentElement.style.getPropertyValue("--kd-android-pwa-bottom-nav-height")).toBe("120px");
            expect(resizeObservers[0].unobserve).toHaveBeenCalledWith(dock);
            expect(resizeObservers[0].observe).toHaveBeenCalledWith(successor);
            wrapper.remove();
            await settle();
            expect(document.documentElement.style.getPropertyValue("--kd-android-pwa-bottom-nav-height")).toBe("0px");
            act(() => root?.unmount()); root = null;
            expect(resizeObservers[0].disconnect).toHaveBeenCalledOnce();
            query.mockClear();
            document.body.appendChild(makeDock(590));
            await settle();
            expect(query.mock.calls.filter(([selector]) => selector === 'nav[aria-label="Mobile navigation"]')).toHaveLength(0);
            expect(document.documentElement.style.getPropertyValue("--kd-android-pwa-bottom-nav-height")).toBe("27px");
        } finally {
            wrapper.remove();
            document.documentElement.style.removeProperty("--kd-android-pwa-bottom-nav-height");
            vi.useRealTimers(); vi.unstubAllGlobals();
        }
    });
});


describe("Chat keyboard sizing custody", () => {
    let root: Root | null = null;
    let dock: HTMLElement;
    let dockHeight = 64;
    let viewportHeight = 500;
    const viewportListeners = new Map<string, EventListener>();
    const resizeObservers: Array<{ callback: ResizeObserverCallback; disconnect: ReturnType<typeof vi.fn> }> = [];
    const originalStyle = document.documentElement.getAttribute("style");
    beforeEach(() => {
        vi.useFakeTimers();
        installMatchMedia(true);
        vi.spyOn(window.navigator, "userAgent", "get").mockReturnValue("Mozilla/5.0 (iPhone; CPU iPhone OS 18_4 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148");
        dockHeight = 64;
        viewportHeight = 500;
        viewportListeners.clear();
        resizeObservers.length = 0;
        vi.stubGlobal("visualViewport", {
            get height() { return viewportHeight; }, offsetTop: 0, scale: 1,
            addEventListener: (type: string, listener: EventListener) => viewportListeners.set(type, listener),
            removeEventListener: (type: string) => viewportListeners.delete(type),
        });
        vi.stubGlobal("ResizeObserver", class {
            callback: ResizeObserverCallback;
            disconnect = vi.fn(); observe = vi.fn(); unobserve = vi.fn();
            constructor(callback: ResizeObserverCallback) { this.callback = callback; resizeObservers.push(this); }
        });
        vi.spyOn(window, "innerHeight", "get").mockReturnValue(800);
        document.body.innerHTML = '<main></main><nav aria-label="Mobile navigation"></nav>';
        document.documentElement.style.setProperty("--kd-mobile-bottom-nav-bottom-offset", "300px");
        dock = document.querySelector('nav[aria-label="Mobile navigation"]') as HTMLElement;
        // This is the existing fixed dock's layout-viewport coordinate behavior.
        // Changing the canonical bottom offset must change its visible geometry.
        vi.spyOn(dock, "getBoundingClientRect").mockImplementation(() => {
            const bottom = 800 - (Number.parseFloat(document.documentElement.style.getPropertyValue("--kd-mobile-bottom-nav-bottom-offset")) || 0);
            return { top: bottom - dockHeight, bottom, left: 0, right: 360, width: 360, height: dockHeight, x: 0, y: bottom - dockHeight, toJSON: () => ({}) };
        });
        root = createRoot(document.querySelector("main") as HTMLElement);
    });
    afterEach(() => {
        act(() => root?.unmount());
        root = null;
        document.body.innerHTML = "";
        if (originalStyle === null) document.documentElement.removeAttribute("style");
        else document.documentElement.setAttribute("style", originalStyle);
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
        vi.useRealTimers();
    });
    it("does not return the visible iOS dock below a keyboard-shrunken viewport", async () => {
        const { ChatRouteShell } = await import("@/components/Chat/ChatRouteShell");
        expect(dock.getBoundingClientRect().bottom).toBe(500);
        act(() => root?.render(<ChatRouteShell><textarea aria-label="Message" /></ChatRouteShell>));
        expect(dock.getBoundingClientRect().bottom).toBeLessThanOrEqual(500);
        expect(document.documentElement.style.getPropertyValue("--chat-visual-viewport-height")).toBe("500px");
    });
    it("does not count keyboard occlusion as a second iOS content reservation", async () => {
        const { ChatRouteShell } = await import("@/components/Chat/ChatRouteShell");
        act(() => root?.render(<ChatRouteShell><textarea aria-label="Message" /></ChatRouteShell>));
        const safeBottom = Number.parseFloat(document.documentElement.style.getPropertyValue("--kd-ios-pwa-safe-bottom"));
        const navHeight = Number.parseFloat(document.documentElement.style.getPropertyValue("--kd-ios-pwa-bottom-nav-height"));
        const gap = Number.parseFloat(document.documentElement.style.getPropertyValue("--kd-ios-pwa-chat-bottom-gap"));
        // The admitted dock was 64px at the bottom of the 500px visual viewport.
        // Its one reservation can include the existing 10px control gap, not 300px keyboard space.
        expect(navHeight + safeBottom + gap).toBeLessThanOrEqual(74);
    });

    it("recovers focus, resize and blur without losing the draft or moving the dock", async () => {
        const { ChatRouteShell } = await import("@/components/Chat/ChatRouteShell");
        act(() => root?.render(<ChatRouteShell><textarea aria-label="Message" defaultValue="Retained draft" /></ChatRouteShell>));
        const textarea = document.querySelector("textarea") as HTMLTextAreaElement;
        textarea.focus();
        expect(document.activeElement).toBe(textarea);
        viewportHeight = 430;
        // CoreLayoutWrapper's existing owner moves the fixed dock for the new viewport.
        document.documentElement.style.setProperty("--kd-mobile-bottom-nav-bottom-offset", "370px");
        await act(async () => { viewportListeners.get("resize")?.(new Event("resize")); await vi.advanceTimersByTimeAsync(100); });
        expect(dock.getBoundingClientRect().bottom).toBe(430);
        expect(document.documentElement.style.getPropertyValue("--kd-ios-pwa-safe-bottom")).toBe("0px");
        expect(document.documentElement.style.getPropertyValue("--chat-visual-viewport-height")).toBe("430px");
        expect(textarea.value).toBe("Retained draft");
        expect(document.activeElement).toBe(textarea);
        textarea.blur(); viewportHeight = 800;
        document.documentElement.style.setProperty("--kd-mobile-bottom-nav-bottom-offset", "0px");
        await act(async () => { window.dispatchEvent(new Event("blur")); viewportListeners.get("resize")?.(new Event("resize")); await vi.advanceTimersByTimeAsync(100); });
        expect(dock.getBoundingClientRect().bottom).toBe(800);
        expect(document.documentElement.style.getPropertyValue("--chat-visual-viewport-height")).toBe("800px");
        expect(document.documentElement.style.getPropertyValue("--kd-ios-pwa-bottom-nav-height")).toBe("64px");
        expect(document.documentElement.style.getPropertyValue("--kd-ios-pwa-safe-bottom")).toBe("0px");
        expect(textarea.value).toBe("Retained draft");
        expect(document.activeElement).not.toBe(textarea);
        expect(document.body.style.overflow).toBe("hidden");
    });
    it("reserves only the visible portion of a partially obscured dock", async () => {
        document.documentElement.style.setProperty("--kd-mobile-bottom-nav-bottom-offset", "260px");
        const { ChatRouteShell } = await import("@/components/Chat/ChatRouteShell");
        act(() => root?.render(<ChatRouteShell><textarea aria-label="Message" /></ChatRouteShell>));
        expect(document.documentElement.style.getPropertyValue("--kd-ios-pwa-bottom-nav-height")).toBe("24px");
        expect(document.documentElement.style.getPropertyValue("--kd-ios-pwa-safe-bottom")).toBe("0px");
        expect(document.documentElement.style.getPropertyValue("--kd-mobile-bottom-nav-bottom-offset")).toBe("260px");
    });
    it("recovers an iOS deferred dock, height change and removal without keyboard padding", async () => {
        dock.remove();
        const { ChatRouteShell } = await import("@/components/Chat/ChatRouteShell");
        act(() => root?.render(<ChatRouteShell><textarea aria-label="Message" /></ChatRouteShell>));
        expect(document.documentElement.style.getPropertyValue("--kd-ios-pwa-bottom-nav-height")).toBe("0px");
        expect(document.documentElement.style.getPropertyValue("--kd-ios-pwa-safe-bottom")).toBe("0px");
        document.body.appendChild(dock);
        await act(async () => { await vi.advanceTimersByTimeAsync(100); });
        expect(document.documentElement.style.getPropertyValue("--kd-ios-pwa-bottom-nav-height")).toBe("64px");
        dockHeight = 96;
        await act(async () => { resizeObservers[0].callback([], {} as ResizeObserver); await vi.advanceTimersByTimeAsync(100); });
        expect(document.documentElement.style.getPropertyValue("--kd-ios-pwa-bottom-nav-height")).toBe("96px");
        dock.remove();
        await act(async () => { await vi.advanceTimersByTimeAsync(100); });
        expect(document.documentElement.style.getPropertyValue("--kd-ios-pwa-bottom-nav-height")).toBe("0px");
        expect(document.documentElement.style.getPropertyValue("--kd-ios-pwa-safe-bottom")).toBe("0px");
    });
    it("restores Chat-owned state while preserving a later canonical navigation offset", async () => {
        document.documentElement.style.setProperty("--kd-ios-pwa-safe-bottom", "7px");
        const { ChatRouteShell } = await import("@/components/Chat/ChatRouteShell");
        act(() => root?.render(<ChatRouteShell><textarea aria-label="Message" /></ChatRouteShell>));
        document.documentElement.style.setProperty("--kd-mobile-bottom-nav-bottom-offset", "42px");
        viewportListeners.get("resize")?.(new Event("resize"));
        act(() => root?.unmount()); root = null;
        await act(async () => { await vi.advanceTimersByTimeAsync(100); });
        expect(document.documentElement.style.getPropertyValue("--kd-mobile-bottom-nav-bottom-offset")).toBe("42px");
        expect(document.documentElement.style.getPropertyValue("--kd-ios-pwa-safe-bottom")).toBe("7px");
        expect(document.documentElement.style.getPropertyValue("--chat-visual-viewport-height")).toBe("");
        expect(viewportListeners.size).toBe(0);
        expect(resizeObservers[0].disconnect).toHaveBeenCalledOnce();
    });
    it("keeps iOS browser mode on the existing default shell without standalone overrides", async () => {
        vi.mocked(window.matchMedia).mockImplementation((query: string) => ({
            matches: query === "(max-width: 767px)", media: query,
            addEventListener: vi.fn(), removeEventListener: vi.fn(),
            addListener: vi.fn(), removeListener: vi.fn(), dispatchEvent: vi.fn(), onchange: null,
        } as MediaQueryList));
        const { ChatRouteShell } = await import("@/components/Chat/ChatRouteShell");
        act(() => root?.render(<ChatRouteShell><textarea aria-label="Message" /></ChatRouteShell>));
        expect(document.querySelector('[data-chat-platform-shell="default"]')).not.toBeNull();
        expect(document.documentElement.style.getPropertyValue("--kd-ios-pwa-visual-height")).toBe("");
        expect(document.documentElement.style.getPropertyValue("--kd-mobile-bottom-nav-bottom-offset")).toBe("300px");
        expect(document.documentElement.style.getPropertyValue("--chat-visual-viewport-height")).toBe("500px");
    });

});
