import { createHash } from "node:crypto";

import { FieldValue } from "firebase-admin/firestore";
import { NextResponse, type NextRequest } from "next/server";

import {
  BUG_REPORT_COLLECTION,
  BUG_REPORT_DAILY_REWARD_CAP,
  BUG_REPORT_DUPLICATE_WINDOW_MS,
  BUG_REPORT_REWARD_GD,
  BUG_REPORT_REWARD_SOURCE,
  getBugReportDayStartMs,
  normalizeBugReportRoute,
  resolveBugReportRedirect,
  sanitizeBugReportContext,
  type BugReportInput,
  type BugReportRecord,
  type BugReportStatus,
} from "@/lib/errors/bug-report-contract";
import { buildHumanApiErrorResponse } from "@/lib/errors/api-error-response";
import type { ErrorSurface } from "@/lib/errors/error-language";
import { resolveHumanErrorFromCode, resolveHumanErrorFromStatus } from "@/lib/errors/resolve-human-error";
import { creditSourceAwareGumdrops, readSourceAwareBalance, buildSourceAwareBalancePatch } from "@/lib/gumdrop-ledger";
import { AuthError } from "@/lib/server/auth";
import { readBoundedJsonBody, isBoundedJsonBodyError } from "@/lib/server/bounded-json-body";
import { adminDb } from "@/lib/server/firebase-admin";
import { buildCompletedGumdropTransaction } from "@/lib/server/gumdrop-ledger";
import { guardApiRequest } from "@/lib/server/request-guard";
import { RateLimitError, STANDARD } from "@/lib/server/rate-limit";

const BUG_REPORT_BODY_LIMIT_BYTES = 16 * 1024;
const VALID_SURFACES = new Set<ErrorSurface>([
  "wallet",
  "gumdrop_purchase",
  "creator_profile",
  "creator_booking",
  "creator_request",
  "fan_pass",
  "creator_chat",
  "creator_dashboard",
  "drops",
  "library",
  "auth",
  "navigation",
  "runtime",
  "unknown",
]);

function readString(value: unknown, fallback = "") {
  return typeof value === "string" ? value.trim().slice(0, 500) : fallback;
}

function readSurface(value: unknown): ErrorSurface {
  return typeof value === "string" && VALID_SURFACES.has(value as ErrorSurface) ? value as ErrorSurface : "unknown";
}

function normalizeInput(value: unknown): BugReportInput {
  const record = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const route = readString(record.route);
  const previousRoute = readString(record.previousRoute);
  return {
    errorKey: readString(record.errorKey, "unknown_error"),
    surface: readSurface(record.surface),
    route: route || undefined,
    previousRoute: previousRoute || undefined,
    userMessage: readString(record.userMessage),
    userTitle: readString(record.userTitle),
    primaryAction: readString(record.primaryAction) as BugReportInput["primaryAction"],
    debugId: readString(record.debugId),
    context: sanitizeBugReportContext(record.context as Record<string, unknown> | undefined),
  };
}

function buildDedupeKey(userId: string, input: BugReportInput) {
  return createHash("sha256")
    .update([
      userId,
      input.errorKey,
      input.surface,
      normalizeBugReportRoute(input.route),
      normalizeBugReportRoute(input.previousRoute),
    ].join(":"))
    .digest("hex");
}

async function hasDuplicateReport(userId: string, dedupeKey: string, nowMs: number) {
  const duplicateWindowStart = nowMs - BUG_REPORT_DUPLICATE_WINDOW_MS;
  const snapshot = await adminDb
    .collection(BUG_REPORT_COLLECTION)
    .where("userId", "==", userId)
    .where("dedupeKey", "==", dedupeKey)
    .where("createdAt", ">=", duplicateWindowStart)
    .limit(1)
    .get();

  return !snapshot.empty;
}

async function countDailyRewardedReports(userId: string, nowMs: number) {
  const dayStartMs = getBugReportDayStartMs(nowMs);
  const snapshot = await adminDb
    .collection(BUG_REPORT_COLLECTION)
    .where("userId", "==", userId)
    .where("status", "==", "rewarded")
    .where("createdAt", ">=", dayStartMs)
    .limit(BUG_REPORT_DAILY_REWARD_CAP)
    .get();

  return snapshot.size;
}

function successMessage(status: BugReportStatus, rewardGd: number) {
  if (status === "rewarded") {
    return `${rewardGd} reward GumDrops added.`;
  }
  if (status === "duplicate") {
    return "Bug sent. We already counted this one recently, so no extra reward this time.";
  }
  if (status === "reward_cap_reached") {
    return "Bug sent. Today's bug reward limit is reached, so no extra GD this time.";
  }
  return "Bug sent. We'll use it to trace the issue.";
}

async function writeBugReport(params: {
  userId: string;
  input: BugReportInput;
  status: BugReportStatus;
  rewardEligible: boolean;
  rewardGranted: boolean;
  dedupeKey: string;
  nowMs: number;
}) {
  const reportRef = adminDb.collection(BUG_REPORT_COLLECTION).doc();
  const transactionRef = adminDb.collection("transactions").doc(`bug_report_reward_${reportRef.id}`);
  const userRef = adminDb.collection("users").doc(params.userId);
  const rewardGd = params.rewardGranted ? BUG_REPORT_REWARD_GD : 0;

  await adminDb.runTransaction(async (transaction) => {
    const userSnapshot = await transaction.get(userRef);
    const userData = userSnapshot.exists ? userSnapshot.data() ?? {} : {};
    const currentBalance = readSourceAwareBalance(userData);
    const nextBalance = params.rewardGranted
      ? creditSourceAwareGumdrops(currentBalance, BUG_REPORT_REWARD_GD, "reward")
      : currentBalance;

    const record: BugReportRecord & { dedupeKey: string } = {
      id: reportRef.id,
      userId: params.userId,
      errorKey: params.input.errorKey,
      surface: params.input.surface,
      route: normalizeBugReportRoute(params.input.route),
      previousRoute: normalizeBugReportRoute(params.input.previousRoute),
      userTitle: params.input.userTitle || resolveHumanErrorFromCode(params.input.errorKey, params.input.surface).userTitle,
      userMessage: params.input.userMessage || resolveHumanErrorFromCode(params.input.errorKey, params.input.surface).userMessage,
      debugId: params.input.debugId || null,
      sanitizedContext: sanitizeBugReportContext(params.input.context),
      rewardEligible: params.rewardEligible,
      rewardGd,
      status: params.status,
      createdAt: params.nowMs,
      serverCreatedAt: FieldValue.serverTimestamp(),
      sourceTruth: "human_error_bug_report",
      dedupeKey: params.dedupeKey,
    };

    transaction.set(reportRef, record);

    if (params.rewardGranted) {
      transaction.update(userRef, buildSourceAwareBalancePatch(nextBalance));
      transaction.set(transactionRef, buildCompletedGumdropTransaction({
        userId: params.userId,
        type: "daily_reward",
        amount: BUG_REPORT_REWARD_GD,
        description: "Bug report reward",
        balanceBefore: currentBalance.total,
        balanceAfter: nextBalance.total,
        rewardSource: "task",
        extra: {
          rewardSource: "bug_report",
          sourceTruth: BUG_REPORT_REWARD_SOURCE,
          bugReportId: reportRef.id,
          purchasedCreditGumDrops: 0,
          rewardCreditGumDrops: BUG_REPORT_REWARD_GD,
        },
      }));
    }
  });

  return reportRef.id;
}

export async function POST(request: NextRequest) {
  try {
    const caller = await guardApiRequest(request, {
      routeName: "bug-reports",
      rateLimit: STANDARD,
      requireTrustedOrigin: true,
      auth: "user",
      scopeToCaller: true,
      allowedMethods: ["POST"],
      maxBodyBytes: BUG_REPORT_BODY_LIMIT_BYTES,
      requiredContentTypePrefix: "application/json",
      requireAuthHeaderPresence: true,
    });

    if (!caller?.uid) {
      const descriptor = resolveHumanErrorFromCode("auth_required", "auth");
      return buildHumanApiErrorResponse(descriptor, { status: 401 });
    }

    const input = normalizeInput(await readBoundedJsonBody<unknown>(request, {
      maxBytes: BUG_REPORT_BODY_LIMIT_BYTES,
      routeName: "bug-reports",
    }));
    const descriptor = resolveHumanErrorFromCode(input.errorKey, input.surface);
    const nowMs = Date.now();
    const dedupeKey = buildDedupeKey(caller.uid, input);
    const duplicate = await hasDuplicateReport(caller.uid, dedupeKey, nowMs);
    const dailyRewardedReports = duplicate ? 0 : await countDailyRewardedReports(caller.uid, nowMs);
    const rewardEligible = descriptor.bugReportEligible && descriptor.rewardEligible;

    const status: BugReportStatus = (() => {
      if (!rewardEligible) return "not_reward_eligible";
      if (duplicate) return "duplicate";
      if (dailyRewardedReports >= BUG_REPORT_DAILY_REWARD_CAP) return "reward_cap_reached";
      return "rewarded";
    })();
    const rewardGranted = status === "rewarded";
    const bugReportId = await writeBugReport({
      userId: caller.uid,
      input: {
        ...input,
        userTitle: input.userTitle || descriptor.userTitle,
        userMessage: input.userMessage || descriptor.userMessage,
      },
      status,
      rewardEligible,
      rewardGranted,
      dedupeKey,
      nowMs,
    });

    return NextResponse.json({
      success: true,
      bugReportId,
      status,
      rewardGranted,
      rewardGd: rewardGranted ? BUG_REPORT_REWARD_GD : 0,
      userTitle: "Bug sent",
      userMessage: successMessage(status, BUG_REPORT_REWARD_GD),
      redirectTo: resolveBugReportRedirect(input.previousRoute, input.route),
    });
  } catch (error) {
    if (isBoundedJsonBodyError(error)) {
      return buildHumanApiErrorResponse(resolveHumanErrorFromCode(error.code, "runtime"), { status: error.status });
    }

    if (error instanceof AuthError || error instanceof RateLimitError) {
      const status = error instanceof RateLimitError ? 429 : error.status;
      return buildHumanApiErrorResponse(resolveHumanErrorFromStatus(status, "runtime"), { status });
    }

    return buildHumanApiErrorResponse(resolveHumanErrorFromCode("internal_server_error", "runtime"), { status: 500 });
  }
}
