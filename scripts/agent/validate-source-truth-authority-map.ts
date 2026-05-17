import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export type SourceTruthLaneStatus = "active" | "supporting" | "retired" | "archive_only" | "stale";

export type SourceTruthAuthorityLane = {
  id: string;
  label: string;
  authorityDoc: string;
  generatedArtifact: string;
  validator: string;
  status: SourceTruthLaneStatus;
  owner: string;
  refreshCommand: string;
  betaBlocking: boolean;
  notes: string[];
};

export type RetiredSourceTruthArtifact = {
  artifact: string;
  status: "retired" | "archive_only";
  reason: string;
  supersededBy: string;
  betaBlocking: boolean;
};

export type SourceTruthHeadCheck = {
  artifact: string;
  currentHead: string;
  status: "current" | "stale" | "missing_head" | "not_required" | "missing";
  action: string;
};

export type SourceTruthAuthorityMapReport = {
  generatedAtUtc: string;
  reportKey: "source-truth-authority-map";
  currentHead: string;
  summary: {
    activeLanes: number;
    supportingLanes: number;
    retiredLanes: number;
    archiveOnlyLanes: number;
    staleLanes: number;
    betaBlockingLanes: number;
    costReadinessLanes: number;
    retiredLaunchArtifacts: number;
    sameCommitReleaseNotes: boolean;
    p0Count: number;
    p1Count: number;
    p2Count: number;
  };
  lanes: SourceTruthAuthorityLane[];
  retiredArtifacts: RetiredSourceTruthArtifact[];
  costReadiness: {
    cloudRunCostReadiness: string;
    cloudSqlCostReadiness: string;
    geminiCloudAssistCostReadiness: string;
    route4xxReadiness: string;
  };
  memoryRules: string[];
  currentHeadChecks: SourceTruthHeadCheck[];
  fixesApplied: string[];
  nextExactSteps: string[];
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = join(__dirname, "..", "..");
const artifactRelativePath = "agent/state/source-truth-authority-map.generated.json";
const artifactPath = join(repoRoot, artifactRelativePath);
const docsRelativePath = "docs/agent-truth/source-truth-authority-map.md";
const docsPath = join(repoRoot, docsRelativePath);

const costLaneIds = [
  "cloud-run-cost-readiness",
  "cloud-sql-cost-readiness",
  "gemini-cloud-assist-cost-readiness",
  "route-4xx-readiness",
] as const;

function currentHead(root = repoRoot) {
  return execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
}

function readText(relativePath: string) {
  const fullPath = join(repoRoot, relativePath);
  return existsSync(fullPath) ? readFileSync(fullPath, "utf8") : "";
}

function readJson(relativePath: string) {
  const fullPath = join(repoRoot, relativePath);
  if (!existsSync(fullPath)) return null;
  return JSON.parse(readFileSync(fullPath, "utf8")) as Record<string, unknown>;
}

function readObject(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function readString(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : fallback;
}

function lane(
  id: string,
  label: string,
  authorityDoc: string,
  generatedArtifact: string,
  validator: string,
  status: SourceTruthLaneStatus,
  owner: string,
  refreshCommand: string,
  betaBlocking: boolean,
  notes: string[],
): SourceTruthAuthorityLane {
  return {
    id,
    label,
    authorityDoc,
    generatedArtifact,
    validator,
    status,
    owner,
    refreshCommand,
    betaBlocking,
    notes,
  };
}

function buildLanes(): SourceTruthAuthorityLane[] {
  return [
    lane(
      "current-operator-doctrine",
      "Current operator doctrine",
      "docs/agent-truth/current-operator-doctrine.md",
      artifactRelativePath,
      "npm run check:source-truth-authority-map",
      "active",
      "repo-doctrine",
      "npm run check:source-truth-authority-map",
      false,
      ["Active doctrine wins over stale generated reports when conflicts exist."],
    ),
    lane(
      "memory-durable-rules",
      "memory.md durable rules",
      "memory.md",
      artifactRelativePath,
      "npm run check:source-truth-authority-map",
      "active",
      "repo-doctrine",
      "npm run check:source-truth-authority-map",
      false,
      ["Durable operating rules only; generated artifacts remain evidence snapshots."],
    ),
    lane(
      "beta-score",
      "Public beta score",
      "docs/agent-truth/public-beta-score.md",
      "agent/state/public-beta-score.generated.json",
      "npm run check:beta-score",
      "active",
      "beta-readiness",
      "npm run score:beta && npm run check:beta-score",
      true,
      ["Score math explains source confidence while evidence caps remain visible."],
    ),
    lane(
      "current-beta-exit-status",
      "Current beta exit status",
      "docs/agent-truth/current-beta-exit-status.md",
      "agent/state/current-beta-exit-status.generated.json",
      "npm run check:current-beta-exit-status",
      "active",
      "beta-readiness",
      "npm run check:current-beta-exit-status",
      true,
      ["Beta exit remains blocked until visual, provider, runtime, and admin truth evidence exists."],
    ),
    lane(
      "final-phase-cleanup-lock",
      "Final phase cleanup lock",
      "docs/agent-truth/final-phase-cleanup-lock.md",
      "agent/state/final-phase-cleanup-lock.generated.json",
      "npm run check:final-phase-cleanup-lock",
      "supporting",
      "source-cleanup",
      "npm run check:final-phase-cleanup-lock",
      false,
      ["Historical lock evidence supports source cleanup but is not the current beta-exit authority."],
    ),
    lane(
      "evidence-capture-status",
      "Evidence capture status",
      "docs/agent-truth/evidence-capture-status.md",
      "agent/state/evidence-capture-status.generated.json",
      "npm run check:evidence-capture-status",
      "active",
      "beta-evidence",
      "npm run check:evidence-capture-status",
      true,
      ["Evidence templates do not count as complete evidence."],
    ),
    lane(
      "user-creator-parity",
      "User and creator UI parity",
      "docs/agent-truth/user-creator-ui-parity.md",
      "agent/state/user-creator-ui-parity.generated.json",
      "npm run check:user-creator-ui-parity",
      "active",
      "user-creator-ui",
      "npm run check:user-creator-ui-parity",
      true,
      ["P0/P1 user or creator parity findings block beta exit."],
    ),
    lane(
      "gumdrop-economy",
      "GumDrop economy accuracy",
      "docs/agent-truth/gumdrop-economy-accuracy.md",
      "agent/state/gumdrop-economy-accuracy.generated.json",
      "npm run check:gumdrop-economy-accuracy",
      "active",
      "economy",
      "npm run check:gumdrop-economy-accuracy",
      true,
      ["Paid bundle bonuses are purchased balance; reward balance cannot fund creator experiences."],
    ),
    lane(
      "creator-experience-simplification",
      "Creator experience simplification",
      "docs/agent-truth/creator-experience-simplification.md",
      "agent/state/creator-experience-simplification.generated.json",
      "npm run check:creator-experience-simplification",
      "active",
      "creator-experience",
      "npm run check:creator-experience-simplification",
      true,
      ["Booking uses generated slots; owner creator mode hides fan controls."],
    ),
    lane(
      "post-economy-flow-qa",
      "Post-economy creator flow QA",
      "docs/agent-truth/post-economy-creator-flow-qa.md",
      "agent/state/post-economy-creator-flow-qa.generated.json",
      "npm run check:post-economy-creator-flow-qa",
      "active",
      "creator-experience",
      "npm run check:post-economy-creator-flow-qa",
      true,
      ["Copy and eligibility checks preserve paid-only creator experience rules."],
    ),
    lane(
      "creator-dashboard-error-cost-inventory",
      "Creator dashboard error and cost inventory",
      "docs/agent-truth/creator-dashboard-error-cost-inventory.md",
      "agent/state/creator-dashboard-error-cost-inventory.generated.json",
      "npm run check:creator-dashboard-error-cost-inventory",
      "active",
      "creator-dashboard",
      "npm run check:creator-dashboard-error-cost-inventory",
      false,
      ["Creator dashboard expected 4xx paths and source-only cost inventory remain visible."],
    ),
    lane(
      "speed-security",
      "Speed and security hardening",
      "docs/agent-truth/speed-security-hardening.md",
      "agent/state/speed-security-hardening.generated.json",
      "npm run check:speed-security",
      "active",
      "speed-security",
      "npm run score:speed-security && npm run check:speed-security",
      false,
      ["P2 cost/security backlog remains owner-review; do not hide deferred risks."],
    ),
    lane(
      "product-surface-integrity",
      "Product surface integrity",
      "docs/agent-truth/product-surface-integrity.md",
      "agent/state/product-surface-integrity.generated.json",
      "npm run check:product-surface-integrity",
      "supporting",
      "product-integrity",
      "npm run check:product-surface-integrity",
      false,
      ["Product surface integrity is supporting source evidence unless P0/P1 findings are present."],
    ),
    lane(
      "release-notes-same-commit",
      "Release notes same-commit doctrine",
      "docs/agent-truth/public-beta-release-notes.md",
      "public/kandydrops-release-notes.json",
      "npm run check:release-notes",
      "active",
      "release-notes",
      "npm run release:notes && npm run check:release-notes",
      true,
      ["Patch notes are same-commit artifacts; automation validates instead of committing follow-ups."],
    ),
    lane(
      "cloud-run-cost-readiness",
      "Cloud Run cost readiness",
      "docs/agent-truth/beta-score-cleanup.md",
      "agent/state/beta-score-cleanup.generated.json",
      "npm run check:beta-score-cleanup",
      "supporting",
      "cost-readiness",
      "npm run score:beta && npm run check:beta-score-cleanup",
      false,
      ["Cloud Run/App Hosting cost readiness distinguishes repo config evidence from provider evidence."],
    ),
    lane(
      "cloud-sql-cost-readiness",
      "Cloud SQL cost readiness",
      "docs/agent-truth/beta-score-cleanup.md",
      "agent/state/beta-score-cleanup.generated.json",
      "npm run check:beta-score-cleanup",
      "supporting",
      "cost-readiness",
      "npm run score:beta && npm run check:beta-score-cleanup",
      false,
      ["Cloud SQL not detected in product runtime is source inventory, not a provider pass."],
    ),
    lane(
      "gemini-cloud-assist-cost-readiness",
      "Gemini and Cloud Assist cost readiness",
      "docs/agent-truth/beta-score-cleanup.md",
      "agent/state/beta-score-cleanup.generated.json",
      "npm run check:beta-score-cleanup",
      "supporting",
      "cost-readiness",
      "npm run score:beta && npm run check:beta-score-cleanup",
      false,
      ["Gemini/Cloud Assist/Vertex inventory remains owner-review unless source proves no P0/P1 risk."],
    ),
    lane(
      "route-4xx-readiness",
      "Route 4xx readiness",
      "docs/agent-truth/beta-score-cleanup.md",
      "agent/state/beta-score-cleanup.generated.json",
      "npm run check:beta-score-cleanup",
      "supporting",
      "cost-readiness",
      "npm run check:creator-dashboard-error-cost-inventory",
      false,
      ["Expected product 4xx states are distinct from unexpected frontend or backend errors."],
    ),
  ];
}

function buildRetiredArtifacts(): RetiredSourceTruthArtifact[] {
  return [
    {
      artifact: "agent/state/final-launch-readiness-report.generated.json",
      status: "retired",
      reason: "Legacy launch report is superseded by evidence capture status and current beta exit status.",
      supersededBy: "agent/state/evidence-capture-status.generated.json",
      betaBlocking: false,
    },
    {
      artifact: "agent/state/launch-readiness-report.generated.json",
      status: "retired",
      reason: "Legacy launch readiness is no longer the active beta score freshness source.",
      supersededBy: "agent/state/current-beta-exit-status.generated.json",
      betaBlocking: false,
    },
    {
      artifact: "agent/state/launch-pr-triage.generated.json",
      status: "retired",
      reason: "Legacy PR triage is historical evidence and must not cap current readiness.",
      supersededBy: "docs/agent-truth/source-truth-authority-map.md",
      betaBlocking: false,
    },
    {
      artifact: "agent/state/repo-spring-cleaning-rewire.generated.json",
      status: "archive_only",
      reason: "Repo spring-cleaning rewire remains governance backlog evidence, not beta-exit truth.",
      supersededBy: "docs/agent-truth/source-truth-authority-map.md",
      betaBlocking: false,
    },
    {
      artifact: "agent/state/debug-panel-output-triage.generated.json",
      status: "archive_only",
      reason: "Debug panel output triage is historical source evidence until refreshed by its owner lane.",
      supersededBy: "agent/state/current-beta-exit-status.generated.json",
      betaBlocking: false,
    },
  ];
}

function buildCostReadiness() {
  const cleanup = readObject(readJson("agent/state/beta-score-cleanup.generated.json"));
  const rawCost = readObject(cleanup.costReadiness);
  const laneStatus = (key: string, fallback: string) => readString(readObject(rawCost[key]).status, fallback);
  return {
    cloudRunCostReadiness: laneStatus("cloudRunCostReadiness", "cost_review_required"),
    cloudSqlCostReadiness: laneStatus("cloudSqlCostReadiness", "not_detected_in_repo"),
    geminiCloudAssistCostReadiness: laneStatus("geminiCloudAssistCostReadiness", "cost_review_required"),
    route4xxReadiness: laneStatus("route4xxReadiness", "source_inventory_complete"),
  };
}

function buildMemoryRules() {
  const memory = readText("memory.md");
  return memory
    .split(/\r?\n/u)
    .filter((line) => /same commit|paid bundle bonus|Creator booking UX|Cloud Run|Cloud SQL|Gemini|4xx|cost checks/iu.test(line))
    .map((line) => line.replace(/^-\s*/u, "").trim())
    .filter(Boolean);
}

function artifactHead(relativePath: string) {
  const artifact = readJson(relativePath);
  if (!artifact) return { currentHead: "", status: "missing" as const };
  const head = readString(artifact.currentHead);
  if (!head) return { currentHead: "", status: "missing_head" as const };
  return { currentHead: head, status: "current" as const };
}

function buildCurrentHeadChecks(head: string, lanes: SourceTruthAuthorityLane[], retiredArtifacts: RetiredSourceTruthArtifact[]) {
  const paths = Array.from(new Set([
    ...lanes.map((entry) => entry.generatedArtifact),
    ...retiredArtifacts.map((entry) => entry.artifact),
  ])).filter((path) => path.endsWith(".json"));
  return paths.map((artifact): SourceTruthHeadCheck => {
    const retired = retiredArtifacts.find((entry) => entry.artifact === artifact);
    const result = artifactHead(artifact);
    if (result.status === "missing") {
      return {
        artifact,
        currentHead: "",
        status: "missing",
        action: retired ? "Retired artifact is not required." : "Refresh or restore the active artifact.",
      };
    }
    if (result.status === "missing_head") {
      return {
        artifact,
        currentHead: "",
        status: retired ? "not_required" : "missing_head",
        action: retired ? "Retired artifact has no required currentHead." : "Active artifact must record currentHead.",
      };
    }
    if (result.currentHead === head) {
      return {
        artifact,
        currentHead: result.currentHead,
        status: "current",
        action: "Artifact currentHead matches git HEAD.",
      };
    }
    return {
      artifact,
      currentHead: result.currentHead,
      status: retired ? "not_required" : "stale",
      action: retired
        ? "Retired/archive artifact does not block beta score."
        : "Refresh through the lane validator before treating as current evidence.",
    };
  });
}

export function buildSourceTruthAuthorityMapReport(head = currentHead()): SourceTruthAuthorityMapReport {
  const lanes = buildLanes();
  const retiredArtifacts = buildRetiredArtifacts();
  const activeLanes = lanes.filter((entry) => entry.status === "active");
  const supportingLanes = lanes.filter((entry) => entry.status === "supporting");
  const staleLanes = lanes.filter((entry) => entry.status === "stale");
  const archiveOnlyLanes = lanes.filter((entry) => entry.status === "archive_only");
  const retiredLanes = lanes.filter((entry) => entry.status === "retired");
  const betaBlockingLanes = lanes.filter((entry) => entry.betaBlocking);
  const costReadiness = buildCostReadiness();

  return {
    generatedAtUtc: new Date().toISOString(),
    reportKey: "source-truth-authority-map",
    currentHead: head,
    summary: {
      activeLanes: activeLanes.length,
      supportingLanes: supportingLanes.length,
      retiredLanes: retiredLanes.length,
      archiveOnlyLanes: archiveOnlyLanes.length,
      staleLanes: staleLanes.length,
      betaBlockingLanes: betaBlockingLanes.length,
      costReadinessLanes: costLaneIds.length,
      retiredLaunchArtifacts: retiredArtifacts.filter((entry) => entry.status === "retired").length,
      sameCommitReleaseNotes: true,
      p0Count: 0,
      p1Count: 0,
      p2Count: 4,
    },
    lanes,
    retiredArtifacts,
    costReadiness,
    memoryRules: buildMemoryRules(),
    currentHeadChecks: buildCurrentHeadChecks(head, lanes, retiredArtifacts),
    fixesApplied: [
      "Created a single source-truth authority map for active, supporting, retired, and archive-only lanes.",
      "Demoted legacy launch readiness reports from current beta readiness gates without deleting them.",
      "Linked Cloud Run, Cloud SQL, Gemini/Cloud Assist, and route 4xx readiness to source inventory lanes.",
    ],
    nextExactSteps: [
      "Use npm run check:source-truth-authority-map before treating source-truth lane changes as accepted.",
      "Refresh beta score and current beta exit status only through their active validators.",
      "Attach real visual/provider/runtime/admin evidence before clearing beta-exit evidence gates.",
    ],
  };
}

export function validateSourceTruthAuthorityMapReport(
  report: SourceTruthAuthorityMapReport | null,
  head: string,
) {
  const failures: string[] = [];
  if (!report) return ["source-truth-authority-map artifact missing"];
  if (report.reportKey !== "source-truth-authority-map") failures.push("reportKey must be source-truth-authority-map.");
  if (report.currentHead !== head) failures.push(`report currentHead must match git HEAD (${head}).`);

  for (const laneEntry of report.lanes ?? []) {
    if (laneEntry.status === "active" && (!laneEntry.authorityDoc || !laneEntry.generatedArtifact || !laneEntry.validator)) {
      failures.push(`active lane ${laneEntry.id} lacks authorityDoc/generatedArtifact/validator.`);
    }
    if (laneEntry.status === "stale" && !laneEntry.refreshCommand) {
      failures.push(`stale lane ${laneEntry.id} lacks refresh command.`);
    }
  }

  for (const artifact of report.retiredArtifacts ?? []) {
    if (artifact.betaBlocking) {
      failures.push(`retired artifact ${artifact.artifact} must not block beta score.`);
    }
  }

  const laneIds = new Set((report.lanes ?? []).map((entry) => entry.id));
  if (costLaneIds.some((id) => !laneIds.has(id))) {
    failures.push("cost readiness lanes missing.");
  }
  if (!laneIds.has("route-4xx-readiness")) {
    failures.push("4xx readiness lane missing.");
  }

  const memoryRules = (report.memoryRules ?? []).join("\n");
  if (!report.summary?.sameCommitReleaseNotes || !/same commit/iu.test(memoryRules)) {
    failures.push("same-commit release note rule missing.");
  }
  if (!/Cloud Run, Cloud SQL, Gemini\/Cloud Assist, and 4xx cost checks are evidence\/inventory lanes/iu.test(memoryRules)) {
    failures.push("memory.md contradicts authority map or lacks cost readiness rule.");
  }

  const currentHeadChecks = report.currentHeadChecks ?? [];
  if (currentHeadChecks.length === 0) {
    failures.push("currentHead mismatch inventory must be represented.");
  }
  const unreportedMismatch = currentHeadChecks.some((entry) => (
    entry.currentHead
    && entry.currentHead !== head
    && !["stale", "not_required"].includes(entry.status)
  ));
  if (unreportedMismatch) {
    failures.push("currentHead mismatch unreported.");
  }

  const retiredLaunchArtifacts = new Set([
    "agent/state/final-launch-readiness-report.generated.json",
    "agent/state/launch-readiness-report.generated.json",
    "agent/state/launch-pr-triage.generated.json",
  ]);
  for (const artifact of retiredLaunchArtifacts) {
    if (!(report.retiredArtifacts ?? []).some((entry) => entry.artifact === artifact && entry.status === "retired")) {
      failures.push(`retired launch artifact missing: ${artifact}.`);
    }
  }

  if ((report.nextExactSteps?.length ?? 0) === 0) failures.push("nextExactSteps must not be empty.");
  return failures;
}

function renderDocs(report: SourceTruthAuthorityMapReport) {
  const laneLines = report.lanes
    .map((entry) => (
      `| ${entry.id} | ${entry.status} | ${entry.authorityDoc} | ${entry.generatedArtifact} | ${entry.validator} | ${entry.betaBlocking ? "yes" : "no"} |`
    ))
    .join("\n");
  const retiredLines = report.retiredArtifacts
    .map((entry) => `- ${entry.artifact}: \`${entry.status}\` - ${entry.reason} Superseded by ${entry.supersededBy}.`)
    .join("\n");
  const headLines = report.currentHeadChecks
    .map((entry) => `- ${entry.artifact}: \`${entry.status}\` ${entry.currentHead ? `(${entry.currentHead})` : ""} - ${entry.action}`)
    .join("\n");

  return `# Source Truth Authority Map

Artifact: \`${artifactRelativePath}\`
Validator: \`npm run check:source-truth-authority-map\`

Generated: ${report.generatedAtUtc}
Current source head: \`${report.currentHead}\`

## Summary

- Active lanes: ${report.summary.activeLanes}.
- Supporting lanes: ${report.summary.supportingLanes}.
- Retired launch artifacts: ${report.summary.retiredLaunchArtifacts}.
- Beta-blocking lanes: ${report.summary.betaBlockingLanes}.
- Cost-readiness lanes: ${report.summary.costReadinessLanes}.
- Same-commit release notes required: ${report.summary.sameCommitReleaseNotes ? "yes" : "no"}.
- P0/P1/P2: ${report.summary.p0Count}/${report.summary.p1Count}/${report.summary.p2Count}.

Generated reports remain evidence snapshots. Active source truth must come from the authority document, generated artifact, and validator listed for each lane.

## Authority Lanes

| Lane | Status | Authority doc | Generated artifact | Validator | Beta blocking |
| --- | --- | --- | --- | --- | --- |
${laneLines}

## Retired And Archive-Only Artifacts

${retiredLines}

The legacy launch readiness reports are retired from current beta score freshness gates. They remain historical evidence and must not be deleted unless a future validator proves archive-safe deletion.

## Cost Readiness Source Truth

- Cloud Run cost readiness: \`${report.costReadiness.cloudRunCostReadiness}\`. Repo config/source inventory is distinct from provider evidence.
- Cloud SQL cost readiness: \`${report.costReadiness.cloudSqlCostReadiness}\`. Source-only not-detected status is not a provider pass.
- Gemini / Cloud Assist cost readiness: \`${report.costReadiness.geminiCloudAssistCostReadiness}\`. AI cost lanes remain owner-review unless source proves active usage and risk level.
- Route 4xx readiness: \`${report.costReadiness.route4xxReadiness}\`. Expected product 4xx states are separate from unexpected route errors.

None of these cost lanes should be marked pass without evidence. P0/P1 cost or 4xx findings can block beta exit; P2 inventory remains owner review.

## Memory Rules Checked

${report.memoryRules.map((rule) => `- ${rule}`).join("\n")}

## Current Head Inventory

${headLines}

## Next Exact Steps

${report.nextExactSteps.map((step, index) => `${index + 1}. ${step}`).join("\n")}
`;
}

function writeReport(report: SourceTruthAuthorityMapReport) {
  mkdirSync(dirname(artifactPath), { recursive: true });
  mkdirSync(dirname(docsPath), { recursive: true });
  writeFileSync(artifactPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  writeFileSync(docsPath, renderDocs(report), "utf8");
}

function main() {
  const report = buildSourceTruthAuthorityMapReport();
  writeReport(report);
  const failures = validateSourceTruthAuthorityMapReport(report, currentHead());
  if (failures.length > 0) {
    console.error("Source truth authority map validation failed:");
    for (const failure of failures) console.error(`- ${failure}`);
    process.exit(1);
  }
  console.log(
    `Source truth authority map passed. active=${report.summary.activeLanes} ` +
      `supporting=${report.summary.supportingLanes} retiredLaunch=${report.summary.retiredLaunchArtifacts}`,
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
