import fs from "node:fs";
import path from "node:path";

import { buildMarchFirstLegacyNormalizationPlan, MARCH_FIRST_RECOVERY_START_DATE } from "@/lib/legacy/march-first-recovery-plan";
import { LEGACY_NORMALIZATION_DOMAINS } from "@/lib/legacy/legacy-normalization-contract";

const ROOT = process.cwd();
const STATE_PATH = path.join(ROOT, "agent/state/march-first-legacy-normalization.generated.json");
const DOC_PATH = path.join(ROOT, "docs/agent-truth/march-first-legacy-normalization.md");
const CONTRACT_PATH = path.join(ROOT, "src/lib/legacy/legacy-normalization-contract.ts");
const PLAN_PATH = path.join(ROOT, "src/lib/legacy/march-first-recovery-plan.ts");

type Finding = {
  severity: "error" | "warning";
  message: string;
};

function readText(filePath: string) {
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : "";
}

function writeJson(filePath: string, value: unknown) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function writeDoc(filePath: string, artifact: {
  generatedAt: string;
  plan: ReturnType<typeof buildMarchFirstLegacyNormalizationPlan>;
}) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `# March First Legacy Normalization

Generated: ${artifact.generatedAt}

This is a dry-run normalization plan for legacy KandyDrops records from March 1, 2026 onward. It does not read production data, run live backfill, mutate current records, or promote unknown legacy rows into current truth.

## Contract

- Recovery start date: ${artifact.plan.recoveryStartDate}
- Mode: ${artifact.plan.mode}
- Production reads: ${String(artifact.plan.readsProduction)}
- Live backfill: ${String(artifact.plan.liveBackfill)}
- Mutations allowed: ${String(artifact.plan.mutationsAllowed)}
- Current truth eligible records: ${artifact.plan.summary.currentTruthEligibleCount}
- Read-only purchase/GumDrop ledger references: ${artifact.plan.summary.readOnlyLedgerReferenceCount}

## Legacy Domains

${LEGACY_NORMALIZATION_DOMAINS.map((domain) => `- ${domain}`).join("\n")}

## Dry-Run Summary

- Input records: ${artifact.plan.summary.inputRecords}
- In-window records: ${artifact.plan.summary.inWindowRecords}
- Probable: ${artifact.plan.summary.probableCount}
- Weak: ${artifact.plan.summary.weakCount}
- Unknown: ${artifact.plan.summary.unknownCount}
- High duplicate risk: ${artifact.plan.summary.highDuplicateRiskCount}

## Debug Backlog Integration

${artifact.plan.debugBacklogIssues.map((issue) => `- ${issue.id}: ${issue.exactNextAction}`).join("\n")}
`);
}

const plan = buildMarchFirstLegacyNormalizationPlan({
  records: [
    {
      legacyId: "fixture_guest_session",
      legacyDomain: "guest_sessions",
      legacySource: "analytics_guest_batches",
      timestampMs: Date.parse("2026-03-01T00:00:00.000Z"),
      fields: { session_id: "session-1", anonymous_visitor_id: "guest-1", route: "/drops" },
    },
    {
      legacyId: "fixture_user_session",
      legacyDomain: "user_sessions",
      legacySource: "analytics_sessions",
      timestampMs: Date.parse("2026-03-01T00:01:00.000Z"),
      fields: { session_id: "session-2", user_id: "user-1", route: "/dashboard" },
    },
    {
      legacyId: "fixture_identity_link",
      legacyDomain: "identity_links",
      legacySource: "analytics_identity_links",
      timestampMs: Date.parse("2026-03-02T00:00:00.000Z"),
      fields: { user_id: "user-1", anonymous_visitor_id: "guest-1", session_id: "session-1" },
    },
    {
      legacyId: "fixture_unknown_behavior",
      legacyDomain: "behavior_events",
      legacySource: "analytics_event_facts",
      timestampMs: Date.parse("2026-03-03T00:00:00.000Z"),
      fields: { eventName: "unknown_legacy" },
    },
    {
      legacyId: "fixture_watch",
      legacyDomain: "watch_sessions",
      legacySource: "analytics_watch_sessions",
      timestampMs: Date.parse("2026-03-04T00:00:00.000Z"),
      fields: { watch_session_id: "watch-1", session_id: "session-1", drop_id: "drop-1" },
    },
    {
      legacyId: "fixture_drop",
      legacyDomain: "drops",
      legacySource: "drops",
      timestampMs: Date.parse("2026-03-05T00:00:00.000Z"),
      fields: { drop_id: "drop-1", slug: "legacy-drop" },
    },
    {
      legacyId: "fixture_creator_profile",
      legacyDomain: "creator_profile_views",
      legacySource: "analytics_event_facts",
      timestampMs: Date.parse("2026-03-06T00:00:00.000Z"),
      fields: { creator_id: "creator-1", session_id: "session-1", user_id: "user-1" },
    },
    {
      legacyId: "fixture_fan_pass",
      legacyDomain: "fan_pass_subscriptions",
      legacySource: "creator_subscriptions",
      timestampMs: Date.parse("2026-03-07T00:00:00.000Z"),
      fields: { subscription_id: "sub-1", creator_id: "creator-1", user_id: "user-1" },
    },
    {
      legacyId: "fixture_broadcast",
      legacyDomain: "creator_broadcasts",
      legacySource: "creator_broadcasts",
      timestampMs: Date.parse("2026-03-08T00:00:00.000Z"),
      fields: { broadcast_id: "broadcast-1", creator_id: "creator-1" },
    },
    {
      legacyId: "fixture_purchase_ledger",
      legacyDomain: "purchases_gumdrop_ledger_references",
      legacySource: "transactions",
      timestampMs: Date.parse("2026-03-09T00:00:00.000Z"),
      fields: { transaction_id: "txn-1", user_id: "user-1", gumdrops_amount: 100 },
    },
    {
      legacyId: "fixture_admin_truth",
      legacyDomain: "admin_truth_samples",
      legacySource: "admin_debug",
      timestampMs: Date.parse("2026-03-10T00:00:00.000Z"),
      fields: { admin_id: "admin-1", route: "/admin/debug", sample_id: "sample-1" },
    },
  ],
});

const findings: Finding[] = [];
const source = `${readText(CONTRACT_PATH)}\n${readText(PLAN_PATH)}`;

if (MARCH_FIRST_RECOVERY_START_DATE !== "2026-03-01" || plan.recoveryStartDate !== "2026-03-01") {
  findings.push({ severity: "error", message: "recovery date is not March 1, 2026" });
}
if (plan.mode !== "dry_run_only" || plan.readsProduction !== false || plan.liveBackfill !== false || plan.mutationsAllowed !== false) {
  findings.push({ severity: "error", message: "recovery can read, backfill, or mutate live data" });
}
if (plan.records.some((record) => record.confidence === "unknown" && record.currentTruthEligible)) {
  findings.push({ severity: "error", message: "legacy unknown counted as current truth" });
}
if (plan.records.some((record) => !record.duplicateRisk)) {
  findings.push({ severity: "error", message: "duplicate risk missing" });
}
if (plan.records.some((record) => !record.confidence)) {
  findings.push({ severity: "error", message: "confidence missing" });
}
if (plan.records.some((record) => record.legacyDomain === "purchases_gumdrop_ledger_references" && (!record.readOnly || record.mutationBlockedReason !== "purchase_gumdrop_ledger_read_only"))) {
  findings.push({ severity: "error", message: "purchase/GumDrop ledger mutation attempted or not blocked" });
}
if (!source.includes("dry_run_only") || !source.includes("mutationsAllowed: false") || !source.includes("readsProduction: false")) {
  findings.push({ severity: "error", message: "dry-run output contract missing" });
}
if (!plan.debugBacklogIssues.some((issue) => issue.sourceRoute === "legacy://march-first-normalization" && issue.fixClass === "evidence_refresh")) {
  findings.push({ severity: "error", message: "legacy gaps are not represented as debug backlog evidence issues" });
}
if (LEGACY_NORMALIZATION_DOMAINS.length !== new Set(LEGACY_NORMALIZATION_DOMAINS).size || LEGACY_NORMALIZATION_DOMAINS.length !== 11) {
  findings.push({ severity: "error", message: "legacy domain contract is missing or duplicated domains" });
}
if (/(firebase-admin|adminDb|collection\s*\(|writeBatch|runTransaction|\.set\s*\(|\.update\s*\(|\.delete\s*\(|fetch\s*\(|backfill\s*\()/u.test(source)) {
  findings.push({ severity: "error", message: "normalization source contains production read/write/backfill call patterns" });
}

const artifact = {
  generatedAt: new Date().toISOString(),
  source: "local_static_validator",
  overallStatus: findings.some((finding) => finding.severity === "error") ? "fail" : "live",
  overallScore: findings.some((finding) => finding.severity === "error") ? 0 : 100,
  productionReads: false,
  liveBackfill: false,
  mutationsAllowed: false,
  reportKey: "march-first-legacy-normalization",
  plan,
  findings,
};

writeJson(STATE_PATH, artifact);
writeDoc(DOC_PATH, { generatedAt: artifact.generatedAt, plan });

if (findings.some((finding) => finding.severity === "error")) {
  console.error(JSON.stringify({ ok: false, findings }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({
  ok: true,
  reportPath: path.relative(ROOT, STATE_PATH).replace(/\\/g, "/"),
  docPath: path.relative(ROOT, DOC_PATH).replace(/\\/g, "/"),
  summary: plan.summary,
}, null, 2));
