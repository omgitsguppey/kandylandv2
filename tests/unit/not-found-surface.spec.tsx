// @vitest-environment happy-dom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
    NOT_FOUND_RETURN_HREF,
    NotFoundSurface,
} from "@/components/ui/NotFoundSurface";

describe("NotFoundSurface", () => {
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

    it("uses a stable app return link and removes the old logo asset", () => {
        act(() => {
            root.render(<NotFoundSurface />);
        });

        const link = container.querySelector("a");
        expect(link?.getAttribute("href")).toBe(NOT_FOUND_RETURN_HREF);
        expect(link?.textContent).toContain("Return to App");
        expect(container.querySelector("[data-old-not-found-logo-removed='true']")).toBeTruthy();
        expect(container.querySelector("svg")).toBeFalsy();
    });
});

