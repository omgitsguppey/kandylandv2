import "server-only";

import { type NextRequest } from "next/server";

import { type AuthResult, AuthError, verifyAdmin, verifyAuth } from "./auth";
import { type RateLimitPolicy, checkRateLimit } from "./rate-limit";
import { hasTrustedSiteOrigin } from "./request-origin";

type RequestGuardAuthMode = "none" | "user" | "admin";

interface RequestGuardOptions {
  routeName?: string;
  preAuthRouteName?: string;
  preAuthRateLimit?: RateLimitPolicy;
  rateLimit?: RateLimitPolicy;
  requireTrustedOrigin?: boolean;
  auth?: RequestGuardAuthMode;
  scopeToCaller?: boolean;
  scopeId?: string | null;
  preAuthScopeId?: string | null;
}

export async function guardApiRequest(
  request: NextRequest,
  options: RequestGuardOptions,
): Promise<AuthResult | null> {
  if (options.requireTrustedOrigin && !hasTrustedSiteOrigin(request)) {
    throw new AuthError("Untrusted origin", 403);
  }

  const preAuthRouteName = options.preAuthRouteName ?? options.routeName;
  if (options.preAuthRateLimit && preAuthRouteName) {
    await checkRateLimit(
      request,
      preAuthRouteName,
      options.preAuthRateLimit,
      options.preAuthScopeId ? { scopeId: options.preAuthScopeId } : undefined,
    );
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
