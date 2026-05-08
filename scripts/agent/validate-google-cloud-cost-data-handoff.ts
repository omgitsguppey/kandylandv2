import { existsSync } from "node:fs";

import { ROOT, nowIso, readText, writeJsonFile } from "./shared";

type SurfaceRow = {
  surface: string;
  product: string;
  runtimeCritical: boolean;
  sidecarOnly: boolean;
  costRisk: "low" | "watch" | "review" | "high" | "critical";
  dataLossRisk: "low" | "watch" | "review" | "high" | "critical";
  currentStatus: "pass" | "warning" | "fail";
  handoffStatus: string;
  owner: string;
  cap: string;
  lastVerified: string;
  issueCodes: string[];
  recommendedAction: string;
};

const REPORT_PATH = "agent/state/google-cloud-cost-data-handoff.generated.json";

function read(path: string) {
  return existsSync(`${ROOT}/${path}`) ? readText(path) : "";
}

function main() {
  const cloudDoc = read("docs/agent-truth/cloudrun-sql-bigquery-guardrails.md");
  const googleCost = read("src/lib/server/global-cost-surface-contract.ts");
  const analyticsPolicy = read("src/lib/analytics/google-analytics-source-policy.ts");
  const sqlSync = read("scripts/agent/sync-sql.ts");
  const packageJson = read("package.json");

  const rows: SurfaceRow[] = [
    {
      surface: "sql_dataconnect",
      product: "Cloud SQL / Firebase Data Connect",
      runtimeCritical: false,
      sidecarOnly: /sidecar|mirror/iu.test(cloudDoc) && /sidecar|mirror/iu.test(sqlSync),
      costRisk: "review",
      dataLossRisk: "review",
      currentStatus: /sidecar|mirror/iu.test(cloudDoc) ? "pass" : "fail",
      handoffStatus: "mirror_only",
      owner: "server_truth",
      cap: "no runtime dependency without explicit approval",
      lastVerified: nowIso(),
      issueCodes: [],
      recommendedAction: "Keep SQL/Data Connect read models out of runtime user/creator routes.",
    },
    {
      surface: "ga_optional_evidence",
      product: "Google Analytics GA4",
      runtimeCritical: false,
      sidecarOnly: true,
      costRisk: "watch",
      dataLossRisk: "watch",
      currentStatus: /return false/u.test(analyticsPolicy) ? "pass" : "fail",
      handoffStatus: "optional_external_evidence",
      owner: "analytics_governance",
      cap: "GA cannot be canonical product truth",
      lastVerified: nowIso(),
      issueCodes: [],
      recommendedAction: "Keep first-party timeline as primary and GA as optional evidence.",
    },
    {
      surface: "global_cost_guardrails",
      product: "Cloud Run / App Hosting / Firestore / Storage / Logging",
      runtimeCritical: true,
      sidecarOnly: false,
      costRisk: "high",
      dataLossRisk: "review",
      currentStatus: googleCost.length > 0 ? "pass" : "fail",
      handoffStatus: "guarded",
      owner: "global_cost_surfaces",
      cap: "route-level caps + dedupe + bounded materializers",
      lastVerified: nowIso(),
      issueCodes: [],
      recommendedAction: "Keep capped routes, deduped evidence, and bounded materializer runs.",
    },
  ];

  const blockers: string[] = [];
  for (const row of rows) {
    if (row.currentStatus === "fail") blockers.push(`${row.surface}: ${row.recommendedAction}`);
  }
  if (!packageJson.includes("\"check:google-cloud-cost-data-handoff\"")) {
    blockers.push("package.json missing check:google-cloud-cost-data-handoff.");
  }

  const status = blockers.length > 0 ? "fail" : "pass";

  writeJsonFile(REPORT_PATH, {
    generatedAt: nowIso(),
    status,
    surfaces: rows,
    criticalBlockers: blockers,
    warnings: [],
  });

  if (status === "fail") {
    console.error("Google Cloud cost/data handoff validation failed.");
    process.exit(1);
  }

  console.log("Google Cloud cost/data handoff validation passed.");
}

main();
