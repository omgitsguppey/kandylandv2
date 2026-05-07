// @vitest-environment happy-dom

import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  CURRENT_BETA_RELEASE_VERSION,
} from "@/lib/release-notes/release-version-contract";
import { formatBetaOdometerVersion } from "@/lib/release-notes/beta-odometer-version";

const mockState = vi.hoisted(() => ({
  trackEvent: vi.fn(),
}));

vi.mock("@/lib/telemetry", () => ({
  trackEvent: (...args: unknown[]) => mockState.trackEvent(...args),
}));

import { BetaBadge } from "@/components/ReleaseNotes/BetaBadge";

function buildReleaseNotesResponse() {
  return {
    currentVersion: CURRENT_BETA_RELEASE_VERSION,
    betaReleaseCounter: 201,
    channel: "beta",
    generatedAt: "2026-05-05T15:00:00.000Z",
    generatedAtUtc: "2026-05-05T15:00:00.000Z",
    lastCommitSha: "abc123",
    notes: [
      {
        version: "1.2.1",
        previousVersion: "1.2.0",
        betaReleaseCounter: 201,
        previousBetaReleaseCounter: 200,
        commitSha: "abc123",
        commitTitle: "feat(app): add beta release notes badge",
        commitCount: 2,
        commitShas: ["abc111", "abc123"],
        committedAt: "2026-05-05T14:30:00.000Z",
        generatedAt: "2026-05-05T15:00:00.000Z",
        committedAtUtc: "2026-05-05T14:30:00.000Z",
        generatedAtUtc: "2026-05-05T15:00:00.000Z",
        updatedAtUtc: "2026-05-05T15:00:00.000Z",
        diffStats: {
          rawAdditions: 10,
          rawDeletions: 2,
          rawChangeCount: 12,
          additions: 10,
          deletions: 2,
          effectiveAdditions: 10,
          effectiveDeletions: 2,
          changedFiles: 3,
          effectiveChangeCount: 12,
          excludedGeneratedChangeCount: 200,
        },
        bumpType: "patch",
        category: "Added",
        title: "Added a Beta badge with app update notes in the top navigation.",
        summary: "Cleaner Beta update notes with clearer summaries and timestamps.",
        userFacingTitle: "Added a Beta badge with app update notes in the top navigation.",
        bullets: [
          "Added a Beta badge beside KandyDrops for update notes.",
          "Improved public update history so the latest notes are easier to read.",
        ],
        audience: "all",
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

  it("formats odometer beta versions from the canonical counter", () => {
    expect(formatBetaOdometerVersion(200)).toBe("1.2.0");
    expect(formatBetaOdometerVersion(201)).toBe("1.2.1");
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
    expect(await screen.findByText(/current version: v1\.2\.1/i)).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: /added a beta badge with app update notes/i })).toBeInTheDocument();
    expect(await screen.findByText(/improved public update history so the latest notes are easier to read/i)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /close beta release notes/i }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: /what's new in beta/i })).not.toBeInTheDocument();
    });
    expect(mockState.trackEvent).toHaveBeenCalledWith("beta_changelog_closed", expect.objectContaining({
      source_component: "navbar_beta_badge",
    }));
  });
});
