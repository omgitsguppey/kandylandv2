import { NextRequest, NextResponse } from "next/server";

import { BUG_REPORT_COLLECTION } from "@/lib/errors/bug-report-contract";
import { summarizeBugReportsForAdmin } from "@/lib/errors/bug-report-admin-summary";
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
    const summary = summarizeBugReportsForAdmin(reports, {
      readLimit: BUG_REPORT_ADMIN_READ_LIMIT,
    });

    return NextResponse.json({
      success: true,
      source: BUG_REPORT_COLLECTION,
      readOnly: true,
      limit: BUG_REPORT_ADMIN_READ_LIMIT,
      summary,
    }, {
      headers: {
        "Cache-Control": "private, max-age=30, stale-while-revalidate=120",
      },
    });
  } catch (error) {
    return handleApiError(error, "admin/debug/bug-reports");
  }
}
