import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { parseArgs } from "node:util";
import { pathToFileURL } from "node:url";

import { withGeneratedReportEnvelope } from "./agent/generated-report-envelope";

const REPORT_PATH = "agent/state/deployment-health.generated.json";
const DEFAULT_TIMEOUT_MS = 10_000;

type DeploymentHealthStatus =
  | "external_evidence_required"
  | "healthy"
  | "unhealthy"
  | "invalid_response"
  | "request_failed"
  | "timeout";

type DeploymentHealthReportInput = {
  status: DeploymentHealthStatus;
  targetUrl?: string;
  healthEndpoint?: string;
  httpStatus?: number;
  responseStatus?: string;
  elapsedMs?: number;
  errorType?: string;
  errorMessage?: string;
  timeoutMs?: number;
  generatedAtUtc?: string;
};

export type DeploymentHealthReport = ReturnType<typeof buildDeploymentHealthReport>;

function safeUrl(value: string) {
  try {
    const url = new URL(value);
    url.username = "";
    url.password = "";
    url.search = "";
    url.hash = "";
    return url.toString().replace(/\/$/u, "");
  } catch {
    return value.replace(/[?#].*$/u, "").replace(/\/$/u, "");
  }
}

export function resolveDeploymentHealthEndpoint(rawTarget?: string | null) {
  const trimmed = rawTarget?.trim();
  if (!trimmed) return null;
  const withoutTrailingSlash = safeUrl(trimmed.replace(/\/+$/u, ""));
  if (/\/api\/health$/u.test(withoutTrailingSlash)) {
    return {
      targetUrl: safeUrl(withoutTrailingSlash.replace(/\/api\/health$/u, "")),
      healthEndpoint: safeUrl(withoutTrailingSlash),
    };
  }
  return {
    targetUrl: safeUrl(withoutTrailingSlash),
    healthEndpoint: safeUrl(`${withoutTrailingSlash}/api/health`),
  };
}

function nextStepsFor(status: DeploymentHealthStatus) {
  if (status === "external_evidence_required") {
    return [
      "Provide a deployed or local runtime URL explicitly: npm run check:deployment -- --url=https://<deployment-origin>",
      "Do not use this source-safe placeholder as deployed runtime proof.",
      "Record provider/payment smoke evidence separately; /api/health cannot clear provider gates.",
    ];
  }
  if (status === "healthy") {
    return [
      "Attach this deployment-health report to the runtime smoke evidence packet if the URL is the intended deployment.",
      "Run provider/admin truth evidence separately before claiming launch readiness.",
    ];
  }
  return [
    "Inspect the deployment target and /api/health response before retrying.",
    "If this was an App Hosting rollout, keep runtime smoke marked unavailable until a healthy deployed response is captured.",
    "Do not replace this failed runtime check with source-only proof.",
  ];
}

export function buildDeploymentHealthReport(input: DeploymentHealthReportInput) {
  const validationFailures =
    input.status === "external_evidence_required" || input.status === "healthy"
      ? []
      : [`deployment health status is ${input.status}`];

  return withGeneratedReportEnvelope({
    owner: "scripts/verify-deployment.ts",
    safetyClass: "runtime_measurement_explicit_url_only",
    costClass: "single_health_request_when_url_provided",
    cleanupPolicy: "regenerate",
    cleanupCommand: "npm run check:deployment -- --url=<deployment-origin>",
    targetUrl: input.targetUrl,
    healthEndpoint: input.healthEndpoint,
    httpStatus: input.httpStatus,
    responseStatus: input.responseStatus,
    elapsedMs: input.elapsedMs,
    timeoutMs: input.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    errorType: input.errorType,
    errorMessage: input.errorMessage,
  }, {
    reportKey: "deployment-health",
    status: input.status,
    generatedAtUtc: input.generatedAtUtc,
    evidenceClass: input.status === "external_evidence_required" ? "external_evidence_required" : "runtime_redacted",
    canClearSourceGate: false,
    canClearRuntimeGate: input.status === "healthy",
    canClearProviderGate: false,
    canClearAdminTruthGate: false,
    nextExactSteps: nextStepsFor(input.status),
    validationFailures,
    doesNotProve: [
      "Does not prove PayPal/provider smoke.",
      "Does not prove production database correctness.",
      "Does not prove admin truth sample evidence.",
      "Does not prove payment, wallet, GumDrop, unlock, or entitlement math.",
    ],
  });
}

function writeReport(report: DeploymentHealthReport, cwd = process.cwd()) {
  const fullPath = join(cwd, REPORT_PATH);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, `${JSON.stringify(report, null, 2)}\n`);
}

function classifyError(error: unknown) {
  if (error instanceof Error && error.name === "AbortError") {
    return { status: "timeout" as const, errorType: error.name, errorMessage: "health request timed out" };
  }
  if (error instanceof Error) {
    return { status: "request_failed" as const, errorType: error.name, errorMessage: error.message };
  }
  return { status: "request_failed" as const, errorType: "unknown", errorMessage: String(error) };
}

export async function measureDeploymentHealth(input: {
  targetUrl?: string | null;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
  generatedAtUtc?: string;
}) {
  const resolved = resolveDeploymentHealthEndpoint(input.targetUrl);
  const timeoutMs = input.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  if (!resolved) {
    return buildDeploymentHealthReport({
      status: "external_evidence_required",
      timeoutMs,
      generatedAtUtc: input.generatedAtUtc,
    });
  }

  const fetchImpl = input.fetchImpl ?? fetch;
  const controller = new AbortController();
  const start = Date.now();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(resolved.healthEndpoint, {
      cache: "no-store",
      signal: controller.signal,
    });
    const elapsedMs = Date.now() - start;
    clearTimeout(timeout);

    let responseStatus = "unreadable";
    try {
      const data = await response.json() as { status?: unknown };
      responseStatus = typeof data.status === "string" ? data.status : "missing_status";
    } catch {
      responseStatus = "invalid_json";
    }

    const status: DeploymentHealthStatus = response.ok
      ? responseStatus === "healthy" ? "healthy" : "invalid_response"
      : "unhealthy";

    return buildDeploymentHealthReport({
      ...resolved,
      status,
      httpStatus: response.status,
      responseStatus,
      elapsedMs,
      timeoutMs,
      generatedAtUtc: input.generatedAtUtc,
    });
  } catch (error) {
    clearTimeout(timeout);
    const classified = classifyError(error);
    return buildDeploymentHealthReport({
      ...resolved,
      ...classified,
      elapsedMs: Date.now() - start,
      timeoutMs,
      generatedAtUtc: input.generatedAtUtc,
    });
  }
}

async function main() {
  const { values } = parseArgs({
    args: process.argv.slice(2),
    options: {
      url: { type: "string" },
      "timeout-ms": { type: "string" },
    },
  });
  const timeoutMs = Number(values["timeout-ms"] ?? DEFAULT_TIMEOUT_MS);
  const targetUrl = values.url ?? process.env.DEPLOYMENT_HEALTH_URL;
  const report = await measureDeploymentHealth({
    targetUrl,
    timeoutMs: Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : DEFAULT_TIMEOUT_MS,
  });
  writeReport(report);

  if (report.status === "external_evidence_required") {
    console.warn("Deployment health external evidence required.");
    console.warn(report.nextExactSteps[0]);
    return;
  }
  if (report.status === "healthy") {
    console.log(`Deployment health passed: ${report.healthEndpoint}`);
    return;
  }
  console.error(`Deployment health failed: ${report.status} (${report.healthEndpoint ?? "unknown endpoint"})`);
  report.validationFailures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  void main();
}
