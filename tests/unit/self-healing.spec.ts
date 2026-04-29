// @vitest-environment happy-dom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createCompactInteractionRecoveryGuard } from "@/lib/self-healing";

describe("createCompactInteractionRecoveryGuard", () => {
    beforeEach(() => {
        document.body.innerHTML = "<main></main><input id='target' />";
        document.documentElement.style.overflow = "";
        document.documentElement.style.overscrollBehaviorY = "";
        document.body.style.overflow = "";
        document.body.style.overscrollBehaviorY = "";
        const main = document.querySelector("main") as HTMLElement | null;
        if (main) {
            main.style.overflow = "";
            main.style.overscrollBehaviorY = "";
        }
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
        document.body.innerHTML = "";
        document.documentElement.style.overflow = "";
        document.documentElement.style.overscrollBehaviorY = "";
        document.body.style.overflow = "";
        document.body.style.overscrollBehaviorY = "";
    });

    it("clears unexpected compact interaction locks and blurs the target", () => {
        const target = document.getElementById("target") as HTMLInputElement;
        const main = document.querySelector("main") as HTMLElement;
        const onRecovered = vi.fn();

        document.documentElement.style.overflow = "hidden";
        document.documentElement.style.overscrollBehaviorY = "none";
        document.body.style.overflow = "hidden";
        document.body.style.overscrollBehaviorY = "none";
        main.style.overflow = "hidden";
        main.style.overscrollBehaviorY = "none";
        target.focus();

        const guard = createCompactInteractionRecoveryGuard({
            isEnabled: () => true,
            getTarget: () => target,
            onRecovered,
            isOverlayOpen: () => false,
        });

        guard.scheduleCheck();
        vi.runAllTimers();

        expect(document.documentElement.style.overflow).toBe("");
        expect(document.body.style.overflow).toBe("");
        expect(main.style.overflow).toBe("");
        expect(document.documentElement.style.overscrollBehaviorY).toBe("");
        expect(document.body.style.overscrollBehaviorY).toBe("");
        expect(main.style.overscrollBehaviorY).toBe("");
        expect(document.activeElement).not.toBe(target);
        expect(onRecovered).toHaveBeenCalledTimes(1);
    });

    it("keeps expected route-owned locks while releasing focused compact inputs", () => {
        const target = document.getElementById("target") as HTMLInputElement;
        const main = document.querySelector("main") as HTMLElement;
        const onRecovered = vi.fn();

        document.documentElement.style.overflow = "hidden";
        document.documentElement.style.overscrollBehaviorY = "none";
        document.body.style.overflow = "hidden";
        document.body.style.overscrollBehaviorY = "none";
        main.style.overflow = "hidden";
        main.style.overscrollBehaviorY = "none";
        target.focus();

        const guard = createCompactInteractionRecoveryGuard({
            isEnabled: () => true,
            getTarget: () => target,
            onRecovered,
            isOverlayOpen: () => false,
            isDocumentScrollLockExpected: () => true,
        });

        guard.runCheck();

        expect(document.documentElement.style.overflow).toBe("hidden");
        expect(document.body.style.overflow).toBe("hidden");
        expect(main.style.overflow).toBe("hidden");
        expect(document.documentElement.style.overscrollBehaviorY).toBe("none");
        expect(document.body.style.overscrollBehaviorY).toBe("none");
        expect(main.style.overscrollBehaviorY).toBe("none");
        expect(document.activeElement).not.toBe(target);
        expect(onRecovered).toHaveBeenCalledTimes(1);
    });

    it("does nothing when a dialog is open", () => {
        const target = document.getElementById("target") as HTMLInputElement;
        const modal = document.createElement("div");
        modal.setAttribute("role", "dialog");
        modal.setAttribute("aria-modal", "true");
        document.body.appendChild(modal);
        document.documentElement.style.overflow = "hidden";

        const onRecovered = vi.fn();
        const guard = createCompactInteractionRecoveryGuard({
            isEnabled: () => true,
            getTarget: () => target,
            onRecovered,
        });

        guard.runCheck();

        expect(document.documentElement.style.overflow).toBe("hidden");
        expect(onRecovered).not.toHaveBeenCalled();
    });
});
