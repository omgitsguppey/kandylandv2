import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  buildUserCreatorUiParityReport,
  detectCreatorSelfLoopAction,
  detectFanPassMutationControls,
  detectForbiddenDrift,
  detectGenericOpenSectionCopy,
  detectHrefHashAction,
  detectTinyButtonTargets,
  detectUnconditionalCreatorManagerStack,
  scanUserCreatorUiParityFindings,
  type UserCreatorUiParityReport,
} from "../../scripts/agent/validate-user-creator-ui-parity";

const root = process.cwd();

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), "utf8");
}

function readJson(relativePath: string) {
  return JSON.parse(read(relativePath)) as UserCreatorUiParityReport;
}

describe("user creator ui parity", () => {
  it("records the current user and creator parity artifact", () => {
    expect(existsSync(join(root, "agent/state/user-creator-ui-parity.generated.json"))).toBe(true);
    const report = readJson("agent/state/user-creator-ui-parity.generated.json");

    expect(report.reportKey).toBe("user-creator-ui-parity");
    expect(report.currentHead).toMatch(/^[a-f0-9]{40}$/u);
    expect(report.summary.surfacesScanned).toBeGreaterThan(0);
    expect(report.nextFixOrder.length).toBeGreaterThan(0);
  });

  it("detects fake user and creator action targets", () => {
    expect(detectHrefHashAction('<a href="#">Broken action</a>')).toBe(true);
    expect(detectCreatorSelfLoopAction('href="/dashboard/creator"')).toBe(true);
    expect(detectCreatorSelfLoopAction('href: "/dashboard/creator"')).toBe(true);
    expect(detectHrefHashAction('<a href="/dashboard/chat">Chat</a>')).toBe(false);
  });

  it("detects generic section copy and eager manager stacks", () => {
    expect(detectGenericOpenSectionCopy("Open section")).toBe(true);
    expect(detectUnconditionalCreatorManagerStack("<CreatorRequestsManager /><CreatorBookingsManager /><CreatorFanPassManager /><CreatorBroadcastManager />")).toBe(true);
    expect(detectUnconditionalCreatorManagerStack('const activeManager = openSection === "requests" ? <CreatorRequestsManager /> : null;')).toBe(false);
  });

  it("detects tiny action buttons and accepts mobile-safe hit targets", () => {
    expect(detectTinyButtonTargets('<button className="rounded-full px-3 py-1.5 text-xs">Refresh</button>')).toBe(true);
    expect(detectTinyButtonTargets('<button className="min-h-11 rounded-full px-3 py-2.5 text-xs">Refresh</button>')).toBe(false);
    expect(detectTinyButtonTargets('<button data-ui-hit-target="compact-approved" className="rounded px-2 py-1">Tiny</button>')).toBe(false);
  });

  it("keeps Fan Pass dashboard visibility read-only", () => {
    expect(detectFanPassMutationControls('method: "POST"; <button>Subscribe</button>')).toBe(true);
    expect(detectFanPassMutationControls("<button>Refresh</button>")).toBe(false);

    const fanPassManager = read("src/components/Creators/CreatorFanPassManager.tsx");
    expect(detectFanPassMutationControls(fanPassManager)).toBe(false);
  });

  it("blocks forbidden admin/backend drift", () => {
    expect(detectForbiddenDrift(["src/app/admin/debug/page.tsx"])).toEqual(["src/app/admin/debug/page.tsx"]);
    expect(detectForbiddenDrift(["src/components/Creators/CreatorDashboardSettingsHub.tsx"])).toEqual([]);
  });

  it("accepts the current creator dashboard parity source", () => {
    const hub = read("src/components/Creators/CreatorDashboardSettingsHub.tsx");

    expect(hub).toContain("data-creator-active-manager");
    expect(hub).toContain("actionLabel");
    expect(detectGenericOpenSectionCopy(hub)).toBe(false);
    expect(detectUnconditionalCreatorManagerStack(hub)).toBe(false);
    expect(hub).not.toContain("formatSourceEvidenceDetail(statsEvidence)");
  });

  it("builds a report with no source blockers beyond explicitly isolated forbidden-surface drift", () => {
    const report = buildUserCreatorUiParityReport();
    const findings = scanUserCreatorUiParityFindings();
    const p0Findings = findings.filter((finding) => finding.severity === "P0");

    expect(p0Findings.every((finding) => finding.key === "forbidden_admin_backend_drift")).toBe(true);
    expect(report.summary.p0Count).toBe(p0Findings.length);
    expect(report.summary.p1Count).toBe(0);
    expect(report.deferredFindings.every((finding) => finding.ownerLane.length > 0)).toBe(true);
    expect(report.fixesApplied.length).toBeGreaterThan(0);
  });
});
