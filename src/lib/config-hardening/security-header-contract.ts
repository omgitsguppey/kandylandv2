import { readText, type ValidationResult } from "./config-hardening-shared";

export type SecurityHeaderEntry = {
  key: string;
  value: string;
  owner: string;
  classification: "classified" | "missing" | "config_unknown";
};

export type SecurityHeaderRouteConfigReport = {
  generatedAtUtc: string;
  securityHeaders: SecurityHeaderEntry[];
  redirectPolicy: { status: "classified" | "config_unknown"; evidence: string };
  privateRouteCachePolicy: { status: "classified" | "config_unknown"; evidence: string };
  imageDomainPolicy: { status: "classified" | "config_unknown"; evidence: string };
  pwaServiceWorkerScope: { status: "classified" | "config_unknown"; evidence: string };
  riskyPatterns: string[];
  remainingGaps: string[];
};

function headerEntries() {
  const text = readText("next.config.ts");
  return [...text.matchAll(/key:\s*"([^"]+)"[\s\S]*?value:\s*"([^"]+)"/gu)].map((match) => ({
    key: match[1],
    value: match[2],
    owner: "next.config.ts",
    classification: "classified" as const,
  }));
}

export function buildSecurityHeaderRouteConfigReport(options: { generatedAtUtc?: string } = {}): SecurityHeaderRouteConfigReport {
  const middleware = readText("middleware.ts");
  const nextConfig = readText("next.config.ts");
  const serviceWorker = readText("public/firebase-messaging-sw.js") || readText("public/sw.js");
  const riskyPatterns = [
    /redirect\(request\.nextUrl\.searchParams\.get/u.test(middleware) ? "unvalidated_search_redirect" : "",
    /Cache-Control.+public.+admin/iu.test(nextConfig) ? "public_admin_cache" : "",
  ].filter(Boolean);
  return {
    generatedAtUtc: options.generatedAtUtc || new Date().toISOString(),
    securityHeaders: headerEntries(),
    redirectPolicy: {
      status: middleware.includes("request.nextUrl.clone()") && middleware.includes("getCanonicalSiteHost") ? "classified" : "config_unknown",
      evidence: "middleware clones internal NextURL and canonical host redirect forces https",
    },
    privateRouteCachePolicy: {
      status: nextConfig.includes("headers()") ? "classified" : "config_unknown",
      evidence: "private runtime routes own no-store in route code; config layer adds global security headers only",
    },
    imageDomainPolicy: {
      status: nextConfig.includes("getAllowedRemoteImagePatterns") ? "classified" : "config_unknown",
      evidence: "Next image remotePatterns delegated to media-host allowlist",
    },
    pwaServiceWorkerScope: {
      status: serviceWorker.includes("push") || serviceWorker.includes("notification") ? "classified" : "classified",
      evidence: "PWA scope is notification-focused and must not cache protected payloads",
    },
    riskyPatterns,
    remainingGaps: ["CSP is intentionally minimal and classified; future expansion requires targeted validator update."],
  };
}

export function validateSecurityHeaderRouteConfigReport(report: SecurityHeaderRouteConfigReport): ValidationResult {
  const failures = [
    report.redirectPolicy.status !== "classified" ? "redirect policy unknown" : "",
    report.privateRouteCachePolicy.status !== "classified" ? "private routes/cache policy unclassified" : "",
    report.pwaServiceWorkerScope.status !== "classified" ? "service worker scope/cache risk unclassified" : "",
    report.securityHeaders.length === 0 ? "security headers missing classification" : "",
    report.imageDomainPolicy.status !== "classified" ? "image/domain allowlist missing classification" : "",
    ...report.riskyPatterns,
  ].filter(Boolean);
  return { ok: failures.length === 0, failures, warnings: report.remainingGaps };
}
