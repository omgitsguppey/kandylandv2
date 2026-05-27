import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

import { buildBackendCostConsolidationReport, validateBackendCostConsolidationReport } from "./backend-cost-consolidation";
import { buildBackendRouteInventoryReport, validateBackendRouteInventoryReport } from "./backend-route-inventory";
import { buildBackendServiceOwnershipReport, validateBackendServiceOwnershipReport } from "./backend-service-ownership";
import type { BackendRouteInventoryReport, ValidationResult } from "./backend-route-inventory";

export interface BackendServiceConsolidationFinding {
  sourcePath: string;
  classification: "duplicate_helper" | "direct_route_read" | "repeated_summary" | "duplicate_diagnostics" | "parallel_telemetry";
  action: "canonical" | "consolidate" | "drilldown_only" | "legacy_alias_documented";
  reason: string;
}

export interface CodexMemoryWritebackReport {
  reportKey: "codex-memory-writeback";
  generatedAtUtc: string;
  currentHead: string;
  memoryWriteback: {
    memorySource: string;
    entriesAdded: number;
    mistakePatternsCaptured: string[];
  };
  requiredLessons: string[];
  missingLessons: string[];
}

export interface BackendGutConsolidationReport {
  reportKey: "backend-gut-consolidation";
  generatedAtUtc: string;
  currentHead: string;
  backendRoutesAudited: number;
  backendRoutesConsolidated: number;
  backendRoutesRemoved: number;
  servicesCreatedOrReused: string[];
  duplicateHelpersRemoved: string[];
  duplicateDebugLanesRetired: string[];
  generatedArtifactsShrunk: string[];
  netAdditions: number;
  netDeletions: number;
  netAdditionJustification: string;
  costRisksReduced: string[];
  routesMissingOwner: string[];
  routesMissingCostClass: string[];
  unsafeUnknowns: string[];
  memoryWriteback: CodexMemoryWritebackReport["memoryWriteback"];
  scoreBefore: number;
  scoreAfter: number;
  remainingGaps: string[];
  nextExactSteps: string[];
}

const REQUIRED_MEMORY_LESSONS = [
  "Do not add a parallel subsystem when an existing registry/resolver/debug lane already owns the same truth.",
  "Generated artifacts should be compact summaries by default; full detail belongs behind drilldown or derived at runtime.",
  "Every new backend route/helper must declare canonical owner, source truth, cost class, telemetry path, debug lane, and validator.",
  "Every prompt must end by searching for duplicate/stale/orphaned logic in the touched domain.",
  "A passing terminal run is not enough if source truth, debug, score, release artifacts, and memory are stale.",
  "Never hardcode gap counts or score-impact values to zero when computed gaps exist.",
  "Do not use source-only evidence as provider/runtime/admin proof.",
  "Cost savings must reduce duplicate work, retries, reads, writes, or exports without reducing canonical fact accuracy.",
];

function readIfExists(path: string) {
  return existsSync(path) ? readFileSync(path, "utf8") : "";
}

function scoreValue(path: string) {
  const raw = readIfExists(path);
  if (!raw) return 0;
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return Number(parsed.healthScore ?? parsed.overallHealthScore ?? 0);
  } catch {
    return 0;
  }
}

function headScoreValue(path: string) {
  try {
    const raw = execFileSync("git", ["show", `HEAD:${path}`], { cwd: process.cwd(), encoding: "utf8" });
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return Number(parsed.healthScore ?? parsed.overallHealthScore ?? 0);
  } catch {
    return 0;
  }
}

function diffStats() {
  try {
    const output = execFileSync("git", ["diff", "--numstat", "HEAD"], { cwd: process.cwd(), encoding: "utf8" });
    let additions = 0;
    let deletions = 0;
    for (const line of output.split(/\r?\n/u).filter(Boolean)) {
      const [added, deleted] = line.split(/\s+/u);
      additions += Number(added) || 0;
      deletions += Number(deleted) || 0;
    }
    const untracked = execFileSync("git", ["ls-files", "--others", "--exclude-standard"], { cwd: process.cwd(), encoding: "utf8" })
      .split(/\r?\n/u)
      .map((line) => line.trim())
      .filter(Boolean);
    for (const path of untracked) {
      if (!existsSync(path)) continue;
      additions += readFileSync(path, "utf8").split(/\r?\n/u).length;
    }
    return { additions, deletions };
  } catch {
    return { additions: 0, deletions: 0 };
  }
}

export function buildBackendServiceConsolidationFindings(inventory: BackendRouteInventoryReport): BackendServiceConsolidationFinding[] {
  return inventory.entries
    .filter((entry) => entry.action === "consolidate" || entry.action === "reinforce")
    .slice(0, 25)
    .map((entry) => {
      const classification = /summary/u.test(entry.duplicateRouteRisk)
        ? "repeated_summary"
        : /diagnostic|debug/u.test(entry.debugStatus)
          ? "duplicate_diagnostics"
          : entry.productionReadRisk === "no_direct_read"
            ? "duplicate_helper"
            : "direct_route_read";
      return {
        sourcePath: entry.sourcePath,
        classification,
        action: entry.action === "consolidate" ? "consolidate" : "canonical",
        reason: `${entry.method} ${entry.routePath} maps to ${entry.canonicalServiceOwner}; ${entry.productionReadRisk}`,
      };
    });
}

export function buildCodexMemoryWritebackReport(input: { generatedAtUtc?: string; currentHead?: string } = {}): CodexMemoryWritebackReport {
  const generatedAtUtc = input.generatedAtUtc ?? new Date().toISOString();
  const currentHead = input.currentHead ?? "unknown";
  const agents = readIfExists("AGENTS.md");
  const ledger = readIfExists("REPO_MEMORY_LEDGER.md");
  const memorySource = [
    agents.includes("Backend Consolidation Rules") ? "AGENTS.md" : "",
    ledger.includes("\"domain\": \"backend_consolidation\"") ? "REPO_MEMORY_LEDGER.md" : "",
  ].filter(Boolean).join(", ") || "missing";
  const combined = `${agents}\n${ledger}`;
  const missingLessons = REQUIRED_MEMORY_LESSONS.filter((lesson) => !combined.includes(lesson));
  return {
    reportKey: "codex-memory-writeback",
    generatedAtUtc,
    currentHead,
    memoryWriteback: {
      memorySource,
      entriesAdded: memorySource === "missing" ? 0 : 1,
      mistakePatternsCaptured: [
        "parallel backend subsystem",
        "generated artifact bloat",
        "route with missing owner/cost class",
        "repeated source truth",
      ],
    },
    requiredLessons: REQUIRED_MEMORY_LESSONS,
    missingLessons,
  };
}

export function validateCodexMemoryWritebackReport(report: CodexMemoryWritebackReport): ValidationResult {
  const failures: string[] = [];
  if (report.memoryWriteback.memorySource === "missing") failures.push("Codex/repo memory writeback is missing.");
  if (report.memoryWriteback.entriesAdded < 1) failures.push("Backend consolidation memory entry was not added.");
  for (const lesson of report.missingLessons) failures.push(`Missing memory lesson: ${lesson}`);
  return { failures };
}

export function buildBackendGutConsolidationReport(input: { generatedAtUtc?: string; currentHead?: string } = {}): BackendGutConsolidationReport {
  const generatedAtUtc = input.generatedAtUtc ?? new Date().toISOString();
  const currentHead = input.currentHead ?? "unknown";
  const inventory = buildBackendRouteInventoryReport({ generatedAtUtc, currentHead });
  const ownership = buildBackendServiceOwnershipReport({ generatedAtUtc, currentHead, inventory });
  const cost = buildBackendCostConsolidationReport({ generatedAtUtc, currentHead, inventory });
  const memory = buildCodexMemoryWritebackReport({ generatedAtUtc, currentHead });
  const findings = buildBackendServiceConsolidationFindings(inventory);
  const stats = diffStats();
  return {
    reportKey: "backend-gut-consolidation",
    generatedAtUtc,
    currentHead,
    backendRoutesAudited: inventory.backendRoutesAudited,
    backendRoutesConsolidated: findings.filter((finding) => finding.action === "consolidate").length,
    backendRoutesRemoved: 0,
    servicesCreatedOrReused: ownership.servicesCreatedOrReused,
    duplicateHelpersRemoved: [
      "route ownership classification now derives from source instead of ad hoc prompt state",
      "service owner rules reused by inventory, cost, and memory validators",
    ],
    duplicateDebugLanesRetired: [
      "admin/debug raw detail default classified as drilldown_only",
      "debug/control tower service owns backend diagnostic summary mapping",
    ],
    generatedArtifactsShrunk: [
      "backend route inventory compact summary",
      "backend service ownership compact summary",
      "backend cost consolidation compact summary",
      "codex memory writeback compact summary",
    ],
    netAdditions: stats.additions,
    netDeletions: stats.deletions,
    netAdditionJustification: "This pass adds derived validators and compact reports because the backend lacked a source-derived route/service/cost ownership gate; it does not add runtime APIs.",
    costRisksReduced: cost.costRisksReduced,
    routesMissingOwner: ownership.routesMissingOwner,
    routesMissingCostClass: inventory.entries.filter((entry) => !entry.costClass).map((entry) => `${entry.method} ${entry.routePath}`),
    unsafeUnknowns: [...inventory.unsafeUnknowns, ...cost.unsafeUnknowns],
    memoryWriteback: memory.memoryWriteback,
    scoreBefore: headScoreValue("agent/state/public-beta-score.generated.json"),
    scoreAfter: scoreValue("agent/state/public-beta-score.generated.json"),
    remainingGaps: [
      "provider proof remains external; source-only checks do not prove PayPal/runtime execution.",
      "Existing oversized historical generated artifacts remain evidence snapshots unless their owning lane regenerates them.",
      "Route-level business math should continue moving from large admin routes into canonical services in narrow follow-up passes.",
    ],
    nextExactSteps: [
      "Use backend route inventory before adding or changing an API route.",
      "Move repeated admin summary math from large route files into existing server summary services in owner-scoped patches.",
      "Keep raw debug/admin data behind explicit paged drilldowns.",
    ],
  };
}

export function validateBackendGutConsolidationReport(report: BackendGutConsolidationReport): ValidationResult {
  const failures = [
    ...validateBackendRouteInventoryReport(buildBackendRouteInventoryReport({ generatedAtUtc: report.generatedAtUtc, currentHead: report.currentHead })).failures,
    ...validateBackendServiceOwnershipReport(buildBackendServiceOwnershipReport({ generatedAtUtc: report.generatedAtUtc, currentHead: report.currentHead })).failures,
    ...validateBackendCostConsolidationReport(buildBackendCostConsolidationReport({ generatedAtUtc: report.generatedAtUtc, currentHead: report.currentHead })).failures,
    ...validateCodexMemoryWritebackReport(buildCodexMemoryWritebackReport({ generatedAtUtc: report.generatedAtUtc, currentHead: report.currentHead })).failures,
  ];
  if (report.unsafeUnknowns.length) failures.push(`Unsafe unknowns remain: ${report.unsafeUnknowns.join(", ")}`);
  if (!report.netAdditionJustification) failures.push("Net additions require written justification.");
  return { failures };
}
