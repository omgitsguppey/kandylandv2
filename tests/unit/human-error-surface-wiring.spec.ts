// @vitest-environment happy-dom
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { captureTakeoverSourceState, readValidatorMutationScope, startTakeoverEvidence, type TakeoverTaskInput } from "../../scripts/agent/validate-agent-takeover-safety-check";

import { describe, expect, it } from "vitest";

function readSource(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

const WIRED_SURFACES = [
  "src/components/Creators/CreatorDashboardSettingsHub.tsx",
  "src/components/Creators/CreatorExperiencesPanel.tsx",
  "src/components/Creators/CreatorRequestsManager.tsx",
  "src/components/Creators/CreatorBookingsManager.tsx",
  "src/components/Creators/CreatorFanPassManager.tsx",
  "src/components/Creators/CreatorBroadcastManager.tsx",
  "src/components/PurchaseModal.tsx",
];

describe("human error surface wiring", () => {
  it("uses the client human-error adapter in wired user and creator surfaces", () => {
    for (const path of WIRED_SURFACES) {
      const source = readSource(path);
      expect(source, path).toContain("resolveClientActionError");
      expect(source, path).toContain("HumanErrorNotice");
    }

    const creatorWorkspaceSource = readSource("src/components/Dashboard/CreatorWorkspacePanel.tsx");
    const creatorSourceNotice = readSource("src/components/Dashboard/creator-workspace/CreatorDashboardSourceNotice.tsx");
    expect(creatorWorkspaceSource).toContain("resolveClientActionError");
    expect(creatorWorkspaceSource).toContain("CreatorDashboardSourceNotice");
    expect(creatorSourceNotice).toContain("HumanErrorNotice");
  });

  it("does not render raw error.message or String(error) in wired visible UI", () => {
    for (const path of WIRED_SURFACES) {
      const source = readSource(path);
      expect(source, path).not.toMatch(/toast\.error\([^)]*error\.message/u);
      expect(source, path).not.toMatch(/>\s*\{\s*[^}]*error\.message[^}]*\}\s*</u);
      expect(source, path).not.toContain("String(error)");
    }
  });

  it("keeps bug reward copy on reward GumDrops only", () => {
    const noticeSource = readSource("src/components/errors/HumanErrorNotice.tsx");

    expect(noticeSource).toContain("reward GumDrops added");
    expect(noticeSource).not.toContain("purchased GumDrops added");
  });

  it("keeps creator dashboard settings errors translated and mobile compact", () => {
    const source = readSource("src/components/Creators/CreatorDashboardSettingsHub.tsx");
    const landingSource = readSource("src/components/Dashboard/CreatorWorkspacePanel.tsx");
    const landingNoticeSource = readSource("src/components/Dashboard/creator-workspace/CreatorDashboardSourceNotice.tsx");

    expect(source).toContain("data-creator-dashboard-density=\"mobile_compact\"");
    expect(source).toContain("data-bottom-nav-safe=\"true\"");
    expect(source).toContain("data-report-issue-safe-offset=\"bottom-nav\"");
    expect(source).toContain("dashboard_source_unavailable");
    expect(source).toContain("route: \"/api/creator/settings\"");
    expect(source).not.toMatch(/setError\([^)]*body\.error/u);
    expect(source).not.toMatch(/throw new Error\(body\.error/u);
    expect(landingSource).toContain("data-creator-dashboard-landing-density=\"mobile_compact\"");
    expect(landingSource).toContain("data-creator-landing-mobile-density=\"compact_v2\"");
    expect(landingSource).toContain("data-creator-landing-error-language=\"human\"");
    expect(landingNoticeSource).toContain("data-creator-landing-source-review=\"partial_safe\"");
    expect(landingNoticeSource).toContain("HumanErrorNotice");
    expect(landingSource).toContain("dashboard_source_unavailable");
    expect(landingSource).not.toContain("body={moduleErrors.bookings}");
    expect(landingSource).not.toContain("body={moduleErrors.subscriptions}");
    expect(landingSource).not.toContain("creator settings: Internal server error");
  });
});

import React from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, vi } from "vitest";
import { ErrorBoundaryHandler, type ErrorInfo } from "next/dist/client/components/error-boundary";
import { AppRouterContext, type AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import AppError from "@/app/error";
import { getPageProblemCopy } from "@/lib/problem-state-copy";

const boundaryMocks = vi.hoisted(() => ({ recordClientError: vi.fn() }));
vi.mock("@/lib/client-diagnostics", () => ({ recordClientError: boundaryMocks.recordClientError }));
vi.mock("@/components/Feedback/ReportBugButton", () => ({ ReportBugButton: () => null }));

const PageErrorComponent = AppError as React.ComponentType<ErrorInfo>;

describe("page source error recovery wiring", () => {
  beforeEach(() => {
    boundaryMocks.recordClientError.mockClear();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  function renderFailedFrame(recovery: (attempt: number) => boolean) {
    const issue = new Error("Source read unavailable; private-provider-message");
    const read = vi.fn();
    let ready = false;
    let attempt = 0;
    const refresh = vi.fn(() => { ready = recovery(++attempt); });
    function SourceView() {
      read();
      if (!ready) throw issue;
      return React.createElement("p", null, "Source is available again");
    }
    const router: AppRouterInstance = {
      bfcacheId: "source-error-fixture",
      back: vi.fn(), forward: vi.fn(), refresh,
      push: vi.fn(), replace: vi.fn(), prefetch: vi.fn(),
    };
    render(React.createElement(AppRouterContext.Provider, { value: router },
      React.createElement(ErrorBoundaryHandler, { pathname: "/drops", errorComponent: PageErrorComponent },
        React.createElement(SourceView))));
    return { refresh, issue, read };
  }

  it("uses the installed Next retry callback to refresh before recovering the failed frame", async () => {
    const frame = renderFailedFrame(() => true);
    expect(screen.getByRole("heading", { name: "Page could not load." })).toBeInTheDocument();
    const previousReads = frame.read.mock.calls.length;
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Try Again" })); });
    expect(frame.refresh).toHaveBeenCalledTimes(1);
    expect(frame.read.mock.calls.length).toBeGreaterThan(previousReads);
    expect(screen.getByText("Source is available again")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Try Again" })).not.toBeInTheDocument();
  });

  it("preserves the failed frame after an unsuccessful refresh and permits the next recovery", async () => {
    const frame = renderFailedFrame(attempt => attempt === 2);
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Try Again" })); });
    expect(frame.refresh).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("heading", { name: "Page could not load." })).toBeInTheDocument();
    expect(screen.queryByText("Source is available again")).not.toBeInTheDocument();
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Try Again" })); });
    expect(frame.refresh).toHaveBeenCalledTimes(2);
    expect(screen.getByText("Source is available again")).toBeInTheDocument();
  });

  it("retains the canonical problem copy and client diagnostic for the original source failure", () => {
    const frame = renderFailedFrame(() => false);
    const copy = getPageProblemCopy(frame.issue);
    expect(screen.getByRole("heading", { name: copy.headline })).toBeInTheDocument();
    expect(screen.getByText(copy.body)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: copy.actionLabel })).toBeInTheDocument();
    expect(screen.queryByText(/private-provider-message/)).not.toBeInTheDocument();
    expect(boundaryMocks.recordClientError).toHaveBeenCalledWith(frame.issue, { source: "app_error_boundary" });
  });

  it("keeps explicit reload separate from the retry callback", () => {
    const frame = renderFailedFrame(() => false);
    const reload = vi.fn();
    const actualWindow = window;
    try {
      vi.stubGlobal("window", { location: { reload } });
      fireEvent.click(screen.getByRole("button", { name: getPageProblemCopy(frame.issue).actionLabel }));
      expect(reload).toHaveBeenCalledTimes(1);
      expect(frame.refresh).not.toHaveBeenCalled();
    } finally {
      vi.stubGlobal("window", actualWindow);
    }
  });
});


describe("human error reader actual CLI scope", () => {
  const roots: string[] = [];
  const prefix = "kd-human-error-scope-";
  const repository = process.cwd();
  const validator = "scripts/agent/validate-human-error-surface-wiring.ts";
  const reportPath = "agent/state/human-error-surface-wiring.generated.json";
  const docPath = "docs/agent-truth/human-error-surface-wiring.md";
  const phaseFivePath = "src/app/admin/debug/components/DebugTabAdvanced.tsx";

  function fixture() {
    const root = mkdtempSync(join(tmpdir(), prefix));
    roots.push(root);
    const write = (file: string, value: string) => {
      mkdirSync(dirname(join(root, file)), { recursive: true });
      writeFileSync(join(root, file), value);
    };
    const git = (...args: string[]) => execFileSync("git", args, { cwd: root, stdio: "ignore", shell: false });
    for (const file of [
      ...WIRED_SURFACES,
      "src/components/Dashboard/CreatorWorkspacePanel.tsx",
      "src/components/Dashboard/creator-workspace/CreatorDashboardSourceNotice.tsx",
      "src/components/errors/HumanErrorNotice.tsx",
      reportPath, docPath,
    ]) write(file, readSource(file));
    const protectedFile = "src/app/admin/human-scope-fixture.ts";
    write(".gitignore", "output/\nagent/state/\ndocs/agent-truth/\n");
    write("AGENTS.md", "Isolated local human error reader authority.\n");
    write("fixture.ts", "export const value = 1;\n");
    write(protectedFile, "export const value = 1;\n");
    write(phaseFivePath, "export const value = 1;\n");
    git("init", "--quiet");
    git("config", "user.name", "Source fixture");
    git("config", "user.email", "fixture@example.invalid");
    git("config", "core.autocrlf", "false");
    git("add", ".");
    git("commit", "--quiet", "-m", "Fixture baseline");
    write(protectedFile, "export const value = 2;\n");
    const input: TakeoverTaskInput = {
      taskKey: "human-error-reader", activePromptLane: "source-validator-caller",
      goal: "Preserve human error safeguards and exact authorized mutation safety.",
      authority: "Isolated fixture only.", allowedFiles: ["fixture.ts"], forbiddenFiles: [protectedFile],
      inFlightLanes: ["sole fixture"], unknowns: ["No provider evidence."],
      memoryWriteback: { required: false, evidencePath: "REPO_MEMORY_LEDGER.md", reason: "Test fixture only." },
      releaseNoteImpact: "None", justificationForNetAdditions: "Distinct inherited/undeclared actual CLI caller proof.",
      authorityFiles: ["AGENTS.md"],
    };
    const inputPath = "output/human-error-reader/input.json";
    write(inputPath, JSON.stringify(input));
    startTakeoverEvidence(inputPath, root);
    const run = (args = ["--task-input", inputPath]) => {
      const result = spawnSync(process.execPath, [createRequire(import.meta.url).resolve("tsx/cli"), "--tsconfig", join(repository, "tsconfig.json"), join(repository, validator), ...args], {
        cwd: root, encoding: "utf8", timeout: 30_000, windowsHide: true,
      });
      return { ...result, output: result.stdout + result.stderr };
    };
    return { root, write, run, git, protectedFile, inputPath };
  }

  afterEach(() => {
    for (const root of roots.splice(0)) {
      const target = resolve(root);
      if (dirname(target) !== resolve(tmpdir()) || !basename(target).startsWith(prefix)) {
        throw new Error("Unexpected human error fixture cleanup target");
      }
      rmSync(target, { recursive: true, force: true });
    }
  });

  it("admits an allowed mutation while preserving inherited forbidden source and current scope evidence", () => {
    const f = fixture();
    f.write("fixture.ts", "export const value = 2;\n");
    const report = readFileSync(join(f.root, reportPath), "utf8");
    const doc = readFileSync(join(f.root, docPath), "utf8");
    const accepted = f.run();
    expect(accepted.error).toBeUndefined();
    expect(accepted.output).toContain("[human-error-surface-wiring] PASS");
    expect(accepted.status).toBe(0);
    expect(readValidatorMutationScope(f.root, ["--task-input", f.inputPath])).toMatchObject({
      owner: "scripts/agent/validate-agent-takeover-safety-check.ts", mode: "input_bound_task",
      changedFiles: ["fixture.ts"], sourceFingerprint: captureTakeoverSourceState(f.root).sourceFingerprint,
      inheritedDirtySourceFileCount: 1,
    });
    expect(readFileSync(join(f.root, f.protectedFile), "utf8")).toBe("export const value = 2;\n");
    expect(readFileSync(join(f.root, reportPath), "utf8")).toBe(report);
    expect(readFileSync(join(f.root, docPath), "utf8")).toBe(doc);
  }, 60_000);

  it("rejects an undeclared mutation without replacing evidence and accepts recovery to retained bytes", () => {
    const f = fixture();
    f.write("fixture.ts", "export const value = 2;\n");
    const report = readFileSync(join(f.root, reportPath), "utf8");
    const doc = readFileSync(join(f.root, docPath), "utf8");
    f.write(f.protectedFile, "export const value = 3;\n");
    const denied = f.run();
    expect(denied.error).toBeUndefined();
    expect(denied.status).not.toBe(0);
    expect(denied.output).toContain("Output scope violation: " + f.protectedFile);
    expect(denied.output).not.toContain("[human-error-surface-wiring] PASS");
    expect(readFileSync(join(f.root, reportPath), "utf8")).toBe(report);
    expect(readFileSync(join(f.root, docPath), "utf8")).toBe(doc);
    f.write(f.protectedFile, "export const value = 2;\n");
    const recovered = f.run();
    expect(recovered.status).toBe(0);
    expect(recovered.output).toContain("[human-error-surface-wiring] PASS");
  }, 60_000);

  it("retains standalone tracked forbidden failures and the existing phaseFive allowed control", () => {
    const f = fixture();
    const denied = f.run([]);
    expect(denied.error).toBeUndefined();
    expect(denied.status).not.toBe(0);
    expect(denied.output).toContain("forbidden files changed: " + f.protectedFile);
    expect(denied.output).not.toContain("[human-error-surface-wiring] PASS");
    f.write(f.protectedFile, "export const value = 1;\n");
    f.write(phaseFivePath, "export const value = 2;\n");
    const accepted = f.run([]);
    expect(accepted.status).toBe(0);
    expect(accepted.output).toContain("[human-error-surface-wiring] PASS");
  }, 60_000);
});
