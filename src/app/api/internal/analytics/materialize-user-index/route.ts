import { timingSafeEqual } from "node:crypto";

import { NextRequest, NextResponse } from "next/server";

import { isBoundedJsonBodyError, readBoundedJsonBody } from "@/lib/server/bounded-json-body";
import { handleApiError } from "@/lib/server/auth";
import { CRON } from "@/lib/server/rate-limit";
import { guardApiRequest } from "@/lib/server/request-guard";
import { withRouteRuntimeHealth } from "@/lib/server/route-runtime-health";
import {
  consumeUserIndexMaterializerOutbox,
  UserIndexMaterializerConfigurationError,
} from "@/lib/server/user-index-materializer";

const ROUTE_NAME = "internal/analytics/materialize-user-index";
const MATERIALIZER_IDEMPOTENCY_KEY = "user_index_materializer_request_id_and_lease";
const MATERIALIZER_ROUTE_SECURITY_POLICY = {
  trustedOriginRequired: false,
  trustedOriginExemptionReason: "service_to_service_cron_bearer_secret",
} as const;

function matchesCronSecret(actual: string, expected: string) {
  const actualBytes = Buffer.from(actual);
  const expectedBytes = Buffer.from(expected);
  return actualBytes.length === expectedBytes.length && timingSafeEqual(actualBytes, expectedBytes);
}

async function POST_handler(request: NextRequest) {
  try {
    const configuredSecret = process.env.CRON_SECRET?.trim() ?? "";
    if (!configuredSecret) {
      return NextResponse.json({
        success: false,
        error: "User index materialization is not configured.",
        errorCode: "configuration_missing",
      }, { status: 503 });
    }
    // The scheduled service has no browser Origin; authenticate its bearer secret in constant time instead.
    const authorization = request.headers.get("authorization")?.trim() ?? "";
    const actualSecret = authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
    if (!actualSecret || !matchesCronSecret(actualSecret, configuredSecret)) {
      return NextResponse.json({
        success: false,
        error: "Unauthorized.",
        errorCode: "unauthorized",
      }, { status: 401 });
    }

    // Authenticate before the remote limiter so unauthenticated header rotation cannot create cost-bearing writes.
    await guardApiRequest(request, {
      routeName: ROUTE_NAME,
      rateLimit: CRON,
      rateLimitStorage: "remote",
      scopeId: "user-index-materializer-scheduler",
      auth: "none",
      requireTrustedOrigin: MATERIALIZER_ROUTE_SECURITY_POLICY.trustedOriginRequired,
      allowedMethods: ["POST"],
      maxBodyBytes: 1_024,
    });

    await readBoundedJsonBody<Record<string, unknown>>(request, {
      maxBytes: 1_024,
      routeName: ROUTE_NAME,
      allowedContentTypes: ["application/json"],
    });
    const result = await consumeUserIndexMaterializerOutbox();
    return NextResponse.json({
      success: true,
      idempotencyKey: MATERIALIZER_IDEMPOTENCY_KEY,
      result,
    }, {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    if (isBoundedJsonBodyError(error)) {
      return NextResponse.json({
        success: false,
        error: error.message,
        errorCode: error.code,
      }, { status: error.status });
    }
    if (error instanceof UserIndexMaterializerConfigurationError) {
      return NextResponse.json({
        success: false,
        error: "User index materialization is not configured.",
        errorCode: error.code,
      }, { status: 503 });
    }
    return handleApiError(error, ROUTE_NAME);
  }
}

export let POST = withRouteRuntimeHealth(`${ROUTE_NAME}:POST`, POST_handler);
