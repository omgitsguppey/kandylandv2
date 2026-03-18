import "server-only";

import { type NextRequest } from "next/server";

import { type AuthResult, AuthError, verifyAdmin, verifyAppCheck, verifyAuth } from "./auth";
import { type RateLimitConfig, checkRateLimit } from "./rate-limit";
import { hasTrustedSiteOrigin } from "./request-origin";

type RequestGuardAuthMode = "none" | "user" | "admin";

interface RequestGuardOptions {
  routeName?: string;
  rateLimit?: RateLimitConfig;
  requireTrustedOrigin?: boolean;
  requireAppCheck?: boolean;
  auth?: RequestGuardAuthMode;
  scopeToCaller?: boolean;
  scopeId?: string | null;
}

export async function guardApiRequest(
  request: NextRequest,
  options: RequestGuardOptions,
): Promise<AuthResult | null> {
  if (options.requireTrustedOrigin && !hasTrustedSiteOrigin(request)) {
    throw new AuthError("Untrusted origin", 403);
  }

  if (options.requireAppCheck) {
    await verifyAppCheck(request);
  }

  let caller: AuthResult | null = null;

  if (options.auth === "user") {
    caller = await verifyAuth(request);
  } else if (options.auth === "admin") {
    caller = await verifyAdmin(request);
  }

  if (options.rateLimit && options.routeName) {
    const scopeId = options.scopeToCaller
      ? caller?.uid ?? options.scopeId ?? null
      : options.scopeId ?? null;

    await checkRateLimit(
      request,
      options.routeName,
      options.rateLimit,
      scopeId ? { scopeId } : undefined,
    );
  }

  return caller;
}
