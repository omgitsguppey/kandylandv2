import fs from "node:fs";
import path from "node:path";

import { buildDebugCockpitBatch21NoSampleRoutesReport, validateDebugCockpitBatch21NoSampleRoutesReport } from "../../src/lib/debug/debug-cockpit-batch21-no-sample-routes";
import { buildHighRiskNoSampleRouteSmokePlan } from "../../src/lib/debug/high-risk-route-smoke-plan";
import { BATCH21_NO_SAMPLE_ROUTE_KEYS, classifyNoSampleRouteCohort } from "../../src/lib/debug/no-sample-route-cohort-classifier";
import { buildNoSampleRouteDisplay, groupNoSampleRoutesByCohort } from "../../src/lib/debug/no-sample-route-display";
import { classifyOptionalManualLegacyRoutePolicy } from "../../src/lib/debug/optional-manual-legacy-route-policy";

type Report = Record<string, unknown>;

function readText(filePath: string) {
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : "";
}

function writeJson(filePath: string, value: unknown) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function writeMarkdown(filePath: string, lines: string[]) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${lines.join("\n")}\n`);
}

function pushIf(condition: boolean, failures: string[], message: string) {
  if (!condition) failures.push(message);
}

function runValidation(reportKey: string, report: Report, failures: string[]) {
  const generatedAtUtc = new Date().toISOString();
  const result = {
    reportKey,
    generatedAtUtc,
    ...report,
    validationFailures: failures,
  };
  writeJson(`agent/state/${reportKey}.generated.json`, result);
  writeMarkdown(`docs/agent-truth/${reportKey}.md`, [
    `# ${reportKey}`,
    "",
    `Generated: ${generatedAtUtc}`,
    "",
    `Status: ${failures.length === 0 ? "pass" : "fail"}`,
    "",
    "## Summary",
    "- No-sample route runtime entries are grouped by cohort and never displayed as live health.",
    "- High-risk mutation/security/proxy routes keep exact source/route evidence next actions.",
    "- Validators are source/artifact only and do not call production routes.",
    "",
    "## Validation Failures",
    ...(failures.length === 0 ? ["- none"] : failures.map((failure) => `- ${failure}`)),
  ]);
  if (failures.length > 0) {
    console.error(`${reportKey} failed:`);
    failures.forEach((failure) => console.error(`- ${failure}`));
    process.exit(1);
  }
  console.log(`${reportKey}: pass`);
}

export function validateNoSampleRouteCohortFinalization() {
  const records = BATCH21_NO_SAMPLE_ROUTE_KEYS.map((routeKey) => classifyNoSampleRouteCohort(routeKey));
  const failures: string[] = [];
  pushIf(records.length === 22, failures, "Batch 21 no-sample route count changed.");
  pushIf(records.every((record) => record.displaysLive === false), failures, "no-sample route displays LIVE.");
  pushIf(records.every((record) => record.cohort !== "unknown"), failures, "route lacks cohort classification.");
  pushIf(classifyNoSampleRouteCohort("creator/payouts:POST").cohort === "creator_payouts_write", failures, "creator payout routes lack monetization classification.");
  pushIf(classifyNoSampleRouteCohort("user/revoke-sessions:POST").cohort === "user_security_write", failures, "user revoke sessions lacks high-risk security classification.");
  pushIf(classifyNoSampleRouteCohort("__/auth/[...path]:POST").cohort === "auth_proxy_high_risk", failures, "Firebase auth proxy routes lack auth proxy policy.");
  pushIf(classifyNoSampleRouteCohort("creator/messages:POST").status === "unseen_legacy_compat_quiet", failures, "legacy creator-message routes lack legacy policy.");
  runValidation("no-sample-route-cohort-finalization", { records }, failures);
}

export function validateNoSampleRouteDisplayCleanup() {
  const records = BATCH21_NO_SAMPLE_ROUTE_KEYS.map((routeKey) => classifyNoSampleRouteCohort(routeKey));
  const displays = records.map(buildNoSampleRouteDisplay);
  const groups = groupNoSampleRoutesByCohort(records);
  const ui = readText("src/app/admin/debug/components/DebugMonitoringRoutes.tsx");
  const failures: string[] = [];
  pushIf(displays.every((display) => display.liveBadgeAllowed === false), failures, "LIVE badge appears on no-sample route.");
  pushIf(displays.every((display) => display.copy.includes("Metrics are unavailable, not zero.")), failures, "no-sample copy lacks unavailable-not-zero truth.");
  pushIf(groups.defaultCollapsed === true && groups.drilldownAvailable === true, failures, "grouping by cohort missing.");
  pushIf(ui.includes("noSampleDisplay") && ui.includes("buildNoSampleRouteDisplay"), failures, "diagnostic/panel no-sample route cards bypass display classifier.");
  pushIf(!ui.includes("No runtime sample has been recorded; metrics are unavailable, not zero."), failures, "old semicolon no-sample copy remains.");
  runValidation("no-sample-route-display-cleanup", { displays, groups }, failures);
}

export function validateHighRiskNoSampleRouteSmokePlan() {
  const plan = buildHighRiskNoSampleRouteSmokePlan();
  const failures: string[] = [];
  pushIf(plan.length > 0, failures, "high-risk no-sample route lacks route evidence plan.");
  pushIf(plan.every((item) => item.productionRouteCallAllowed === false), failures, "mutation route has auto route-check production plan.");
  pushIf(plan.some((item) => item.routeKey === "user/revoke-sessions:POST" && item.smokeType === "local_safe_route_contract"), failures, "security route can be marked healthy without evidence.");
  pushIf(plan.some((item) => item.routeKey === "creator/payouts:POST" && item.smokeType === "manual_operator_smoke"), failures, "creator payout route lacks protected operator evidence plan.");
  pushIf(plan.some((item) => item.routeKey === "__/auth/[...path]:POST" && item.smokeType === "formal_runtime_required"), failures, "auth proxy route lacks deployed route evidence plan.");
  runValidation("high-risk-no-sample-route-smoke-plan", { plan }, failures);
}

export function validateOptionalManualLegacyRoutePolicy() {
  const policies = [
    classifyOptionalManualLegacyRoutePolicy("creator/messages:POST"),
    classifyOptionalManualLegacyRoutePolicy("creator/messages:DELETE"),
    classifyOptionalManualLegacyRoutePolicy("admin/drops/[dropId]:DELETE"),
    classifyOptionalManualLegacyRoutePolicy("admin/manual/balance-adjust:POST"),
  ];
  const failures: string[] = [];
  pushIf(policies.every((policy) => policy.displaysLive === false), failures, "optional/manual/legacy no-sample route displays LIVE.");
  pushIf(policies.filter((policy) => policy.policy !== "not_optional_manual_or_legacy").every((policy) => policy.affectsScore === false), failures, "optional quiet route affects score without reason.");
  pushIf(policies.some((policy) => policy.policy === "legacy_visible_until_removal" && policy.removalPolicy), failures, "legacy route lacks removal/review policy.");
  pushIf(policies.some((policy) => policy.policy === "manual_operator_action"), failures, "manual route appears as live diagnostic health.");
  runValidation("optional-manual-legacy-route-policy", { policies }, failures);
}

export function validateDebugCockpitBatch21NoSampleRoutes() {
  const report = buildDebugCockpitBatch21NoSampleRoutesReport();
  const failures = validateDebugCockpitBatch21NoSampleRoutesReport(report);
  const display = readText("src/lib/debug/no-sample-route-display.ts");
  pushIf(display.includes("liveBadgeAllowed: false"), failures, "any no-sample route still displays LIVE.");
  pushIf(report.cohorts.length > 0, failures, "no-sample route lacks cohort.");
  pushIf(report.requiredSmokeRoutes.length > 0, failures, "high-risk no-sample route lacks route evidence plan.");
  pushIf(report.optionalQuietRoutes.length + report.manualOperatorRoutes.length + report.legacyCompatRoutes.length >= 2, failures, "optional/manual/legacy routes are counted as live health.");
  pushIf(Object.keys(report.scoreDimensions).length > 0, failures, "score dimensions missing.");
  runValidation("debug-cockpit-batch21-no-sample-routes", report as unknown as Report, failures);
}
