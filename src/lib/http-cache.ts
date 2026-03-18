import { createHash } from "node:crypto";

import { type NextRequest, NextResponse } from "next/server";

export const PRIVATE_REVALIDATE_CACHE_CONTROL = "private, no-cache, must-revalidate";

export function buildWeakEtag(payload: unknown) {
  return `W/"${createHash("sha1").update(JSON.stringify(payload)).digest("hex")}"`;
}

export function requestMatchesEtag(request: NextRequest, etag: string) {
  const requestEtag = request.headers.get("if-none-match");
  if (!requestEtag) {
    return false;
  }

  return requestEtag
    .split(",")
    .map((value) => value.trim())
    .includes(etag);
}

export function buildNotModifiedResponse(etag: string, cacheControl = PRIVATE_REVALIDATE_CACHE_CONTROL) {
  return new NextResponse(null, {
    status: 304,
    headers: {
      ETag: etag,
      "Cache-Control": cacheControl,
    },
  });
}
