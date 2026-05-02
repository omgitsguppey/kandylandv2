// @vitest-environment happy-dom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CreatorIntakeFlow } from "@/components/Auth/CreatorIntakeFlow";
import type { AuthFormData } from "@/components/Auth/AuthHelpers";

describe("CreatorIntakeFlow", () => {
    let container: HTMLDivElement;
    let root: Root;

    beforeEach(() => {
        container = document.createElement("div");
        document.body.appendChild(container);
        root = createRoot(container);
    });

    afterEach(() => {
        act(() => {
            root.unmount();
        });
        container.remove();
    });

    it("renders the expected creator-facing step titles without raw legal status labels", () => {
        const register = (name: keyof AuthFormData) => ({
            name,
            onChange: vi.fn(),
            onBlur: vi.fn(),
            ref: vi.fn(),
        });
        const setValue = vi.fn();
        const watch = vi.fn((name: keyof AuthFormData) => {
            if (name === "creatorMonetizationGoals") return ["paid_drops"];
            if (name === "creatorRecommendedSetup") return "drops_only";
            return "";
        });

        [0, 1, 2, 3, 4].forEach((step) => {
            act(() => {
                root.render(
                    <CreatorIntakeFlow
                        step={step}
                        register={register as never}
                        setValue={setValue as never}
                        watch={watch as never}
                        errors={{}}
                        checkingUsername={false}
                        usernameAvailable={null}
                        markUsernameTouched={vi.fn()}
                        onGoalSelected={vi.fn()}
                    />,
                );
            });
        });

        expect(container.textContent).toContain("Submit for review");
        expect(container.textContent).not.toContain("legalStatus");
        expect(container.textContent).not.toContain("signature_pending");
        expect(container.textContent).not.toContain("id_not_requested");
    });
});
