import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";

type Severity = "P0" | "P1" | "P2";

type TriageFinding = {
  findingKey: string;
  severity: Severity;
  title: string;
  description: string;
  files: string[];
  evidence: string[];
  currentStatus: string;
  recommendedFix: string;
};

type ScoreIngestionFinding = TriageFinding & {
  evidenceFileExists: boolean;
  scoreReadsIt: boolean;
  scoreTrustsItCorrectly: boolean;
  scoreGateAffected: string;
};

export type PhaseOneScoreUiTriageReport = {
  generatedAtUtc: string;
  reportKey: "phase-one-score-ui-triage";
  currentHead: string;
  summary: {
    scoreIngestionIssues: number;
    scoreMathIssues: number;
    uiConnectionIssues: number;
    watchTimeIssues: number;
    adminDashboardIssues: number;
    creatorDashboardIssues: number;
    p0Count: number;
    p1Count: number;
    p2Count: number;
  };
  scoreIngestionFindings: ScoreIngestionFinding[];
  scoreMathFindings: TriageFinding[];
  uiConnectionFindings: TriageFinding[];
  watchTimeFindings: TriageFinding[];
  adminDashboardFindings: TriageFinding[];
  creatorDashboardFindings: TriageFinding[];
  recommendedFixOrder: Array<{
    stepKey: string;
    severity: Severity;
    title: string;
    targetFiles: string[];
    validators: string[];
    rationale: string;
  }>;
  nextPromptRecommendation: string;
};

const REPORT_PATH = "agent/state/phase-one-score-ui-triage.generated.json";

function readText(root: string, relativePath: string) {
  const fullPath = join(root, relativePath);
  return existsSync(fullPath) ? readFileSync(fullPath, "utf8") : "";
}

function readJson(root: string, relativePath: string): Record<string, unknown> {
  const source = readText(root, relativePath);
  if (!source) return {};
  try {
    const parsed = JSON.parse(source) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : {};
  } catch {
    return {};
  }
}

function fileExists(root: string, relativePath: string) {
  return existsSync(join(root, relativePath));
}

function fileAgeHours(root: string, relativePath: string, nowMs: number) {
  const fullPath = join(root, relativePath);
  if (!existsSync(fullPath)) return null;
  return (nowMs - statSync(fullPath).mtimeMs) / (60 * 60 * 1000);
}

function readCurrentHead(root: string) {
  try {
    const headPath = join(root, ".git", "HEAD");
    const head = readFileSync(headPath, "utf8").trim();
    if (!head.startsWith("ref:")) return head;
    const ref = head.replace(/^ref:\s*/u, "").trim();
    const refPath = join(root, ".git", ...ref.split("/"));
    if (existsSync(refPath)) {
      return readFileSync(refPath, "utf8").trim();
    }
    const packedRefs = readText(root, ".git/packed-refs");
    const packedMatch = packedRefs
      .split(/\r?\n/u)
      .map((line) => line.trim())
      .find((line) => line.endsWith(` ${ref}`));
    return packedMatch?.split(/\s+/u)[0] ?? "unavailable";
  } catch {
    return "unavailable";
  }
}

function countSeverity(groups: TriageFinding[][], severity: Severity) {
  return groups.flat().filter((finding) => finding.severity === severity).length;
}

function evidenceStatus(report: Record<string, unknown>) {
  return String(report.overallStatus ?? report.status ?? report.reportKey ?? "unknown");
}

function includesAll(source: string, values: string[]) {
  return values.every((value) => source.includes(value));
}

function scoreReadsPath(scoreScript: string, path: string) {
  return scoreScript.includes(path) || scoreScript.includes(path.replaceAll("/", "\\"));
}

function buildScoreIngestionFindings(root: string) {
  const scoreScriptPath = "scripts/agent/score-public-beta-readiness.ts";
  const scoreScript = readText(root, scoreScriptPath);
  const providerReport = readJson(root, "agent/state/provider-smoke-evidence.generated.json");
  const runtimeReport = readJson(root, "agent/state/runtime-smoke-evidence.generated.json");
  const adminTruthReport = readJson(root, "agent/state/admin-truth-sample-evidence.generated.json");
  const findings: ScoreIngestionFinding[] = [];

  const formalEvidence = [
    {
      key: "provider-smoke-evidence-not-ingested",
      path: "agent/state/provider-smoke-evidence.generated.json",
      report: providerReport,
      gate: "runtimeProviderSmoke",
      title: "Provider smoke evidence artifact is not read by the public beta score",
      description: "Formal provider smoke tracking exists, but the score runner still infers provider smoke from final launch readiness report text.",
    },
    {
      key: "runtime-smoke-evidence-not-ingested",
      path: "agent/state/runtime-smoke-evidence.generated.json",
      report: runtimeReport,
      gate: "runtimeProviderSmoke",
      title: "Runtime smoke evidence artifact is not read by the public beta score",
      description: "Runtime smoke tracking exists, but the score gate has no direct runtime evidence artifact input.",
    },
    {
      key: "admin-truth-sample-evidence-not-ingested",
      path: "agent/state/admin-truth-sample-evidence.generated.json",
      report: adminTruthReport,
      gate: "adminTruthSamples",
      title: "Admin truth sample evidence artifact is not read by the public beta score",
      description: "The score derives admin truth sample evidence from debug entries instead of the formal admin truth sample artifact.",
    },
  ];

  for (const item of formalEvidence) {
    const exists = fileExists(root, item.path);
    const scoreReadsIt = scoreReadsPath(scoreScript, item.path);
    findings.push({
      findingKey: item.key,
      severity: "P1",
      title: item.title,
      description: item.description,
      files: [scoreScriptPath, item.path],
      evidence: [
        `${item.path} exists=${exists}`,
        `${item.path} status=${evidenceStatus(item.report)}`,
        `scoreReadsIt=${scoreReadsIt}`,
      ],
      currentStatus: exists ? `${evidenceStatus(item.report)} but not directly scored` : "missing artifact",
      evidenceFileExists: exists,
      scoreReadsIt,
      scoreTrustsItCorrectly: false,
      scoreGateAffected: item.gate,
      recommendedFix: "Wire this formal artifact into score input as an honest gate input without converting missing/operator-reported evidence into a pass.",
    });
  }

  if (scoreScript.includes("hasTargetedBehaviorEvidence: false")) {
    findings.push({
      findingKey: "targeted-behavior-evidence-hardcoded-false",
      severity: "P1",
      title: "Targeted behavior evidence is hardcoded false",
      description: "The beta score cannot improve from targeted validator evidence because the score input always supplies false.",
      files: [scoreScriptPath],
      evidence: ["score input contains hasTargetedBehaviorEvidence: false"],
      currentStatus: "hardcoded false",
      evidenceFileExists: false,
      scoreReadsIt: true,
      scoreTrustsItCorrectly: false,
      scoreGateAffected: "targetedBehaviorTests",
      recommendedFix: "Add a local evidence contract for focused validators and require freshness/schema validation before awarding credit.",
    });
  }

  if (includesAll(scoreScript, [
    "function hasProviderSmokeEvidence",
    "agent/state/final-launch-readiness-report.generated.json",
    "normalizedSource.includes",
  ])) {
    findings.push({
      findingKey: "provider-smoke-derived-from-final-report-text",
      severity: "P1",
      title: "Provider smoke is derived from launch report text parsing",
      description: "Provider smoke status should come from formal provider/runtime evidence artifacts, not inverted string matching in the final launch report.",
      files: [scoreScriptPath, "agent/state/final-launch-readiness-report.generated.json"],
      evidence: ["hasProviderSmokeEvidence reads final-launch-readiness-report and searches for missing-smoke phrases."],
      currentStatus: "string-derived smoke gate",
      evidenceFileExists: fileExists(root, "agent/state/final-launch-readiness-report.generated.json"),
      scoreReadsIt: true,
      scoreTrustsItCorrectly: false,
      scoreGateAffected: "runtimeProviderSmoke",
      recommendedFix: "Make provider smoke an explicit schema-driven input that can represent missing, operator-reported, failed, and passed states.",
    });
  }

  if (includesAll(scoreScript, ["VISUAL_EVIDENCE_FILES", "fileExists(root, filePath)"])) {
    findings.push({
      findingKey: "visual-evidence-file-existence-only",
      severity: "P2",
      title: "Visual evidence is based on file existence only",
      description: "A visual/manual evidence file can unlock the visual gate without schema, timestamp, route, viewport, or result validation.",
      files: [scoreScriptPath],
      evidence: ["VISUAL_EVIDENCE_FILES.some(filePath => fileExists(root, filePath))"],
      currentStatus: "file-existence gate",
      evidenceFileExists: false,
      scoreReadsIt: true,
      scoreTrustsItCorrectly: false,
      scoreGateAffected: "retired_ui_score_gate",
      recommendedFix: "Use deterministic UI source coverage first; route screenshots only to optional reproduction evidence.",
    });
  }

  if (scoreScript.includes("hasAdminTruthSampleEvidence: Object.values(debugEvidence).some")) {
    findings.push({
      findingKey: "admin-truth-sample-derived-from-debug-entries",
      severity: "P1",
      title: "Admin truth sample scoring is derived from debug entries",
      description: "Debug evidence presence is not the same as a fresh admin truth sample with source freshness and sample count.",
      files: [scoreScriptPath, "agent/state/admin-truth-sample-evidence.generated.json"],
      evidence: ["score input uses Object.values(debugEvidence).some(entries => entries.length > 0)"],
      currentStatus: "debug-entry-derived",
      evidenceFileExists: fileExists(root, "agent/state/admin-truth-sample-evidence.generated.json"),
      scoreReadsIt: false,
      scoreTrustsItCorrectly: false,
      scoreGateAffected: "adminTruthSamples",
      recommendedFix: "Read admin-truth-sample-evidence.generated.json and preserve missing_or_unknown as non-passing evidence.",
    });
  }

  return findings;
}

function buildScoreMathFindings(root: string, nowMs: number) {
  const corePath = "src/lib/agent-score/core.ts";
  const weightsPath = "src/lib/agent-score/weights.ts";
  const scoreReportPath = "agent/state/public-beta-score.generated.json";
  const core = readText(root, corePath);
  const scoreReport = readJson(root, scoreReportPath);
  const findings: TriageFinding[] = [];

  if (scoreReport.readinessStatus === "Stale evidence" && scoreReport.overallScore === 25) {
    findings.push({
      findingKey: "score-stuck-at-source-safety-only",
      severity: "P1",
      title: "Score remains at source-safety-only despite formal tracking artifacts",
      description: "The score is 25/100 because only the source safety gate scores; formal evidence tracking exists but is not modeled as gate input.",
      files: [scoreReportPath, "agent/state/provider-smoke-evidence.generated.json", "agent/state/runtime-smoke-evidence.generated.json", "agent/state/admin-truth-sample-evidence.generated.json"],
      evidence: [
        `overallScore=${scoreReport.overallScore}`,
        `readinessStatus=${scoreReport.readinessStatus}`,
        `evidenceScore=${scoreReport.evidenceScore}`,
      ],
      currentStatus: "25/100 source safety only",
      recommendedFix: "Keep missing evidence non-passing, but ingest formal artifact statuses so operators can see which gates are tracked, missing, operator-reported, or passed.",
    });
  }

  const staleFinal = fileAgeHours(root, "agent/state/final-launch-readiness-report.generated.json", nowMs);
  if (core.includes("PUBLIC_BETA_REQUIRED_REPORT_STALE_HOURS") || staleFinal !== null) {
    findings.push({
      findingKey: "stale-report-cap-has-no-independent-refresh-lane",
      severity: "P1",
      title: "Stale launch/PR reports cap readiness without an independent freshness lane",
      description: "A stale required generated report can dominate readiness even after narrower evidence artifacts are refreshed.",
      files: [corePath, weightsPath, "agent/state/final-launch-readiness-report.generated.json", "agent/state/launch-pr-triage.generated.json"],
      evidence: [
        `final launch report ageHours=${staleFinal === null ? "missing" : staleFinal.toFixed(1)}`,
        "freshnessIntegrity status outranks unknown/visual/smoke gates through mostSevereReadinessStatus.",
      ],
      currentStatus: "stale evidence cap active",
      recommendedFix: "Add a focused launch/PR freshness refresh path or make the score reason expose stale reports as one cap among multiple blockers.",
    });
  }

  if (core.includes("gates.find((gate) => gate.status === readinessStatus)?.detail")) {
    findings.push({
      findingKey: "readiness-status-reason-only-shows-one-cap",
      severity: "P2",
      title: "Readiness status reason reports only one cap",
      description: "The public beta score has several active caps, but readinessStatusReason selects a single gate detail.",
      files: [corePath],
      evidence: ["readinessStatusReason uses gates.find(...) for the most severe status."],
      currentStatus: "single cap reason",
      recommendedFix: "Expose all active cap reasons in the report and keep the single status as a summary only.",
    });
  }

  if (core.includes("boolean") && core.includes("hasProviderSmokeEvidence?: boolean")) {
    findings.push({
      findingKey: "evidence-gates-are-mostly-boolean",
      severity: "P2",
      title: "Evidence gates are booleans instead of status enums",
      description: "The score cannot distinguish missing, operator-reported, failed, stale, and passed formal evidence for several gates.",
      files: [corePath],
      evidence: ["PublicBetaEvidenceInput uses boolean fields for targeted, visual, provider, and admin truth evidence."],
      currentStatus: "boolean evidence gates",
      recommendedFix: "Introduce schema-backed status inputs while keeping only real evidence eligible for score credit.",
    });
  }

  return findings;
}

function buildUiConnectionFindings(root: string) {
  const controlTowerPath = "src/lib/admin-debug-control-tower.ts";
  const controlTower = readText(root, controlTowerPath);
  const debugControlTowerComponentPath = "src/app/admin/debug/components/DebugControlTower.tsx";
  const debugControlTowerComponent = readText(root, debugControlTowerComponentPath);
  const findings: TriageFinding[] = [];

  if (includesAll(controlTower, [
    "const scoreValues = reports",
    ".filter((report) => report.required",
    "scoreValues.reduce",
  ])) {
    findings.push({
      findingKey: "control-tower-score-is-report-average-not-public-beta-score",
      severity: "P1",
      title: "Admin Debug Control Tower displays an aggregate score instead of the canonical public beta score",
      description: "The Control Tower reads public-beta-score.generated.json, but its visible overallScore is an average of required report scores.",
      files: [controlTowerPath, debugControlTowerComponentPath, "agent/state/public-beta-score.generated.json"],
      evidence: ["overallScore is computed from required report scoreValues, while the component renders model.overallScore."],
      currentStatus: "connected to generated reports but not canonical beta score",
      recommendedFix: "Show the canonical public beta score and cap reason separately from any Control Tower aggregate score.",
    });
  }

  if (!controlTower.includes("currentHead") && controlTower.includes("generatedAt ?? raw.generated_at")) {
    findings.push({
      findingKey: "control-tower-freshness-does-not-check-current-head",
      severity: "P2",
      title: "Admin Debug report freshness does not validate currentHead",
      description: "Generated report cards are aged by generatedAt or file mtime, but source commit/currentHead drift is not represented.",
      files: [controlTowerPath],
      evidence: ["readGeneratedReport reads generatedAt and mtime, but does not compare currentHead/sourceCommit."],
      currentStatus: "timestamp-only freshness",
      recommendedFix: "Add currentHead/sourceCommit mismatch handling for generated report cards.",
    });
  }

  if (debugControlTowerComponent.includes("model?.overallScore ?? \"--\"") && !debugControlTowerComponent.includes("readinessStatusReason")) {
    findings.push({
      findingKey: "control-tower-score-cap-reason-not-visible",
      severity: "P2",
      title: "Admin Debug score display does not show why the beta score is capped",
      description: "The primary score display shows a number and stale/missing counts, but not the public beta readinessStatusReason.",
      files: [debugControlTowerComponentPath],
      evidence: ["DebugControlTower renders model.overallScore and report counts, not readinessStatusReason."],
      currentStatus: "cap reason indirect",
      recommendedFix: "Surface the public beta score cap reason from the canonical report without adding new broad panels.",
    });
  }

  return findings;
}

function buildWatchTimeFindings(root: string) {
  const rollupPath = "src/lib/server/watch-time-rollup.ts";
  const metricsPath = "src/lib/server/admin-user-metrics-snapshot.ts";
  const metricsTestPath = "tests/unit/admin-user-metrics.spec.ts";
  const rollup = readText(root, rollupPath);
  const metrics = readText(root, metricsPath);
  const metricsTest = readText(root, metricsTestPath);
  const findings: TriageFinding[] = [];

  if (rollup.includes("diagnosticEstimate") && rollup.includes("watchTimeMs = legacyPageDurationMs")) {
    findings.push({
      findingKey: "watch-time-contract-canonical-but-needs-ui-lock",
      severity: "P2",
      title: "Watch-time rollup contract is canonical, but UI locks need to enforce it",
      description: "The rollup keeps diagnostic estimates out of watchTimeMs unless legacy fallback is explicitly allowed; UI validators still need to prove every panel preserves that distinction.",
      files: [rollupPath, "src/lib/watch-time-rollup-contract.ts"],
      evidence: ["source=watch_session_rollup is canonical; legacy_page_duration is a labeled fallback; diagnostic_estimate does not count as verified watch time."],
      currentStatus: "contract present, UI-wide enforcement incomplete",
      recommendedFix: "Add an Admin UI/source validator that forbids diagnostic estimates or legacy duration from rendering as canonical watch time.",
    });
  }

  if (includesAll(metrics, ["viewerOpenMs: analytics.reduce", "pageDurationMs: analytics.reduce", "watchSecondsTotal"])) {
    findings.push({
      findingKey: "admin-user-metrics-feeds-legacy-watch-seconds-into-diagnostics",
      severity: "P2",
      title: "Admin user metrics still feeds legacy watchSecondsTotal into diagnostics",
      description: "Legacy aggregate watchSecondsTotal is passed as viewer/page duration context. It is diagnostics-only today, but this path needs a validator lock.",
      files: [metricsPath],
      evidence: ["viewerOpenMs and pageDurationMs are derived from analytics.watchSecondsTotal."],
      currentStatus: "diagnostic-only but fragile",
      recommendedFix: "Keep watchSecondsTotal labeled as diagnostics or legacy context and ensure it cannot populate validWatchTimeMs without valid sessions.",
    });
  }

  if (metricsTest.includes("watchTimeMs: 90_000")) {
    findings.push({
      findingKey: "admin-user-metrics-test-expects-legacy-watch-seconds-as-watch-time",
      severity: "P1",
      title: "Admin user metrics test expects legacy watchSecondsTotal as canonical watch time",
      description: "A unit test still expects watchTimeMs from analytics watchSecondsTotal even when no valid watch sessions are supplied.",
      files: [metricsTestPath, metricsPath, rollupPath],
      evidence: ["tests/unit/admin-user-metrics.spec.ts expects watchTimeMs: 90_000 in a fixture without watchSessionsByUser."],
      currentStatus: "test contract conflicts with watch-session rollup doctrine",
      recommendedFix: "Realign the test and any dependent UI copy so nonzero canonical watch time requires valid watch sessions or labeled legacy fallback.",
    });
  }

  return findings;
}

function buildAdminDashboardFindings(root: string) {
  const tabNowPath = "src/app/admin/debug/components/DebugTabNow.tsx";
  const runtimeEvidencePath = "src/app/admin/debug/components/DebugRuntimeEvidenceGroups.tsx";
  const controlTowerPath = "src/lib/admin-debug-control-tower.ts";
  const tabNow = readText(root, tabNowPath);
  const runtimeEvidence = readText(root, runtimeEvidencePath);
  const controlTower = readText(root, controlTowerPath);
  const findings: TriageFinding[] = [];

  if (includesAll(tabNow, [
    "<DebugControlTower",
    "title=\"System health now\"",
    "<DebugRecoveryEvidenceSummary",
    "<DebugCreatorLane",
    "<DebugNowDiagnostics",
  ])) {
    findings.push({
      findingKey: "debug-now-still-stacks-control-tower-health-recovery-creator-diagnostics",
      severity: "P2",
      title: "Admin Debug Now still stacks several truth panels in one view",
      description: "The panel was reduced, but it still renders Control Tower, System Health, Recovery, Creator Lane, and Diagnostics together.",
      files: [tabNowPath],
      evidence: ["DebugTabNow renders Control Tower, System health now, Recovery Evidence, Creator Lane, and Now Diagnostics."],
      currentStatus: "clutter reduced but still dense",
      recommendedFix: "Keep Control Tower and compact summaries open; collapse System Health detail, Creator Lane detail, and diagnostics by default.",
    });
  }

  if (includesAll(controlTower, [
    "sections.beta_readiness.push(report)",
    "report.id === \"device-ui-dry-audit\"",
    "report.id === \"telemetry-parity\"",
  ])) {
    findings.push({
      findingKey: "control-tower-duplicates-reports-across-sections",
      severity: "P2",
      title: "Control Tower duplicates generated reports across sections",
      description: "Several report cards are pushed into beta readiness and their native sections, which increases repeated truth panels.",
      files: [controlTowerPath],
      evidence: ["buildSections duplicates device, content, cost, and telemetry reports into beta_readiness."],
      currentStatus: "intentional duplication but clutter risk",
      recommendedFix: "Keep a single primary placement and use section summary pills for cross-surface relevance.",
    });
  }

  if (runtimeEvidence.includes("data-admin-debug-recovery-summary-compact=\"true\"")
    && runtimeEvidence.includes("data-admin-debug-recovery-details-default=\"collapsed\"")) {
    findings.push({
      findingKey: "recovery-panel-compact-contract-present",
      severity: "P2",
      title: "Recovery evidence is compact but still needs validator coverage in this triage lane",
      description: "The compact recovery contract exists; this triage should lock it so future evidence additions do not reopen the panel by default.",
      files: [runtimeEvidencePath],
      evidence: ["Recovery evidence summary has compact and collapsed default data markers."],
      currentStatus: "compact contract present",
      recommendedFix: "Keep the existing Admin Debug validator checking compact recovery defaults and no nested scroll in the summary.",
    });
  }

  return findings;
}

function buildCreatorDashboardFindings(root: string) {
  const hubPath = "src/components/Creators/CreatorDashboardSettingsHub.tsx";
  const routePath = "src/app/api/creator/settings/route.ts";
  const routeTestPath = "tests/unit/creator-settings-route.spec.ts";
  const hub = readText(root, hubPath);
  const route = readText(root, routePath);
  const routeTest = readText(root, routeTestPath);
  const findings: TriageFinding[] = [];

  if (hub.includes('state: stats ? "live" : "unavailable"') && !route.includes("sourceFreshness")) {
    findings.push({
      findingKey: "creator-dashboard-stats-can-render-live-without-source-samples",
      severity: "P0",
      title: "Creator dashboard stats can render live without source sample metadata",
      description: "The creator settings API returns a stats object without source freshness/sample metadata, while the UI marks earnings and audience live whenever stats exists.",
      files: [hubPath, routePath],
      evidence: [
        "CreatorDashboardSettingsHub uses state: stats ? \"live\" : \"unavailable\" for earnings/audience sections.",
        "/api/creator/settings returns stats counts without sourceFreshness, sampleCount, or unavailable reason fields.",
      ],
      currentStatus: "fake-live risk when aggregate counts are zero or missing",
      recommendedFix: "Add source/sample metadata to the creator settings response and map zero/missing stats to unavailable or needs_review until samples exist.",
    });
  }

  if ((hub.match(/href: "\/dashboard\/creator"/gu) ?? []).length >= 4) {
    findings.push({
      findingKey: "creator-dashboard-section-links-self-loop",
      severity: "P1",
      title: "Creator dashboard section links loop back to the same dashboard route",
      description: "Several operational sections expose an Open section link that points to /dashboard/creator instead of a dedicated connected destination.",
      files: [hubPath],
      evidence: [`/dashboard/creator href count=${(hub.match(/href: "\/dashboard\/creator"/gu) ?? []).length}`],
      currentStatus: "self-loop links",
      recommendedFix: "Either route each section to a real connected destination or remove the Open section link for inline-only sections.",
    });
  }

  if (!routeTest.includes("GET")) {
    findings.push({
      findingKey: "creator-settings-get-route-lacks-focused-unit-test",
      severity: "P2",
      title: "Creator settings GET route lacks a focused unit test",
      description: "The route test covers PUT ownership/projection behavior, but not GET stats shape, projection payload, or source metadata.",
      files: [routePath, routeTestPath],
      evidence: ["tests/unit/creator-settings-route.spec.ts imports and exercises PUT only."],
      currentStatus: "GET path validator gap",
      recommendedFix: "Add GET tests before changing creator dashboard stats semantics.",
    });
  }

  return findings;
}

export function buildPhaseOneScoreUiTriageReport(options?: {
  root?: string;
  now?: Date;
}): PhaseOneScoreUiTriageReport {
  const root = options?.root ?? process.cwd();
  const now = options?.now ?? new Date();
  const nowMs = now.getTime();
  const scoreIngestionFindings = buildScoreIngestionFindings(root);
  const scoreMathFindings = buildScoreMathFindings(root, nowMs);
  const uiConnectionFindings = buildUiConnectionFindings(root);
  const watchTimeFindings = buildWatchTimeFindings(root);
  const adminDashboardFindings = buildAdminDashboardFindings(root);
  const creatorDashboardFindings = buildCreatorDashboardFindings(root);
  const allGroups = [
    scoreIngestionFindings,
    scoreMathFindings,
    uiConnectionFindings,
    watchTimeFindings,
    adminDashboardFindings,
    creatorDashboardFindings,
  ];

  return {
    generatedAtUtc: now.toISOString(),
    reportKey: "phase-one-score-ui-triage",
    currentHead: readCurrentHead(root),
    summary: {
      scoreIngestionIssues: scoreIngestionFindings.length,
      scoreMathIssues: scoreMathFindings.length,
      uiConnectionIssues: uiConnectionFindings.length,
      watchTimeIssues: watchTimeFindings.length,
      adminDashboardIssues: adminDashboardFindings.length,
      creatorDashboardIssues: creatorDashboardFindings.length,
      p0Count: countSeverity(allGroups, "P0"),
      p1Count: countSeverity(allGroups, "P1"),
      p2Count: countSeverity(allGroups, "P2"),
    },
    scoreIngestionFindings,
    scoreMathFindings,
    uiConnectionFindings,
    watchTimeFindings,
    adminDashboardFindings,
    creatorDashboardFindings,
    recommendedFixOrder: [
      {
        stepKey: "score-evidence-ingestion",
        severity: "P1",
        title: "Wire formal smoke/admin truth evidence artifacts into public beta scoring",
        targetFiles: [
          "scripts/agent/score-public-beta-readiness.ts",
          "src/lib/agent-score/core.ts",
          "src/lib/agent-score/reporting.ts",
          "tests/unit/public-beta-score.spec.ts",
        ],
        validators: [
          "npm run score:beta",
          "npm run check:beta-score",
          "npm run check:provider-smoke-evidence",
          "npm run check:runtime-smoke-evidence",
          "npm run check:admin-truth-sample-evidence",
        ],
        rationale: "This explains why the score remains 25/100 after formal tracking artifacts were added.",
      },
      {
        stepKey: "creator-dashboard-source-sample-contract",
        severity: "P0",
        title: "Add creator dashboard source/sample metadata before showing stats as live",
        targetFiles: [
          "src/app/api/creator/settings/route.ts",
          "src/components/Creators/CreatorDashboardSettingsHub.tsx",
          "tests/unit/creator-settings-route.spec.ts",
          "tests/unit/creator-dashboard-settings.spec.tsx",
        ],
        validators: [
          "npm run check:settings-creator-dashboard-split",
          "npx vitest run tests/unit/creator-settings-route.spec.ts tests/unit/creator-dashboard-settings.spec.tsx",
          "npm run typecheck",
        ],
        rationale: "This is the clearest UI truth risk: stats can be live without source sample proof.",
      },
      {
        stepKey: "admin-debug-beta-score-connection",
        severity: "P1",
        title: "Show canonical public beta score and cap reason in Admin Debug",
        targetFiles: [
          "src/lib/admin-debug-control-tower.ts",
          "src/app/admin/debug/components/DebugControlTower.tsx",
          "tests/unit/admin-debug-control-tower.spec.ts",
        ],
        validators: [
          "npm run check:admin-debug-control-tower",
          "npm run check:admin-truth",
          "npm run typecheck",
        ],
        rationale: "The current Control Tower score can drift from public-beta-score.generated.json.",
      },
      {
        stepKey: "watch-time-contract-lock",
        severity: "P1",
        title: "Realign admin user metrics tests with watch-session rollup truth",
        targetFiles: [
          "src/lib/server/admin-user-metrics-snapshot.ts",
          "tests/unit/admin-user-metrics.spec.ts",
          "tests/unit/watch-time-rollup.spec.ts",
        ],
        validators: [
          "npm run check:watch-time-rollup-truth",
          "npx vitest run tests/unit/watch-time-rollup.spec.ts tests/unit/admin-user-metrics.spec.ts",
          "npm run typecheck",
        ],
        rationale: "Tests still encode legacy watchSecondsTotal as canonical watch time in one fixture.",
      },
      {
        stepKey: "admin-dashboard-scope-followup",
        severity: "P2",
        title: "Collapse repeated Admin Debug truth panels without changing data behavior",
        targetFiles: [
          "src/app/admin/debug/components/DebugTabNow.tsx",
          "src/lib/admin-debug-control-tower.ts",
          "tests/unit/admin-debug-control-tower.spec.ts",
        ],
        validators: [
          "npm run check:admin-debug-control-tower",
          "npm run check:admin-truth",
          "npm run typecheck",
        ],
        rationale: "This is clutter and operator comprehension work after the truth defects are locked.",
      },
    ],
    nextPromptRecommendation: [
      "CODE MODE. Execute Phase 1 Score Evidence Ingestion Fix.",
      "Goal: update the public beta score to read provider-smoke-evidence, runtime-smoke-evidence, and admin-truth-sample-evidence artifacts as schema-backed evidence states without marking missing/operator-reported evidence as passed.",
      "Scope: score-public-beta-readiness.ts, agent-score core/reporting/tests, public-beta-score docs/state only. No runtime UI changes, no provider calls, no production reads.",
      "Required checks: npm run score:beta, npm run check:beta-score, npm run check:provider-smoke-evidence, npm run check:runtime-smoke-evidence, npm run check:admin-truth-sample-evidence, npm run typecheck.",
    ].join("\n"),
  };
}

function validateFinding(finding: TriageFinding, label: string, failures: string[]) {
  for (const key of ["findingKey", "severity", "title", "description", "currentStatus", "recommendedFix"] as const) {
    if (typeof finding[key] !== "string" || finding[key].trim().length === 0) {
      failures.push(`${label}.${key} must be a non-empty string.`);
    }
  }
  if (!["P0", "P1", "P2"].includes(finding.severity)) {
    failures.push(`${label}.severity must be P0, P1, or P2.`);
  }
  if (!Array.isArray(finding.files) || finding.files.length === 0) {
    failures.push(`${label}.files must be a non-empty array.`);
  }
  if (!Array.isArray(finding.evidence) || finding.evidence.length === 0) {
    failures.push(`${label}.evidence must be a non-empty array.`);
  }
}

export function validatePhaseOneScoreUiTriageReport(report: PhaseOneScoreUiTriageReport) {
  const failures: string[] = [];
  if (report.reportKey !== "phase-one-score-ui-triage") failures.push("reportKey must be phase-one-score-ui-triage.");
  if (typeof report.generatedAtUtc !== "string" || Number.isNaN(Date.parse(report.generatedAtUtc))) {
    failures.push("generatedAtUtc must be an ISO timestamp.");
  }
  if (typeof report.currentHead !== "string" || report.currentHead.length === 0) {
    failures.push("currentHead must be present.");
  }
  const sections = [
    report.scoreIngestionFindings,
    report.scoreMathFindings,
    report.uiConnectionFindings,
    report.watchTimeFindings,
    report.adminDashboardFindings,
    report.creatorDashboardFindings,
  ];
  const summaryKeys = [
    "scoreIngestionIssues",
    "scoreMathIssues",
    "uiConnectionIssues",
    "watchTimeIssues",
    "adminDashboardIssues",
    "creatorDashboardIssues",
    "p0Count",
    "p1Count",
    "p2Count",
  ] as const;
  for (const key of summaryKeys) {
    if (typeof report.summary[key] !== "number" || report.summary[key] < 0) {
      failures.push(`summary.${key} must be a non-negative number.`);
    }
  }
  sections.forEach((section, sectionIndex) => {
    if (!Array.isArray(section)) {
      failures.push(`findings section ${sectionIndex} must be an array.`);
      return;
    }
    section.forEach((finding, findingIndex) => validateFinding(finding, `section${sectionIndex}[${findingIndex}]`, failures));
  });
  report.scoreIngestionFindings.forEach((finding, index) => {
    if (typeof finding.evidenceFileExists !== "boolean") failures.push(`scoreIngestionFindings[${index}].evidenceFileExists must be boolean.`);
    if (typeof finding.scoreReadsIt !== "boolean") failures.push(`scoreIngestionFindings[${index}].scoreReadsIt must be boolean.`);
    if (typeof finding.scoreTrustsItCorrectly !== "boolean") failures.push(`scoreIngestionFindings[${index}].scoreTrustsItCorrectly must be boolean.`);
    if (typeof finding.scoreGateAffected !== "string" || finding.scoreGateAffected.length === 0) {
      failures.push(`scoreIngestionFindings[${index}].scoreGateAffected must be present.`);
    }
  });
  const allFindings = sections.flat();
  if (report.summary.p0Count !== allFindings.filter((finding) => finding.severity === "P0").length) {
    failures.push("summary.p0Count must match findings.");
  }
  if (report.summary.p1Count !== allFindings.filter((finding) => finding.severity === "P1").length) {
    failures.push("summary.p1Count must match findings.");
  }
  if (report.summary.p2Count !== allFindings.filter((finding) => finding.severity === "P2").length) {
    failures.push("summary.p2Count must match findings.");
  }
  if (!Array.isArray(report.recommendedFixOrder) || report.recommendedFixOrder.length === 0) {
    failures.push("recommendedFixOrder must be non-empty.");
  }
  if (!report.recommendedFixOrder.some((step) => step.stepKey === "score-evidence-ingestion")) {
    failures.push("recommendedFixOrder must include score-evidence-ingestion.");
  }
  if (!report.creatorDashboardFindings.some((finding) => finding.findingKey === "creator-dashboard-stats-can-render-live-without-source-samples")) {
    failures.push("creator dashboard fake-live risk must be represented.");
  }
  if (!report.nextPromptRecommendation.includes("Phase 1 Score Evidence Ingestion Fix")) {
    failures.push("nextPromptRecommendation must include the exact next score evidence ingestion prompt.");
  }
  return failures;
}

export function writePhaseOneScoreUiTriageReport(report: PhaseOneScoreUiTriageReport, root = process.cwd()) {
  const fullPath = join(root, REPORT_PATH);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, `${JSON.stringify(report, null, 2)}\n`);
  return fullPath;
}

function main() {
  const report = buildPhaseOneScoreUiTriageReport();
  const failures = validatePhaseOneScoreUiTriageReport(report);
  writePhaseOneScoreUiTriageReport(report);

  if (failures.length > 0) {
    console.error("Phase one score/UI triage validation failed:");
    failures.forEach((failure) => console.error(`- ${failure}`));
    process.exit(1);
  }

  console.log("Phase one score/UI triage validation passed.");
  console.log(`Report: ${REPORT_PATH}`);
  console.log(`Score ingestion issues: ${report.summary.scoreIngestionIssues}`);
  console.log(`Score math issues: ${report.summary.scoreMathIssues}`);
  console.log(`Watch-time issues: ${report.summary.watchTimeIssues}`);
  console.log(`Admin dashboard issues: ${report.summary.adminDashboardIssues}`);
  console.log(`Creator dashboard issues: ${report.summary.creatorDashboardIssues}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
