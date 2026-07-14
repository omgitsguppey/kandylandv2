// @vitest-environment happy-dom

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authFetch: vi.fn(),
  trackEvent: vi.fn(),
}));

vi.mock("@/context/AuthContext", () => ({
  useAuth: () => ({ user: { uid: "creator_1" } }),
}));

vi.mock("@/lib/authFetch", () => ({
  authFetch: (...args: unknown[]) => mocks.authFetch(...args),
}));

vi.mock("@/lib/telemetry", () => ({
  trackEvent: mocks.trackEvent,
}));

vi.mock("@/components/Admin/CreateDropModal", () => ({
  CreateDropModal: () => null,
}));

import { CreatorDropManager } from "@/components/Creators/CreatorDropManager";

const statusRows = [
  ["draft", "Draft"],
  ["creator_submitted", "Submitted"],
  ["pending_review", "Pending"],
  ["approved_live", "Approved"],
  ["needs_changes", "Needs changes"],
  ["rejected", "Rejected"],
  ["expired", "Expired"],
] as const;

function dropForStatus(status: typeof statusRows[number], index: number) {
  const [creatorStatusKey, title] = status;
  return {
    id: `drop_${index}`,
    title: `${title} drop`,
    statusResolution: {
      creatorStatusKey,
      creatorStatusLabel: title,
      statusTone: "muted",
      isExpired: creatorStatusKey === "expired",
      isAdminCreated: false,
      isCreatorSubmitted: creatorStatusKey !== "draft",
      publicVisibilityLabel: "Hidden from users",
    },
    metrics: {
      source: "source_missing",
      views: { displayValue: "—" },
      clicks: { displayValue: "—" },
      unwraps: { displayValue: "—" },
    },
  };
}

describe("CreatorDropManager status grouping", () => {
  beforeEach(() => {
    mocks.authFetch.mockReset();
    mocks.trackEvent.mockReset();
  });

  it("counts every review status once and switches to the grouped tab", async () => {
    mocks.authFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ drops: statusRows.map(dropForStatus) }),
    });

    render(<CreatorDropManager />);

    await waitFor(() => expect(screen.getByRole("button", { name: "All 7" })).toBeTruthy());
    for (const label of ["Drafts", "Submitted", "Pending", "Approved", "Needs changes", "Rejected", "Expired"]) {
      expect(screen.getByRole("button", { name: `${label} 1` })).toBeTruthy();
    }

    fireEvent.click(screen.getByRole("button", { name: "Pending 1" }));

    expect(screen.getByLabelText("Pending drop")).toBeTruthy();
    expect(screen.queryByLabelText("Draft drop")).toBeNull();
    expect(screen.queryByLabelText("Approved drop")).toBeNull();
  });
});
