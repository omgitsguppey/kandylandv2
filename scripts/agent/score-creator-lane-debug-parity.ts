import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import type { CreatorLaneDebugParityReport } from "../../src/lib/creator-lane-debug-parity";

const root = process.cwd();
const outputPath = join(root, "agent", "state", "creator-lane-debug-parity.generated.json");

function fileContains(relativePath: string, needle: string) {
  const fullPath = join(root, relativePath);
  return existsSync(fullPath) && readFileSync(fullPath, "utf8").includes(needle);
}

function main() {
  const generatedAtUtc = new Date().toISOString();
  const hasRuntimeReport =
    fileContains("src/lib/server/creator-onboarding-diagnostics.ts", "report: CreatorLaneDebugParityReport")
    && fileContains("src/app/admin/debug/components/DebugCreatorLane.tsx", "Top creator lane mismatches")
    && fileContains("src/app/admin/debug/components/DebugCreatorLane.tsx", "Materializer has no recorded completion timestamp");

  const report: CreatorLaneDebugParityReport = {
    generatedAt: generatedAtUtc,
    generatedAtUtc,
    status: hasRuntimeReport ? "review" : "failed",
    overallStatus: hasRuntimeReport ? "review" : "failed",
    lastMaterializedAtUtc: null,
    materializationFreshnessState: hasRuntimeReport ? "not_recorded" : "failed",
    sourceSnapshots: {
      queueEntries: 0,
      userProjections: 0,
      settingsRecords: 0,
      experienceRecords: 0,
      historyRecords: 0,
    },
    issueCount: 0,
    historyGapCount: 0,
    mismatches: [],
    optionalAuditNotes: [],
    nextActions: hasRuntimeReport
      ? [
        "Load the admin Debug snapshot to populate creatorId-level mismatch rows from canonical creator onboarding, queue, projection, settings, experience, and history sources.",
        "If Last Materialized is not recorded in the live snapshot, keep Creator Lane in review and run npm run check:creator-review-queue-materializer before repairing data.",
        "For a verified id_requested history gap, dry-run npm run repair:creator-lifecycle-history -- --userId <uid> --event id_requested before adding --apply.",
        "Missing ownerOverrideReason is optional admin audit context and should not block Creator Lane parity.",
      ]
      : [
        "Restore Creator Lane runtime report fields and Debug mismatch rendering.",
      ],
    localTruthNote: hasRuntimeReport
      ? "Source-only local refresh confirms Creator Lane can expose actionable runtime mismatch rows, but no live Firebase creator snapshot was queried in this run."
      : "Creator Lane runtime report wiring is incomplete.",
  };

  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(`Creator lane debug parity: ${report.status} -> ${outputPath}`);
}

main();
