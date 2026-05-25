import { NextRequest, NextResponse } from "next/server";

import { BUG_REPORT_COLLECTION } from "@/lib/errors/bug-report-contract";
import { buildBugReportTruthSource } from "@/lib/debug/bug-report-truth-source";
import { handleApiError } from "@/lib/server/auth";
import { adminDb } from "@/lib/server/firebase-admin";
import { ADMIN, HEAVY_READ } from "@/lib/server/rate-limit";
import { guardApiRequest } from "@/lib/server/request-guard";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const BUG_REPORT_ADMIN_READ_LIMIT = 50;

export async function GET(request: NextRequest) {
  try {
    await guardApiRequest(request, {
      routeName: "admin/debug/bug-reports",
      preAuthRouteName: "admin/debug/bug-reports/preauth",
      preAuthRateLimit: HEAVY_READ,
      rateLimit: ADMIN,
      requireTrustedOrigin: true,
      auth: "admin",
      scopeToCaller: true,
      allowedMethods: ["GET"],
    });

    const snapshot = await adminDb
      .collection(BUG_REPORT_COLLECTION)
      .orderBy("createdAt", "desc")
      .limit(BUG_REPORT_ADMIN_READ_LIMIT)
      .get();
    const reports = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() ?? {}),
    }));
    const generatedAtMs = Date.now();
    const source = buildBugReportTruthSource({
      reports,
      readLimit: BUG_REPORT_ADMIN_READ_LIMIT,
      generatedAtMs,
      sourcePath: "/api/admin/debug/bug-reports",
    });

    return NextResponse.json({
      ...source,
      source: BUG_REPORT_COLLECTION,
    }, {
      headers: {
        "Cache-Control": "private, max-age=30, stale-while-revalidate=120",
      },
    });
  } catch (error) {
    return handleApiError(error, "admin/debug/bug-reports");
  }
}
