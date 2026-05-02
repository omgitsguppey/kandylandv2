// @vitest-environment happy-dom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CreatorAuditTrailPanel } from "@/components/Admin/CreatorAuditTrailPanel";
import type { CreatorOnboardingHistoryEntry } from "@/lib/creator-onboarding";

function buildHistoryEntry(index: number, eventType: CreatorOnboardingHistoryEntry["eventType"]): CreatorOnboardingHistoryEntry {
  return {
    eventType,
    actorId: `actor_${index}`,
    actorRole: index % 2 === 0 ? "admin" : "creator",
    actorLabel: index % 2 === 0 ? "Admin" : "Creator",
    timestamp: 1_710_000_000_000 + index,
    summary: eventType,
    detail: `Detail ${index}`,
    metadata: {
      rawEventType: eventType,
    },
  };
}

describe("CreatorAuditTrailPanel", () => {
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

  it("renders latest three events by default and expands full history on request", () => {
    const history = [
      buildHistoryEntry(1, "creator_contract_signed"),
      buildHistoryEntry(2, "admin_contract_signed"),
      buildHistoryEntry(3, "id_requested"),
      buildHistoryEntry(4, "creator_approved"),
    ];

    act(() => {
      root.render(<CreatorAuditTrailPanel history={history} />);
    });

    expect(container.querySelector("[data-audit-trail-default-count='3']")).toBeTruthy();
    expect(container.textContent).toContain("Creator signed agreement");
    expect(container.textContent).toContain("Admin countersigned agreement");
    expect(container.textContent).toContain("ID requested");
    expect(container.textContent).not.toContain("Creator approved");
    expect(container.textContent).not.toContain("creator_contract_signed");

    const button = Array.from(container.querySelectorAll("button"))
      .find((entry) => entry.textContent === "View full history");
    expect(button).toBeTruthy();

    act(() => {
      button?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(container.textContent).toContain("Creator approved");
  });

  it("keeps technical metadata inside Details and emits expansion telemetry callback", () => {
    const onEventExpanded = vi.fn();

    act(() => {
      root.render(
        <CreatorAuditTrailPanel
          history={[buildHistoryEntry(1, "creator_contract_signed")]}
          onEventExpanded={onEventExpanded}
        />,
      );
    });

    const details = container.querySelector("details");
    expect(details).toBeTruthy();
    expect(container.textContent).not.toContain("rawEventType");

    act(() => {
      Object.defineProperty(details, "open", { configurable: true, value: true });
      details?.dispatchEvent(new Event("toggle", { bubbles: true }));
    });

    expect(onEventExpanded).toHaveBeenCalledWith(expect.objectContaining({
      eventType: "creator_contract_signed",
    }));
  });
});
