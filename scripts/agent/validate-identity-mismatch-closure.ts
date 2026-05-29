import fs from "node:fs";
import { classifyGeneratedArtifactFromGit } from "../../src/lib/agent-score/generated-artifact-version-policy";

export function runValidation() {
  const failures: string[] = [];

  // 1. Check identity-mismatch-closure report
  const closurePath = "agent/state/identity-mismatch-closure.generated.json";
  if (!fs.existsSync(closurePath)) {
    failures.push(`${closurePath} is missing.`);
  } else {
    try {
      const data = JSON.parse(fs.readFileSync(closurePath, "utf8"));
      
      if (data.individualMetricHydrationStatus === "review") {
        failures.push("individualMetricHydrationStatus remains vague 'review' in mismatch closure.");
      }

      if (data.globalVsUserMismatchCount > 0 && (!data.mismatches || data.mismatches.length === 0)) {
        failures.push("globalVsUserMismatchCount > 0 without exact mismatch records.");
      }

      const hasLinkMissing = data.remainingGaps?.some((gap: any) => gap.gapId === "identity_link_missing");
      if (hasLinkMissing) {
        const gap = data.remainingGaps.find((g: any) => g.gapId === "identity_link_missing");
        if (!gap.source || !gap.nextAction) {
          failures.push("identity_link_missing lacks source or nextAction in closure.");
        }
      }

      // Check currentHead staleness using central policy
      const result = classifyGeneratedArtifactFromGit({
        cwd: process.cwd(),
        artifactPath: closurePath,
        artifactHead: data.currentHead,
      });
      if (result.needsRefresh) {
        failures.push(`identity-mismatch-closure report head-stale: ${result.reason}`);
      }

    } catch (e: any) {
      failures.push(`Failed to parse ${closurePath}: ${e.message}`);
    }
  }

  // 2. Check other generated identity reports
  const identityReports = [
    "identity-handoff-analytics-truth",
    "individual-user-metric-truth",
    "guest-user-handoff-repair",
    "identity-chain-contract",
    "identity-handoff-4xx-policy",
    "identity-tracking-memory-writeback",
    "user-tracking-live-evidence",
    "analytic-algorithm-truth-audit"
  ];

  for (const reportKey of identityReports) {
    const reportPath = `agent/state/${reportKey}.generated.json`;
    if (!fs.existsSync(reportPath)) {
      failures.push(`${reportPath} is missing.`);
    } else {
      try {
        const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
        
        // individualMetricHydrationStatus must be "classified", "fixed", or "pass"
        if (report.individualMetricHydrationStatus === "review") {
          failures.push(`individualMetricHydrationStatus remains vague 'review' in ${reportKey}.`);
        }

        // generated identity artifacts are head-stale using central policy
        const result = classifyGeneratedArtifactFromGit({
          cwd: process.cwd(),
          artifactPath: reportPath,
          artifactHead: report.currentHead,
        });
        if (result.needsRefresh) {
          failures.push(`${reportKey} generated against stale head: ${result.reason}`);
        }

      } catch (e: any) {
        failures.push(`Failed to parse ${reportPath}: ${e.message}`);
      }
    }
  }

  if (failures.length > 0) {
    console.error("Identity Mismatch Closure Validation Failed:");
    failures.forEach((f) => console.error(`- ${f}`));
    process.exit(1);
  }

  console.log("Identity Mismatch Closure OK.");
}

if (require.main === module) {
  runValidation();
}
