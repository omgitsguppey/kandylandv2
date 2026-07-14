import "server-only";

import { randomUUID } from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";
import { z } from "zod";
import { adminDb } from "@/lib/server/firebase-admin";

/**
 * Canonical owner: paymentLocks/{orderId} PayPal order and capture lifecycle.
 * Source truth: authenticated server-created order plus normalized PayPal capture proof.
 * Cost class: sensitive payment write; bounded Firestore transactions and recovery reads.
 * Telemetry/debug: paypal/capture route diagnostics and canonical purchase telemetry.
 * Validator: PayPal route regression tests and check:payment-unlock-security.
 */
const CAPTURE_LEASE_MS = 2 * 60 * 1000;
export const paypalOrderIdSchema = z.string()
  .min(1)
  .max(128)
  .regex(/^[A-Za-z0-9_-]+$/u);

export const paypalPaymentStateSchema = z.object({
  orderId: paypalOrderIdSchema,
  userId: z.string().min(1),
  expectedDrops: z.number().int().positive().optional(),
  drops: z.number().int().positive().optional(),
  expectedPrice: z.string().optional(),
  currency: z.string().optional(),
  customId: z.string().optional(),
  status: z.enum([
    "pending",
    "capture_reserved",
    "capture_recovery_required",
    "captured_uncredited",
    "credited",
  ]).optional(),
  captureAttemptId: z.string().optional(),
  captureLeaseExpiresAtMs: z.number().optional(),
  captureVerification: z.enum(["verified", "blocked"]).optional(),
  captureId: z.string().nullable().optional(),
  captureStatus: z.string().nullable().optional(),
  capturedAmount: z.string().nullable().optional(),
  capturedCurrency: z.string().nullable().optional(),
  capturedCustomId: z.string().nullable().optional(),
  paypalFeeAmount: z.string().nullable().optional(),
  netAmount: z.string().nullable().optional(),
  transactionId: z.string().optional(),
}).passthrough();

export type PayPalPaymentState = z.infer<typeof paypalPaymentStateSchema>;
export type PayPalPaymentInput = {
  orderId: string;
  userId: string;
  expectedDrops: number;
  expectedPrice: string;
};
export type PayPalCaptureRequest = Omit<PayPalPaymentInput, "expectedPrice">;
export type PayPalCaptureEvidence = {
  captureId: string | null;
  captureStatus: string | null;
  amount: string | null;
  currency: string | null;
  customId: string | null;
  paypalFeeAmount: string | null;
  netAmount: string | null;
  providerStatus: string;
};
export type PayPalCaptureInspection =
  | { kind: "non_completed"; providerStatus: string }
  | { kind: "verified"; evidence: PayPalCaptureEvidence }
  | { kind: "blocked"; evidence: PayPalCaptureEvidence; reason: string };
export type PayPalCaptureAction =
  | { kind: "capture"; attemptId: string; expectedPrice: string }
  | { kind: "reconcile"; canRecapture: boolean; expectedPrice: string; attemptId: string }
  | { kind: "resume_credit"; expectedPrice: string }
  | { kind: "duplicate"; transactionId?: string }
  | { kind: "error"; status: number; code: string; message: string; retryable: boolean };

function errorAction(
  status: number,
  code: string,
  message: string,
  retryable: boolean,
): PayPalCaptureAction {
  return { kind: "error", status, code, message, retryable };
}

export function validateStoredPayPalPayment(
  data: Record<string, unknown> | undefined,
  input: PayPalCaptureRequest & { expectedPrice?: string },
): { ok: true; state: PayPalPaymentState; legacyCredited: boolean } | { ok: false; result: PayPalCaptureAction } {
  const parsed = paypalPaymentStateSchema.safeParse(data);
  if (!parsed.success || parsed.data.orderId !== input.orderId) {
    return { ok: false, result: errorAction(409, "payment_state_invalid", "Payment order state is invalid", false) };
  }

  const state = parsed.data;
  if (state.userId !== input.userId) {
    return { ok: false, result: errorAction(403, "payment_order_owner_mismatch", "User verification failed", false) };
  }
  if ((state.expectedDrops ?? state.drops) !== input.expectedDrops) {
    return { ok: false, result: errorAction(400, "payment_order_package_mismatch", "Payment package mismatch", false) };
  }
  if (!state.status) {
    return { ok: true, state, legacyCredited: true };
  }
  const storedPrice = state.expectedPrice;
  if (
    typeof storedPrice !== "string"
    || !/^\d+\.\d{2}$/u.test(storedPrice)
    || Number.parseFloat(storedPrice) <= 0
    || (input.expectedPrice !== undefined && storedPrice !== input.expectedPrice)
    || state.currency !== "USD"
    || state.customId !== `${input.userId}:${input.expectedDrops}`
  ) {
    return { ok: false, result: errorAction(409, "payment_order_contract_mismatch", "Payment order contract mismatch", false) };
  }
  return { ok: true, state, legacyCredited: false };
}

export async function persistPendingPayPalOrder(input: PayPalPaymentInput) {
  const paymentLockRef = adminDb.collection("paymentLocks").doc(input.orderId);
  await adminDb.runTransaction(async (transaction) => {
    const existingLock = await transaction.get(paymentLockRef);
    if (existingLock.exists) {
      throw new Error("PayPal returned an order identifier that is already owned.");
    }
    transaction.set(paymentLockRef, {
      ...input,
      drops: input.expectedDrops,
      currency: "USD",
      customId: `${input.userId}:${input.expectedDrops}`,
      status: "pending",
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  });
}

export async function beginPayPalCapture(input: PayPalCaptureRequest): Promise<PayPalCaptureAction> {
  const paymentLockRef = adminDb.collection("paymentLocks").doc(input.orderId);
  const userRef = adminDb.collection("users").doc(input.userId);
  const attemptId = randomUUID();
  const nowMs = Date.now();

  return adminDb.runTransaction(async (transaction) => {
    const existingLock = await transaction.get(paymentLockRef);
    if (!existingLock.exists) {
      return errorAction(404, "pending_payment_order_missing", "Payment order not found", false);
    }
    const validation = validateStoredPayPalPayment(existingLock.data(), input);
    if (!validation.ok) return validation.result;
    if (validation.legacyCredited || validation.state.status === "credited") {
      return { kind: "duplicate", transactionId: validation.state.transactionId };
    }

    const userSnapshot = await transaction.get(userRef);
    if (!userSnapshot.exists) {
      return errorAction(409, "payment_user_missing", "Payment account is unavailable", true);
    }
    if (validation.state.status === "captured_uncredited") {
      return validation.state.captureVerification === "verified"
        ? { kind: "resume_credit", expectedPrice: validation.state.expectedPrice! }
        : errorAction(409, "captured_payment_recovery_required", "Payment requires support recovery", false);
    }
    if (validation.state.status === "capture_reserved" || validation.state.status === "capture_recovery_required") {
      if (!validation.state.captureAttemptId) {
        return errorAction(409, "payment_capture_reservation_invalid", "Payment capture reservation is invalid", false);
      }
      return {
        kind: "reconcile",
        expectedPrice: validation.state.expectedPrice!,
        attemptId: validation.state.captureAttemptId,
        canRecapture: validation.state.status === "capture_recovery_required"
          || (validation.state.captureLeaseExpiresAtMs ?? 0) <= nowMs,
      };
    }
    if (validation.state.status !== "pending") {
      return errorAction(409, "payment_state_not_capturable", "Payment order is not capturable", false);
    }

    transaction.update(paymentLockRef, {
      status: "capture_reserved",
      captureAttemptId: attemptId,
      captureRequestId: `capture_${input.orderId}`,
      captureLeaseExpiresAtMs: nowMs + CAPTURE_LEASE_MS,
      captureAttemptCount: FieldValue.increment(1),
      updatedAt: FieldValue.serverTimestamp(),
    });
    return { kind: "capture", attemptId, expectedPrice: validation.state.expectedPrice! };
  });
}

export async function reservePayPalCaptureRecovery(
  input: PayPalPaymentInput,
  observedAttemptId: string,
): Promise<PayPalCaptureAction> {
  const paymentLockRef = adminDb.collection("paymentLocks").doc(input.orderId);
  const userRef = adminDb.collection("users").doc(input.userId);
  const attemptId = randomUUID();
  const nowMs = Date.now();

  return adminDb.runTransaction(async (transaction) => {
    const existingLock = await transaction.get(paymentLockRef);
    if (!existingLock.exists) {
      return errorAction(404, "pending_payment_order_missing", "Payment order not found", false);
    }
    const validation = validateStoredPayPalPayment(existingLock.data(), input);
    if (!validation.ok) return validation.result;
    if (validation.legacyCredited || validation.state.status === "credited") {
      return { kind: "duplicate", transactionId: validation.state.transactionId };
    }
    if (validation.state.status === "captured_uncredited") {
      return validation.state.captureVerification === "verified"
        ? { kind: "resume_credit", expectedPrice: validation.state.expectedPrice! }
        : errorAction(409, "captured_payment_recovery_required", "Payment requires support recovery", false);
    }

    const userSnapshot = await transaction.get(userRef);
    if (!userSnapshot.exists) {
      return errorAction(409, "payment_user_missing", "Payment account is unavailable", true);
    }

    const canReserve = validation.state.status === "capture_recovery_required"
      || (validation.state.status === "capture_reserved" && (validation.state.captureLeaseExpiresAtMs ?? 0) <= nowMs);
    if (!canReserve || validation.state.captureAttemptId !== observedAttemptId) {
      return {
        kind: "reconcile",
        canRecapture: false,
        expectedPrice: validation.state.expectedPrice!,
        attemptId: validation.state.captureAttemptId ?? observedAttemptId,
      };
    }

    transaction.update(paymentLockRef, {
      status: "capture_reserved",
      captureAttemptId: attemptId,
      captureRequestId: `capture_${input.orderId}`,
      captureLeaseExpiresAtMs: nowMs + CAPTURE_LEASE_MS,
      captureAttemptCount: FieldValue.increment(1),
      updatedAt: FieldValue.serverTimestamp(),
    });
    return { kind: "capture", attemptId, expectedPrice: validation.state.expectedPrice! };
  });
}

export async function markPayPalCaptureRecoveryRequired(input: {
  orderId: string;
  attemptId: string;
  reason: string;
  providerStatus?: string;
}) {
  const paymentLockRef = adminDb.collection("paymentLocks").doc(input.orderId);
  return adminDb.runTransaction(async (transaction) => {
    const existingLock = await transaction.get(paymentLockRef);
    const state = existingLock.exists ? paypalPaymentStateSchema.safeParse(existingLock.data()) : null;
    if (
      !state?.success
      || (state.data.status !== "capture_reserved" && state.data.status !== "capture_recovery_required")
      || state.data.captureAttemptId !== input.attemptId
    ) {
      return false;
    }
    transaction.update(paymentLockRef, {
      status: "capture_recovery_required",
      recoveryReason: input.reason,
      providerOrderStatus: input.providerStatus?.slice(0, 64) ?? null,
      captureLeaseExpiresAtMs: 0,
      updatedAt: FieldValue.serverTimestamp(),
    });
    return true;
  });
}

export async function persistCapturedPayPalPayment(input: PayPalPaymentInput & {
  inspection: Extract<PayPalCaptureInspection, { kind: "verified" | "blocked" }>;
  source: "capture" | "reconciliation";
  attemptId: string;
}): Promise<"captured_uncredited" | "credited"> {
  const paymentLockRef = adminDb.collection("paymentLocks").doc(input.orderId);
  return adminDb.runTransaction(async (transaction) => {
    const existingLock = await transaction.get(paymentLockRef);
    if (!existingLock.exists) throw new Error("Captured payment order state is missing.");

    const validation = validateStoredPayPalPayment(existingLock.data(), input);
    if (!validation.ok) {
      throw new Error(validation.result.kind === "error" ? validation.result.message : "Captured payment order state is invalid.");
    }
    if (validation.legacyCredited || validation.state.status === "credited") return "credited";
    if (validation.state.status === "captured_uncredited") {
      const currentId = validation.state.captureId;
      if (currentId && input.inspection.evidence.captureId && currentId !== input.inspection.evidence.captureId) {
        throw new Error("Payment order has conflicting capture identifiers.");
      }
      if (validation.state.captureVerification === "verified") return "captured_uncredited";
    } else if (validation.state.status !== "capture_reserved" && validation.state.status !== "capture_recovery_required") {
      throw new Error("Payment order is not ready to persist capture evidence.");
    }
    if (
      validation.state.status !== "captured_uncredited"
      && validation.state.captureAttemptId !== input.attemptId
    ) {
      throw new Error("Payment capture reservation changed before evidence could be persisted.");
    }

    transaction.update(paymentLockRef, {
      status: "captured_uncredited",
      captureVerification: input.inspection.kind === "verified" ? "verified" : "blocked",
      recoveryReason: input.inspection.kind === "blocked" ? input.inspection.reason : null,
      captureId: input.inspection.evidence.captureId,
      captureStatus: input.inspection.evidence.captureStatus,
      capturedAmount: input.inspection.evidence.amount,
      capturedCurrency: input.inspection.evidence.currency,
      capturedCustomId: input.inspection.evidence.customId,
      paypalFeeAmount: input.inspection.evidence.paypalFeeAmount,
      netAmount: input.inspection.evidence.netAmount,
      providerOrderStatus: input.inspection.evidence.providerStatus,
      captureLeaseExpiresAtMs: 0,
      capturedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    return "captured_uncredited";
  });
}
