// @vitest-environment happy-dom

import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  bumpPublicVersion,
  classifyPublicVersionBump,
} from "@/lib/release-notes/release-version-contract";

const mockState = vi.hoisted(() => ({
  trackEvent: vi.fn(),
}));

vi.mock("@/lib/telemetry", () => ({
  trackEvent: (...args: unknown[]) => mockState.trackEvent(...args),
}));

import { BetaBadge } from "@/components/ReleaseNotes/BetaBadge";

function buildReleaseNotesResponse() {
  return {
    currentVersion: "1.0.1",
    channel: "beta",
    generatedAt: "2026-05-05T15:00:00.000Z",
    lastCommitSha: "abc123",
    notes: [
      {
        version: "1.0.1",
        previousVersion: "1.0.0",
        commitSha: "abc123",
        commitTitle: "feat(app): add beta release notes badge",
        committedAt: "2026-05-05T14:30:00.000Z",
        generatedAt: "2026-05-05T15:00:00.000Z",
        diffStats: {
          additions: 10,
          deletions: 2,
          changedFiles: 3,
          effectiveChangeCount: 12,
          excludedGeneratedChangeCount: 200,
        },
        bumpType: "patch",
        category: "Added",
        userFacingTitle: "Added a Beta badge with app update notes in the top navigation.",
        bullets: ["Tap Beta beside KandyDrops to see the latest app-style updates."],
        affectedSurfaces: ["release-notes", "navigation"],
      },
    ],
  };
}

describe("public beta release notes", () => {
  beforeEach(() => {
    mockState.trackEvent.mockReset();
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: true,
      json: async () => buildReleaseNotesResponse(),
    })));
  });

  it("bumps minor for substantial effective diffs and patch for small diffs", () => {
    expect(classifyPublicVersionBump(101)).toBe("minor");
    expect(bumpPublicVersion("1.0.4", "minor")).toBe("1.1.0");
    expect(classifyPublicVersionBump(100)).toBe("patch");
    expect(bumpPublicVersion("1.0.0", "patch")).toBe("1.0.1");
  });

  it("opens a lazy beta changelog drawer from the nav badge", async () => {
    render(<BetaBadge />);

    await userEvent.click(screen.getByRole("button", { name: /open kandydrops beta release notes/i }));

    expect(mockState.trackEvent).toHaveBeenCalledWith("beta_badge_clicked", expect.objectContaining({
      source_component: "navbar_beta_badge",
    }));
    expect(mockState.trackEvent).toHaveBeenCalledWith("beta_changelog_opened", expect.objectContaining({
      source_component: "navbar_beta_badge",
    }));

    expect(await screen.findByRole("dialog", { name: /what's new in beta/i })).toBeInTheDocument();
    expect(await screen.findByText(/current version: v1\.0\.1/i)).toBeInTheDocument();
    expect(await screen.findByText(/added a beta badge/i)).toBeInTheDocument();
    expect(await screen.findByText(/tap beta beside kandydrops/i)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /close beta release notes/i }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: /what's new in beta/i })).not.toBeInTheDocument();
    });
    expect(mockState.trackEvent).toHaveBeenCalledWith("beta_changelog_closed", expect.objectContaining({
      source_component: "navbar_beta_badge",
    }));
  });
});
