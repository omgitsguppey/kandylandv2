import { generateSecureClientToken } from "@/lib/client-random";

export const DISCOVERY_IMPRESSION_VISIBILITY_THRESHOLD = 0.6;
export const DISCOVERY_IMPRESSION_MIN_VISIBLE_MS = 500;

const MAX_DISCOVERY_QUERY_LENGTH = 80;
const EMAIL_PATTERN = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const PHONE_PATTERN = /(?<!\w)(?:\+?\d[\d\s().-]{7,}\d)(?!\w)/g;

function createRandomToken() {
  return generateSecureClientToken(12);
}

export function createDiscoveryTrackingSessionId(prefix: string) {
  const normalizedPrefix = prefix.replace(/[^A-Za-z0-9_-]+/g, "_").slice(0, 32) || "discovery";
  return `${normalizedPrefix}_${Date.now().toString(36)}_${createRandomToken()}`;
}

export function buildDiscoveryImpressionKey(input: {
  sessionId: string;
  entityId: string;
  surface: string;
}) {
  return [
    input.sessionId.trim() || "unknown_session",
    input.surface.trim() || "unknown_surface",
    input.entityId.trim() || "unknown_entity",
  ].join(":");
}

function stripUrlQuery(value: string) {
  try {
    const url = new URL(value);
    return `${url.origin}${url.pathname}`;
  } catch {
    return value.split(/[?#]/u)[0] || value;
  }
}

export function sanitizeDiscoveryQuery(query: string) {
  const normalized = query.trim().replace(/\s+/g, " ");

  if (!normalized) {
    return "";
  }

  const sanitized = normalized
    .replace(/https?:\/\/\S+/giu, (value) => stripUrlQuery(value))
    .replace(/[?#]\S+/gu, "")
    .replace(EMAIL_PATTERN, "[redacted_email]")
    .replace(PHONE_PATTERN, "[redacted_phone]")
    .slice(0, MAX_DISCOVERY_QUERY_LENGTH);

  return sanitized.trim();
}

export function resolveDropsDiscoverySort(category: string) {
  if (category === "New") {
    return "newest";
  }
  if (category === "Ending Soon") {
    return "ending_soon";
  }
  if (category === "Hottest") {
    return "hottest";
  }
  return "default";
}
