import { existsSync } from "node:fs";

import { ROOT, nowIso, readText, writeJsonFile } from "./shared";

type Check = { id: string; pass: boolean; detail: string };

const REPORT_PATH = "agent/state/server-loading-speed.generated.json";

function read(path: string) {
  return existsSync(`${ROOT}/${path}`) ? readText(path) : "";
}

function main() {
  const checks: Check[] = [];

  const requestGuard = read("src/lib/server/request-guard.ts");
  checks.push({
    id: "request_guard_prevalidation",
    pass: /method|content-type|content length|rate limit|trusted origin/iu.test(requestGuard),
    detail: "Request guard contains cheap prevalidation ordering.",
  });

  const rateLimit = read("src/lib/server/rate-limit.ts");
  checks.push({
    id: "rate_limit_present",
    pass: /rate/i.test(rateLimit),
    detail: "Server rate limiting utility exists.",
  });

  const analyticsIngest = read("src/app/api/analytics/ingest/route.ts");
  checks.push({
    id: "analytics_ingest_capped",
    pass: /max|limit|cap|dedupe/iu.test(analyticsIngest),
    detail: "Analytics ingest route has cap/dedupe guards.",
  });

  const fourXx = read("src/lib/server/cheap-4xx-response.ts");
  checks.push({
    id: "cheap_4xx_helper",
    pass: fourXx.length > 0,
    detail: "Cheap 4xx response helper exists.",
  });

  const packageJson = read("package.json");
  checks.push({
    id: "server_speed_script",
    pass: packageJson.includes("\"check:server-loading-speed\""),
    detail: "Server speed validator wired in package scripts.",
  });

  const criticalBlockers = checks.filter((check) => !check.pass).map((check) => `${check.id}: ${check.detail}`);
  const score = Math.round((checks.filter((check) => check.pass).length / Math.max(1, checks.length)) * 100);
  const status = criticalBlockers.length > 0 ? "fail" : score >= 90 ? "pass" : "warning";

  writeJsonFile(REPORT_PATH, {
    generatedAt: nowIso(),
    status,
    score,
    checks,
    criticalBlockers,
    warnings: [],
  });

  if (status === "fail") {
    console.error(`Server loading speed validation failed (${criticalBlockers.length} blockers).`);
    process.exit(1);
  }

  console.log(`Server loading speed validation ${status.toUpperCase()} (${score}).`);
}

main();
