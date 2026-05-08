import { existsSync } from "node:fs";

import { ROOT, readText, writeJsonFile } from "./shared";

type FourXxRiskTier = "low" | "watch" | "review" | "high" | "critical";

type FourXxRouteReport = {
  routePattern: string;
  status: number;
  class: string;
  likelyCostCause: string;
  cachePolicy: string;
  loggingPolicy: string;
  firestoreBeforeReject: boolean;
  responseTooLarge: boolean;
  rateLimitRequired: boolean;
  debugEvidenceDedupe: boolean;
  recommendedFix: string;
  riskTier: FourXxRiskTier;
};

type ScoreReport = {
  generatedAt: string;
  status: "pass" | "warning" | "fail";
  score: number;
  checks: Array<{ id: string; pass: boolean; detail: string }>;
  criticalBlockers: string[];
  warnings: string[];
  routeReports: FourXxRouteReport[];
};

function read(path: string) {
  return existsSync(`${ROOT}/${path}`) ? readText(path) : "";
}

function computeRiskTier(score: number): FourXxRiskTier {
  if (score >= 80) return "critical";
  if (score >= 60) return "high";
  if (score >= 45) return "review";
  if (score >= 30) return "watch";
  return "low";
}

function main() {
  const contract = read("src/lib/server/http-error-cost-contract.ts");
  const cheapResponse = read("src/lib/server/cheap-4xx-response.ts");
  const classifier = read("src/lib/server/route-4xx-classifier.ts");
  const dedupe = read("src/lib/server/route-4xx-dedupe.ts");
  const middleware = read("middleware.ts");
  const requestGuard = read("src/lib/server/request-guard.ts");
  const analyticsIngest = read("src/app/api/analytics/ingest/route.ts");
  const analyticsIngestIdentified = read("src/app/api/analytics/ingest-identified/route.ts");
  const packageJson = read("package.json");

  const checks = [
    { id: "contract_exists", pass: contract.includes("type FourXxCostPolicy"), detail: "4xx cost policy contract exists." },
    { id: "cheap_response_exists", pass: cheapResponse.includes("cheap4xxResponse"), detail: "cheap 4xx helper exists." },
    { id: "classifier_exists", pass: classifier.includes("classify4xxPath"), detail: "4xx route classifier exists." },
    { id: "dedupe_exists", pass: dedupe.includes("record4xxDedupe"), detail: "4xx dedupe helper exists." },
    { id: "probe_paths_blocked", pass: middleware.includes("isKnownBotProbePath") && middleware.includes("bot_probe_path_blocked"), detail: "probe paths are cheaply rejected in middleware." },
    { id: "legacy_paths_blocked", pass: middleware.includes("legacy_route_gone"), detail: "legacy routes are cheap rejected." },
    { id: "request_guard_order", pass: requestGuard.includes("Order is intentionally cheap-first"), detail: "request guard order is documented/enforced." },
    { id: "analytics_method_body_guarded", pass: analyticsIngest.includes("allowedMethods: [\"POST\"]") && analyticsIngestIdentified.includes("allowedMethods: [\"POST\"]"), detail: "analytics routes enforce cheap method/body prechecks." },
    { id: "scripts_wired", pass: packageJson.includes("\"score:4xx-cost\"") && packageJson.includes("\"check:4xx-cost\""), detail: "package scripts wired." },
  ];

  const routeReports: FourXxRouteReport[] = [
    {
      routePattern: "/.env",
      status: 404,
      class: "bot_probe",
      likelyCostCause: "high-volume automated probing",
      cachePolicy: "public max-age=300",
      loggingPolicy: "deduped",
      firestoreBeforeReject: false,
      responseTooLarge: false,
      rateLimitRequired: false,
      debugEvidenceDedupe: true,
      recommendedFix: "Keep middleware short-circuit and deduped diagnostics.",
      riskTier: "watch",
    },
    {
      routePattern: "/api/analytics/ingest",
      status: 400,
      class: "analytics_ignored",
      likelyCostCause: "malformed/oversized analytics payloads",
      cachePolicy: "no-store",
      loggingPolicy: "sampled",
      firestoreBeforeReject: false,
      responseTooLarge: false,
      rateLimitRequired: true,
      debugEvidenceDedupe: true,
      recommendedFix: "Preserve ignored-path lightweight returns and sampled logs.",
      riskTier: "review",
    },
  ];

  const blockerChecks = checks.filter((check) => !check.pass);
  const score = Math.round((checks.filter((check) => check.pass).length / checks.length) * 100);
  const status = blockerChecks.length > 0 ? "fail" : score >= 90 ? "pass" : "warning";
  const report: ScoreReport = {
    generatedAt: new Date().toISOString(),
    status,
    score,
    checks,
    criticalBlockers: blockerChecks.map((check) => `${check.id}: ${check.detail}`),
    warnings: [],
    routeReports: routeReports.map((route) => ({
      ...route,
      riskTier: computeRiskTier(
        (route.firestoreBeforeReject ? 30 : 0)
        + (route.responseTooLarge ? 20 : 0)
        + (route.debugEvidenceDedupe ? 0 : 20)
        + (route.rateLimitRequired ? 10 : 0)
        + (route.loggingPolicy === "always" ? 20 : route.loggingPolicy === "sampled" ? 8 : 4),
      ),
    })),
  };

  writeJsonFile("agent/state/4xx-cost-guardrails.generated.json", report);
  console.log(`4xx cost guardrails score: ${report.score}/100 (${report.status})`);
}

main();
