// @vitest-environment happy-dom

import React from "react";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, afterEach, vi } from "vitest";
import { AdminPrivacyPreflight } from "@/app/admin/AdminPrivacyPreflight";
import { buildPrivacyConsoleState } from "@/lib/admin-privacy-console";
import type { useAdminPrivacyPreflight } from "@/hooks/useAdminPrivacyPreflight";

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const componentSource = readFileSync(join(process.cwd(), "src/app/admin/AdminPrivacyPreflight.tsx"), "utf8");
const hookSource = readFileSync(join(process.cwd(), "src/hooks/useAdminPrivacyPreflight.ts"), "utf8");

describe("admin privacy fixture boundary", () => {
  it("labels local admin UI fixture privacy evidence as no-source", () => {
    expect(componentSource).toContain('data-admin-privacy-fixture-boundary="true"');
    expect(componentSource).toContain('data-admin-privacy-fixture-state="source_missing"');
    expect(componentSource).toContain("source_missing: privacy source is not loaded in this fixture");
    expect(componentSource).toContain("Protected reads stay blocked until verified admin access provides the source");
    expect(componentSource).toContain('data-privacy-console-overall-state={isLocalFixtureSourceMissing ? "source_missing"');
  });

  it("keeps privacy evidence drilldown compact", () => {
    expect(componentSource).toContain(">Details</summary>");
    expect(componentSource).not.toContain("Source notes");
  });

  it("skips privacy preflight route reads in fixture mode", () => {
    expect(hookSource).toContain("isAdminUiTestSessionUser(user)");
    expect(hookSource).toContain('"local_fixture_source_missing"');
    expect(hookSource).toContain('adminSessionState === "local_fixture_source_missing"');
    expect(hookSource).toContain("setIsLoading(false)");

    const fixtureBranch = hookSource.indexOf('adminSessionState === "local_fixture_source_missing"');
    const routeFetch = hookSource.indexOf("authFetch(`/api/admin/privacy/preflight?range=");

    expect(fixtureBranch).toBeGreaterThan(-1);
    expect(routeFetch).toBeGreaterThan(fixtureBranch);
  });
});


type PrivacyHookState = ReturnType<typeof useAdminPrivacyPreflight>;
const privacyFixture = vi.hoisted(() => ({ current: null as PrivacyHookState | null, setRange: vi.fn() }));
vi.mock("@/hooks/useAdminPrivacyPreflight", () => ({ useAdminPrivacyPreflight: () => {
  if (!privacyFixture.current) throw new Error("Privacy component fixture has not been initialized.");
  return privacyFixture.current;
} }));
const sourceInput = {
    generatedAtUtc: "2026-05-06T00:00:00.000Z",
    range: "24h" as const,
    eventPipeline: {
        sampleCount: 1,
        lastSeenAtUtc: "2026-05-06T00:00:00.000Z",
        latestSource: "identified_event_fact",
        guestBatchCount: 0,
        identifiedEventCount: 1,
        ingestRoute: { status: "healthy", hasSample: true, lastSeenAtUtc: "2026-05-06T00:00:00.000Z" },
        identifiedIngestRoute: { status: "healthy", hasSample: true, lastSeenAtUtc: "2026-05-06T00:00:00.000Z" },
    },
    deduplication: {
        checkedEvents: 1,
        withKeyCount: 1,
        missingKeyCount: 0,
        duplicateSuppressionCount: null,
        lastSeenAtUtc: "2026-05-06T00:00:00.000Z",
    },
    consentGating: {
        allowedCount: 1,
        deniedCount: 0,
        unknownConsentCount: 0,
        blockedDueToConsentCount: 0,
        trackedDeniedConsentViolationCount: 0,
        lastSeenAtUtc: "2026-05-06T00:00:00.000Z",
        consentRoute: { status: "healthy", hasSample: true, lastSeenAtUtc: "2026-05-06T00:00:00.000Z" },
    },
    guestTracking: {
        guestEventCount: 0,
        anonymousIdPresentCount: 0,
        missingAnonymousIdCount: 0,
        lastGuestEventAtUtc: null,
    },
    cloudRunIngest: {
        serverOriginSampleCount: 1,
        clientOriginSampleCount: 0,
        lastIngestAtUtc: "2026-05-06T00:00:00.000Z",
        ingestRoute: { status: "healthy", hasSample: true, lastSeenAtUtc: "2026-05-06T00:00:00.000Z" },
        identifiedIngestRoute: { status: "healthy", hasSample: true, lastSeenAtUtc: "2026-05-06T00:00:00.000Z" },
    },
    bigqueryExport: {
        configured: true,
        listenerFailed: false,
        lastHeartbeatAtUtc: "2026-05-06T00:00:00.000Z",
        lastSuccessfulExportAtUtc: "2026-05-06T00:00:00.000Z",
        failureCount: 0,
        failureReason: null,
        affectedRange: null,
    },
} as const satisfies Parameters<typeof buildPrivacyConsoleState>[0];
const sourceSnapshot = buildPrivacyConsoleState(sourceInput);

beforeEach(() => {
  privacyFixture.setRange.mockClear();
  privacyFixture.current = { data: null, error: null, isLoading: true, range: "24h", setRange: privacyFixture.setRange, adminSessionState: "ready" };
});
afterEach(cleanup);

describe("admin privacy rendered source and control truth", () => {
  it.each(["ready", "waiting_for_admin_session", "local_fixture_source_missing"] as const)("does not invent zero check totals without a source in %s", (adminSessionState) => {
    privacyFixture.current = { ...privacyFixture.current!, adminSessionState, isLoading: adminSessionState !== "local_fixture_source_missing" };
    const { container } = render(React.createElement(AdminPrivacyPreflight));
    expect(container.textContent).not.toMatch(/\b(?:Pass|Review|Error|Quiet)\s*0\b/u);
    expect(container.querySelectorAll("[data-privacy-check-id]")).toHaveLength(0);
    if (adminSessionState === "local_fixture_source_missing") {
      expect(container.querySelector("[data-privacy-console-overall-state]")?.getAttribute("data-privacy-console-overall-state")).toBe("source_missing");
      expect(screen.getByText(/Protected reads stay blocked until verified admin access provides the source/u)).toBeTruthy();
      expect(screen.getAllByText(/source_missing: privacy source is not loaded in this fixture/u)).toHaveLength(1);
    }
  });

  it("never exposes a prior source after session readiness changes", () => {
    privacyFixture.current = { ...privacyFixture.current!, data: sourceSnapshot, isLoading: false, adminSessionState: "local_fixture_source_missing" };
    const { container } = render(React.createElement(AdminPrivacyPreflight));
    expect(container.querySelectorAll("[data-privacy-check-id]")).toHaveLength(0);
    expect(container.querySelector("[data-privacy-console-source-range]")?.getAttribute("data-privacy-console-source-range")).toBe("unavailable");
  });

  it("preserves every canonical check identity, source, reason and evidence field", () => {
    privacyFixture.current = { ...privacyFixture.current!, data: sourceSnapshot, isLoading: false };
    const { container } = render(React.createElement(AdminPrivacyPreflight));
    for (const check of sourceSnapshot.checks) {
      const record = container.querySelector('[data-privacy-check-id="' + check.id + '"]') as HTMLElement;
      expect(record).toBeTruthy();
      expect(record.getAttribute("data-privacy-check-state")).toBe(check.state);
      expect(record.getAttribute("data-privacy-check-evidence-state")).toBe(check.evidenceState);
      expect(record.getAttribute("data-privacy-check-sample-count")).toBe(String(check.sampleCount ?? "unknown"));
      expect(record.getAttribute("data-privacy-check-source")).toBe(check.source);
      expect(record.getAttribute("data-privacy-check-reason-code")).toBe(check.reasonCode);
      expect(within(record).getByText(check.label)).toBeTruthy();
      expect(within(record).getByText(check.explanation)).toBeTruthy();
      expect(within(record).getByText("Next action: " + check.nextAction)).toBeTruthy();
    }
  });

  it("keeps missing sample counts distinct from observed zero", () => {
    const [missing, observed, ...rest] = sourceSnapshot.checks;
    privacyFixture.current = { ...privacyFixture.current!, isLoading: false, data: { ...sourceSnapshot, checks: [{ ...missing, sampleCount: null }, { ...observed, sampleCount: 0 }, ...rest] } };
    const { container } = render(React.createElement(AdminPrivacyPreflight));
    const missingRecord = container.querySelector('[data-privacy-check-id="' + missing.id + '"]') as HTMLElement;
    const observedRecord = container.querySelector('[data-privacy-check-id="' + observed.id + '"]') as HTMLElement;
    expect(missingRecord.getAttribute("data-privacy-check-sample-count")).toBe("unknown");
    expect(within(missingRecord).getByText(/No count/u)).toBeTruthy();
    expect(observedRecord.getAttribute("data-privacy-check-sample-count")).toBe("0");
    expect(within(observedRecord).getByText(/0 samples/u)).toBeTruthy();
  });

  it("identifies the retained source window during a different requested range", () => {
    privacyFixture.current = { ...privacyFixture.current!, data: sourceSnapshot, range: "7d", isLoading: true };
    const { container } = render(React.createElement(AdminPrivacyPreflight));
    const section = container.querySelector("[data-privacy-console-range]")!;
    expect(section.getAttribute("data-privacy-console-range")).toBe("7d");
    expect(section.getAttribute("data-privacy-console-source-range")).toBe("24h");
    expect(section.getAttribute("data-privacy-console-overall-state")).toBe("loading");
    expect(screen.getByRole("status").textContent).toContain("Collecting privacy evidence for 7 days. Showing 24 hours until new evidence arrives.");
    expect(container.querySelectorAll("[data-privacy-check-id]")).toHaveLength(sourceSnapshot.checks.length);
  });

  it("retains the prior evidence while a failed refresh replaces the overall Current status", () => {
    privacyFixture.current = { ...privacyFixture.current!, data: sourceSnapshot, range: "7d", isLoading: false, error: new Error("permission-denied: private transport detail") };
    const { container, rerender } = render(React.createElement(AdminPrivacyPreflight));
    const section = container.querySelector("[data-privacy-console-range]")!;
    expect(section.getAttribute("data-privacy-console-overall-state")).toBe("error");
    expect(section.getAttribute("data-privacy-console-source-range")).toBe("24h");
    expect(screen.getByRole("alert").textContent).not.toContain("private transport detail");
    expect(container.querySelectorAll("[data-privacy-check-id]")).toHaveLength(sourceSnapshot.checks.length);
    privacyFixture.current = { ...privacyFixture.current!, data: { ...sourceSnapshot, range: "7d" }, error: null };
    rerender(React.createElement(AdminPrivacyPreflight));
    expect(section.getAttribute("data-privacy-console-overall-state")).toBe("live");
    expect(section.getAttribute("data-privacy-console-source-range")).toBe("7d");
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("changes the selected existing range once and ignores values outside its options", () => {
    render(React.createElement(AdminPrivacyPreflight));
    const select = screen.getByRole("combobox", { name: "Evidence range" });
    fireEvent.change(select, { target: { value: "7d" } });
    expect(privacyFixture.setRange).toHaveBeenCalledExactlyOnceWith("7d");
    fireEvent.change(select, { target: { value: "unsupported" } });
    expect(privacyFixture.setRange).toHaveBeenCalledTimes(1);
  });

  it("keeps each native disclosure closed until activated and restores its closed state", () => {
    privacyFixture.current = { ...privacyFixture.current!, data: sourceSnapshot, isLoading: false };
    const { container } = render(React.createElement(AdminPrivacyPreflight));
    for (const details of container.querySelectorAll("details")) {
      const summary = within(details).getByText("Details");
      expect(details.open).toBe(false);
      fireEvent.click(summary);
      expect(details.open).toBe(true);
      expect(details.textContent).toContain("Source:");
      expect(details.textContent).toContain("Reason:");
      expect(details.textContent).toContain("Severity:");
      fireEvent.click(summary);
      expect(details.open).toBe(false);
    }
  });
});
