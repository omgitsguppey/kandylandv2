import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import {
  DEBUG_EVIDENCE_BUCKETS,
  type DebugEvidenceCategory,
  type DebugEvidenceSeverity,
  type DebugEvidenceSource,
} from "@/lib/debug-evidence-contract";
import { AuthError, handleApiError } from "@/lib/server/auth";
import { ANALYTICS_WRITE } from "@/lib/server/rate-limit";
import { guardApiRequest } from "@/lib/server/request-guard";
import { recordDebugEvidence } from "@/lib/server/debug-evidence-store";

const sourceSchema = z.enum([
  "client",
  "server",
  "admin",
  "route",
  "support",
  "telemetry",
  "audit",
  "self_healing",
]);

const severitySchema = z.enum(["info", "warn", "error", "critical"]);

const categorySchema = z.enum([
  "layout",
  "hydration",
  "chat",
  "drops",
  "wallet",
  "support",
  "permissions",
  "auth",
  "telemetry",
  "content_protection",
  "performance",
  "runtime",
  "network",
  "browser_security_boundary",
  "firestore_rules",
  "api_route",
]);

const evidenceSchema = z.object({
  source: sourceSchema,
  severity: severitySchema,
  category: categorySchema,
  route: z.string().trim().max(240).optional().nullable(),
  component: z.string().trim().max(160).optional().nullable(),
  sessionId: z.string().trim().max(160).optional().nullable(),
  anonymousVisitorId: z.string().trim().max(160).optional().nullable(),
  entityType: z.string().trim().max(80).optional().nullable(),
  entityId: z.string().trim().max(160).optional().nullable(),
  message: z.string().trim().min(1).max(240),
  humanMessage: z.string().trim().min(1).max(280),
  technicalDetail: z.record(z.string(), z.unknown()).optional(),
  fingerprint: z.string().trim().max(160).optional().nullable(),
});

export async function POST(request: NextRequest) {
  try {
    await guardApiRequest(request, {
      routeName: "debug/evidence",
      rateLimit: ANALYTICS_WRITE,
      requireTrustedOrigin: true,
      auth: "none",
      scopeToCaller: false,
    });

    const parsed = evidenceSchema.parse(await request.json());
    const fingerprint = await recordDebugEvidence({
      ...parsed,
      source: parsed.source as DebugEvidenceSource,
      severity: parsed.severity as DebugEvidenceSeverity,
      category: parsed.category as DebugEvidenceCategory,
      userId: null,
    });

    return NextResponse.json({
      success: true,
      fingerprint,
      buckets: DEBUG_EVIDENCE_BUCKETS,
    });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return handleApiError(new AuthError("Invalid debug evidence payload", 400), "debug/evidence");
    }
    return handleApiError(error, "debug/evidence");
  }
}
