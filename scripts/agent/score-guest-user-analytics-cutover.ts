import { existsSync } from "node:fs";

import { ROOT, readText, writeJsonFile } from "./shared";

type ScoreStatus = "pass" | "warning" | "fail";

type CutoverReport = {
  generatedAt: string;
  status: ScoreStatus;
  score: number;
  checks: Array<{ id: string; pass: boolean; detail: string }>;
  criticalBlockers: string[];
  warnings: string[];
  exactValidatorsToRun: string[];
  surfacesAffected: string[];
  promoReadinessVerdict: string;
};

const REPORT_PATH = "agent/state/guest-user-analytics-cutover.generated.json";

function read(path: string) {
  return existsSync(`${ROOT}/${path}`) ? readText(path) : "";
}

function main() {
  const guestIngest = read("src/app/api/analytics/ingest/route.ts");
  const identifiedIngest = read("src/app/api/analytics/ingest-identified/route.ts");
  const deepTracker = read("src/components/Analytics/DeepTracker.tsx");
  const confidence = read("src/lib/behavioral/behavioral-confidence-v2.ts");
  const gaPolicy = read("src/lib/analytics/google-analytics-source-policy.ts");
  const timelineContract = read("src/lib/behavioral/behavioral-timeline-contract.ts");
  const rollupContract = read("src/lib/behavioral/guest-user-behavior-contract.ts");
  const identityLinking = read("src/lib/server/analytics-identity-linking.ts");
  const packageJson = read("package.json");

  const checks = [
    {
      id: "guest_ingest_timeline",
      pass: guestIngest.includes("writeBehavioralTimelineProjection("),
      detail: "Guest ingest atomically writes timeline facts and user-index outbox requests.",
    },
    {
      id: "identified_ingest_timeline",
      pass: identifiedIngest.includes("writeBehavioralTimelineProjection("),
      detail: "Identified ingest atomically writes timeline facts and user-index outbox requests.",
    },
    {
      id: "identity_linked_emission",
      pass: identityLinking.includes("trackServerEvent(\"identity_linked\""),
      detail: "identity_linked is emitted in server identity linking.",
    },
    {
      id: "ga_demoted",
      pass: gaPolicy.includes("isGoogleAnalyticsCanonicalTruthAllowed") && gaPolicy.includes("return false"),
      detail: "GA is policy-demoted from canonical truth.",
    },
    {
      id: "confidence_caps",
      pass: confidence.includes("guest_only") && confidence.includes("legacy_only") && confidence.includes("Math.min(confidence, 0.60)"),
      detail: "Confidence caps for guest-only/legacy-only/no-outcome are present.",
    },
    {
      id: "deeptracker_noise_demoted",
      pass: deepTracker.includes("GUEST_ANALYTICS_MAX_DIAGNOSTIC_EVENTS_PER_SESSION")
        && deepTracker.includes("event.type === \"hover\"")
        && deepTracker.includes("event.type === \"visibility\""),
      detail: "DeepTracker low-value noise is capped/demoted.",
    },
    {
      id: "timeline_contract_present",
      pass: timelineContract.includes("BehavioralTimelineFact") && timelineContract.includes("sourceReliability"),
      detail: "Behavioral timeline contract exists.",
    },
    {
      id: "rollup_contract_present",
      pass: rollupContract.includes("sourceBreakdown") && rollupContract.includes("dataAvailabilityReason"),
      detail: "Guest/user rollup contract exists.",
    },
    {
      id: "package_scripts_present",
      pass: packageJson.includes("\"score:guest-user-analytics\"") && packageJson.includes("\"check:guest-user-analytics\""),
      detail: "Package scripts are wired.",
    },
  ];

  const criticalBlockers = checks.filter((check) => !check.pass).map((check) => `${check.id}: ${check.detail}`);
  const warnings: string[] = [];

  const passCount = checks.filter((check) => check.pass).length;
  const score = Math.round((passCount / checks.length) * 100);
  const status: ScoreStatus = criticalBlockers.length > 0 ? "fail" : score >= 90 ? "pass" : "warning";

  const report: CutoverReport = {
    generatedAt: new Date().toISOString(),
    status,
    score,
    checks,
    criticalBlockers,
    warnings,
    exactValidatorsToRun: [
      "npm run score:guest-user-analytics",
      "npm run check:guest-user-analytics",
      "npm run typecheck",
    ],
    surfacesAffected: [
      "guest analytics ingest",
      "identified analytics ingest",
      "behavioral timeline",
      "behavioral confidence",
      "admin analytics rollups",
    ],
    promoReadinessVerdict: status === "pass"
      ? "ready_with_targeted_checks"
      : "blocked_until_critical_blockers_resolved",
  };

  writeJsonFile(REPORT_PATH, report);
  console.log(`Guest/user analytics cutover score: ${score}/100 (${status})`);
}

main();
