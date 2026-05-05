import fs from "node:fs";
import path from "node:path";

import type { Drop } from "../../src/types/db";
import {
  assessIntegrityRisk,
  buildIntegrityRiskMap,
} from "../../src/lib/moderation/integrity-risk-map";
import {
  applyIntegrityDemotion,
  applyIntegrityDemotions,
  computeIntegrityMultiplier,
  INTEGRITY_DEMOTION_ADMIN_REASON,
} from "../../src/lib/recommendations/integrity-demotions";

const repoRoot = process.cwd();

type Check = {
  label: string;
  pass: boolean;
  detail: string;
};

function read(relativePath: string) {
  return fs.readFileSync(path.resolve(repoRoot, relativePath), "utf8");
}

function exists(relativePath: string) {
  return fs.existsSync(path.resolve(repoRoot, relativePath));
}

function check(label: string, pass: boolean, detail: string): Check {
  return { label, pass, detail };
}

function makeDrop(id: string, overrides: Partial<Drop> & Record<string, unknown> = {}): Drop {
  const nowMs = Date.now();

  return {
    id,
    title: `Drop ${id}`,
    description: "validator fixture",
    imageUrl: "https://example.test/cover.jpg",
    contentUrl: "https://example.test/content.jpg",
    unlockCost: 100,
    validFrom: nowMs - (2 * 24 * 60 * 60 * 1000),
    validUntil: nowMs + (7 * 24 * 60 * 60 * 1000),
    status: "active",
    approvalStatus: "approved",
    totalUnlocks: 0,
    type: "content",
    tags: ["art"],
    ...overrides,
  } as Drop;
}

function main() {
  const packageJson = JSON.parse(read("package.json")) as { scripts?: Record<string, string> };
  const riskMapContract = read("src/lib/moderation/integrity-risk-map.ts");
  const demotionContract = read("src/lib/recommendations/integrity-demotions.ts");
  const serverBehavior = read("src/lib/server/behavioral-intelligence.ts");
  const adminRoute = read("src/app/api/admin/user/[userId]/route.ts");
  const calibrationDocs = read("docs/agent-truth/behavioral-math-calibration.md");
  const rankingDocs = read("docs/agent-truth/recommendation-ranking.md");
  const moderationDoctrine = read("docs/doctrine/surfaces/moderation.md");
  const validatorMap = read("agent/context/validator-map.json");
  const multiplier = computeIntegrityMultiplier({
    moderationRisk: 0.5,
    supportComplaintRate: 0.25,
    negativeSatisfactionRate: 0.25,
    verificationRisk: 0.5,
    metadataRisk: 0.2,
  });
  const mediumRisk = assessIntegrityRisk({
    moderationRiskTier: "medium",
    supportComplaintRate: 0.25,
    negativeSatisfactionRate: 0.2,
    creatorVerificationComplete: false,
    metadataRisk: 0.2,
  });
  const criticalRisk = assessIntegrityRisk({
    moderationRiskTier: "critical",
    contentProtectionFailure: true,
  });
  const demoted = applyIntegrityDemotion({
    entry: { drop: makeDrop("medium"), score: 80 },
    risk: mediumRisk,
  });
  const removedSet = applyIntegrityDemotions({
    entries: [
      { drop: makeDrop("safe"), score: 80 },
      { drop: makeDrop("critical"), score: 100 },
    ],
    integrityRiskMap: new Map([
      ["critical", criticalRisk],
    ]),
  });
  const derivedRiskMap = buildIntegrityRiskMap({
    drops: [
      makeDrop("warning", {
        moderationRiskTier: "medium",
        contentProtectionWarning: true,
        supportComplaintRate: 0.3,
        creatorVerificationComplete: false,
      }),
      makeDrop("safe"),
    ],
  });

  const checks: Check[] = [
    check(
      "package script exists",
      packageJson.scripts?.["check:integrity-demotions"] === "tsx scripts/agent/validate-integrity-demotions.ts",
      "Package must expose the targeted integrity demotion validator.",
    ),
    check(
      "created files exist",
      exists("src/lib/recommendations/integrity-demotions.ts")
        && exists("src/lib/moderation/integrity-risk-map.ts")
        && exists("scripts/agent/validate-integrity-demotions.ts"),
      "Integrity demotion, risk map, and validator files must exist.",
    ),
    check(
      "formula is exact",
      demotionContract.includes("(0.35 * components.moderationRisk)")
        && demotionContract.includes("(0.20 * components.supportComplaintRate)")
        && demotionContract.includes("(0.20 * components.negativeSatisfactionRate)")
        && demotionContract.includes("(0.15 * components.verificationRisk)")
        && demotionContract.includes("(0.10 * components.metadataRisk)")
        && multiplier < 1
        && multiplier > 0,
      "integrityMultiplier must use the requested weighted formula.",
    ),
    check(
      "final score uses multiplier",
      demotionContract.includes("input.entry.score * integrityMultiplier")
        && demoted.score < 80
        && demoted.integrity.finalScore === demoted.score,
      "Final score must equal rankScore * integrityMultiplier for demoted candidates.",
    ),
    check(
      "critical failures remove candidate",
      criticalRisk.criticalPolicyFailure
        && criticalRisk.contentProtectionFailure
        && removedSet.every((entry) => entry.drop.id !== "critical"),
      "Critical policy or content-protection failures must be removed after candidate generation.",
    ),
    check(
      "medium risk demotes with admin reason",
      demoted.integrity.action === "demote"
        && demoted.integrity.reasons.includes(INTEGRITY_DEMOTION_ADMIN_REASON)
        && INTEGRITY_DEMOTION_ADMIN_REASON === "demoted by integrity risk",
      "Medium risk must demote and surface the explicit admin reason.",
    ),
    check(
      "risk map includes requested signals",
      [
        "moderationRiskTier",
        "contentProtectionWarning",
        "supportComplaintRate",
        "negativeSatisfactionRate",
        "refundRisk",
        "creatorVerificationComplete",
        "metadataUpdatedAtMs",
        "suspiciousAssetAccessRate",
      ].every((token) => riskMapContract.includes(token))
        && (derivedRiskMap.get("warning")?.components.moderationRisk || 0) >= 0.5,
      "Risk map must consume moderation, content protection, complaints, satisfaction/refund, verification, metadata, and asset access signals.",
    ),
    check(
      "server applies demotion before final ranking",
      serverBehavior.includes("buildIntegrityRiskMap")
        && serverBehavior.includes("applyIntegrityDemotions")
        && serverBehavior.indexOf("const integrityAdjusted = applyIntegrityDemotions") > serverBehavior.indexOf("const scored = deterministicRanked")
        && serverBehavior.indexOf("const integrityAdjusted = applyIntegrityDemotions") < serverBehavior.indexOf("const explored = applyExplorationBudget")
        && serverBehavior.indexOf("const integrityAdjusted = applyIntegrityDemotions") < serverBehavior.indexOf("const ranked = rerankRecommendationsForDiversity"),
      "Integrity demotion must run after scoring and before exploration/diversity final ranking.",
    ),
    check(
      "admin exposes integrity diagnostics",
      serverBehavior.includes("integrity: IntegrityDemotionDiagnostics")
        && serverBehavior.includes("...entry.integrity.reasons")
        && adminRoute.includes("integrity: entry.integrity"),
      "Admin recommendation diagnostics must expose integrity action, multiplier, components, and reasons.",
    ),
    check(
      "docs and validator map updated",
      calibrationDocs.includes("Integrity Demotions")
        && rankingDocs.includes("Integrity demotions")
        && moderationDoctrine.includes("check:integrity-demotions")
        && validatorMap.includes("check:integrity-demotions"),
      "Docs, moderation doctrine, and compact validator map must expose integrity demotions.",
    ),
  ];

  checks.forEach((entry) => {
    console.log(`${entry.pass ? "PASS" : "FAIL"} ${entry.label}: ${entry.detail}`);
  });

  const failures = checks.filter((entry) => !entry.pass);
  if (failures.length > 0) {
    console.error(`Integrity demotion validation failed with ${failures.length} issue(s).`);
    process.exitCode = 1;
  } else {
    console.log("Integrity demotion validation passed.");
  }
}

main();
