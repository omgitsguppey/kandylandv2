import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync, mkdirSync, mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { dirname, join, delimiter, resolve } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { runInNewContext } from "node:vm";
import * as ts from "typescript";
import { BehavioralVerdictCard } from "@/components/Admin/BehavioralVerdictCard";
import { AdminUserDirectory, AdminUserMetricCard, type AdminUserDirectoryRecord } from "@/components/creative-tim/kandydrops/admin-users/AdminUsersOperations";
import type { UserProfile } from "@/types/db";
import { computeUserEngagementScore } from "@/lib/behavioral/user-engagement-score";
import { buildBehaviorRollupReviewBadge } from "@/lib/behavioral/review-badge-rules";
import { computeUserValueScore } from "@/lib/behavioral/user-value-score";
import { isVerifiedWatchTimeRollupSource, isLegacyWatchTimeRollupSource } from "@/lib/watch-time-rollup-contract";
import { describe, expect, it } from "vitest";

import {
  buildEngagementBehavioralExplanation,
  buildRecommendationBehavioralExplanation,
  buildValueBehavioralExplanation,
} from "@/lib/behavioral/behavioral-explanation";

describe("behavioral explanations", () => {
  it("shows insufficient signal when confidence is below threshold", () => {
    const explanation = buildEngagementBehavioralExplanation({
      engagement: undefined,
      behaviorRollup: {
        confidence: "insufficient",
        confidenceScore: 18,
        freshnessState: "live",
        source: "event_facts",
        sourceLabel: "analytics_event_facts",
        issues: [],
      } as any,
      truthState: "review",
    });

    expect(explanation.type).toBe("insufficient_signal");
    expect(explanation.verdict).toBe("Insufficient signal");
  });

  it("promotes tracking issues over fake recommendation confidence", () => {
    const explanation = buildRecommendationBehavioralExplanation({
      behavioralProfile: {
        confidenceScore: 0.72,
        confidenceLabel: "strong",
        freshnessLabel: "live",
        recommendationState: "profile-driven",
      },
      recommendationDebug: {
        showExplanationCards: true,
        drops: [{ dropId: "drop-1", explanationSummary: "Strong watch signal." }],
      },
      behaviorRollup: {
        confidence: "usable",
        confidenceScore: 64,
        freshnessState: "degraded",
        source: "event_facts",
        sourceLabel: "analytics_event_facts",
        issues: [{
          code: "watch_time_missing_despite_views",
          severity: "warn",
          message: "views exist but watch sessions are missing",
          evidence: {},
        }],
      } as any,
      truthState: "review",
    });

    expect(explanation.type).toBe("tracking_issue");
    expect(explanation.summary).toContain("views exist but watch sessions are missing");
  });

  it("labels fallback-only recommendations plainly", () => {
    const explanation = buildRecommendationBehavioralExplanation({
      behavioralProfile: {
        confidenceScore: 0.58,
        confidenceLabel: "usable",
        freshnessLabel: "live",
        recommendationState: "deterministic-fallback",
      },
      recommendationDebug: {
        mode: "deterministic-fallback",
        showExplanationCards: false,
      },
      behaviorRollup: {
        confidence: "usable",
        confidenceScore: 58,
        freshnessState: "live",
        source: "materialized_rollup",
        sourceLabel: "behavior_rollup",
        issues: [],
      } as any,
      truthState: "live",
    });

    expect(explanation.type).toBe("fallback_only");
    expect(explanation.summary).toContain("fallback-only");
  });

  it("keeps canonical value verdicts first and uses plain-English source wording", () => {
    const explanation = buildValueBehavioralExplanation({
      value: {
        verdict: "Repeat buyer",
        valueScore: 72,
        valueTier: "repeat_buyer",
        repeatPurchaseLikelihood: 0.61,
        topReasons: [
          { code: "total_spend", label: "Total spend", contribution: 0.4, value: 99, summary: "$99 spend." },
          { code: "purchase_count", label: "Purchase count", contribution: 0.2, value: 3, summary: "3 purchases." },
        ],
      } as any,
      behaviorRollup: {
        confidence: "strong",
        confidenceScore: 82,
        freshnessState: "live",
        source: "materialized_rollup",
        sourceLabel: "behavior_rollup",
        issues: [],
      } as any,
      truthState: "live",
    });

    expect(explanation.type).toBe("value_profile");
    expect(explanation.statusLabel).toBe("Value profile");
    expect(explanation.verdict).toBe("Repeat buyer");
    expect(explanation.summary).toBe("This value profile reflects recorded spend and usage.");
    expect(explanation.debugFacts.some((fact) => fact.includes("Score 72/100"))).toBe(true);
  });
});

const repositoryRoot = process.cwd();
const readerOwners = [
  "scripts/agent/validate-behavioral-truth-source.ts",
  "scripts/agent/validate-user-engagement-score.ts",
  "scripts/agent/validate-user-value-score.ts",
  "scripts/agent/validate-behavioral-math-calibration.ts",
  "scripts/agent/validate-behavioral-explanations.ts",
] as const;
const statsReaderOwners = [
  "scripts/agent/validate-admin-user-behavior-truth.ts",
  "scripts/agent/validate-admin-users-stats-grid.ts",
] as const;

function readRepoSource(relativePath: string) {
  return readFileSync(join(repositoryRoot, relativePath), "utf8");
}

function runActualReaderFixture(readers: readonly string[], mutations: Record<string, (source: string) => string> = {}, options: { importOnly?: boolean } = {}) {
  const fixture = mkdtempSync(join(tmpdir(), "kandydrops-behavioral-reader-"));
  const sourcePaths = new Set<string>([
    ...readerOwners,
    ...statsReaderOwners,
    "src/components/creative-tim/kandydrops/admin-users/AdminUsersOperations.tsx",
    "src/components/Admin/BehavioralVerdictCard.tsx",
    "src/lib/behavioral/behavioral-explanation.ts",
    "src/lib/behavioral/behavioral-math-calibration.ts",
    "agent/state/behavioral-math-calibration.generated.json",
    "functions/src/analytics-core.ts",
  ]);
  for (const owner of [...readerOwners, ...statsReaderOwners]) {
    for (const match of readRepoSource(owner).matchAll(/(?:read(?:SourceAst)?|parseJson<[^>]+>|exists)\("([^"]+)"\)/g)) sourcePaths.add(match[1]);
  }
  try {
    for (const relativePath of sourcePaths) {
      const target = join(fixture, relativePath);
      mkdirSync(dirname(target), { recursive: true });
      const original = readRepoSource(relativePath);
      writeFileSync(target, mutations[relativePath]?.(original) ?? original);
    }
    return readers.map((owner) => {
      const args = options.importOnly
        ? [join(repositoryRoot, "node_modules/tsx/dist/cli.mjs"), "-e", `require(${JSON.stringify(join(fixture, owner))})`]
        : [join(repositoryRoot, "node_modules/tsx/dist/cli.mjs"), join(fixture, owner)];
      const result = spawnSync(process.execPath, args, {
        cwd: fixture, encoding: "utf8", windowsHide: true, timeout: 20_000,
        env: { ...process.env, NODE_PATH: [join(repositoryRoot, "node_modules"), process.env.NODE_PATH].filter(Boolean).join(delimiter) },
      });
      if (result.error) throw result.error;
      return { owner, status: result.status, stdout: result.stdout, stderr: result.stderr };
    });
  } finally {
    const resolvedFixture = resolve(fixture);
    if (dirname(resolvedFixture) !== resolve(tmpdir())) throw new Error("Fixture cleanup escaped its temporary parent.");
    rmSync(resolvedFixture, { recursive: true, force: true });
  }
}

function changeOnce(source: string, before: string, after: string) {
  expect(source.split(before)).toHaveLength(2);
  return source.replace(before, after);
}

function expectReaderFailure(result: ReturnType<typeof runActualReaderFixture>[number], message: string) {
  expect(result.status).toBe(1);
  expect(result.stderr).toContain(message);
  expect(result.stderr).not.toContain("Cannot find module");
  expect(result.stderr).not.toContain("Transform failed");
}

describe("behavioral source reader ownership", () => {
  it("executes all five existing CLI owners against the actual connected source", () => {
    for (const result of runActualReaderFixture(readerOwners)) {
      expect({ owner: result.owner, errors: result.stderr, status: result.status }).toEqual({ owner: result.owner, errors: "", status: 0 });
      expect(result.stdout).toMatch(/validation passed|validator passed/);
    }
  }, 30_000);

  it("rejects a hardcoded healthy metric state even when the original binding survives in a comment", () => {
    const [result] = runActualReaderFixture([readerOwners[0]], {
      "src/components/creative-tim/kandydrops/admin-users/AdminUsersOperations.tsx": (source) => changeOnce(source,
        "data-admin-users-metric-state={state}", 'data-admin-users-metric-state="live" /* data-admin-users-metric-state={state} */'),
    });
    expectReaderFailure(result, "actual metric state");
  });

  it("rejects a disconnected metric component instead of accepting its unused import or a decoy marker", () => {
    const [result] = runActualReaderFixture([readerOwners[0]], {
      "src/app/admin/users/page.tsx": (source) => changeOnce(source, "<AdminUserMetricCard\n", "<div\n")
        + '\nconst unusedMetric = <AdminUserMetricCard data-admin-users-metric-state="live" data-admin-users-metric-source="verified" />;\n',
    });
    expectReaderFailure(result, "actual metric state");
  });

  it("rejects the retired Returners label even when the required wording is only a comment", () => {
    const [result] = runActualReaderFixture([readerOwners[1]], {
      "src/app/api/admin/users/route.ts": (source) => changeOnce(source, 'label: "Returned in last 7 days"', 'label: "Returners" /* Returned in last 7 days */'),
    });
    expectReaderFailure(result, "seven-day window");
  });

  it("rejects drift in the single canonical engagement weight owner", () => {
    const [result] = runActualReaderFixture([readerOwners[1]], {
      "src/lib/behavioral/behavioral-math-calibration.ts": (source) => changeOnce(source, "purchaseSignal: 0.24,", "purchaseSignal: 0.07,"),
    });
    expectReaderFailure(result, "agree for purchaseSignal");
  });

  it("rejects a correct weight wired to the wrong active signal", () => {
    const [result] = runActualReaderFixture([readerOwners[1]], {
      "src/lib/behavioral/user-engagement-score.ts": (source) => changeOnce(source, "purchaseSignal: breakdown.purchaseComponent,", "purchaseSignal: breakdown.freeIntentComponent,"),
    });
    expectReaderFailure(result, "agree for purchaseSignal");
  });

  it("rejects raw score substitution at the rendered Directory verdict owner", () => {
    const results = runActualReaderFixture([readerOwners[1], readerOwners[2]], {
      "src/components/creative-tim/kandydrops/admin-users/AdminUsersOperations.tsx": (source) => source.replaceAll("{behavior.engagement}", '{"score"}').replaceAll("{behavior.value}", '{"score"}'),
    });
    expectReaderFailure(results[0], "canonical engagement verdict first");
    expectReaderFailure(results[1], "canonical value verdict");
  });

  it("rejects a fabricated zero fallback for an unavailable value score", () => {
    const [result] = runActualReaderFixture([readerOwners[2]], {
      "src/app/admin/users/page.tsx": (source) => changeOnce(source, 'row.valueScore ?? "--"', "row.valueScore ?? 0"),
    });
    expectReaderFailure(result, "unavailable placeholder");
  });

  it("rejects a Detail Card that does not receive the actual engagement explanation", () => {
    const [result] = runActualReaderFixture([readerOwners[1]], {
      "src/app/admin/user/[userId]/page.tsx": (source) => changeOnce(source, "explanation={engagementExplanation}", "explanation={valueExplanation}"),
    });
    expectReaderFailure(result, "canonical engagement verdict and top three reasons");
  });

  it("rejects dropped canonical reasons rather than accepting a commented old expression", () => {
    const [result] = runActualReaderFixture([readerOwners[1]], {
      "src/lib/behavioral/behavioral-explanation.ts": (source) => changeOnce(source,
        "reasons: input.engagement.topReasons.slice(0, 3).map((reason) => reason.summary),", "reasons: [], /* input.engagement.topReasons.slice(0, 3).map((reason) => reason.summary) */"),
    });
    expectReaderFailure(result, "canonical engagement verdict and top three reasons");
  });

  it("rejects bonus copy that is absent from the actual independent explanation channel", () => {
    const [result] = runActualReaderFixture([readerOwners[2]], {
      "src/lib/behavioral/behavioral-explanation.ts": (source) => changeOnce(source,
        '      "Bonus GD stays separate from cash revenue. Package bonus raises paid-source delivery, not gross spend.",',
        '      /* "Bonus GD stays separate from cash revenue. Package bonus raises paid-source delivery, not gross spend." */'),
    });
    expectReaderFailure(result, "independent bonus-not-cash distinction");
  });

  it("keeps the existing privacy confidence cap guard", () => {
    const [result] = runActualReaderFixture([readerOwners[0]], {
      "functions/src/behavioral-intelligence-runtime.ts": (source) => changeOnce(source,
        "PRIVACY_LIMITED_RECOMMENDATION_CONFIDENCE_CAP = 0.34", "PRIVACY_LIMITED_RECOMMENDATION_CONFIDENCE_CAP = 0.95"),
    });
    expectReaderFailure(result, "privacy-limited recommendation confidence cap");
  });

  it("keeps the existing legacy watch-duration demotion guard", () => {
    const [result] = runActualReaderFixture([readerOwners[0]], {
      "src/lib/server/user-behavior-rollup.ts": (source) => source.replaceAll('"legacy_page_duration"', '"verified_watch"'),
    });
    expectReaderFailure(result, "labeled legacy page-duration fallback");
  });

  it("keeps the existing spend formula guard when a bonus quantity is substituted for spend", () => {
    const [result] = runActualReaderFixture([readerOwners[2]], {
      "src/lib/behavioral/user-value-score.ts": (source) => changeOnce(source, "0.45 * breakdown.spendComponent", "0.45 * normalizedInput.bonusGdDelivered"),
    });
    expectReaderFailure(result, "0.45 * breakdown.spendComponent");
  });
});

const bonusNotCash = "Bonus GD stays separate from cash revenue. Package bonus raises paid-source delivery, not gross spend.";
const verifiedBehavior = {
  confidence: "strong", confidenceScore: 82, freshnessState: "live", source: "materialized_rollup", sourceLabel: "behavior_rollup", issues: [],
} as any;

describe("value explanation source meaning", () => {
  it.each([0, 5000])("retains three canonical score reasons and the independent bonus distinction for bonus GD %i", (bonusGdDelivered) => {
    const value = computeUserValueScore({ totalSpendUsd: 9.99, purchaseCount: 1, paidGdPurchased: 1000, bonusGdDelivered, rewardGdEarned: 0,
      freeGdEarned30d: 0, unwrapsAfterPurchase: 2, daysSinceLastPurchase: 2 });
    const explanation = buildValueBehavioralExplanation({ value, behaviorRollup: verifiedBehavior, truthState: "live" });
    expect(explanation.type).toBe("value_profile");
    expect(explanation.statusLabel).toBe("Value profile");
    expect(explanation.verdict).toBe(value.verdict);
    expect(explanation.summary).not.toMatch(/likely to spend|purchased recently|kept unlocking/i);
    expect(value.totalSpendUsd).toBe(9.99);
    expect(value.paidGdPurchased).toBe(1000);
    expect(value.bonusGdDelivered).toBe(bonusGdDelivered);
    expect(value.topReasons).toHaveLength(3);
    expect(explanation.reasons).toEqual(value.topReasons.map((reason) => reason.summary));
    expect(explanation.debugFacts.filter((fact) => fact === bonusNotCash)).toHaveLength(1);
    const markup = renderToStaticMarkup(React.createElement(BehavioralVerdictCard, { title: "Value verdict", explanation }));
    expect(markup).toContain(bonusNotCash);
    expect(markup).toContain("Value profile");
    expect(markup).toContain(value.verdict);
    expect(explanation.debugFacts).toContain(`Repeat purchase likelihood ${Math.round(value.repeatPurchaseLikelihood * 100)}%`);
    for (const reason of explanation.reasons) expect(markup).toContain(reason);
  });

  it("keeps verified zero amounts and a neutral canonical value profile", () => {
    const value = computeUserValueScore({ totalSpendUsd: 0, purchaseCount: 0, paidGdPurchased: 0, bonusGdDelivered: 0, rewardGdEarned: 0,
      freeGdEarned30d: 0, unwrapsAfterPurchase: 0, daysSinceLastPurchase: null });
    const explanation = buildValueBehavioralExplanation({ value, behaviorRollup: verifiedBehavior, truthState: "live" });
    expect(explanation.summary).not.toMatch(/likely to spend|purchased recently|kept unlocking/i);
    expect(explanation.type).toBe("value_profile");
    expect(explanation.statusLabel).toBe("Value profile");
    expect([value.totalSpendUsd, value.purchaseCount, value.paidGdPurchased, value.bonusGdDelivered]).toEqual([0, 0, 0, 0]);
    expect(explanation.verdict).toBe(value.verdict);
    expect(explanation.reasons).toEqual(value.topReasons.map((reason) => reason.summary));
    expect(explanation.debugFacts).toContain(bonusNotCash);
    const markup = renderToStaticMarkup(React.createElement(BehavioralVerdictCard, { title: "Value verdict", explanation }));
    expect(markup).toContain("Observer");
    expect(markup).toContain("Value profile");
    expect(markup).not.toMatch(/Spend likely|purchased recently|kept unlocking/i);
  });

  it.each(["unavailable", "privacy_limited"] as const)("leaves missing paid/spend/bonus data unmeasured under %s", (truthState) => {
    const explanation = buildValueBehavioralExplanation({ value: undefined, truthState });
    expect(explanation.type).toBe(truthState === "privacy_limited" ? "privacy_limited" : "insufficient_signal");
    expect(explanation.reasons).toEqual([]);
    expect(explanation.debugFacts).toContain("Source unavailable");
    const markup = renderToStaticMarkup(React.createElement(BehavioralVerdictCard, { title: "Value verdict", explanation }));
    expect(markup).not.toMatch(/\$0|0 GD|Score 0/);
    expect(markup).not.toContain("Spend likely");
  });
});

function runActualKpiProducer() {
  const source = ts.createSourceFile("route.ts", readRepoSource("src/app/api/admin/users/route.ts"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const names = ["toUtcIsoString", "formatCount", "formatCompactMoney", "formatHoursOrMinutes", "mapSnapshotFreshnessToKpiState", "mapCommerceTruthToKpiState", "buildAdminUsersKpiCards"];
  const functions = names.map((name) => {
    const declaration = source.statements.find((node): node is ts.FunctionDeclaration => ts.isFunctionDeclaration(node) && node.name?.text === name);
    expect(declaration, "actual producer dependency " + name).toBeDefined();
    return declaration!.getText(source);
  });
  const code = ts.transpileModule(functions.join("\n") + "\nglobalThis.buildCards = buildAdminUsersKpiCards;", {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText;
  const context = { isVerifiedWatchTimeRollupSource, isLegacyWatchTimeRollupSource, buildCards: undefined as unknown as (input: unknown) => any[] };
  runInNewContext(code, context);
  return context.buildCards({ summary: {
    totalUsers: 12, activeUsers: 9, returnedInLast7Days: 7, activeLast7Days: 8, onboardingCompletedUsers: 4,
    totalUnwraps: 0, totalPurchases: 0, grossRevenueUsd: 0, adjustedProfitUsd: 0, bonusValueUsd: 0,
    payingUsers: 0, averageOrderUsd: 0, effectiveUsdPer100Gd: 0, verifiedUsers: 0, notificationsEnabledUsers: 0,
    commerceTruthLabel: "unavailable", metricsSnapshot: undefined,
  } }).find((card) => card.id === "returned_7d");
}

describe("returned activity producer and Card agreement", () => {
  it("keeps the actual seven-day producer id, formula and metadata while naming its window", () => {
    expect(runActualKpiProducer()).toMatchObject({
      id: "returned_7d", label: "Returned in last 7 days", primaryValue: "7", secondaryValue: "7 / 12 users", scope: "rolling_7d",
      sourceTruth: "materialized_snapshot", freshnessState: "unknown", explanation: "Logged in, visited, or emitted tracked activity in the last 7 days.",
      warnings: [], sourceLabel: "materialized_snapshot",
    });
  });

  it("renders the actual producer label, value and scope through the current metric Card", () => {
    const card = runActualKpiProducer();
    const markup = renderToStaticMarkup(React.createElement(AdminUserMetricCard, {
      id: card.id, label: card.label, primaryValue: card.primaryValue, secondaryValue: card.secondaryValue, title: card.explanation,
      state: "unavailable", pendingInitialLoad: false, hasUsableValue: true, reviewDecision: null, source: card.sourceLabel, freshness: card.freshnessState, scope: card.scope,
      reason: card.reasonCode ?? "unknown", generatedAtUtc: card.generatedAtUtc, sourceDetail: card.sourceLabel, footerReason: card.explanation,
    }));
    expect(markup).toContain("Returned in last 7 days");
    expect(markup).toContain('data-admin-users-kpi-id="returned_7d"');
    expect(markup).toContain('data-admin-users-kpi-scope="rolling_7d"');
    expect(markup).toContain("7 / 12 users");
    expect(markup).toContain(card.explanation);
  });
});


describe("source-backed value profile wording", () => {
  it("does not invent post-purchase unwraps for a purchase profile with no unwraps", () => {
    const value = computeUserValueScore({ totalSpendUsd: 99.99, purchaseCount: 2, paidGdPurchased: 2500, bonusGdDelivered: 1000,
      rewardGdEarned: 0, freeGdEarned30d: 0, unwrapsAfterPurchase: 0, daysSinceLastPurchase: 2 });
    const explanation = buildValueBehavioralExplanation({ value, behaviorRollup: verifiedBehavior, truthState: "live" });
    expect(explanation.summary).not.toMatch(/kept unlocking|likely to spend/i);
    expect(explanation.type).toBe("value_profile");
    expect(explanation.verdict).toBe(value.verdict);
    expect(value.unwrapsAfterPurchase).toBe(0);
    expect(explanation.reasons).toEqual(value.topReasons.map((reason) => reason.summary));
    const markup = renderToStaticMarkup(React.createElement(BehavioralVerdictCard, { title: "Value verdict", explanation }));
    expect(markup).toContain(value.verdict);
    expect(markup).toContain("Value profile");
    expect(markup).not.toMatch(/kept unlocking|likely to spend/i);
  });

  it.each(["degraded", "stale"] as const)("preserves %s source posture over a positive canonical value profile", (truthState) => {
    const value = computeUserValueScore({ totalSpendUsd: 99.99, purchaseCount: 2, paidGdPurchased: 2500, bonusGdDelivered: 1000,
      rewardGdEarned: 0, freeGdEarned30d: 0, unwrapsAfterPurchase: 5, daysSinceLastPurchase: 2 });
    const explanation = buildValueBehavioralExplanation({ value, behaviorRollup: verifiedBehavior, truthState });
    expect(explanation.type).toBe(truthState === "degraded" ? "source_disagreement" : "stale_source");
    expect(explanation.reasons).toEqual([]);
    expect(explanation.debugFacts).toContain("Source behavior_rollup");
    const markup = renderToStaticMarkup(React.createElement(BehavioralVerdictCard, { title: "Value verdict", explanation }));
    expect(markup).toContain(truthState === "degraded" ? "Source disagreement" : "Stale source");
    expect(markup).not.toContain("Value profile");
    expect(markup).not.toContain("Spend likely");
  });
});

describe("sibling reader controls", () => {

  it.each([
    ["canonical weight", "src/lib/behavioral/behavioral-math-calibration.ts", "purchaseSignal: 0.24,", "purchaseSignal: 0.07,"],
    ["active signal", "src/lib/behavioral/user-engagement-score.ts", "purchaseSignal: breakdown.purchaseComponent,", "purchaseSignal: breakdown.freeIntentComponent,"],
  ])("rejects drift in %s through the shared active inspection", (_name, owner, before, after) => {
    const [result] = runActualReaderFixture([readerOwners[3]], { [owner]: source => changeOnce(source, before, after) });
    expect(result.status).toBe(1);
    expect(result.stdout).toContain("FAIL engagement formula exists");
  });

  it.each([
    ["source classification", " || !isCanonicalMetricSource(record)", " /* isServerPurchaseFact isServerUnlockFact !isCanonicalMetricSource(record) */"],
    ["metric eligibility", " || record.metricEligible === false", " /* record.metricEligible === false */"],
    ["connected producer", "metricFacts: buildCanonicalMetricFacts({", "metricFacts: unrelatedFacts({"],
  ])("keeps the actual Functions %s guard despite retired-name decoys", (_name, before, after) => {
    const [result] = runActualReaderFixture([readerOwners[3]], {
      "functions/src/behavioral-intelligence-runtime.ts": source => changeOnce(source, before, after),
    });
    expect(result.status).toBe(1);
    expect(result.stdout).toContain("FAIL server purchase and unlock truth first");
  });

  it("rejects a forged Directory math mode despite a commented original binding", () => {
    const [result] = runActualReaderFixture([readerOwners[3]], {
      "src/app/admin/users/page.tsx": source => changeOnce(source,
        'mathMode: behaviorRollup?.mathCalibration?.activeMode ?? "unavailable",',
        'mathMode: "ml_active", /* behaviorRollup?.mathCalibration?.activeMode ?? "unavailable" */'),
    });
    expect(result.stdout).toContain("FAIL admin rollups expose math state");
    expect(result.status).toBe(1);
  });

  it("rejects a hardcoded rendered math mode with an unused valid token", () => {
    const [result] = runActualReaderFixture([readerOwners[3]], {
      "src/components/creative-tim/kandydrops/admin-users/AdminUsersOperations.tsx": source => changeOnce(source,
        "data-user-behavior-math-mode={behavior.mathMode}", 'data-user-behavior-math-mode="deterministic" /* data-user-behavior-math-mode={behavior.mathMode} */'),
    });
    expect(result.stdout).toContain("FAIL admin rollups expose math state");
    expect(result.status).toBe(1);
  });

  it("rejects a dropped Directory reason even when the old binding remains in a comment", () => {
    const [result] = runActualReaderFixture([readerOwners[4]], {
      "src/app/admin/users/page.tsx": source => changeOnce(source,
        "engagementReason: engagementExplanation.reasons[0] ?? engagementExplanation.summary,",
        'engagementReason: "Healthy", /* engagementExplanation.reasons[0] ?? engagementExplanation.summary */'),
    });
    expectReaderFailure(result, "Loaded Admin directory must render canonical plain-English behavior reasons");
  });

  it("rejects a disconnected Directory summary instead of its unused function", () => {
    const results = runActualReaderFixture(readerOwners.slice(3), {
      "src/components/creative-tim/kandydrops/admin-users/AdminUsersOperations.tsx": source => source.replaceAll("<DirectoryBehaviorSummary ", "<div "),
    });
    expect(results[0].status).toBe(1);
    expect(results[0].stdout).toContain("FAIL admin rollups expose math state");
    expectReaderFailure(results[1], "Loaded Admin directory must render canonical plain-English behavior reasons");
  });

  it("accepts a valid named Directory import alias at the actual rendered owner", () => {
    for (const result of runActualReaderFixture(readerOwners.slice(3), {
      "src/app/admin/users/page.tsx": source => changeOnce(source, "{ AdminUserDirectory, AdminUserMetricCard", "{ AdminUserDirectory as DirectoryRows, AdminUserMetricCard")
        .replaceAll("<AdminUserDirectory\n", "<DirectoryRows\n"),
    })) {
      expect({ owner: result.owner, stderr: result.stderr, status: result.status }).toEqual({ owner: result.owner, stderr: "", status: 0 });
    }
  }, 30_000);

  it.each([
    ["model activation", "src/lib/behavioral/behavioral-math-calibration.ts", "sampleSize < 50", "sampleSize < 1", "ML activation rules enforced"],
    ["drop ranking", "src/lib/behavioral/behavioral-math-calibration.ts", "(0.35 * clamp01(input.pPurchase7d))", "(0.05 * clamp01(input.pPurchase7d))", "drop ranking formula exists"],
    ["ranker binding", "src/lib/recommendations/deterministic-ranker.ts", "computeDropRecommendationScore", "differentScoreOwner", "rankers use goal-calibrated score"],
    ["truth weighting", "src/lib/behavioral/behavioral-math-calibration.ts", "(0.4 * clamp01(input.sourceReliability))", "(0.9 * clamp01(input.sourceReliability))", "truth score formula exists"],
  ])("retains the distinct %s gate", (_name, owner, before, after, label) => {
    const [result] = runActualReaderFixture([readerOwners[3]], { [owner]: source => source.replaceAll(before, after) });
    expect(result.status).toBe(1);
    expect(result.stdout).toContain("FAIL " + label);
  });

  it.each([
    ["required metrics", (report: any) => { delete report.validationMetrics.sampleSize; }, "generated report carries required metrics"],
    ["critical truth", (report: any) => { report.truthRequirements.purchaseTruthPresent = false; }, "critical truth requirements pass"],
  ] as const)("retains the distinct formal report %s gate", (_name, mutate, label) => {
    const [result] = runActualReaderFixture([readerOwners[3]], {
      "agent/state/behavioral-math-calibration.generated.json": source => { const report = JSON.parse(source); mutate(report); return JSON.stringify(report); },
    });
    expect(result.status).toBe(1);
    expect(result.stdout).toContain("FAIL " + label);
  });
});

function actualDirectoryRecords(analytics: any, truthState = "live"): AdminUserDirectoryRecord[] {
  const source = ts.createSourceFile("page.tsx", readRepoSource("src/app/admin/users/page.tsx"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let initializer: ts.Expression | undefined;
  const visit = (node: ts.Node) => {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === "adminDirectoryRecords") initializer = node.initializer;
    ts.forEachChild(node, visit);
  };
  visit(source);
  expect(initializer).toBeDefined();
  const user: UserProfile = { uid: "directory-source-proof", email: null, displayName: "Observed account", photoURL: null, gumDropsBalance: 0, unlockedContent: [], createdAt: 1, role: "user" };
  const context = {
    filteredUsers: [user], getUserAnalytics: () => analytics, getBehaviorRollup: () => analytics?.behaviorRollup,
    getBehaviorTruthState: () => truthState, buildEngagementBehavioralExplanation, buildValueBehavioralExplanation, buildBehaviorRollupReviewBadge,
    userManagementSummaryById: new Map(), formatJoined: () => "Recorded date", formatLastSeen: () => "Recorded activity", formatLastPurchase: () => "Recorded purchase",
    getOnboardingBadge: () => ({label: "Recorded", className: ""}), getBehaviorAvailabilityLabel: () => null,
    formatOptionalCount: (value: unknown) => typeof value === "number" ? String(value) : "No source",
    formatWatchHours: () => "No source", records: [] as AdminUserDirectoryRecord[],
  };
  const code = ts.transpileModule("globalThis.records = " + initializer!.getText(source) + ";", {compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
  runInNewContext(code, context);
  return context.records;
}

function renderDirectoryRecords(records: AdminUserDirectoryRecord[]) {
  const noop = () => undefined;
  return renderToStaticMarkup(React.createElement(AdminUserDirectory, { records, loading: false, searchQuery: "", selectedDetailUserId: null, getStatusColor: () => "",
    onEditUsername: noop, onEditBalance: noop, onViewHistory: noop, onLoadDetail: noop, onOpenContent: noop, onViewSecurity: noop,
    onPromoteCreator: noop, onChangeRole: noop, onToggleVerification: noop, onSetStatus: noop }));
}

describe("Directory source-to-render continuity", () => {
  it("keeps a pending row unloaded without invented reasons or math", () => {
    const records = actualDirectoryRecords(undefined);
    const markup = renderDirectoryRecords(records);
    expect(records[0].behavior.loaded).toBe(false);
    expect(markup).toContain("Load detail");
    expect(markup).not.toContain("Math:");
    expect(markup).not.toContain("Engagement:");
  });

  it("shows an unavailable math state and canonical insufficient reason when detail data is missing", () => {
    const records = actualDirectoryRecords({metricTruthLabel:"unknown"}, "unavailable");
    const markup = renderDirectoryRecords(records);
    expect(records[0].behavior.mathMode).toBe("unavailable");
    expect(records[0].behavior.mathVerdict).toBe("unavailable");
    const engagement = buildEngagementBehavioralExplanation({truthState:"unavailable"});
    const value = buildValueBehavioralExplanation({truthState:"unavailable"});
    for (const [kind, explanation] of [["engagement",engagement],["value",value]] as const) {
      expect(explanation.type).toBe("insufficient_signal");
      expect(explanation.reasons).toEqual([]);
      expect(records[0].behavior[kind + "Reason" as "engagementReason" | "valueReason"]).toBe(explanation.summary);
      expect(markup.split(explanation.summary)).toHaveLength(2);
    }
    expect(markup).toContain('data-user-behavior-math-mode="unavailable"');
    expect(markup).not.toContain("Math: deterministic");
    expect(markup).not.toContain("ml_validated");
  });

  it.each([0, 2])("renders actual canonical reasons and current math for %i recorded purchases", (purchaseCount) => {
    const value = computeUserValueScore({ totalSpendUsd: purchaseCount * 9.99, purchaseCount, paidGdPurchased: purchaseCount * 1000, bonusGdDelivered: purchaseCount * 100,
      rewardGdEarned:0, freeGdEarned30d:0, unwrapsAfterPurchase:0, daysSinceLastPurchase: purchaseCount ? 2 : null });
    const engagement = computeUserEngagementScore({ normalizedActionCount7d:0, unwrappedCount30d:0, validWatchMinutes30d:0, purchaseCount90d:purchaseCount, activeDays7d:0, freeGdEarned30d:0 });
    const behaviorRollup = {...verifiedBehavior, engagement, value, mathCalibration:{activeMode:"deterministic",verdict:"deterministic_active"}, dataAvailabilityReason:"full_signal"};
    const records = actualDirectoryRecords({engagement,value,behaviorRollup});
    const markup = renderDirectoryRecords(records);
    expect(records[0].behavior.engagementReason).toBe(engagement.topReasons[0].summary);
    expect(records[0].behavior.valueReason).toBe(value.topReasons[0].summary);
    for (const reason of [records[0].behavior.engagementReason, records[0].behavior.valueReason]) expect(markup.split(reason)).toHaveLength(2);
    expect(markup).toContain('data-user-behavior-math-mode="deterministic"');
    expect(markup).toContain("deterministic_active");
    expect(value.purchaseCount).toBe(purchaseCount);
  });

  it.each(["stale","privacy_limited"] as const)("keeps the canonical %s reason in the loaded row", (truthState) => {
    const engagement = computeUserEngagementScore({normalizedActionCount7d:0,unwrappedCount30d:0,validWatchMinutes30d:0,purchaseCount90d:0,activeDays7d:0,freeGdEarned30d:0});
    const behaviorRollup = {...verifiedBehavior,engagement};
    const records = actualDirectoryRecords({engagement,behaviorRollup}, truthState);
    const markup = renderDirectoryRecords(records);
    const expected = buildEngagementBehavioralExplanation({engagement,behaviorRollup,truthState});
    expect(expected.type).toBe(truthState === "stale" ? "stale_source" : "privacy_limited");
    expect(records[0].behavior.engagementReason).toBe(expected.summary);
    expect(markup).toContain(expected.summary);
    expect(records[0].behavior.mathMode).toBe("unavailable");
  });
});

function actualCanonicalMetricFactBuilder() {
  const runtime = ts.createSourceFile("runtime.ts", readRepoSource("functions/src/behavioral-intelligence-runtime.ts"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const core = ts.createSourceFile("core.ts", readRepoSource("functions/src/analytics-core.ts"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const select = (source: ts.SourceFile, names: string[]) => names.map(name => {
    const node = source.statements.find((node): node is ts.FunctionDeclaration => ts.isFunctionDeclaration(node) && node.name?.text === name);
    expect(node, "actual pure owner " + name).toBeDefined();
    return node!.getText(source).replace(/^export /, "");
  }).join("\n");
  const code = select(core, ["readString","readNumber"]) + "\n"
    + select(runtime, ["readNormalizedAction","readSourceTruth","isCanonicalMetricSource","buildCanonicalMetricFacts"])
    + "\nglobalThis.buildMetricFacts = buildCanonicalMetricFacts;";
  const context = { buildMetricFacts: undefined as unknown as (input: {eventFacts: Record<string,unknown>[];watchSessions:Record<string,unknown>[]}) => Record<string,unknown>[] };
  runInNewContext(ts.transpileModule(code,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,context);
  return context.buildMetricFacts;
}

describe("Functions canonical metric source boundary", () => {
  it.each([
    ["gumdrops_purchased","server_transaction","server_transaction"],
    ["drop_unlocked","server_entitlement_unlock","server_entitlement"],
  ])("keeps an eligible canonical %s fact with its actual actor and provenance", (normalizedActionName,sourceTruth,provenance) => {
    const facts = actualCanonicalMetricFactBuilder()({eventFacts:[{normalizedActionName,sourceTruth,metricEligible:true,eventId:"source-proof",actorUserId:"recorded-user",timestamp:123,valueUsd:9.99}],watchSessions:[]});
    expect(facts).toHaveLength(1);
    expect(facts[0]).toMatchObject({metricName:normalizedActionName,sourceTruth,provenance,eventId:"source-proof",actorUserId:"recorded-user",timestampMs:123});
  });

  it.each(["gumdrops_purchased","drop_unlocked"])("rejects browser provenance for %s even with a client-provided verified marker", normalizedActionName => {
    expect(actualCanonicalMetricFactBuilder()({eventFacts:[{normalizedActionName,sourceTruth:"client",metricEligible:true,serverVerified:true,actorUserId:"recorded-user"}],watchSessions:[]})).toEqual([]);
  });

  it.each(["gumdrops_purchased","drop_unlocked"])("retains explicit non-counting eligibility for %s despite server provenance", normalizedActionName => {
    expect(actualCanonicalMetricFactBuilder()({eventFacts:[{normalizedActionName,sourceTruth:"server",metricEligible:false,actorUserId:"recorded-user"}],watchSessions:[]})).toEqual([]);
  });

  it("keeps verified watch source distinct from legacy page duration", () => {
    const facts = actualCanonicalMetricFactBuilder()({eventFacts:[],watchSessions:[
      {watchScoreSource:"legacy_page_duration",validWatchMs:5000,userId:"legacy",watchSessionId:"legacy-proof"},
      {watchScoreSource:"watch_session_rollup",validWatchMs:1000,userId:"recorded-user",watchSessionId:"watch-proof",lastSeenAtMs:123},
    ]});
    expect(facts).toHaveLength(1);
    expect(facts[0]).toMatchObject({metricName:"watch_session_verified",sourceTruth:"watch_session_rollup",actorUserId:"recorded-user",eventId:"watch-proof",value:1000,timestampMs:123});
  });
});


describe("Admin Users connected stats readers", () => {
  const pageOwner = "src/app/admin/users/page.tsx";
  const cardOwner = "src/components/creative-tim/kandydrops/admin-users/AdminUsersOperations.tsx";
  const routeOwner = "src/app/api/admin/users/route.ts";

  it("executes both existing stats and behavior CLIs against the connected current source", () => {
    for (const result of runActualReaderFixture(statsReaderOwners)) {
      expect({ owner: result.owner, status: result.status, errors: result.stderr }).toEqual({ owner: result.owner, status: 0, errors: "" });
      expect(result.stdout).toContain("validation passed");
    }
  }, 30_000);

  it("does not execute the shared stats CLI when imported by a consumer", () => {
    const [result] = runActualReaderFixture([statsReaderOwners[1]], {}, { importOnly: true });
    expect(result.status).toBe(0);
    expect(result.stdout).toBe("");
    expect(result.stderr).toBe("");
  });

  it("rejects a missing active marker even when its old text remains in a comment", () => {
    for (const result of runActualReaderFixture(statsReaderOwners, {
      [cardOwner]: source => changeOnce(source, '      data-admin-users-metric-source={source}\n', '')
        + '\n// data-admin-users-metric-source={source}\n',
    })) expectReaderFailure(result, "prop-backed data-admin-users-metric-source");
  }, 30_000);

  it("rejects a disconnected card caller even when an unused caller contains all markers", () => {
    for (const result of runActualReaderFixture(statsReaderOwners, {
      [pageOwner]: source => changeOnce(source, "<AdminUserMetricCard\n", "<div\n")
        + '\nconst unusedStatsCard = <AdminUserMetricCard data-admin-users-metric-state="live" data-admin-users-metric-source="verified" />;\n',
    })) expectReaderFailure(result, "imported, rendered AdminUserMetricCard");
  }, 30_000);

  it("rejects a canonical mapper that exists but is no longer called by the summary array", () => {
    for (const result of runActualReaderFixture(statsReaderOwners, {
      [pageOwner]: source => changeOnce(source, "{renderSummaryMetricCard(card)}", "{null}")
        + '\n// renderSummaryMetricCard(card)\n',
    })) expectReaderFailure(result, "imported, rendered AdminUserMetricCard");
  }, 30_000);

  it("rejects source and freshness props replaced by healthy constants", () => {
    for (const result of runActualReaderFixture(statsReaderOwners, {
      [pageOwner]: source => changeOnce(changeOnce(source, 'source={card.sourceLabel ?? card.sourceTruth}', 'source="verified"'),
        'freshness={card.freshnessState}', 'freshness="live"'),
    })) {
      expectReaderFailure(result, "source must forward canonical KPI truth");
      expect(result.stderr).toContain("freshness must forward canonical KPI truth");
    }
  }, 30_000);

  it("rejects a card attribute detached from the source prop", () => {
    for (const result of runActualReaderFixture(statsReaderOwners, {
      [cardOwner]: source => changeOnce(source, 'data-admin-users-kpi-source-truth={source}', 'data-admin-users-kpi-source-truth="verified"'),
    })) expectReaderFailure(result, "prop-backed data-admin-users-kpi-source-truth");
  }, 30_000);

  it("rejects a ribbon marker outside the rendered page", () => {
    for (const result of runActualReaderFixture(statsReaderOwners, {
      [pageOwner]: source => changeOnce(source, 'data-admin-users-stats-layout="evidence-ribbon"', 'data-admin-users-stats-layout="unknown"')
        + '\nconst unusedRibbon = <div data-admin-users-stats-layout="evidence-ribbon" />;\n',
    })) expectReaderFailure(result, "current evidence-ribbon layout");
  }, 30_000);

  it("rejects a missing canonical KPI ID despite a disconnected record with its old label", () => {
    for (const result of runActualReaderFixture(statsReaderOwners, {
      [routeOwner]: source => changeOnce(source, 'id: "returned_7d",', 'id: "wrong_returned",')
        + '\nconst unusedReturned = { id: "returned_7d", label: "Returned in last 7 days" };\n',
    })) expectReaderFailure(result, "builder must return returned_7d");
  }, 30_000);

  it("rejects summary projection detached from the canonical builder", () => {
    for (const result of runActualReaderFixture(statsReaderOwners, {
      [routeOwner]: source => source.replaceAll('kpiCards: buildAdminUsersKpiCards({ summary: summaryBase })', 'kpiCards: []')
        + '\n// kpiCards: buildAdminUsersKpiCards({ summary: summaryBase })\n',
    })) expectReaderFailure(result, "Bounded summary projection must return canonical KPI cards");
  }, 30_000);

  it("accepts a valid imported-card alias and renamed active renderer", () => {
    for (const result of runActualReaderFixture(statsReaderOwners, {
      [pageOwner]: source => changeOnce(source, 'AdminUserDirectory, AdminUserMetricCard,', 'AdminUserDirectory, AdminUserMetricCard as MetricTile,')
        .replaceAll('<AdminUserMetricCard\n', '<MetricTile\n')
        .replaceAll('renderSummaryMetricCard', 'renderKpiSourceTile'),
    })) expect({ owner: result.owner, status: result.status, errors: result.stderr }).toEqual({ owner: result.owner, status: 0, errors: "" });
  }, 30_000);
});
