import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  REQUIRED_VISUAL_CONFIRMATION_ROUTES,
  buildUserCreatorVisualConfirmationReport,
  detectChatShellBottomGuardRegression,
  detectFakeActionTarget,
  detectFinalVisualQaClaimWithoutEvidence,
  detectForbiddenAdminBackendDrift,
  detectForbiddenPaymentRuntimeDrift,
  detectMissingManagerMobileTargets,
  detectMissingReleaseDrawerOverflowGuard,
  detectScreenshotEvidenceMismatch,
  type UserCreatorVisualConfirmationReport,
} from "../../scripts/agent/validate-user-creator-visual-confirmation";

const root = process.cwd();

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), "utf8");
}

function readJson(relativePath: string) {
  return JSON.parse(read(relativePath)) as UserCreatorVisualConfirmationReport;
}

describe("user creator visual confirmation", () => {
  it("records source-only visual confirmation when screenshots are not attached", () => {
    expect(existsSync(join(root, "agent/state/user-creator-visual-confirmation.generated.json"))).toBe(true);
    const report = readJson("agent/state/user-creator-visual-confirmation.generated.json");

    expect(report.reportKey).toBe("user-creator-visual-confirmation");
    expect(report.currentHead).toMatch(/^[a-f0-9]{40}$/u);
    expect(report.summary.routesChecked).toBeGreaterThanOrEqual(REQUIRED_VISUAL_CONFIRMATION_ROUTES.length);
    expect(report.summary.screenshotEvidenceAttached).toBe(false);
    expect(report.summary.sourceOnlyRoutes).toBeGreaterThanOrEqual(REQUIRED_VISUAL_CONFIRMATION_ROUTES.length);
    expect(report.deferredManualChecks.length).toBeGreaterThan(0);
  });

  it("requires every visual route in the source-only route list when screenshots are missing", () => {
    const report = buildUserCreatorVisualConfirmationReport({ screenshotEvidenceAttached: false });
    const routeIds = new Set(report.routes.map((route) => route.route));

    for (const route of REQUIRED_VISUAL_CONFIRMATION_ROUTES) {
      expect(routeIds.has(route)).toBe(true);
    }

    expect(detectScreenshotEvidenceMismatch(report)).toEqual([]);
  });

  it("detects fake action targets and creator self-loops", () => {
    expect(detectFakeActionTarget('<a href="#">Broken</a>')).toBe(true);
    expect(detectFakeActionTarget('<Link href="/dashboard/creator">Open section</Link>', "src/components/Creators/Card.tsx")).toBe(true);
    expect(detectFakeActionTarget('<Link href="/dashboard/chat">Chat</Link>', "src/components/Creators/Card.tsx")).toBe(false);
  });

  it("blocks forbidden admin backend and payment runtime drift", () => {
    expect(detectForbiddenAdminBackendDrift(["src/app/admin/debug/page.tsx"])).toEqual(["src/app/admin/debug/page.tsx"]);
    expect(detectForbiddenAdminBackendDrift(["src/components/Creators/CreatorBroadcastManager.tsx"])).toEqual([]);
    expect(detectForbiddenPaymentRuntimeDrift(["src/lib/paypal/capture.ts"])).toEqual(["src/lib/paypal/capture.ts"]);
    expect(detectForbiddenPaymentRuntimeDrift(["src/components/ReleaseNotes/BetaReleaseNotesDrawer.tsx"])).toEqual([]);
  });

  it("detects missing mobile-safe manager targets", () => {
    expect(detectMissingManagerMobileTargets('<button className="rounded-full px-3 py-1.5 text-xs">Refresh</button>')).toBe(true);
    expect(detectMissingManagerMobileTargets('<button className="min-h-11 rounded-full px-3 py-2.5 text-xs">Refresh</button>')).toBe(false);
  });

  it("requires release drawer overflow and current-version guards", () => {
    expect(detectMissingReleaseDrawerOverflowGuard('<aside className="max-h-96">Drawer</aside>')).toBe(true);

    const drawer = read("src/components/ReleaseNotes/BetaReleaseNotesDrawer.tsx");
    expect(detectMissingReleaseDrawerOverflowGuard(drawer)).toBe(false);
  });

  it("requires chat shell bottom safe-area markers", () => {
    expect(detectChatShellBottomGuardRegression("<div />")).toBe(true);

    const chatShell = read("src/components/Chat/ChatExperience.tsx");
    expect(detectChatShellBottomGuardRegression(chatShell)).toBe(false);
  });

  it("does not allow final visual QA pass claims without evidence", () => {
    const report = buildUserCreatorVisualConfirmationReport({ screenshotEvidenceAttached: false });
    expect(detectFinalVisualQaClaimWithoutEvidence(report)).toBe(false);

    expect(detectFinalVisualQaClaimWithoutEvidence({
      ...report,
      summary: {
        ...report.summary,
        screenshotEvidenceAttached: false,
      },
      nextFixOrder: ["final visual QA passed"],
    })).toBe(true);
  });
});
