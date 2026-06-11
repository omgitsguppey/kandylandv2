import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { buildRefreshPlan } from "../../src/lib/agent-score/refresh-safeguards";
import { REFRESH_ARTIFACT_REGISTRY } from "../../src/lib/agent-score/refresh-registry";

type LockOpenPr = {
  number?: number;
  title?: string;
  author?: unknown;
  mergeStateStatus?: string;
  updatedAt?: string;
  url?: string;
  classification?: string;
};

type RefreshPlanInput = {
  artifactPath: string;
  status: string;
  nextAction: string;
  refreshCommand: string | null;
};

type BuildInput = {
  currentHead?: string;
  generatedAtUtc?: string;
  openPrs?: LockOpenPr[];
  changedFiles?: string[];
  untrackedFiles?: string[];
  refreshPlan?: RefreshPlanInput[];
  evidence?: Partial<{
    operatorRevenueSmokeStatus: string;
    formalProviderSmokeStatus: string;
    manualEvidenceStatus: string;
    runtimeEvidenceStatus: string;
    adminTruthEvidenceStatus: string;
    canStartBetaExitReview: boolean;
  }>;
  beta?: Partial<{
    betaScore: number;
    betaStatus: string;
  }>;
};

type DirtyFileAction = {
  path: string;
  classification: string;
  action: string;
};

export type FinalMorningBetaLockReport = {
  generatedAtUtc: string;
  reportKey: "final-morning-beta-lock";
  currentHead: string;
  summary: {
    openPrsClassified: boolean;
    dirtyFilesClassified: boolean;
    staleArtifactsHaveRefreshActions: boolean;
    operatorRevenueSmokeStatus: string;
    formalProviderSmokeStatus: string;
    manualEvidenceStatus: string;
    runtimeEvidenceStatus: string;
    adminTruthEvidenceStatus: string;
    betaScore: number;
    betaStatus: string;
    canStartBetaExitReview: boolean;
    chatUntouched: boolean;
    navUntouched: boolean;
    p0Count: number;
    p1Count: number;
    p2Count: number;
  };
  prActions: Array<LockOpenPr & { classification: string; action: string }>;
  dirtyFileActions: DirtyFileAction[];
  staleArtifacts: Array<{
    artifactPath: string;
    status: string;
    nextAction: string;
    refreshCommand: string | null;
  }>;
  evidenceStatus: Array<{
    lane: string;
    status: string;
    gateImpact: string;
    nextAction: string;
  }>;
  refreshPlan: RefreshPlanInput[];
  remainingBlockers: Array<{
    id: string;
    severity: "P0" | "P1" | "P2";
    status: string;
    nextAction: string;
  }>;
  nextExactSteps: string[];
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, "..", "..");
const ARTIFACT = "agent/state/final-morning-beta-lock.generated.json";
const DOC = "docs/agent-truth/final-morning-beta-lock.md";

const chatPattern = /(^|\/)(src\/components\/Chat|src\/app\/dashboard\/chat)\//u;
const navPattern = /(^|\/)(src\/components\/Navigation|src\/components\/Navbar|src\/components\/BottomNav|src\/components\/TopNav)/u;

function safeExec(command: string, args: string[]) {
  try {
    return execFileSync(command, args, { cwd: ROOT, encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

function currentHead() {
  return safeExec("git", ["rev-parse", "HEAD"]) || "unknown";
}

function readJson(relativePath: string): Record<string, unknown> {
  const fullPath = join(ROOT, relativePath);
  if (!existsSync(fullPath)) return {};
  try {
    return JSON.parse(readFileSync(fullPath, "utf8")) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function readString(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : fallback;
}

function readNumber(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function changedFiles() {
  return Array.from(new Set([
    ...safeExec("git", ["diff", "--name-only"]).split(/\r?\n/u),
    ...safeExec("git", ["diff", "--cached", "--name-only"]).split(/\r?\n/u),
  ].filter(Boolean))).map((entry) => entry.replaceAll("\\", "/"));
}

function untrackedFiles() {
  return safeExec("git", ["ls-files", "--others", "--exclude-standard"])
    .split(/\r?\n/u)
    .filter(Boolean)
    .map((entry) => entry.replaceAll("\\", "/"));
}

function openPrs(): LockOpenPr[] {
  if (process.env.ALLOW_GH_PR_LIST !== "1") return [];
  const output = safeExec("gh", [
    "pr",
    "list",
    "--repo",
    "omgitsguppey/kandylandv2",
    "--state",
    "open",
    "--limit",
    "100",
    "--json",
    "number,title,author,mergeStateStatus,updatedAt,url",
  ]);
  if (!output) return [];
  try {
    return JSON.parse(output) as LockOpenPr[];
  } catch {
    return [];
  }
}

function classifyPr(pr: LockOpenPr): LockOpenPr & { classification: string; action: string } {
  const title = `${pr.title ?? ""}`.toLowerCase();
  if (pr.number === 274 || title.includes("monolith")) {
    return { ...pr, classification: "closed_or_superseded_broad_doctrine_pr", action: "Preserve current source-truth doctrine; do not merge broad stale doctrine." };
  }
  if (pr.number === 275 || title.includes("aggregation hotspot") || title.includes("duplicate computation")) {
    return { ...pr, classification: "merged_or_superseded_scoped_admin_analytics_pr", action: "Classified against current admin/cost cleanup state." };
  }
  return { ...pr, classification: pr.classification ?? "", action: pr.classification ? "Already classified." : "" };
}

function classifyDirtyFile(path: string): DirtyFileAction {
  if (path === ARTIFACT || path === DOC || path === "scripts/agent/validate-final-morning-beta-lock.ts" || path === "tests/unit/final-morning-beta-lock.spec.ts") {
    return { path, classification: "current_generated_artifact_to_commit", action: "Commit as this final morning lock." };
  }
  if (path.startsWith("agent/state/") || path.startsWith("docs/agent-truth/")) {
    return { path, classification: "current_generated_artifact_to_commit", action: "Commit refreshed source-only status artifact." };
  }
  if (path === "package.json" || path === "CHANGELOG.md" || path === "public/kandydrops-release-notes.json" || path.startsWith("src/lib/release-notes/")) {
    return { path, classification: "release_artifact_expected", action: "Commit same-release-note artifacts with the lock." };
  }
  if (path.startsWith("scripts/agent/") || path.startsWith("tests/unit/") || path.startsWith("src/lib/agent-score/")) {
    return { path, classification: "real_source_change_needs_review", action: "Commit scoped validator/helper change after focused checks." };
  }
  return { path, classification: "unsafe_unknown", action: "Do not stage without review." };
}

function artifactInput(relativePath: string, head: string) {
  const parsed = readJson(relativePath);
  if (Object.keys(parsed).length === 0) {
    return { artifactPath: relativePath, exists: false, currentCodeVersion: head };
  }
  return {
    artifactPath: relativePath,
    generatedAtUtc: readString(parsed.generatedAtUtc ?? parsed.generatedAt) || undefined,
    sourceCommit: readString(parsed.sourceCommit ?? parsed.currentHead) || undefined,
    currentCodeVersion: head,
    exists: true,
  };
}

function workspaceRefreshPlan(head: string): RefreshPlanInput[] {
  return buildRefreshPlan(REFRESH_ARTIFACT_REGISTRY.map((entry) => artifactInput(entry.artifactPath, head)), {
    currentCodeVersion: head,
    nowUtc: new Date().toISOString(),
  }).map((entry) => ({
    artifactPath: entry.artifactPath,
    status: entry.status,
    nextAction: entry.nextAction,
    refreshCommand: entry.refreshCommand,
  }));
}

function workspaceEvidence() {
  const operator = readJson("agent/state/operator-revenue-smoke.generated.json");
  const operatorSummary = operator.summary && typeof operator.summary === "object" ? operator.summary as Record<string, unknown> : {};
  const evidence = readJson("agent/state/evidence-capture-status.generated.json");
  const evidenceSummary = evidence.summary && typeof evidence.summary === "object" ? evidence.summary as Record<string, unknown> : {};
  return {
    operatorRevenueSmokeStatus: readString(operatorSummary.revenueSmokeStatus, "not_recorded"),
    formalProviderSmokeStatus: readString(operatorSummary.providerSmokeGateStatus, readString(evidenceSummary.providerSmokeEvidence, "missing")),
    manualEvidenceStatus: readString(evidenceSummary.manualScreenshotEvidence, "missing"),
    runtimeEvidenceStatus: readString(evidenceSummary.runtimeSmokeEvidence, "missing"),
    adminTruthEvidenceStatus: readString(evidenceSummary.adminTruthSampleEvidence, "missing"),
    canStartBetaExitReview: evidenceSummary.canStartBetaExitReview === true,
  };
}

function workspaceBeta() {
  const score = readJson("agent/state/public-beta-score.generated.json");
  const current = readJson("agent/state/current-beta-exit-status.generated.json");
  const summary = current.summary && typeof current.summary === "object" ? current.summary as Record<string, unknown> : {};
  return {
    betaScore: readNumber(score.overallScore ?? summary.betaScore, 0),
    betaStatus: readString(score.readinessStatus ?? summary.betaStatus, "unknown"),
  };
}

export function buildFinalMorningBetaLockReport(input: BuildInput = {}): FinalMorningBetaLockReport {
  const head = input.currentHead ?? currentHead();
  const generatedAtUtc = input.generatedAtUtc ?? new Date().toISOString();
  const prs = (input.openPrs ?? openPrs()).map(classifyPr);
  const files = Array.from(new Set([...(input.changedFiles ?? changedFiles()), ...(input.untrackedFiles ?? untrackedFiles())]));
  const dirtyFileActions = files.map(classifyDirtyFile);
  const refreshPlan = input.refreshPlan ?? workspaceRefreshPlan(head);
  const staleArtifacts = refreshPlan.filter((entry) => entry.status !== "current");
  const evidence = { ...workspaceEvidence(), ...input.evidence };
  const beta = { ...workspaceBeta(), ...input.beta };
  const chatUntouched = !files.some((file) => chatPattern.test(file));
  const navUntouched = !files.some((file) => navPattern.test(file));
  const openPrsClassified = prs.every((pr) => Boolean(pr.classification));
  const dirtyFilesClassified = dirtyFileActions.every((entry) => entry.classification !== "unsafe_unknown");
  const staleArtifactsHaveRefreshActions = staleArtifacts.every((entry) => Boolean(entry.nextAction && entry.refreshCommand));
  const formalEvidenceMissing = [
    evidence.formalProviderSmokeStatus,
    evidence.manualEvidenceStatus,
    evidence.runtimeEvidenceStatus,
    evidence.adminTruthEvidenceStatus,
  ].some((status) => status !== "complete" && !/^formal_.*passed$/u.test(status ?? ""));
  const remainingBlockers = [
    evidence.formalProviderSmokeStatus === "missing_formal_evidence" || evidence.formalProviderSmokeStatus === "missing"
      ? { id: "formal_provider_smoke_missing", severity: "P1" as const, status: evidence.formalProviderSmokeStatus ?? "missing", nextAction: "Attach formal provider/app artifact only when the operator chooses to clear provider smoke." }
      : null,
    evidence.manualEvidenceStatus !== "complete"
      ? { id: "manual_evidence_missing", severity: "P1" as const, status: evidence.manualEvidenceStatus ?? "missing", nextAction: "Attach manual screenshot QA evidence." }
      : null,
    evidence.runtimeEvidenceStatus !== "complete"
      ? { id: "runtime_evidence_missing", severity: "P1" as const, status: evidence.runtimeEvidenceStatus ?? "missing", nextAction: "Attach deployed runtime smoke evidence." }
      : null,
    evidence.adminTruthEvidenceStatus !== "complete"
      ? { id: "admin_truth_evidence_missing", severity: "P1" as const, status: evidence.adminTruthEvidenceStatus ?? "missing", nextAction: "Attach a redacted admin truth sample artifact." }
      : null,
    staleArtifacts.length > 0
      ? { id: "stale_artifacts_need_refresh", severity: "P2" as const, status: "refresh_actions_available", nextAction: "Run listed refresh commands before relying on stale supporting reports." }
      : null,
  ].filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));
  const p0Count = [
    !openPrsClassified,
    !dirtyFilesClassified,
    !staleArtifactsHaveRefreshActions,
    !chatUntouched || !navUntouched,
    evidence.operatorRevenueSmokeStatus !== "operator_confirmed_revenue_smoke",
    evidence.canStartBetaExitReview === true && formalEvidenceMissing,
  ].filter(Boolean).length;

  return {
    generatedAtUtc,
    reportKey: "final-morning-beta-lock",
    currentHead: head,
    summary: {
      openPrsClassified,
      dirtyFilesClassified,
      staleArtifactsHaveRefreshActions,
      operatorRevenueSmokeStatus: evidence.operatorRevenueSmokeStatus ?? "not_recorded",
      formalProviderSmokeStatus: evidence.formalProviderSmokeStatus ?? "missing",
      manualEvidenceStatus: evidence.manualEvidenceStatus ?? "missing",
      runtimeEvidenceStatus: evidence.runtimeEvidenceStatus ?? "missing",
      adminTruthEvidenceStatus: evidence.adminTruthEvidenceStatus ?? "missing",
      betaScore: beta.betaScore ?? 0,
      betaStatus: beta.betaStatus ?? "unknown",
      canStartBetaExitReview: evidence.canStartBetaExitReview === true,
      chatUntouched,
      navUntouched,
      p0Count,
      p1Count: remainingBlockers.filter((entry) => entry.severity === "P1").length,
      p2Count: remainingBlockers.filter((entry) => entry.severity === "P2").length,
    },
    prActions: prs,
    dirtyFileActions,
    staleArtifacts,
    evidenceStatus: [
      { lane: "operator_revenue_smoke", status: evidence.operatorRevenueSmokeStatus ?? "not_recorded", gateImpact: "product_signal_only", nextAction: "Keep represented without clearing provider smoke." },
      { lane: "formal_provider_smoke", status: evidence.formalProviderSmokeStatus ?? "missing", gateImpact: "required_formal_lane", nextAction: "Attach formal artifact only when available." },
      { lane: "manual_screenshot_qa", status: evidence.manualEvidenceStatus ?? "missing", gateImpact: "required_formal_lane", nextAction: "Attach screenshot evidence." },
      { lane: "runtime_smoke", status: evidence.runtimeEvidenceStatus ?? "missing", gateImpact: "required_formal_lane", nextAction: "Attach deployed runtime proof." },
      { lane: "admin_truth_sample", status: evidence.adminTruthEvidenceStatus ?? "missing", gateImpact: "required_formal_lane", nextAction: "Attach redacted admin truth sample." },
    ],
    refreshPlan,
    remainingBlockers,
    nextExactSteps: [
      "Keep operator-confirmed $50 GumDrop revenue smoke represented as product signal only.",
      "Do not clear formal provider smoke until a formal provider/app artifact exists.",
      "Attach manual screenshot, runtime smoke, and admin truth sample evidence before beta exit review.",
      "Use stale artifact refresh commands before relying on supporting reports.",
    ],
  };
}

export function validateFinalMorningBetaLockReport(report: FinalMorningBetaLockReport | null, head: string) {
  const failures: string[] = [];
  if (!report) return ["final-morning-beta-lock artifact missing"];
  if (report.reportKey !== "final-morning-beta-lock") failures.push("reportKey must be final-morning-beta-lock.");
  if (report.currentHead !== head) failures.push("currentHead must match the latest code version.");
  if (!report.summary.openPrsClassified || report.prActions.some((pr) => !pr.classification)) failures.push("open PRs must be classified.");
  if (!report.summary.dirtyFilesClassified || report.dirtyFileActions.some((file) => file.classification === "unsafe_unknown")) failures.push("dirty files must be classified.");
  if (!report.summary.staleArtifactsHaveRefreshActions || report.staleArtifacts.some((artifact) => !artifact.nextAction || !artifact.refreshCommand)) failures.push("stale artifacts must include refresh actions.");
  if (report.summary.operatorRevenueSmokeStatus !== "operator_confirmed_revenue_smoke") failures.push("operator-confirmed revenue smoke must be represented.");
  if (/passed|complete/u.test(report.summary.formalProviderSmokeStatus) && report.summary.operatorRevenueSmokeStatus === "operator_confirmed_revenue_smoke") {
    failures.push("operator-confirmed revenue smoke must not clear formal provider smoke.");
  }
  if (report.summary.canStartBetaExitReview && [report.summary.formalProviderSmokeStatus, report.summary.manualEvidenceStatus, report.summary.runtimeEvidenceStatus, report.summary.adminTruthEvidenceStatus].some((status) => !/complete|passed/u.test(status))) {
    failures.push("beta exit cannot be true without formal evidence lanes.");
  }
  if (!report.summary.chatUntouched || !report.summary.navUntouched) failures.push("chat/nav files must remain untouched.");
  if (report.nextExactSteps.length === 0) failures.push("nextExactSteps missing.");
  return failures;
}

function renderDocs(report: FinalMorningBetaLockReport) {
  return `# Final Morning Beta Lock

Generated: ${report.generatedAtUtc}

## Summary

- Open PRs classified: ${report.summary.openPrsClassified}
- Dirty files classified: ${report.summary.dirtyFilesClassified}
- Stale artifacts have refresh actions: ${report.summary.staleArtifactsHaveRefreshActions}
- Operator revenue smoke: ${report.summary.operatorRevenueSmokeStatus}
- Formal provider smoke: ${report.summary.formalProviderSmokeStatus}
- Manual evidence: ${report.summary.manualEvidenceStatus}
- Runtime evidence: ${report.summary.runtimeEvidenceStatus}
- Admin truth evidence: ${report.summary.adminTruthEvidenceStatus}
- Beta score/status: ${report.summary.betaScore}/${report.summary.betaStatus}
- Beta exit review ready: ${report.summary.canStartBetaExitReview}
- Chat untouched: ${report.summary.chatUntouched}
- Nav untouched: ${report.summary.navUntouched}

## Stale Artifacts

${report.staleArtifacts.length ? report.staleArtifacts.map((entry) => `- ${entry.artifactPath}: ${entry.nextAction}`).join("\n") : "- None."}

## Evidence Status

${report.evidenceStatus.map((entry) => `- ${entry.lane}: ${entry.status}; ${entry.gateImpact}; next: ${entry.nextAction}`).join("\n")}

## Remaining Blockers

${report.remainingBlockers.length ? report.remainingBlockers.map((entry) => `- ${entry.severity} ${entry.id}: ${entry.nextAction}`).join("\n") : "- None."}

## Next Exact Steps

${report.nextExactSteps.map((step, index) => `${index + 1}. ${step}`).join("\n")}
`;
}

function main() {
  const report = buildFinalMorningBetaLockReport({
    currentHead: currentHead(),
    generatedAtUtc: new Date().toISOString(),
  });
  mkdirSync(dirname(join(ROOT, ARTIFACT)), { recursive: true });
  mkdirSync(dirname(join(ROOT, DOC)), { recursive: true });
  writeFileSync(join(ROOT, ARTIFACT), `${JSON.stringify(report, null, 2)}\n`);
  writeFileSync(join(ROOT, DOC), renderDocs(report));
  const failures = validateFinalMorningBetaLockReport(report, currentHead());
  if (failures.length > 0) {
    console.error("Final morning beta lock failed:");
    for (const failure of failures) console.error(`- ${failure}`);
    process.exit(1);
  }
  console.log(`Final morning beta lock passed. beta=${report.summary.betaScore}/${report.summary.betaStatus} p0=${report.summary.p0Count}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
