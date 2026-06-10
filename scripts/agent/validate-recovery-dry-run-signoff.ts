import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import {
  ROOT,
  fileExists,
  nowIso,
  readJsonFile,
  readText,
  writeJsonFile,
  type Json,
} from "./shared";

type RecoveryPathMode = "dry_run" | "read_only" | "fixture_only" | "manual_review" | "write_enabled";
type RecoveryGuardStatus = "pass" | "fail";

type RecoveryPathClassification = {
  path: string;
  mode: RecoveryPathMode;
  owner: string;
  reason: string;
  productTruthWritesAllowed: boolean;
  approvedWriteGuard: boolean;
  detectedWriteSignals: string[];
};

type RecoveryDryRunSignoffReport = {
  reportKey: "recovery-dry-run-signoff";
  generatedAtUtc: string;
  currentHead: string;
  status: RecoveryGuardStatus;
  summary: {
    classifiedPathCount: number;
    missingExpectedPathCount: number;
    dryRunCount: number;
    readOnlyCount: number;
    fixtureOnlyCount: number;
    manualReviewCount: number;
    writeEnabledCount: number;
    unguardedProductTruthWriteCount: number;
  };
  classifications: RecoveryPathClassification[];
  adminDebugGuards: {
    recoveryEvidenceNotMoneyTruth: boolean;
    analyticsOnlyDiagnosticLabelPresent: boolean;
    moneyActionAllowedCountVisible: boolean;
  };
  generatedArtifactGuards: {
    recoveryTimelineDryRunOnly: boolean;
    gumdropQueueRejectsAnalyticsOnlyBalanceRecovery: boolean;
    legacyPurgatoryNotProductTruthEligible: boolean;
  };
  forbiddenWriteSignals: string[];
  manualRecoveryProcess: string[];
  failures: string[];
};

const REPORT_PATH = "agent/state/recovery-dry-run-signoff.generated.json";

const RECOVERY_PATHS: Array<Omit<RecoveryPathClassification, "detectedWriteSignals">> = [
  {
    path: "src/lib/analytics/recovery-timeline-spine.ts",
    mode: "dry_run",
    owner: "recovery_timeline_spine",
    reason: "Defines recovery timeline, treasury reconciliation, and GumDrop recovery queue contracts without product writes.",
    productTruthWritesAllowed: false,
    approvedWriteGuard: false,
  },
  {
    path: "scripts/agent/validate-recovery-timeline-spine.ts",
    mode: "fixture_only",
    owner: "recovery_timeline_spine",
    reason: "Builds local fixture evidence and writes only the compact generated recovery timeline report.",
    productTruthWritesAllowed: false,
    approvedWriteGuard: false,
  },
  {
    path: "tests/unit/recovery-timeline-spine.spec.ts",
    mode: "fixture_only",
    owner: "recovery_timeline_spine",
    reason: "Tests dry-run recovery and analytics-only rejection behavior using local fixtures.",
    productTruthWritesAllowed: false,
    approvedWriteGuard: false,
  },
  {
    path: "agent/state/recovery-timeline-spine.generated.json",
    mode: "manual_review",
    owner: "recovery_timeline_spine",
    reason: "Generated source evidence snapshot; never runtime product truth.",
    productTruthWritesAllowed: false,
    approvedWriteGuard: false,
  },
  {
    path: "src/lib/analytics/legacy-history-reconciler.ts",
    mode: "dry_run",
    owner: "legacy_recovery",
    reason: "Classifies legacy history into purgatory/manual review buckets without current totals eligibility.",
    productTruthWritesAllowed: false,
    approvedWriteGuard: false,
  },
  {
    path: "scripts/agent/validate-analytics-legacy-history-reconciliation.ts",
    mode: "fixture_only",
    owner: "legacy_recovery",
    reason: "Builds local purgatory queue artifacts from checked-in mapping reports.",
    productTruthWritesAllowed: false,
    approvedWriteGuard: false,
  },
  {
    path: "agent/state/analytics-legacy-purgatory-queue.generated.json",
    mode: "manual_review",
    owner: "legacy_recovery",
    reason: "Generated manual-review queue for weak/unknown legacy events.",
    productTruthWritesAllowed: false,
    approvedWriteGuard: false,
  },
  {
    path: "scripts/agent/lost-data-recovery-dry-run.ts",
    mode: "dry_run",
    owner: "lost_data_recovery",
    reason: "Recovery planning artifact with productionAllowedNow=false.",
    productTruthWritesAllowed: false,
    approvedWriteGuard: false,
  },
  {
    path: "scripts/agent/validate-lost-data-recovery-dry-run.ts",
    mode: "dry_run",
    owner: "lost_data_recovery",
    reason: "Validates recovery lanes remain static/manual and production-disabled.",
    productTruthWritesAllowed: false,
    approvedWriteGuard: false,
  },
  {
    path: "src/lib/analytics/ga4-truth.ts",
    mode: "read_only",
    owner: "ga4_recovery_truth",
    reason: "Labels GA4 as unavailable/evidence-only/imported sample state, not product truth.",
    productTruthWritesAllowed: false,
    approvedWriteGuard: false,
  },
  {
    path: "scripts/agent/validate-ga4-recovery-truth.ts",
    mode: "dry_run",
    owner: "ga4_recovery_truth",
    reason: "Validates GA4 recovery semantics without provider calls.",
    productTruthWritesAllowed: false,
    approvedWriteGuard: false,
  },
  {
    path: "src/lib/admin-debug-control-tower.ts",
    mode: "read_only",
    owner: "admin_debug_recovery_display",
    reason: "Reads compact generated recovery summaries for Admin Debug display.",
    productTruthWritesAllowed: false,
    approvedWriteGuard: false,
  },
  {
    path: "src/app/admin/debug/components/DebugRuntimeEvidenceGroups.tsx",
    mode: "read_only",
    owner: "admin_debug_recovery_display",
    reason: "Displays recovery evidence as diagnostic-only and collapsed by default.",
    productTruthWritesAllowed: false,
    approvedWriteGuard: false,
  },
  {
    path: "src/app/admin/debug/components/DebugControlTower.tsx",
    mode: "read_only",
    owner: "admin_debug_recovery_display",
    reason: "Renders compact recovery state from Control Tower model.",
    productTruthWritesAllowed: false,
    approvedWriteGuard: false,
  },
  {
    path: "scripts/agent/validate-admin-debug-control-tower.ts",
    mode: "read_only",
    owner: "admin_debug_recovery_display",
    reason: "Source-level validator for compact Admin Debug recovery display labels.",
    productTruthWritesAllowed: false,
    approvedWriteGuard: false,
  },
];

const WRITE_SIGNAL_PATTERNS = [
  { id: "firebase_admin_db", pattern: /\badminDb\b/u },
  { id: "firebase_client_set_doc", pattern: /\bsetDoc\s*\(/u },
  { id: "firebase_client_update_doc", pattern: /\bupdateDoc\s*\(/u },
  { id: "firebase_client_add_doc", pattern: /\baddDoc\s*\(/u },
  { id: "firebase_client_delete_doc", pattern: /\bdeleteDoc\s*\(/u },
  { id: "firestore_write_batch", pattern: /\bwriteBatch\s*\(/u },
  { id: "firestore_transaction", pattern: /\brunTransaction\s*\(/u },
  { id: "firestore_increment", pattern: /\bFieldValue\.increment\s*\(/u },
  { id: "firestore_collection_chain", pattern: /\.collection\s*\(/u },
  { id: "firestore_document_chain", pattern: /\.doc\s*\(/u },
];

const CHAINED_WRITE_METHODS = [
  { id: "firestore_set", pattern: /\.set\s*\(/u },
  { id: "firestore_update", pattern: /\.update\s*\(/u },
  { id: "firestore_add", pattern: /\.add\s*\(/u },
  { id: "firestore_delete", pattern: /\.delete\s*\(/u },
];

function stripStringLiterals(source: string) {
  return source
    .replace(/`(?:\\.|[^`\\])*`/gu, "\"\"")
    .replace(/"(?:\\.|[^"\\])*"/gu, "\"\"")
    .replace(/'(?:\\.|[^'\\])*'/gu, "''");
}

function currentHead() {
  const headPath = join(ROOT, ".git", "HEAD");
  if (!existsSync(headPath)) return "unknown";
  const head = readFileSync(headPath, "utf8").trim();
  if (!head.startsWith("ref:")) return head;
  const refPath = join(ROOT, ".git", head.slice("ref:".length).trim());
  return existsSync(refPath) ? readFileSync(refPath, "utf8").trim() : "unknown";
}

function detectWriteSignals(path: string) {
  if (!fileExists(path) || /\.(?:json|md)$/u.test(path)) return [];
  const source = stripStringLiterals(readText(path));
  const directSignals = WRITE_SIGNAL_PATTERNS
    .filter((entry) => entry.pattern.test(source))
    .map((entry) => entry.id);
  const chainedSignals = source
    .split(/\r?\n/u)
    .flatMap((line) => {
      const looksLikeFirestoreReceiver = /\b(?:adminDb|firestore|firebase|batch|transaction|docRef|collectionRef|documentRef)\b/u.test(line)
        || /\.collection\s*\(/u.test(line)
        || /\.doc\s*\(/u.test(line);
      if (!looksLikeFirestoreReceiver) return [];
      return CHAINED_WRITE_METHODS
        .filter((entry) => entry.pattern.test(line))
        .map((entry) => entry.id);
    });
  return Array.from(new Set([...directSignals, ...chainedSignals])).sort();
}

function readOptionalJson(path: string): Record<string, Json> | null {
  if (!fileExists(path)) return null;
  try {
    const parsed = readJsonFile<Json>(path);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, Json> : null;
  } catch {
    return null;
  }
}

function nestedRecord(source: Record<string, Json> | null, key: string): Record<string, Json> | null {
  const value = source?.[key];
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, Json> : null;
}

function numberField(source: Record<string, Json> | null, key: string) {
  const value = source?.[key];
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function buildReport(): RecoveryDryRunSignoffReport {
  const failures: string[] = [];
  const missingExpectedPaths = RECOVERY_PATHS
    .filter((entry) => !fileExists(entry.path))
    .map((entry) => entry.path);
  const classifications = RECOVERY_PATHS
    .map((entry): RecoveryPathClassification => ({
      ...entry,
      detectedWriteSignals: detectWriteSignals(entry.path),
    }));

  for (const path of missingExpectedPaths) {
    failures.push(`Expected recovery signoff path is missing: ${path}.`);
  }

  for (const entry of classifications) {
    const writesProductTruth = entry.detectedWriteSignals.length > 0 && entry.mode !== "fixture_only";
    if (writesProductTruth && (!entry.productTruthWritesAllowed || !entry.approvedWriteGuard)) {
      failures.push(`${entry.path} has write signals but is not an approved guarded recovery write path.`);
    }
  }

  const runtimeEvidenceGroups = fileExists("src/app/admin/debug/components/DebugRuntimeEvidenceGroups.tsx")
    ? readText("src/app/admin/debug/components/DebugRuntimeEvidenceGroups.tsx")
    : "";
  const recoveryTimeline = readOptionalJson("agent/state/recovery-timeline-spine.generated.json");
  const gumdropQueue = nestedRecord(recoveryTimeline, "gumdropRecoveryQueue");
  const gumdropQueueSummary = nestedRecord(gumdropQueue, "summary");
  const gumdropQueuePolicy = nestedRecord(gumdropQueue, "productTruthPolicy");
  const legacyPurgatory = readOptionalJson("agent/state/analytics-legacy-purgatory-queue.generated.json");
  const legacyPurgatorySummary = nestedRecord(legacyPurgatory, "summary");
  const legacyPurgatoryPolicy = nestedRecord(legacyPurgatory, "productTruthPolicy");

  const adminDebugGuards = {
    recoveryEvidenceNotMoneyTruth: runtimeEvidenceGroups.includes("Ledger/server proof remains money truth"),
    analyticsOnlyDiagnosticLabelPresent: runtimeEvidenceGroups.includes("diagnostic_only_not_treasury_truth"),
    moneyActionAllowedCountVisible: runtimeEvidenceGroups.includes("data-admin-debug-gumdrop-recovery-money-action-allowed"),
  };
  const generatedArtifactGuards = {
    recoveryTimelineDryRunOnly: gumdropQueuePolicy?.dryRunOnly === true
      && gumdropQueuePolicy?.creditsOrDebitsUsers === false
      && gumdropQueuePolicy?.backfillsTransactions === false,
    gumdropQueueRejectsAnalyticsOnlyBalanceRecovery: Boolean(gumdropQueue?.schema) && nestedRecord(gumdropQueue, "schema")?.analyticsOnlyRecoveryAllowed === false
      && numberField(gumdropQueueSummary, "analyticsOnlyRejectedCount") > 0
      && numberField(gumdropQueueSummary, "moneyAffectingRecoveryAllowedCount") === 0,
    legacyPurgatoryNotProductTruthEligible: numberField(legacyPurgatorySummary, "productTruthEligible") === 0
      && legacyPurgatoryPolicy?.weakMatchesRemainEvidenceOnly === true
      && legacyPurgatoryPolicy?.unknownLegacyIsNotZero === true,
  };

  for (const [key, passed] of Object.entries(adminDebugGuards)) {
    if (!passed) failures.push(`Admin Debug recovery guard failed: ${key}.`);
  }
  for (const [key, passed] of Object.entries(generatedArtifactGuards)) {
    if (!passed) failures.push(`Generated recovery artifact guard failed: ${key}.`);
  }

  const writeEnabledCount = classifications.filter((entry) => entry.mode === "write_enabled").length;
  const unguardedProductTruthWriteCount = classifications.filter((entry) => (
    entry.detectedWriteSignals.length > 0
    && (!entry.productTruthWritesAllowed || !entry.approvedWriteGuard)
    && entry.mode !== "fixture_only"
  )).length;

  const report: RecoveryDryRunSignoffReport = {
    reportKey: "recovery-dry-run-signoff",
    generatedAtUtc: nowIso(),
    currentHead: currentHead(),
    status: failures.length > 0 ? "fail" : "pass",
    summary: {
      classifiedPathCount: classifications.length,
      missingExpectedPathCount: missingExpectedPaths.length,
      dryRunCount: classifications.filter((entry) => entry.mode === "dry_run").length,
      readOnlyCount: classifications.filter((entry) => entry.mode === "read_only").length,
      fixtureOnlyCount: classifications.filter((entry) => entry.mode === "fixture_only").length,
      manualReviewCount: classifications.filter((entry) => entry.mode === "manual_review").length,
      writeEnabledCount,
      unguardedProductTruthWriteCount,
    },
    classifications,
    adminDebugGuards,
    generatedArtifactGuards,
    forbiddenWriteSignals: [
      ...WRITE_SIGNAL_PATTERNS.map((entry) => entry.id),
      ...CHAINED_WRITE_METHODS.map((entry) => entry.id),
    ],
    manualRecoveryProcess: [
      "Keep analytics, GA4, legacy, and generated reports as evidence snapshots only.",
      "Require redacted ledger/server proof before any money-affecting recovery proposal.",
      "Create a separate approved backfill plan before enabling any product-truth writes.",
      "Do not credit, debit, unlock, refund, adjust, or materialize current totals from analytics-only evidence.",
    ],
    failures,
  };

  return report;
}

function main() {
  const report = buildReport();
  writeJsonFile(REPORT_PATH, report as unknown as Json);

  if (report.failures.length > 0) {
    console.error("Recovery dry-run signoff failed:");
    for (const failure of report.failures) console.error(`- ${failure}`);
    process.exit(1);
  }

  console.log(`Recovery dry-run signoff passed: ${report.summary.classifiedPathCount} path(s), ${report.summary.writeEnabledCount} write-enabled.`);
}

main();
