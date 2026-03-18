import "server-only";

import * as admin from "firebase-admin";

import { adminDb } from "./firebase-admin";

const MAX_RECEIPT_DOC_ID_LENGTH = 180;

function encodeReceiptDocId(collectionName: string, receiptKey: string) {
  const encoded = Buffer.from(`${collectionName}:${receiptKey}`).toString("base64url");
  return encoded.slice(0, MAX_RECEIPT_DOC_ID_LENGTH) || "receipt";
}

function isAlreadyExistsError(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const code = "code" in error ? (error as { code?: unknown }).code : undefined;
  return code === 6 || code === "already-exists" || code === "ALREADY_EXISTS";
}

interface ClaimAnalyticsReceiptOptions {
  collectionName: string;
  receiptKey: string;
  data: Record<string, unknown>;
}

export async function claimAnalyticsReceipt(options: ClaimAnalyticsReceiptOptions) {
  const receiptRef = adminDb.collection(options.collectionName).doc(
    encodeReceiptDocId(options.collectionName, options.receiptKey),
  );

  try {
    await receiptRef.create({
      ...options.data,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return true;
  } catch (error) {
    if (isAlreadyExistsError(error)) {
      return false;
    }
    throw error;
  }
}
