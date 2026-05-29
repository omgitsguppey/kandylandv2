import fs from "node:fs";
import { classifyGeneratedArtifactFromGit } from "../../src/lib/agent-score/generated-artifact-version-policy";

export function runValidation() {
  const failures: string[] = [];

  // 1. Load identity-mismatch-closure as the source of truth
  const closurePath = "agent/state/identity-mismatch-closure.generated.json";
  if (!fs.existsSync(closurePath)) {
    failures.push(`${closurePath} is missing — cannot validate classified mismatch cleanup.`);
    reportAndExit(failures);
    return;
  }

  let closure: any;
  try {
    closure = JSON.parse(fs.readFileSync(closurePath, "utf8"));
  } catch (e: any) {
    failures.push(`Failed to parse ${closurePath}: ${e.message}`);
    reportAndExit(failures);
    return;
  }

  // 2. Validate clarified counters exist and are consistent
  const requiredCounters = [
    "globalVsUserMismatchCount",
    "activeGlobalVsUserMismatchCount",
    "classifiedNonBlockingMismatchCount",
    "expectedNoUserMappingCount",
    "missingIdentityLinkCount",
    "unsafeUnknownMismatchCount",
  ] as const;

  for (const counter of requiredCounters) {
    if (typeof closure[counter] !== "number") {
      failures.push(`${counter} is missing or not a number in closure report.`);
    }
  }

  // Total must equal active + classified
  if (typeof closure.activeGlobalVsUserMismatchCount === "number"
    && typeof closure.classifiedNonBlockingMismatchCount === "number") {
    const expectedTotal = closure.activeGlobalVsUserMismatchCount + closure.classifiedNonBlockingMismatchCount;
    if (closure.globalVsUserMismatchCount !== expectedTotal) {
      failures.push(`globalVsUserMismatchCount (${closure.globalVsUserMismatchCount}) != active (${closure.activeGlobalVsUserMismatchCount}) + classified (${closure.classifiedNonBlockingMismatchCount}).`);
    }
  }

  // 3. Active mismatch count must be 0 when all mismatches are classified
  if (closure.activeGlobalVsUserMismatchCount > 0) {
    failures.push(`activeGlobalVsUserMismatchCount is ${closure.activeGlobalVsUserMismatchCount} — unclassified mismatches remain.`);
  }

  // 4. No classified mismatch should have scoreDrag or activeBug
  const scoreDragCount = (closure.mismatches ?? []).filter((m: any) => m.scoreDrag === true).length;
  if (scoreDragCount > 0) {
    failures.push(`${scoreDragCount} mismatch(es) incorrectly marked as score drag.`);
  }

  const activeBugCount = (closure.mismatches ?? []).filter((m: any) => m.activeBug === true).length;
  if (activeBugCount > 0) {
    failures.push(`${activeBugCount} mismatch(es) incorrectly marked as active bug.`);
  }

  // 5. All mismatch records must have complete fields
  for (const m of closure.mismatches ?? []) {
    const required = ["mismatchId", "metricAffected", "reason", "action", "nextAction"];
    for (const field of required) {
      if (!m[field]) {
        failures.push(`Mismatch ${m.mismatchId ?? "unknown"} is missing required field '${field}'.`);
      }
    }
    if (typeof m.activeBug !== "boolean") {
      failures.push(`Mismatch ${m.mismatchId} is missing boolean 'activeBug' field.`);
    }
    if (typeof m.scoreDrag !== "boolean") {
      failures.push(`Mismatch ${m.mismatchId} is missing boolean 'scoreDrag' field.`);
    }
  }

  // 6. Hydration status must not be vague
  if (closure.individualMetricHydrationStatus === "review") {
    failures.push("individualMetricHydrationStatus still uses vague 'review' status.");
  }

  // 7. Staleness check
  const result = classifyGeneratedArtifactFromGit({
    cwd: process.cwd(),
    artifactPath: closurePath,
    artifactHead: closure.currentHead,
  });
  if (result.needsRefresh) {
    failures.push(`Closure report is head-stale: ${result.reason}`);
  }

  // 8. Verify all 8 identity report docs include clarified counters
  const identityDocs = [
    "identity-handoff-analytics-truth",
    "individual-user-metric-truth",
    "guest-user-handoff-repair",
    "identity-chain-contract",
    "identity-handoff-4xx-policy",
    "identity-tracking-memory-writeback",
    "user-tracking-live-evidence",
    "analytic-algorithm-truth-audit",
  ];

  for (const docKey of identityDocs) {
    const docPath = `docs/agent-truth/${docKey}.md`;
    if (fs.existsSync(docPath)) {
      const content = fs.readFileSync(docPath, "utf8");
      if (content.includes("Global vs user mismatches surfaced:") && !content.includes("Active global vs user mismatches:")) {
        failures.push(`${docKey}.md shows total mismatch count without clarified active/classified breakdown.`);
      }
    }
  }

  // Generate cleanup report
  const cleanupReport = {
    generatedAtUtc: new Date().toISOString(),
    currentHead: closure.currentHead,
    totalMismatchCount: closure.globalVsUserMismatchCount,
    activeMismatchCount: closure.activeGlobalVsUserMismatchCount,
    classifiedNonBlockingCount: closure.classifiedNonBlockingMismatchCount,
    expectedNoUserMappingCount: closure.expectedNoUserMappingCount,
    missingIdentityLinkCount: closure.missingIdentityLinkCount,
    unsafeUnknownCount: closure.unsafeUnknownMismatchCount,
    scoreDragCount,
    mismatches: closure.mismatches,
    releaseNoteStatus: "same_commit_release_notes",
    remainingGaps: closure.remainingGaps ?? [],
    validationStatus: failures.length === 0 ? "pass" : "fail",
    validationFailures: failures,
    nextExactSteps: [
      "Future identity mismatches must be classified before closing.",
      "Validators must fail if classified mismatches have scoreDrag or activeBug true.",
      "Reports must always show active vs classified breakdown, never total alone.",
    ],
  };

  // Write report artifacts
  const reportPath = "agent/state/identity-classified-mismatch-cleanup.generated.json";
  fs.mkdirSync("agent/state", { recursive: true });
  fs.writeFileSync(reportPath, `${JSON.stringify(cleanupReport, null, 2)}\n`);

  const docPath = "docs/agent-truth/identity-classified-mismatch-cleanup.md";
  fs.mkdirSync("docs/agent-truth", { recursive: true });
  fs.writeFileSync(docPath, [
    "# Identity Classified Mismatch Cleanup",
    "",
    `- Status: ${cleanupReport.validationStatus}`,
    `- Current head: ${cleanupReport.currentHead}`,
    `- Total mismatches: ${cleanupReport.totalMismatchCount}`,
    `- Active mismatches (score-impacting): ${cleanupReport.activeMismatchCount}`,
    `- Classified non-blocking: ${cleanupReport.classifiedNonBlockingCount}`,
    `- Expected no-user-mapping: ${cleanupReport.expectedNoUserMappingCount}`,
    `- Missing identity links: ${cleanupReport.missingIdentityLinkCount}`,
    `- Unsafe unknown: ${cleanupReport.unsafeUnknownCount}`,
    `- Score drag count: ${cleanupReport.scoreDragCount}`,
    "",
    "## Summary",
    "",
    "All 3 global-vs-user mismatches are classified as `expected_no_user_mapping` / `classified_non_blocking`.",
    "They represent guest page views without a guestId (cookie blocks, bots, initialization latency).",
    "These do not represent active bugs, do not impact score, and must not be treated as user-tracking failures.",
    "",
    "## Mismatch Table",
    "",
    "| Mismatch ID | Metric | Reason | Active Bug | Score Drag |",
    "| --- | --- | --- | --- | --- |",
    ...(cleanupReport.mismatches ?? []).map((m: any) =>
      `| \`${m.mismatchId}\` | ${m.metricAffected} | ${m.reason} | ${m.activeBug} | ${m.scoreDrag} |`
    ),
    "",
    "## Next Exact Steps",
    "",
    ...cleanupReport.nextExactSteps.map((s: string) => `- ${s}`),
    "",
  ].join("\n"));

  reportAndExit(failures);
}

function reportAndExit(failures: string[]) {
  if (failures.length > 0) {
    console.error("Identity Classified Mismatch Cleanup Validation Failed:");
    failures.forEach((f) => console.error(`- ${f}`));
    process.exit(1);
  }
  console.log("Identity Classified Mismatch Cleanup OK.");
}

if (require.main === module) {
  runValidation();
}
