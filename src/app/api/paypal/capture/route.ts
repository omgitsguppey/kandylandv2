import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/server/firebase-admin";
import { handleApiError } from "@/lib/server/auth";
import { trackServerEvent } from "@/lib/server/analytics";
import { SENSITIVE_WRITE } from "@/lib/server/rate-limit";
import { deriveGumdropEconomics, getBundlePresentation } from "@/lib/gumdrop-economics";
import {
  buildPaidPurchaseBalanceCredit,
  buildSourceAwareBalancePatch,
  computeNextGumdropBalance,
  creditSourceAwareGumdrops,
  normalizeGumdropBalance,
  readSourceAwareBalance,
} from "@/lib/gumdrop-ledger";
import {
  buildChatPaidGdLowBalanceReminderAfterPaidRefill,
  normalizeChatPaidGdLowBalanceReminderState,
} from "@/lib/chat";
import { buildCompletedGumdropTransaction } from "@/lib/server/gumdrop-ledger";
import type { DailyTasksState } from "@/lib/tasks/task-catalog";
import { recordCanonicalTaskEvent } from "@/lib/server/daily-tasks";
import { guardApiRequest } from "@/lib/server/request-guard";
import { resolveExpectedGumdropPrice } from "@/lib/gumdrops-packages";
import { buildPurchaseSourceOfFundsBreakdown } from "@/lib/platform-economy";
import { buildServerPurchaseTelemetryEvent } from "@/lib/commerce/commerce-parity-contract";
import type { UserProfile } from "@/types/db";
import { touchUserRuntime } from "@/lib/server/user-runtime";
import { capturePayPalOrder, getPayPalOrder } from "@/lib/server/paypal";
import {
  beginPayPalCapture,
  markPayPalCaptureRecoveryRequired,
  persistCapturedPayPalPayment,
  paypalOrderIdSchema,
  reservePayPalCaptureRecovery,
  validateStoredPayPalPayment,
  type PayPalCaptureEvidence,
  type PayPalCaptureInspection,
} from "@/lib/server/paypal-order-state";
import { recordRouteWarning } from "@/lib/server/route-diagnostics";
import { withRouteRuntimeHealth } from "@/lib/server/route-runtime-health";
import { isBoundedJsonBodyError, readBoundedJsonBody } from "@/lib/server/bounded-json-body";

const PAYPAL_CAPTURE_BODY_LIMIT_BYTES = 32_768;

const bodySchema = z.object({
  orderId: paypalOrderIdSchema,
  expectedDrops: z.number().int().positive().max(100_000),
});

const providerOrderSchema = z.object({
  status: z.string(),
  purchase_units: z.array(z.object({
    custom_id: z.string().optional(),
    payments: z.object({
      captures: z.array(z.object({
        id: z.string().optional(),
        status: z.string().optional(),
        custom_id: z.string().optional(),
        amount: z.object({
          currency_code: z.string(),
          value: z.string(),
        }).optional(),
        seller_receivable_breakdown: z.object({
          paypal_fee: z.object({ currency_code: z.string(), value: z.string() }).optional(),
          net_amount: z.object({ currency_code: z.string(), value: z.string() }).optional(),
        }).optional(),
      })),
    }).optional(),
  })),
});

function inspectProviderOrder(
  rawCaptureData: Record<string, unknown>,
  input: { userId: string; expectedDrops: number; expectedPrice: string },
): PayPalCaptureInspection {
  const rawStatus = typeof rawCaptureData.status === "string" ? rawCaptureData.status : "UNKNOWN";
  const parsedResult = providerOrderSchema.safeParse(rawCaptureData);

  if (!parsedResult.success) {
    if (rawStatus !== "COMPLETED") {
      return { kind: "non_completed", providerStatus: rawStatus };
    }

    return {
      kind: "blocked",
      reason: "invalid_completed_capture_payload",
      evidence: {
        captureId: null,
        captureStatus: null,
        amount: null,
        currency: null,
        customId: null,
        paypalFeeAmount: null,
        netAmount: null,
        providerStatus: rawStatus,
      },
    };
  }

  const parsed = parsedResult.data;
  if (parsed.status !== "COMPLETED") {
    return { kind: "non_completed", providerStatus: parsed.status };
  }

  const purchaseUnit = parsed.purchase_units[0];
  const capture = purchaseUnit?.payments?.captures[0];
  const { userId, expectedDrops } = input;
  const customId = capture?.custom_id || purchaseUnit?.custom_id || null;
  const paidAmountStr = capture?.amount?.value ?? "";
  const expectedPrice = input.expectedPrice;
  const [capturedUserId, capturedDropsRaw] = typeof customId === "string" ? customId.split(":") : [];
  const capturedExpectedDrops = /^\d+$/u.test(capturedDropsRaw ?? "")
    ? Number.parseInt(capturedDropsRaw ?? "", 10)
    : Number.NaN;
  const evidence: PayPalCaptureEvidence = {
    captureId: capture?.id ?? null,
    captureStatus: capture?.status ?? null,
    amount: paidAmountStr || null,
    currency: capture?.amount?.currency_code ?? null,
    customId,
    paypalFeeAmount: capture?.seller_receivable_breakdown?.paypal_fee?.currency_code === "USD"
      ? capture.seller_receivable_breakdown.paypal_fee.value
      : null,
    netAmount: capture?.seller_receivable_breakdown?.net_amount?.currency_code === "USD"
      ? capture.seller_receivable_breakdown.net_amount.value
      : null,
    providerStatus: parsed.status,
  };

  if (!capture?.id || !capture.amount || capture.amount.currency_code !== "USD") {
    return { kind: "blocked", evidence, reason: "invalid_currency_or_capture_data" };
  }

  if (capture.status !== "COMPLETED") {
    return {
      kind: "non_completed",
      providerStatus: `CAPTURE_${capture.status ?? "UNKNOWN"}`,
    };
  }

  if (!/^\d+\.\d{2}$/u.test(paidAmountStr)) {
    return { kind: "blocked", evidence, reason: "invalid_capture_amount" };
  }

  if (!expectedPrice || paidAmountStr !== expectedPrice) {
    return { kind: "blocked", evidence, reason: "payment_package_mismatch" };
  }

  if (!customId || !capturedUserId || !Number.isInteger(capturedExpectedDrops)) {
    return { kind: "blocked", evidence, reason: "missing_identity_binding" };
  }

  if (capturedUserId !== userId || capturedExpectedDrops !== expectedDrops) {
    return { kind: "blocked", evidence, reason: "identity_or_package_binding_mismatch" };
  }

  return { kind: "verified", evidence };
}

function blockedCaptureResponse(inspection: Extract<PayPalCaptureInspection, { kind: "blocked" }>) {
  const identityFailure = inspection.reason === "missing_identity_binding"
    || inspection.reason === "identity_or_package_binding_mismatch";
  return NextResponse.json({
    error: identityFailure ? "User verification failed" : "Payment requires support recovery",
    code: "captured_payment_recovery_required",
    retryable: false,
  }, { status: identityFailure ? 403 : 409 });
}

function nonCompletedCaptureResponse(providerStatus: string) {
  if (providerStatus === "PAYER_ACTION_REQUIRED") {
    return NextResponse.json({
      error: "Payment approval must be completed again",
      code: "payment_payer_action_required",
      retryable: false,
    }, { status: 409 });
  }

  if (["VOIDED", "CREATED", "SAVED", "CAPTURE_DECLINED", "CAPTURE_FAILED"].includes(providerStatus)) {
    return NextResponse.json({
      error: "Payment could not be completed",
      code: "payment_capture_terminal",
      retryable: false,
    }, { status: 409 });
  }

  return NextResponse.json({
    error: "Payment capture is still processing",
    code: "payment_capture_in_progress",
    retryable: true,
  }, { status: 409 });
}

async function creditCapturedPayment(input: {
  orderId: string;
  userId: string;
  expectedDrops: number;
  expectedPrice: string;
  usernameFallback: string;
}) {
  const paymentLockRef = adminDb.collection("paymentLocks").doc(input.orderId);
  const userRef = adminDb.collection("users").doc(input.userId);

  return adminDb.runTransaction(async (transaction) => {
    const existingLock = await transaction.get(paymentLockRef);
    if (!existingLock.exists) {
      throw new Error("Captured payment order state is missing.");
    }
    const validation = validateStoredPayPalPayment(existingLock.data(), input);
    if (!validation.ok) {
      throw new Error(validation.result.kind === "error"
        ? validation.result.message
        : "Captured payment order state is invalid.");
    }
    if (validation.legacyCredited || validation.state.status === "credited") {
      return {
        duplicate: true as const,
        transactionId: validation.state.transactionId,
      };
    }
    if (
      validation.state.status !== "captured_uncredited"
      || validation.state.captureVerification !== "verified"
      || !validation.state.captureId
      || validation.state.captureStatus !== "COMPLETED"
      || validation.state.capturedCurrency !== "USD"
      || validation.state.capturedAmount !== input.expectedPrice
      || validation.state.capturedCustomId !== `${input.userId}:${input.expectedDrops}`
    ) {
      throw new Error("Captured payment is not verified for automatic credit.");
    }

    const userSnapshot = await transaction.get(userRef);
    if (!userSnapshot.exists) {
      throw new Error("Payment was captured but the user profile is unavailable; credit remains recoverable.");
    }

    const paidUsd = Number.parseFloat(validation.state.capturedAmount);
    const paypalFeeUsd = validation.state.paypalFeeAmount === null
      || validation.state.paypalFeeAmount === undefined
      ? undefined
      : Number.parseFloat(validation.state.paypalFeeAmount);
    const netRevenueUsd = validation.state.netAmount === null
      || validation.state.netAmount === undefined
      ? undefined
      : Number.parseFloat(validation.state.netAmount);
    const economics = deriveGumdropEconomics(input.expectedDrops, paidUsd, {
      paypalFeeUsd: Number.isFinite(paypalFeeUsd) ? paypalFeeUsd : undefined,
      netRevenueUsd: Number.isFinite(netRevenueUsd) ? netRevenueUsd : undefined,
    });
    const bundlePresentation = getBundlePresentation(input.expectedDrops);
    const userData = userSnapshot.data() ?? {};
    const sourceAwareBalance = readSourceAwareBalance(userData);
    const currentBalance = normalizeGumdropBalance(sourceAwareBalance.total);
    const purchaseCredit = buildPaidPurchaseBalanceCredit({
      deliveredGumDrops: economics.deliveredGumDrops,
      paidGumDrops: economics.paidGumDrops,
      bonusGumDrops: economics.bonusGumDrops,
    });
    const nextBalance = computeNextGumdropBalance(currentBalance, purchaseCredit.purchasedCreditGumDrops);
    const nextSourceAwareBalance = creditSourceAwareGumdrops(
      sourceAwareBalance,
      purchaseCredit.purchasedCreditGumDrops,
      "purchased",
    );
    const username = typeof userData.username === "string" && userData.username.trim().length > 0
      ? userData.username.trim()
      : typeof userData.displayName === "string" && userData.displayName.trim().length > 0
        ? userData.displayName.trim()
        : input.usernameFallback;
    const purchaseTransactionRef = adminDb.collection("transactions").doc();
    const sourceOfFundsBreakdown = buildPurchaseSourceOfFundsBreakdown({
      paidBaseGd: economics.paidGumDrops,
      paidBonusGd: economics.bonusGumDrops,
      rewardPromoGd: 0,
    });
    const chatPaidGdReminderState = normalizeChatPaidGdLowBalanceReminderState(userData.chatPaidGdLowBalanceReminder);
    const shouldResetChatPaidGdReminder = sourceAwareBalance.purchased < 100
      && nextSourceAwareBalance.purchased >= 100;
    const nextChatPaidGdReminderState = shouldResetChatPaidGdReminder
      ? buildChatPaidGdLowBalanceReminderAfterPaidRefill({
          current: chatPaidGdReminderState,
          previousPaidBalanceGd: sourceAwareBalance.purchased,
          nextPaidBalanceGd: nextSourceAwareBalance.purchased,
          reminderCycleId: `paid_refill:${input.orderId}`,
        })
      : chatPaidGdReminderState;

    transaction.update(userRef, {
      ...buildSourceAwareBalancePatch(nextSourceAwareBalance),
      ...(shouldResetChatPaidGdReminder ? {
        chatPaidGdLowBalanceReminder: nextChatPaidGdReminderState,
      } : {}),
    });
    transaction.set(purchaseTransactionRef, buildCompletedGumdropTransaction({
      userId: input.userId,
      type: "purchase_currency",
      amount: input.expectedDrops,
      description: `Purchased ${input.expectedDrops} Gum Drops`,
      balanceBefore: currentBalance,
      balanceAfter: nextBalance,
      extra: {
        cost: paidUsd,
        grossRevenueUsd: economics.grossRevenueUsd,
        grossRevenueCents: economics.grossRevenueCents,
        paypalFeeUsd: economics.paypalFeeUsd,
        paypalFeeCents: economics.paypalFeeCents,
        netRevenueUsd: economics.netRevenueUsd,
        netRevenueCents: economics.netRevenueCents,
        deliveredGumDrops: economics.deliveredGumDrops,
        paidGumDrops: economics.paidGumDrops,
        bonusGumDrops: economics.bonusGumDrops,
        paidBaseGd: purchaseCredit.paidGumDrops,
        paidBonusGd: purchaseCredit.purchaseBonusGumDrops,
        purchasedCreditGd: purchaseCredit.purchasedCreditGumDrops,
        rewardCreditGd: purchaseCredit.rewardCreditGumDrops,
        purchaseBonusGumDrops: purchaseCredit.purchaseBonusGumDrops,
        purchasedBalanceCreditGumDrops: purchaseCredit.purchasedCreditGumDrops,
        rewardBalanceCreditGumDrops: purchaseCredit.rewardCreditGumDrops,
        rewardPromoGd: 0,
        purchaseSourceClassification: purchaseCredit.sourceClassification,
        sourceClassification: purchaseCredit.sourceClassification,
        retailValueUsd: economics.retailValueUsd,
        retailValueCents: economics.retailValueCents,
        bonusValueUsd: economics.bonusValueUsd,
        bonusValueCents: economics.bonusValueCents,
        adjustedProfitUsd: economics.adjustedProfitUsd,
        adjustedProfitCents: economics.adjustedProfitCents,
        discountUsd: economics.discountUsd,
        discountCents: economics.discountCents,
        effectiveUsdPer100Gd: economics.effectiveUsdPer100Gd,
        effectiveCentsPer100Gd: economics.effectiveCentsPer100Gd,
        effectiveYieldRatio: economics.effectiveYieldRatio,
        bundleLabel: bundlePresentation.bundleLabel,
        bundleKey: bundlePresentation.bundleKey,
        bundleTier: bundlePresentation.bundleTier,
        packageId: bundlePresentation.bundleKey,
        promoId: null,
        offerId: null,
        priceUsdBeforeDiscount: economics.retailValueUsd,
        priceUsdPaid: economics.grossRevenueUsd,
        sourceOfFundsBreakdown,
        idempotencyKey: input.orderId,
        orderId: input.orderId,
        currency: "USD",
        paymentId: input.orderId,
        paypalCaptureId: validation.state.captureId,
        transactionId: purchaseTransactionRef.id,
        sourceTruth: "server_purchase_transaction",
      },
    }));
    transaction.update(paymentLockRef, {
      status: "credited",
      transactionId: purchaseTransactionRef.id,
      creditedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return {
      duplicate: false as const,
      username,
      transactionId: purchaseTransactionRef.id,
      captureId: validation.state.captureId,
      chatPaidGdReminderReset: shouldResetChatPaidGdReminder,
      nextPaidBalanceGd: nextSourceAwareBalance.purchased,
      economics,
      bundlePresentation,
      paidUsd,
    };
  });
}

async function POST_handler(request: NextRequest) {
  try {
    const caller = await guardApiRequest(request, {
      routeName: "paypal/capture",
      rateLimit: SENSITIVE_WRITE,
      requireTrustedOrigin: true,
      auth: "user",
      scopeToCaller: true,
    });
    const userId = caller?.uid ?? "";
    const rawBody = await readBoundedJsonBody<unknown>(request, {
      maxBytes: PAYPAL_CAPTURE_BODY_LIMIT_BYTES,
      routeName: "paypal/capture",
    });
    const { orderId, expectedDrops } = bodySchema.parse(rawBody);
    const captureRequest = { orderId, userId, expectedDrops };
    let nextAction = await beginPayPalCapture(captureRequest);
    if (nextAction.kind === "error") {
      recordRouteWarning("paypal/capture", "Rejected payment capture before provider call", undefined, {
        channel: "commerce",
        detail: { userId, orderId, expectedDrops, code: nextAction.code },
      });
      return NextResponse.json({
        error: nextAction.message,
        code: nextAction.code,
        retryable: nextAction.retryable,
      }, { status: nextAction.status });
    }
    if (nextAction.kind === "duplicate") {
      return NextResponse.json({
        success: true,
        drops: expectedDrops,
        duplicate: true,
        transactionId: nextAction.transactionId ?? orderId,
      }, { status: 200 });
    }

    const expectedPrice = nextAction.expectedPrice;
    const currentCatalogPrice = resolveExpectedGumdropPrice(expectedDrops);
    if (currentCatalogPrice !== expectedPrice) {
      recordRouteWarning("paypal/capture", "Settling PayPal order using its durable server-owned package terms", undefined, {
        channel: "commerce",
        detail: { userId, orderId, expectedDrops, storedPrice: expectedPrice, currentCatalogPrice },
      });
    }
    const paymentInput = { ...captureRequest, expectedPrice };

    if (nextAction.kind === "reconcile") {
      const reconciliationAttemptId = nextAction.attemptId;
      if (!nextAction.canRecapture) {
        return NextResponse.json({
          error: "Payment capture is already processing",
          code: "payment_capture_in_progress",
          retryable: true,
        }, { status: 409 });
      }

      let reconciliationData: Record<string, unknown>;
      try {
        reconciliationData = await getPayPalOrder(orderId);
      } catch (error) {
        recordRouteWarning("paypal/capture", "PayPal order reconciliation failed", error, {
          channel: "commerce",
          detail: { userId, orderId, expectedDrops },
        });
        return NextResponse.json({
          error: "Payment status is temporarily unavailable",
          code: "payment_reconciliation_unavailable",
          errorCode: "payment_failed",
          retryable: true,
        }, { status: 503 });
      }

      const reconciliation = inspectProviderOrder(reconciliationData, paymentInput);
      if (reconciliation.kind === "verified" || reconciliation.kind === "blocked") {
        const persistedState = await persistCapturedPayPalPayment({
          ...paymentInput,
          inspection: reconciliation,
          source: "reconciliation",
          attemptId: reconciliationAttemptId,
        });
        if (persistedState === "credited") {
          return NextResponse.json({ success: true, drops: expectedDrops, duplicate: true }, { status: 200 });
        }
        if (reconciliation.kind === "blocked") {
          recordRouteWarning("paypal/capture", "Reconciled PayPal capture requires manual recovery", undefined, {
            channel: "commerce",
            detail: { userId, orderId, expectedDrops, reason: reconciliation.reason },
          });
          return blockedCaptureResponse(reconciliation);
        }
        nextAction = { kind: "resume_credit", expectedPrice };
      } else if (nextAction.canRecapture && reconciliation.providerStatus === "APPROVED") {
        nextAction = await reservePayPalCaptureRecovery(paymentInput, reconciliationAttemptId);
      } else {
        const markedRecovery = await markPayPalCaptureRecoveryRequired({
          orderId,
          attemptId: reconciliationAttemptId,
          reason: "provider_state_requires_recovery",
          providerStatus: reconciliation.providerStatus,
        });
        if (!markedRecovery) {
          return nonCompletedCaptureResponse("CAPTURE_PENDING");
        }
        recordRouteWarning("paypal/capture", "PayPal order reconciliation requires recovery", undefined, {
          channel: "commerce",
          detail: { userId, orderId, expectedDrops, providerStatus: reconciliation.providerStatus },
        });
        return nonCompletedCaptureResponse(reconciliation.providerStatus);
      }
    }

    if (nextAction.kind === "error") {
      recordRouteWarning("paypal/capture", "Rejected PayPal capture recovery before provider call", undefined, {
        channel: "commerce",
        detail: { userId, orderId, expectedDrops, code: nextAction.code },
      });
      return NextResponse.json({
        error: nextAction.message,
        code: nextAction.code,
        retryable: nextAction.retryable,
      }, { status: nextAction.status });
    }
    if (nextAction.kind === "duplicate") {
      return NextResponse.json({ success: true, drops: expectedDrops, duplicate: true }, { status: 200 });
    }
    if (nextAction.kind === "reconcile") {
      return NextResponse.json({
        error: "Payment capture is already processing",
        code: "payment_capture_in_progress",
        retryable: true,
      }, { status: 409 });
    }

    if (nextAction.kind === "capture") {
      let captureData: Record<string, unknown>;
      try {
        captureData = await capturePayPalOrder(orderId);
      } catch (error) {
        await markPayPalCaptureRecoveryRequired({
          orderId,
          attemptId: nextAction.attemptId,
          reason: "provider_capture_result_unknown",
        });
        recordRouteWarning("paypal/capture", "PayPal capture result requires reconciliation", error, {
          channel: "commerce",
          detail: { userId, orderId, expectedDrops },
        });
        return NextResponse.json({
          error: "Payment status requires reconciliation",
          code: "payment_capture_recovery_required",
          errorCode: "payment_failed",
          retryable: true,
        }, { status: 503 });
      }

      const inspection = inspectProviderOrder(captureData, paymentInput);
      if (inspection.kind === "non_completed") {
        await markPayPalCaptureRecoveryRequired({
          orderId,
          attemptId: nextAction.attemptId,
          reason: "provider_capture_not_completed",
          providerStatus: inspection.providerStatus,
        });
        return nonCompletedCaptureResponse(inspection.providerStatus);
      }

      const persistedState = await persistCapturedPayPalPayment({
        ...paymentInput,
        inspection,
        source: "capture",
        attemptId: nextAction.attemptId,
      });
      if (persistedState === "credited") {
        return NextResponse.json({ success: true, drops: expectedDrops, duplicate: true }, { status: 200 });
      }
      if (inspection.kind === "blocked") {
        const warningMessage = inspection.reason === "missing_identity_binding"
          ? "PayPal capture was missing its server-created identity binding"
          : inspection.reason === "identity_or_package_binding_mismatch"
            ? "PayPal user or package verification failed"
            : inspection.reason === "payment_package_mismatch"
              ? "PayPal package verification failed"
              : "Completed PayPal capture requires manual recovery";
        recordRouteWarning("paypal/capture", warningMessage, undefined, {
          channel: "commerce",
          detail: { userId, orderId, expectedDrops, reason: inspection.reason },
        });
        return blockedCaptureResponse(inspection);
      }
    }

    const result = await creditCapturedPayment({
      ...paymentInput,
      usernameFallback: caller?.email || userId,
    });
    if (result.duplicate) {
      return NextResponse.json({
        success: true,
        drops: expectedDrops,
        duplicate: true,
        transactionId: result.transactionId ?? orderId,
      }, { status: 200 });
    }

    const capture = { id: result.captureId };
    const purchaseTelemetryEvent = buildServerPurchaseTelemetryEvent({
      userId,
      transactionId: result.transactionId,
      orderId,
      captureId: capture.id,
      grossRevenueCents: result.economics.grossRevenueCents,
      grossRevenueUsd: result.economics.grossRevenueUsd,
      deliveredGumDrops: result.economics.deliveredGumDrops,
      paidGumDrops: result.economics.paidGumDrops,
      bonusGumDrops: result.economics.bonusGumDrops,
      bundleKey: result.bundlePresentation.bundleKey,
      route: "/api/paypal/capture",
      sourceComponent: "paypal_capture_route",
    });
    const [analyticsResult, taskEventResult, chatReminderResetResult] = await Promise.allSettled([
      trackServerEvent(purchaseTelemetryEvent.eventName, {
        ...purchaseTelemetryEvent.params,
        paypal_capture_id: capture.id,
        paypal_fee_usd: result.economics.paypalFeeUsd,
        net_revenue_usd: result.economics.netRevenueUsd,
        adjusted_profit_usd: result.economics.adjustedProfitUsd,
        items_count: expectedDrops,
      }, userId),
      recordCanonicalTaskEvent(userId, result.username, "gumdrops_purchase_completed", {
        package_drops: expectedDrops,
        purchase_value: result.paidUsd,
        bundle_key: result.bundlePresentation.bundleKey,
        bundle_tier: result.bundlePresentation.bundleTier,
        bonus_gumdrops: result.economics.bonusGumDrops,
        order_id: orderId,
        transaction_id: result.transactionId,
      }),
      result.chatPaidGdReminderReset
        ? trackServerEvent("chat_low_paid_gd_reminder_reset", {
            source_component: "paypal_capture_route",
            route: "/api/paypal/capture",
            paid_balance_gd: result.nextPaidBalanceGd,
            required_min_paid_gd: 1,
            subscriber_free_chat_applies: false,
            transaction_id: result.transactionId,
          }, userId)
        : Promise.resolve(null),
    ]);

    if (analyticsResult.status === "rejected") {
      recordRouteWarning("paypal/capture", "Purchase verified analytics sync failed", analyticsResult.reason, {
        channel: "analytics",
        detail: { userId, orderId, expectedDrops },
      });
    }
    if (taskEventResult.status === "rejected") {
      recordRouteWarning("paypal/capture", "Purchase completed but daily task progress sync failed", taskEventResult.reason, {
        channel: "analytics",
        detail: { userId, orderId, expectedDrops },
      });
    }
    if (chatReminderResetResult.status === "rejected") {
      recordRouteWarning("paypal/capture", "Chat paid GumDrops reminder reset tracking failed", chatReminderResetResult.reason, {
        channel: "analytics",
        detail: { userId, orderId, expectedDrops },
      });
    }

    const userRef = adminDb.collection("users").doc(userId);
    const updatedUserSnapshot = await userRef.get();
    const updatedUserData = (updatedUserSnapshot.data() ?? {}) as Partial<UserProfile>;
    await touchUserRuntime(userId, { activity: true, profile: true });

    return NextResponse.json({
      success: true,
      drops: expectedDrops,
      transactionId: result.transactionId,
      gumDropsBalance: Number.isFinite(updatedUserData.gumDropsBalance)
        ? Number(updatedUserData.gumDropsBalance)
        : null,
      dailyTasksState: (updatedUserData.dailyTasksState ?? null) as DailyTasksState | null,
    });
  } catch (error) {
    if (isBoundedJsonBodyError(error)) {
      return NextResponse.json({
        error: error.message,
        code: error.code,
        retryable: false,
      }, { status: error.status });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: "Choose a valid payment order and GumDrop package.",
        code: "invalid_payment_request",
        retryable: false,
        details: error.issues.map((issue) => issue.message).slice(0, 8),
      }, { status: 400 });
    }
    return handleApiError(error, "PayPal.Capture");
  }
}

export let POST = withRouteRuntimeHealth("paypal/capture:POST", POST_handler);
