import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import {
  printPublicBetaScoreSummary,
  writePublicBetaScoreReport,
} from "../../src/lib/agent-score/reporting";
import { buildPublicBetaReadinessReport } from "../../src/lib/agent-score/public-beta-scanner";
import {
  PUBLIC_BETA_DOMAIN_WEIGHTS,
  PUBLIC_BETA_REQUIRED_REPORT_STALE_HOURS,
} from "../../src/lib/agent-score/weights";
import { loadDebugEvidenceForAuditDomains } from "./load-debug-evidence-for-audit";
import type { PublicBetaGeneratedReportEvidence } from "../../src/lib/agent-score/core";

const REQUIRED_EVIDENCE_REPORTS = [
  "agent/state/final-launch-readiness-report.generated.json",
  "agent/state/launch-readiness-report.generated.json",
  "agent/state/launch-pr-triage.generated.json",
  "agent/state/generated-report-authority.generated.json",
] as const;

const VISUAL_EVIDENCE_FILES = [
  "agent/state/manual-smoke-evidence.generated.json",
  "agent/state/visual-smoke-evidence.generated.json",
  "agent/state/screenshot-evidence.generated.json",
] as const;

function parseJsonObject(source: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(source) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
  } catch {
    return {};
  }
}

function collectGeneratedReportEvidence(root: string, now = Date.now()): PublicBetaGeneratedReportEvidence[] {
  return REQUIRED_EVIDENCE_REPORTS.map((reportPath) => {
    const fullPath = join(root, reportPath);
    if (!existsSync(fullPath)) {
      return { path: reportPath, freshness: "missing" };
    }

    const parsed = parseJsonObject(readFileSync(fullPath, "utf8"));
    const stats = statSync(fullPath);
    const generatedAt = typeof parsed.generatedAt === "string" ? parsed.generatedAt : stats.mtime.toISOString();
    const ageHours = (now - Date.parse(generatedAt)) / (60 * 60 * 1000);
    const embeddedFreshness = parsed.freshness === "fresh" || parsed.freshness === "stale" || parsed.freshness === "unknown"
      ? parsed.freshness
      : undefined;
    const freshness = embeddedFreshness ?? (
      Number.isFinite(ageHours) && ageHours <= PUBLIC_BETA_REQUIRED_REPORT_STALE_HOURS ? "fresh" : "stale"
    );

    return {
      path: reportPath,
      generatedAt,
      sourceCommit: typeof parsed.sourceCommit === "string" ? parsed.sourceCommit : undefined,
      freshness,
      ageHours: Number.isFinite(ageHours) ? ageHours : undefined,
    };
  });
}

function fileExists(root: string, filePath: string) {
  return existsSync(join(root, filePath));
}

function hasProviderSmokeEvidence(root: string) {
  const launchPath = join(root, "agent/state/final-launch-readiness-report.generated.json");
  if (!existsSync(launchPath)) return false;
  const source = readFileSync(launchPath, "utf8").toLowerCase();
  return !source.includes("smoke was not performed") && !source.includes("provider smoke was not performed");
}

export function runPublicBetaReadinessScore(root = process.cwd(), safeAutofixesApplied = 0) {
  const debugEvidence = loadDebugEvidenceForAuditDomains([
    ...Object.keys(PUBLIC_BETA_DOMAIN_WEIGHTS),
    "support",
  ], root, 10);
  const report = buildPublicBetaReadinessReport({
    root,
    safeAutofixesApplied,
    debugEvidence,
    evidence: {
      requiredReports: collectGeneratedReportEvidence(root),
      hasTargetedBehaviorEvidence: false,
      hasVisualManualEvidence: VISUAL_EVIDENCE_FILES.some((filePath) => fileExists(root, filePath)),
      hasProviderSmokeEvidence: hasProviderSmokeEvidence(root),
      hasAdminTruthSampleEvidence: Object.values(debugEvidence).some((entries) => entries.length > 0),
      openPrTriageFresh: collectGeneratedReportEvidence(root).find((reportEvidence) =>
        reportEvidence.path === "agent/state/launch-pr-triage.generated.json")?.freshness === "fresh",
    },
  });
  writePublicBetaScoreReport(report, root);
  return report;
}

const report = runPublicBetaReadinessScore();
printPublicBetaScoreSummary(report);
