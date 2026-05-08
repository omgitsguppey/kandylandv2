import type { FourXxClass } from "@/lib/server/http-error-cost-contract";

const BOT_PROBE_PATH_PREFIXES = [
  "/.env",
  "/.git",
  "/wp-admin",
  "/wordpress",
  "/phpmyadmin",
  "/server-status",
  "/cgi-bin",
  "/vendor",
  "/node_modules",
];

const LEGACY_PATH_PREFIXES = [
  "/creator/settings",
  "/dashboard/settings/creator",
  "/drops/preview",
];

export function isInternalBypassPath(pathname: string) {
  return pathname.startsWith("/_next/")
    || pathname.startsWith("/__/firebase/")
    || pathname.startsWith("/favicon");
}

export function isKnownBotProbePath(pathname: string) {
  const normalized = pathname.toLowerCase();
  return BOT_PROBE_PATH_PREFIXES.some((prefix) => normalized.startsWith(prefix));
}

export function isKnownLegacyPath(pathname: string) {
  const normalized = pathname.toLowerCase();
  return LEGACY_PATH_PREFIXES.some((prefix) => normalized.startsWith(prefix));
}

export function classify4xxPath(input: {
  pathname: string;
  status: number;
  method?: string;
  routeType?: "api" | "page" | "media" | "analytics";
}): FourXxClass {
  if (isKnownBotProbePath(input.pathname)) return "bot_probe";
  if (isKnownLegacyPath(input.pathname)) return "legacy_route";
  if (input.status === 401) return "unauthorized";
  if (input.status === 403) return "forbidden";
  if (input.status === 404) return input.routeType === "media" ? "media_not_found" : "static_not_found";
  if (input.status === 405) return "unsupported_method";
  if (input.status === 410) return "expired_content";
  if (input.status === 429) return "rate_limited";
  if (input.routeType === "analytics") return "analytics_ignored";
  if (input.status >= 400 && input.status < 500) return "bad_request";
  return "unknown";
}
