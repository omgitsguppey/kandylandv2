// @vitest-environment happy-dom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createAutoHealingObserver, createCompactInteractionRecoveryGuard, type AutoHealingObserverControl } from "@/lib/self-healing";

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

describe("finite Firestore observer recovery", () => {
    let controls: AutoHealingObserverControl[];
    beforeEach(() => {
        controls = [];
        vi.useFakeTimers();
    });
    afterEach(() => {
        controls.forEach((control) => control.cleanup());
        vi.clearAllTimers();
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    const observe = (setup: () => (() => void), notify = vi.fn()) => {
        const control = createAutoHealingObserver(setup, notify);
        controls.push(control);
        return control;
    };

    it("settles an asynchronous permission error and emits one failure notification", async () => {
        const detach = vi.fn();
        const setup = vi.fn(() => detach);
        const notify = vi.fn();
        const control = observe(setup, notify);
        await Promise.resolve().then(() => control.triggerReconnect({ code: "permission-denied" }));
        await vi.advanceTimersByTimeAsync(600_000);
        window.dispatchEvent(new Event("online"));
        await vi.advanceTimersByTimeAsync(600_000);
        expect(setup).toHaveBeenCalledOnce();
        expect(detach).toHaveBeenCalledOnce();
        expect(notify).toHaveBeenCalledOnce();
    });

    it("grows delays across asynchronous failures and stops after four reconnect attempts", async () => {
        const detach = vi.fn();
        const setup = vi.fn(() => detach);
        const control = observe(setup);
        for (const delay of [2_000, 4_000, 8_000, 16_000]) {
            const before = setup.mock.calls.length;
            await Promise.resolve().then(() => control.triggerReconnect({ code: "unavailable" }));
            await vi.advanceTimersByTimeAsync(delay - 1);
            expect(setup).toHaveBeenCalledTimes(before);
            await vi.advanceTimersByTimeAsync(1);
            expect(setup).toHaveBeenCalledTimes(before + 1);
        }
        control.triggerReconnect({ code: "unavailable" });
        await vi.advanceTimersByTimeAsync(600_000);
        expect(setup).toHaveBeenCalledTimes(5);
        expect(detach).toHaveBeenCalledTimes(5);
    });

    it("applies the same finite policy to setup failures", async () => {
        const setup = vi.fn((): (() => void) => { throw Object.assign(new Error("Invalid query"), { code: "invalid-argument" }); });
        observe(setup);
        await vi.advanceTimersByTimeAsync(600_000);
        expect(setup).toHaveBeenCalledOnce();
    });

    it("does not postpone or multiply a pending retry on duplicate callbacks", async () => {
        const setup = vi.fn(() => vi.fn());
        const notify = vi.fn();
        const control = observe(setup, notify);
        control.triggerReconnect({ code: "unavailable" });
        await vi.advanceTimersByTimeAsync(1_000);
        control.triggerReconnect({ code: "unavailable" });
        await vi.advanceTimersByTimeAsync(1_000);
        expect(setup).toHaveBeenCalledTimes(2);
        expect(notify).toHaveBeenCalledOnce();
    });

    it("cancels an already queued transient retry when access becomes permanently denied", async () => {
        const setup = vi.fn(() => vi.fn());
        const control = observe(setup);
        control.triggerReconnect({ code: "unavailable" });
        await vi.advanceTimersByTimeAsync(1_000);
        control.triggerReconnect({ code: "permission-denied" });
        window.dispatchEvent(new Event("online"));
        await vi.advanceTimersByTimeAsync(600_000);
        expect(setup).toHaveBeenCalledOnce();
    });

    it("bounds uncoded setup exceptions without treating registration as recovery", async () => {
        const setup = vi.fn((): (() => void) => { throw new TypeError("Failed to fetch"); });
        observe(setup);
        await vi.advanceTimersByTimeAsync(600_000);
        expect(setup).toHaveBeenCalledTimes(5);
    });

    it("restarts an exhausted transient epoch after network recovery", async () => {
        const setup = vi.fn(() => vi.fn());
        const control = observe(setup);
        for (const delay of [2_000, 4_000, 8_000, 16_000]) {
            control.triggerReconnect({ code: "unavailable" });
            await vi.advanceTimersByTimeAsync(delay);
        }
        control.triggerReconnect({ code: "unavailable" });
        window.dispatchEvent(new Event("online"));
        await vi.advanceTimersByTimeAsync(2_000);
        expect(setup).toHaveBeenCalledTimes(6);
    });

    it("uses the existing explicit recovery control after a source decision", async () => {
        const setup = vi.fn(() => vi.fn());
        const control = observe(setup);
        control.triggerReconnect({ code: "failed-precondition" });
        control.triggerReconnect();
        control.triggerReconnect();
        await vi.advanceTimersByTimeAsync(2_000);
        expect(setup).toHaveBeenCalledTimes(2);
    });

    it("cancels pending work and makes late callbacks and recovery inert after cleanup", async () => {
        const detach = vi.fn();
        const setup = vi.fn(() => detach);
        const control = observe(setup);
        control.triggerReconnect({ code: "unavailable" });
        control.cleanup();
        control.triggerReconnect();
        window.dispatchEvent(new Event("online"));
        await vi.advanceTimersByTimeAsync(600_000);
        expect(setup).toHaveBeenCalledOnce();
        expect(detach).toHaveBeenCalledOnce();
    });
});
