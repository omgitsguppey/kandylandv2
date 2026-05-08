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
  allowedMethods?: string[];
  maxBodyBytes?: number;
  requiredContentTypePrefix?: string;
  requireAuthHeaderPresence?: boolean;
}

export async function guardApiRequest(
  request: NextRequest,
  options: RequestGuardOptions,
): Promise<AuthResult | null> {
  const requestMethod = request.method.toUpperCase();

  // Order is intentionally cheap-first: method -> body size -> content type -> auth header presence.
  if (Array.isArray(options.allowedMethods) && options.allowedMethods.length > 0) {
    const allowedMethods = options.allowedMethods.map((method) => method.toUpperCase());
    if (!allowedMethods.includes(requestMethod)) {
      throw new AuthError("Unsupported method", 405);
    }
  }

  if (typeof options.maxBodyBytes === "number" && options.maxBodyBytes > 0) {
    const contentLength = Number(request.headers.get("content-length") || 0);
    if (Number.isFinite(contentLength) && contentLength > options.maxBodyBytes) {
      throw new AuthError("Payload too large", 413);
    }
  }

  if (options.requiredContentTypePrefix) {
    const contentType = request.headers.get("content-type") || "";
    if (contentType && !contentType.toLowerCase().startsWith(options.requiredContentTypePrefix.toLowerCase())) {
      throw new AuthError("Unsupported content type", 415);
    }
  }

  if (options.requireAuthHeaderPresence) {
    const authHeader = request.headers.get("authorization") || "";
    if (!authHeader.startsWith("Bearer ")) {
      throw new AuthError("Missing or invalid token", 401);
    }
  }

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
