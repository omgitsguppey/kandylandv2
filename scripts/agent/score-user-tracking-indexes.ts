import { existsSync } from "node:fs";

import { ROOT, readText, writeJsonFile } from "./shared";

type ScoreCheck = { id: string; pass: boolean; detail: string };
type ScoreReport = {
  generatedAt: string;
  status: "pass" | "warning" | "fail";
  score: number;
  checks: ScoreCheck[];
  criticalBlockers: string[];
  warnings: string[];
  surfacesAffected: string[];
  exactValidatorsToRun: string[];
};

function read(path: string) {
  return existsSync(`${ROOT}/${path}`) ? readText(path) : "";
}

function main() {
  const contract = read("src/lib/user-indexes/user-tracking-index-contract.ts");
  const normalizer = read("src/lib/user-indexes/user-index-normalizer.ts");
  const writer = read("src/lib/server/user-index-writer.ts");
  const reader = read("src/lib/server/user-index-reader.ts");
  const materializer = read("src/lib/server/user-index-materializer.ts");
  const guestIngest = read("src/app/api/analytics/ingest/route.ts");
  const identifiedIngest = read("src/app/api/analytics/ingest-identified/route.ts");
  const legacyRegistry = read("src/lib/user-indexes/user-index-legacy-registry.ts");
  const governance = read("src/lib/server/analytics-governance.ts");
  const adminUsersPage = read("src/app/admin/users/page.tsx");
  const adminUserDetailPage = read("src/app/admin/user/[userId]/page.tsx");
  const packageJson = read("package.json");

  const checks: ScoreCheck[] = [
    { id: "contract_exists", pass: contract.includes("type UserTrackingIndex"), detail: "User tracking index contract exists." },
    { id: "guest_contract_exists", pass: contract.includes("type GuestTrackingIndex"), detail: "Guest tracking index contract exists." },
    { id: "identity_lineage_contract_exists", pass: contract.includes("type IdentityLineageIndex"), detail: "Identity lineage index contract exists." },
    { id: "normalizer_exists", pass: normalizer.includes("buildUserTrackingIndex"), detail: "User index normalizer exists." },
    { id: "writer_exists", pass: writer.includes("writeUserTrackingIndex"), detail: "User index writer exists." },
    { id: "reader_exists", pass: reader.includes("readUserTrackingIndex"), detail: "User index reader exists." },
    { id: "materializer_caps", pass: materializer.includes("maxUsers") && materializer.includes("maxFacts") && materializer.includes("runtimeCapMs") && materializer.includes("dryRun"), detail: "Materializer has caps and dry-run." },
    { id: "guest_ingest_calls_materializer", pass: guestIngest.includes("materializeUserTrackingIndexes"), detail: "Guest ingest triggers index materialization." },
    { id: "identified_ingest_calls_materializer", pass: identifiedIngest.includes("materializeUserTrackingIndexes"), detail: "Identified ingest triggers index materialization." },
    { id: "governance_collections_updated", pass: governance.includes("user_tracking_indexes") && governance.includes("identity_lineage_indexes"), detail: "Analytics governance contains new index collections." },
    { id: "legacy_paths_blocked", pass: legacyRegistry.includes("status: \"blocked\""), detail: "Legacy tracking registry blocks old paths." },
    { id: "admin_surfaces_source_labels", pass: adminUsersPage.includes("AdminTruthBadge") && adminUserDetailPage.includes("AdminTruthBadge"), detail: "Admin surfaces expose truth/source state." },
    { id: "scripts_wired", pass: packageJson.includes("\"score:user-tracking-indexes\"") && packageJson.includes("\"check:user-tracking-index-cutover\""), detail: "Package scripts wired." },
  ];

  const passCount = checks.filter((check) => check.pass).length;
  const score = Math.round((passCount / checks.length) * 100);
  const criticalBlockers = checks.filter((check) => !check.pass).map((check) => `${check.id}: ${check.detail}`);

  const report: ScoreReport = {
    generatedAt: new Date().toISOString(),
    status: criticalBlockers.length > 0 ? "fail" : score >= 90 ? "pass" : "warning",
    score,
    checks,
    criticalBlockers,
    warnings: [],
    surfacesAffected: [
      "analytics ingest routes",
      "user tracking index materializer",
      "admin/recommendation index read models",
    ],
    exactValidatorsToRun: [
      "npm run score:user-tracking-indexes",
      "npm run check:user-tracking-index-cutover",
      "npm run typecheck",
    ],
  };

  writeJsonFile("agent/state/user-tracking-index-cutover.generated.json", report);
  console.log(`User tracking indexes score: ${report.score}/100 (${report.status})`);
}

main();
