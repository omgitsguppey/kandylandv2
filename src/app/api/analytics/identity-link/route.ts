import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import {
  buildIdentityLink,
  type GuestUserIdentityLinkReason,
} from "@/lib/analytics/analytics-identity-link";
import { upsertAnalyticsIdentityLink } from "@/lib/server/analytics-identity-linking";
import { ANALYTICS_WRITE } from "@/lib/server/rate-limit";
import { guardApiRequest } from "@/lib/server/request-guard";

export const dynamic = "force-dynamic";

const MAX_IDENTITY_LINK_BODY_BYTES = 16 * 1024;

const IdentityLinkSchema = z.object({
  guestId: z.string().min(1).max(200),
  sessionId: z.string().min(1).max(200),
  linkedAt: z.string().min(1).max(80).optional(),
  reason: z.enum(["login", "signup", "session_restore"]).default("login"),
  consentState: z.enum(["granted", "denied", "partial", "unknown", "not_required"]).default("unknown"),
  eligiblePastSessionIds: z.array(z.string().min(1).max(200)).max(25).optional(),
});

async function POST_handler(request: NextRequest) {
  const caller = await guardApiRequest(request, {
    routeName: "analytics/identity-link",
    preAuthRouteName: "analytics/identity-link/preauth",
    allowedMethods: ["POST"],
    auth: "user",
    scopeToCaller: true,
    maxBodyBytes: MAX_IDENTITY_LINK_BODY_BYTES,
    requiredContentTypePrefix: "application/json",
    requireAuthHeaderPresence: true,
    requireTrustedOrigin: true,
    preAuthRateLimit: ANALYTICS_WRITE,
    rateLimit: ANALYTICS_WRITE,
  });

  if (!caller?.uid) {
    return NextResponse.json({ success: false, reason: "auth_required", retryable: false }, { status: 401 });
  }

  const rawPayload = await request.json().catch(() => null);
  const parsed = IdentityLinkSchema.safeParse(rawPayload);
  if (!parsed.success) {
    return NextResponse.json({ success: false, reason: "invalid_identity_link", retryable: false }, { status: 400 });
  }

  const link = buildIdentityLink({
    guestId: parsed.data.guestId,
    userId: caller.uid,
    sessionId: parsed.data.sessionId,
    linkedAt: parsed.data.linkedAt,
    reason: parsed.data.reason,
  });

  // cost-bound: link-first transfer writes one association record and never scans historical guest events.
  const linkResult = await upsertAnalyticsIdentityLink({
    anonymousVisitorId: link.guestId,
    sessionId: link.sessionId,
    userId: caller.uid,
    linkedAt: link.linkedAt,
    method: link.reason as GuestUserIdentityLinkReason,
    eligiblePastSessionIds: Array.from(new Set([link.sessionId, ...(parsed.data.eligiblePastSessionIds ?? [])])).filter(Boolean),
    consentState: parsed.data.consentState,
    mergeAllowed: parsed.data.consentState !== "denied",
    confidence: 0.9,
    authTransitionId: link.authTransitionId,
    identityState: link.identityState,
    sourceTruth: link.sourceTruth,
  });

  return NextResponse.json({
    success: true,
    identityLinkId: linkResult.identityLinkId || link.identityLinkId,
    created: linkResult.created === true,
    identityState: link.identityState,
    retryable: false,
  });
}

export const POST = POST_handler;
