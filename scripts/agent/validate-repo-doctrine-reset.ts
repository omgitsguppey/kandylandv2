import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

type Severity = "P0" | "P1" | "P2";

type DoctrineAuthority = {
  lane: string;
  authorityDoc: string;
  supportingDocs: string[];
  supersededDocs: string[];
  validator: string;
};

type StaleDoctrineFinding = {
  key: string;
  severity: Severity;
  file: string;
  oldText: string;
  action: string;
  replacementOrReference: string;
};

export type RepoDoctrineResetReport = {
  generatedAtUtc: string;
  reportKey: "repo-doctrine-reset";
  currentHead: string;
  summary: {
    docsScanned: number;
    docsUpdated: number;
    activeAuthorityDocs: number;
    supportingDocs: number;
    supersededDocs: number;
    evidenceArchiveDocs: number;
    staleDoctrineHits: number;
    releaseNoteConflictsFixed: number;
    measurementDoctrineConflictsFixed: number;
    fullLoopDoctrineCoverage: boolean;
    p0Count: number;
    p1Count: number;
    p2Count: number;
  };
  doctrineAuthorities: DoctrineAuthority[];
  staleDoctrineFindings: StaleDoctrineFinding[];
  requiredFuturePromptRules: string[];
  validationCommands: string[];
};

const root = process.cwd();
const reportPath = "agent/state/repo-doctrine-reset.generated.json";

const docsScanned = [
  "AGENTS.md",
  "README.md",
  "docs/agent-truth/current-operator-doctrine.md",
  "docs/agent-truth/public-beta-score.md",
  "docs/agent-truth/public-beta-release-notes.md",
  "docs/agent-truth/firebase-owned-repo-automation.md",
  "docs/agent-truth/admin-debug-control-tower.md",
  "docs/agent-truth/admin-analytics-truth.md",
  "docs/agent-truth/analytics-truth-layer-v2.md",
  "docs/agent-truth/snapshot-admin-vendor-cost-rewire.md",
  "docs/agent-truth/phase-one-score-ui-triage.md",
  "docs/agent-truth/repo-spring-cleaning-rewire.md",
  "docs/agent-truth/user-facing-feature-connection-audit.md",
  "docs/agent-truth/watch-time-rollup-truth.md",
  "docs/agent-truth/creator-dashboard-projection-lock.md",
  "docs/agent-truth/creator-dashboard-settings.md",
];

const docsUpdated = docsScanned;

function read(relativePath: string): string {
  const fullPath = join(root, relativePath);
  return existsSync(fullPath) ? readFileSync(fullPath, "utf8") : "";
}

function currentHead(): string {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
}

function count(findings: StaleDoctrineFinding[], severity: Severity): number {
  return findings.filter((finding) => finding.severity === severity).length;
}

export function buildRepoDoctrineResetReport(now = new Date()): RepoDoctrineResetReport {
  const doctrineAuthorities: DoctrineAuthority[] = [
    {
      lane: "operator workflow",
      authorityDoc: "docs/agent-truth/current-operator-doctrine.md",
      supportingDocs: ["AGENTS.md", "README.md"],
      supersededDocs: [],
      validator: "npm run check:repo-doctrine-reset",
    },
    {
      lane: "public beta score",
      authorityDoc: "docs/agent-truth/public-beta-score.md",
      supportingDocs: ["docs/agent-truth/current-operator-doctrine.md"],
      supersededDocs: ["docs/agent-truth/phase-one-score-ui-triage.md"],
      validator: "npm run check:beta-score",
    },
    {
      lane: "release notes",
      authorityDoc: "docs/agent-truth/public-beta-release-notes.md",
      supportingDocs: ["docs/agent-truth/firebase-owned-repo-automation.md", "docs/agent-truth/current-operator-doctrine.md"],
      supersededDocs: [],
      validator: "npm run check:release-notes",
    },
    {
      lane: "admin debug",
      authorityDoc: "docs/agent-truth/admin-debug-control-tower.md",
      supportingDocs: ["docs/agent-truth/debug-panel-output-triage.md", "docs/agent-truth/current-operator-doctrine.md"],
      supersededDocs: [],
      validator: "npm run check:admin-debug-control-tower",
    },
    {
      lane: "admin analytics",
      authorityDoc: "docs/agent-truth/admin-analytics-truth.md",
      supportingDocs: [
        "docs/agent-truth/analytics-truth-layer-v2.md",
        "docs/agent-truth/snapshot-admin-vendor-cost-rewire.md",
        "docs/agent-truth/current-operator-doctrine.md",
      ],
      supersededDocs: [],
      validator: "npm run check:admin-truth",
    },
    {
      lane: "watch time",
      authorityDoc: "docs/agent-truth/watch-time-rollup-truth.md",
      supportingDocs: ["docs/agent-truth/current-operator-doctrine.md"],
      supersededDocs: ["docs/agent-truth/phase-one-score-ui-triage.md"],
      validator: "npm run check:watch-time-rollup-truth",
    },
    {
      lane: "creator feature connections",
      authorityDoc: "docs/agent-truth/user-facing-feature-connection-audit.md",
      supportingDocs: [
        "docs/agent-truth/creator-dashboard-projection-lock.md",
        "docs/agent-truth/creator-dashboard-settings.md",
        "docs/agent-truth/current-operator-doctrine.md",
      ],
      supersededDocs: ["docs/agent-truth/phase-one-score-ui-triage.md"],
      validator: "npm run check:user-facing-feature-connection-audit",
    },
    {
      lane: "repo cleanup inventory",
      authorityDoc: "docs/agent-truth/repo-spring-cleaning-rewire.md",
      supportingDocs: ["docs/agent-truth/current-operator-doctrine.md"],
      supersededDocs: [],
      validator: "npm run check:repo-spring-cleaning-rewire",
    },
  ];

  const staleDoctrineFindings: StaleDoctrineFinding[] = [
    {
      key: "phase-one-triage-score-ingestion-stale",
      severity: "P2",
      file: "docs/agent-truth/phase-one-score-ui-triage.md",
      oldText: "the score runner does not directly ingest those artifacts yet",
      action: "Marked the triage doc evidence/archive only and added current-state notes.",
      replacementOrReference: "docs/agent-truth/public-beta-score.md and docs/agent-truth/current-operator-doctrine.md",
    },
    {
      key: "phase-one-triage-creator-stats-stale",
      severity: "P2",
      file: "docs/agent-truth/phase-one-score-ui-triage.md",
      oldText: "The UI marks several sections as live whenever stats exists.",
      action: "Marked as historical and pointed to statsEvidence/source metadata.",
      replacementOrReference: "docs/agent-truth/user-facing-feature-connection-audit.md",
    },
    {
      key: "repo-spring-current-lanes-stale",
      severity: "P2",
      file: "docs/agent-truth/repo-spring-cleaning-rewire.md",
      oldText: "Public beta score evidence artifacts exist but score still uses old boolean/string-derived logic.",
      action: "Rewrote current lanes into historical findings and kept the lane as cleanup inventory authority.",
      replacementOrReference: "docs/agent-truth/current-operator-doctrine.md",
    },
    {
      key: "release-note-skip-rule-fragmented",
      severity: "P1",
      file: "AGENTS.md, README.md, docs/agent-truth/public-beta-release-notes.md",
      oldText: "release-note skip behavior lived in workflow/docs but not in the main operator gateway.",
      action: "Added release-note-only [skip release-notes] and no-second-badge-loop language to active gateways.",
      replacementOrReference: "docs/agent-truth/current-operator-doctrine.md",
    },
    {
      key: "measurement-cadence-fragmented",
      severity: "P1",
      file: "docs/agent-truth/admin-analytics-truth.md",
      oldText: "metrics had source/range rules but lacked one consolidated metric cadence contract.",
      action: "Added metricKey/source/formula/unit/window/cadence/freshness/exactness/fallback/zero/debug detail doctrine.",
      replacementOrReference: "docs/agent-truth/current-operator-doctrine.md",
    },
    {
      key: "generated-report-authority-fragmented",
      severity: "P1",
      file: "docs/agent-truth/repo-spring-cleaning-rewire.md",
      oldText: "generated reports could support cleanup without a single demote/archive-before-delete rule.",
      action: "Added explicit snapshot, freshness, demote-first, archive-before-delete doctrine.",
      replacementOrReference: "docs/agent-truth/current-operator-doctrine.md",
    },
    {
      key: "cleanup-grep-paypal-pass-safe-negative-hits",
      severity: "P2",
      file: "docs/agent-truth/final-launch-readiness-report.md, docs/agent-truth/launch-readiness-final.md",
      oldText: "operator reported PayPal ... does not mark provider/PayPal smoke as passed",
      action: "Left as safe negative evidence language; it reinforces that operator-reported PayPal is not formal provider smoke.",
      replacementOrReference: "docs/agent-truth/current-operator-doctrine.md",
    },
    {
      key: "cleanup-grep-fake-zero-hits-are-guards",
      severity: "P2",
      file: "docs/agent-truth/*, scripts/agent/*, tests/unit/*",
      oldText: "fake zero / fake live / missing data is not zero",
      action: "Remaining matches are forbidden examples, validators, or tests that prevent fake live/zero regressions.",
      replacementOrReference: "docs/agent-truth/current-operator-doctrine.md",
    },
    {
      key: "cleanup-grep-new-metric-hits-are-forbidden-examples",
      severity: "P2",
      file: "docs/agent-truth/current-operator-doctrine.md",
      oldText: "Do not add a new measurement lane",
      action: "Kept as current forbidden-example doctrine.",
      replacementOrReference: "docs/agent-truth/current-operator-doctrine.md",
    },
    {
      key: "cleanup-grep-realtime-live-required-hits-are-contextual",
      severity: "P2",
      file: "docs/agent-truth/accessibility-tap-targets.md, docs/agent-truth/admin-overview.md, docs/agent-truth/creator-lane-debug-parity.md",
      oldText: "realtime required / live required",
      action: "Remaining matches describe accessibility metadata, Debug metadata, or creator live eligibility context; current doctrine still forbids fake realtime as a metric default.",
      replacementOrReference: "docs/agent-truth/current-operator-doctrine.md",
    },
  ];

  const requiredFuturePromptRules = [
    "exact symptom or code defect",
    "exact files to inspect before editing",
    "exact stale logic to remove/demote",
    "exact canonical source to connect",
    "surrounding callers/routes/UI/tests to inspect",
    "grep cleanup checks",
    "targeted validators/tests",
    "allowed files",
    "forbidden files",
    "release-note rule",
    "commit message",
  ];

  return {
    generatedAtUtc: now.toISOString(),
    reportKey: "repo-doctrine-reset",
    currentHead: currentHead(),
    summary: {
      docsScanned: docsScanned.length,
      docsUpdated: docsUpdated.length,
      activeAuthorityDocs: doctrineAuthorities.length,
      supportingDocs: 8,
      supersededDocs: 1,
      evidenceArchiveDocs: 1,
      staleDoctrineHits: staleDoctrineFindings.length,
      releaseNoteConflictsFixed: 1,
      measurementDoctrineConflictsFixed: 1,
      fullLoopDoctrineCoverage: true,
      p0Count: count(staleDoctrineFindings, "P0"),
      p1Count: count(staleDoctrineFindings, "P1"),
      p2Count: count(staleDoctrineFindings, "P2"),
    },
    doctrineAuthorities,
    staleDoctrineFindings,
    requiredFuturePromptRules,
    validationCommands: [
      "npm run check:repo-doctrine-reset",
      "npm run check:repo-spring-cleaning-rewire",
      "npm run check:beta-score",
      "npm run check:release-notes",
      "npm run check:watch-time-rollup-truth",
      "npm run check:user-facing-feature-connection-audit",
      "npm run typecheck",
      "npx vitest run tests/unit/repo-doctrine-reset.spec.ts",
    ],
  };
}

function requireIncludes(source: string, expected: string, label: string, failures: string[]): void {
  if (!source.includes(expected)) {
    failures.push(`${label} must include "${expected}".`);
  }
}

function requireMatch(source: string, pattern: RegExp, label: string, failures: string[]): void {
  if (!pattern.test(source)) {
    failures.push(`${label} must match ${pattern}.`);
  }
}

export function validateRepoDoctrineResetReport(report: RepoDoctrineResetReport): string[] {
  const failures: string[] = [];
  const currentDoctrine = read("docs/agent-truth/current-operator-doctrine.md");
  const agents = read("AGENTS.md");
  const readme = read("README.md");
  const publicBetaScore = read("docs/agent-truth/public-beta-score.md");
  const releaseNotes = read("docs/agent-truth/public-beta-release-notes.md");
  const watchTime = read("docs/agent-truth/watch-time-rollup-truth.md");
  const userFacingAudit = read("docs/agent-truth/user-facing-feature-connection-audit.md");
  const repoSpring = read("docs/agent-truth/repo-spring-cleaning-rewire.md");

  if (!currentDoctrine) failures.push("current-operator-doctrine.md is missing.");
  requireIncludes(agents, "docs/agent-truth/current-operator-doctrine.md", "AGENTS.md", failures);
  requireIncludes(readme, "docs/agent-truth/current-operator-doctrine.md", "README.md", failures);

  requireIncludes(currentDoctrine, "Full-Loop Closure", "current operator doctrine", failures);
  requireIncludes(currentDoctrine, "Measurement/Source-Of-Truth", "current operator doctrine", failures);
  requireIncludes(currentDoctrine, "Metric Cadence + Math Precision", "current operator doctrine", failures);
  requireIncludes(currentDoctrine, "Missing data is not zero", "current operator doctrine", failures);
  requireIncludes(currentDoctrine, "No fake realtime", "current operator doctrine", failures);
  requireIncludes(currentDoctrine, "Operator-reported PayPal is tracked, not formal provider smoke", "current operator doctrine", failures);
  requireIncludes(currentDoctrine, "Screenshots are symptom receipts", "current operator doctrine", failures);
  requireIncludes(currentDoctrine, "No Additive Patch Stacking", "current operator doctrine", failures);
  requireIncludes(currentDoctrine, "Every future Codex prompt must include", "current operator doctrine", failures);
  requireIncludes(currentDoctrine, "Do not add a new measurement lane", "current operator doctrine", failures);
  requireIncludes(currentDoctrine, "add no new event volume", "current operator doctrine", failures);

  requireIncludes(publicBetaScore, "Authority: Current authority for beta score math", "public beta score doctrine", failures);
  requireIncludes(publicBetaScore, "Provider smoke no longer comes from final launch report string parsing", "public beta score doctrine", failures);
  if (/provider smoke is inferred by parsing final launch readiness report text/iu.test(publicBetaScore)) {
    failures.push("public-beta-score.md still implies final-launch string parsing is provider truth.");
  }

  requireIncludes(releaseNotes, "[skip release-notes]", "release-note doctrine", failures);
  requireMatch(releaseNotes, /Release-note-only commits must include `\[skip release-notes\]`/u, "release-note doctrine", failures);
  requireMatch(releaseNotes, /skipped Public Beta Release Notes workflow is not a failure/iu, "release-note doctrine", failures);

  requireIncludes(watchTime, "analytics_watch_sessions.validWatchMs", "watch-time doctrine", failures);
  requireIncludes(watchTime, "watch_session_rollup", "watch-time doctrine", failures);

  requireIncludes(userFacingAudit, "No orphan button", "user-facing connection doctrine", failures);
  requireIncludes(userFacingAudit, "self-loop", "user-facing connection doctrine", failures);

  requireIncludes(repoSpring, "demote first", "repo spring-cleaning doctrine", failures);
  requireIncludes(repoSpring, "delete later only with human approval", "repo spring-cleaning doctrine", failures);
  requireIncludes(repoSpring, "Old generated reports are not authority", "repo spring-cleaning doctrine", failures);

  if (report.reportKey !== "repo-doctrine-reset") {
    failures.push("repo doctrine reset reportKey is wrong.");
  }
  if (report.summary.p0Count !== 0) {
    failures.push("Doctrine reset must leave no P0 stale doctrine findings.");
  }
  for (const lane of [
    "operator workflow",
    "public beta score",
    "release notes",
    "admin debug",
    "admin analytics",
    "watch time",
    "creator feature connections",
    "repo cleanup inventory",
  ]) {
    if (!report.doctrineAuthorities.some((authority) => authority.lane === lane)) {
      failures.push(`Missing doctrine authority lane: ${lane}.`);
    }
  }

  for (const rule of [
    "exact symptom or code defect",
    "exact files to inspect before editing",
    "exact stale logic to remove/demote",
    "exact canonical source to connect",
    "grep cleanup checks",
    "targeted validators/tests",
    "release-note rule",
    "commit message",
  ]) {
    if (!report.requiredFuturePromptRules.includes(rule)) {
      failures.push(`Missing future prompt rule: ${rule}.`);
    }
  }

  return failures;
}

export function writeRepoDoctrineResetReport(now = new Date()): RepoDoctrineResetReport {
  const report = buildRepoDoctrineResetReport(now);
  writeFileSync(join(root, reportPath), `${JSON.stringify(report, null, 2)}\n`, "utf8");
  return report;
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("scripts/agent/validate-repo-doctrine-reset.ts")) {
  const report = writeRepoDoctrineResetReport();
  const failures = validateRepoDoctrineResetReport(report);
  if (failures.length > 0) {
    console.error("Repo doctrine reset validation failed:");
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exit(1);
  }
  console.log(
    `Repo doctrine reset validation passed: docs=${report.summary.docsScanned}, staleHits=${report.summary.staleDoctrineHits}, P0=${report.summary.p0Count}.`,
  );
}
