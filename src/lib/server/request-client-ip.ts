import "server-only";

import { type NextRequest } from "next/server";

type NextRequestWithIp = NextRequest & {
  ip?: string | null;
};

const TRUSTED_IP_HEADERS = [
  "x-vercel-forwarded-for",
  "x-real-ip",
  "cf-connecting-ip",
  "fastly-client-ip",
] as const;

function normalizeIp(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const normalized = value
    .split(",")[0]
    ?.trim();

  return normalized || null;
}

export function getTrustedClientIp(request: NextRequest) {
  const platformIp = normalizeIp((request as NextRequestWithIp).ip);
  if (platformIp) {
    return platformIp;
  }

  for (const headerName of TRUSTED_IP_HEADERS) {
    const headerIp = normalizeIp(request.headers.get(headerName));
    if (headerIp) {
      return headerIp;
    }
  }

  return "unknown";
}
