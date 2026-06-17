// @vitest-environment happy-dom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";

import { AdminReviewBadge } from "@/components/Admin/AdminReviewBadge";

describe("AdminReviewBadge", () => {
  let container: HTMLDivElement;
  let root: Root;

  afterEach(() => {
    act(() => {
      root?.unmount();
    });
    container?.remove();
  });

  it("renders human labels while preserving diagnostic reason attributes", () => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    act(() => {
      root.render(
        <AdminReviewBadge
          decision={{
            severity: "review",
            reasonCode: "missing_required_data",
            label: "Missing required data",
            summary: "A visible metric is missing required source data.",
          }}
        />,
      );
    });

    const badge = container.querySelector("[data-admin-review-reason]");

    expect(badge?.textContent).toContain("REVIEW · Missing required data");
    expect(badge?.textContent).not.toContain("missing_required_data");
    expect(badge?.getAttribute("data-admin-review-reason")).toBe("missing_required_data");
    expect(badge?.getAttribute("aria-label")).toContain("missing_required_data");
  });
});
