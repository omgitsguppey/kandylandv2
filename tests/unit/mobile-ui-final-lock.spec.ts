import { describe, expect, it } from "vitest";

import {
  buildMobileUiFinalLockReport,
  SELF_CHECK_RULES,
  validateMobileUiFinalLockReport,
  type MobileUiFinalLockReport,
} from "../../scripts/agent/validate-mobile-ui-final-lock";

const readyDependencyStatus = [
  {
    id: "mobile-ui-scaling-doctrine",
    status: "ready" as const,
    severity: "P0" as const,
    detail: "Scaling doctrine, report, and validator are present.",
  },
  {
    id: "mobile-hardcoded-css-cleanup",
    status: "ready" as const,
    severity: "P0" as const,
    detail: "Hardcoded mobile sprawl scan is present.",
  },
  {
    id: "mobile-loading-hydration-stability",
    status: "ready" as const,
    severity: "P0" as const,
    detail: "Loading/hydration scan is present.",
  },
  {
    id: "mobile-surface-organization",
    status: "ready" as const,
    severity: "P0" as const,
    detail: "Admin, user, and creator mobile organization are represented.",
  },
  {
    id: "mobile-ui-beta-source-readiness",
    status: "ready" as const,
    severity: "P1" as const,
    detail: "Mobile UI doctrine is source-ready only; visual/manual evidence is not claimed and beta exit remains false.",
  },
];

const readyPhaseSummaries = {
  scaling: {
    doctrineCreated: true,
    sharedMobileScaleContractCreated: true,
    skeletonPolicyReady: true,
    skeletonPolicyCreated: true,
    hydrationPolicyCreated: true,
    hardcodedCssScanReady: true,
    hardcodedCssScanCreated: true,
  },
  hardcoded: {
    hardcodedCssScanReady: true,
    protectedNavUntouched: true,
    protectedChatUntouched: true,
  },
  loading: {
    loadingHydrationReady: true,
    compactSkeletonsPresent: true,
    staleRequestProtectionApplied: true,
  },
  organization: {
    surfaceOrganizationReady: true,
    adminMobileReady: true,
    userMobileReady: true,
    creatorMobileReady: true,
    adminSummaryFirst: true,
    userDashboardPreserved: true,
    creatorWorkflowsSeparated: true,
  },
};

describe("mobile UI final lock", () => {
  it("passes when every mobile source-readiness phase is represented and protected files are untouched", () => {
    const report = buildMobileUiFinalLockReport({
      currentHead: "head",
      generatedAtUtc: "2026-05-19T12:00:00.000Z",
      changedFiles: [
        "agent/state/mobile-ui-final-lock.generated.json",
        "docs/agent-truth/mobile-ui-final-lock.md",
      ],
      packageJson: '"check:mobile-ui-final-lock"',
      dependencyStatus: readyDependencyStatus,
      phaseSummaries: readyPhaseSummaries,
      selfCheckRules: SELF_CHECK_RULES,
    });

    expect(report.summary.scalingDoctrineReady).toBe(true);
    expect(report.summary.protectedNavUntouched).toBe(true);
    expect(report.summary.protectedChatUntouched).toBe(true);
    expect(report.summary.selfCheckGuardsReady).toBe(true);
    expect(report.summary.p0Count).toBe(0);
    expect(report.summary.p1Count).toBe(0);
    expect(validateMobileUiFinalLockReport(report)).toEqual([]);
  });

  it("fails if protected navigation or chat files changed", () => {
    const report = buildMobileUiFinalLockReport({
      currentHead: "head",
      generatedAtUtc: "2026-05-19T12:00:00.000Z",
      changedFiles: ["src/components/Navigation/ProfileSidebar.tsx", "src/components/Chat/ChatExperience.tsx"],
      packageJson: '"check:mobile-ui-final-lock"',
      dependencyStatus: readyDependencyStatus,
      phaseSummaries: readyPhaseSummaries,
      selfCheckRules: SELF_CHECK_RULES,
    });

    expect(report.summary.protectedNavUntouched).toBe(false);
    expect(report.summary.protectedChatUntouched).toBe(false);
    expect(validateMobileUiFinalLockReport(report)).toContain("protected nav/chat files changed by this pass.");
  });

  it("fails when a mobile phase artifact is missing instead of dependency-noted", () => {
    const report = buildMobileUiFinalLockReport({
      currentHead: "head",
      generatedAtUtc: "2026-05-19T12:00:00.000Z",
      changedFiles: [],
      packageJson: '"check:mobile-ui-final-lock"',
      dependencyStatus: [
        ...readyDependencyStatus.slice(0, 1),
        {
          id: "mobile-hardcoded-css-cleanup",
          status: "missing" as const,
          severity: "P0" as const,
          detail: "",
        },
      ],
      phaseSummaries: readyPhaseSummaries,
      selfCheckRules: SELF_CHECK_RULES,
    });

    expect(validateMobileUiFinalLockReport(report)).toContain("mobile phase artifact missing without dependency note.");
  });

  it("fails when self-check rules are absent", () => {
    const report = buildMobileUiFinalLockReport({
      currentHead: "head",
      generatedAtUtc: "2026-05-19T12:00:00.000Z",
      changedFiles: [],
      packageJson: '"check:mobile-ui-final-lock"',
      dependencyStatus: readyDependencyStatus,
      phaseSummaries: readyPhaseSummaries,
      selfCheckRules: [],
    });

    expect(report.summary.selfCheckGuardsReady).toBe(false);
    expect(validateMobileUiFinalLockReport(report)).toContain("agent self-check rules missing.");
  });

  it("fails when admin, user, and creator readiness are not represented", () => {
    const report = buildMobileUiFinalLockReport({
      currentHead: "head",
      generatedAtUtc: "2026-05-19T12:00:00.000Z",
      changedFiles: [],
      packageJson: '"check:mobile-ui-final-lock"',
      dependencyStatus: readyDependencyStatus,
      phaseSummaries: {
        ...readyPhaseSummaries,
        organization: {
          ...readyPhaseSummaries.organization,
          adminSummaryFirst: false,
        },
      },
      selfCheckRules: SELF_CHECK_RULES,
    });

    expect(validateMobileUiFinalLockReport(report)).toContain("admin/user/creator mobile readiness not represented.");
  });

  it("keeps beta evidence source-ready only and does not mark beta exit ready", () => {
    const report = buildMobileUiFinalLockReport({
      currentHead: "head",
      generatedAtUtc: "2026-05-19T12:00:00.000Z",
      changedFiles: [],
      packageJson: '"check:mobile-ui-final-lock"',
      dependencyStatus: readyDependencyStatus,
      phaseSummaries: readyPhaseSummaries,
      selfCheckRules: SELF_CHECK_RULES,
    });

    const betaStatus = report.dependencyStatus.find((entry) => entry.id === "mobile-ui-beta-source-readiness");
    expect(betaStatus?.detail).toContain("source-ready only");
    expect(report.remainingMobileRisks).toContain("Visual/manual mobile evidence is not claimed by this source lock.");
    expect(report.remainingMobileRisks).toContain("Beta exit remains blocked until formal evidence exists outside this source-readiness pass.");
  });

  it("fails when next exact steps are missing", () => {
    const report: MobileUiFinalLockReport = {
      ...buildMobileUiFinalLockReport({
        currentHead: "head",
        generatedAtUtc: "2026-05-19T12:00:00.000Z",
        changedFiles: [],
        packageJson: '"check:mobile-ui-final-lock"',
        dependencyStatus: readyDependencyStatus,
        phaseSummaries: readyPhaseSummaries,
        selfCheckRules: SELF_CHECK_RULES,
      }),
      nextExactSteps: [],
    };

    expect(validateMobileUiFinalLockReport(report)).toContain("nextExactSteps missing.");
  });
});
