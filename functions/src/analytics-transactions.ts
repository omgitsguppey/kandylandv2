import {onDocumentCreated} from "firebase-functions/v2/firestore"
import {FieldValue} from "firebase-admin/firestore"

import {buildIncrementUpdate, encodeKeyFragment, readNumber, readString, toTimeKeys} from "./analytics-core.js"
import {db} from "./firebase-admin.js"
import {REGION} from "./firebase-runtime.js"
import {deriveGumdropEconomics} from "./gumdrop-economics.js"
import {incrementRealtimeNode} from "./analytics-realtime.js"

interface TransactionFact {
  type?: string;
  status?: string;
  userId?: string;
  amount?: number;
  cost?: number;
  grossRevenueUsd?: number;
  grossRevenueCents?: number;
  paypalFeeUsd?: number;
  paypalFeeCents?: number;
  netRevenueUsd?: number;
  netRevenueCents?: number;
  deliveredGumDrops?: number;
  paidGumDrops?: number;
  bonusGumDrops?: number;
  retailValueUsd?: number;
  bonusValueUsd?: number;
  adjustedProfitUsd?: number;
  adjustedProfitCents?: number;
  effectiveUsdPer100Gd?: number;
  bundleLabel?: string;
  bundleKey?: string;
  bundleTier?: string;
  timestamp?: number;
  description?: string;
  dropId?: string;
}

export const onTransactionCreated = onDocumentCreated(
  {document: "transactions/{transactionId}", region: REGION},
  async (event) => {
    const data = event.data?.data() as TransactionFact | undefined
    if (!data) {
      return
    }

    const timestamp = readNumber(data.timestamp) || Date.now()
    const timeKeys = toTimeKeys(timestamp)
    const type = readString(data.type) || "unknown"
    const status = readString(data.status) || "unknown"
    const userId = readString(data.userId)
    const dropId = readString(data.dropId)
    const amount = readNumber(data.amount)
    const unlockSpendAmount = type === "unlock_content" ? Math.abs(amount) : 0
    const cost = readNumber(data.cost)
    const grossRevenueUsd = readNumber(data.grossRevenueUsd) || cost
    const paypalFeeUsd = readNumber(data.paypalFeeUsd)
    const netRevenueUsd = readNumber(data.netRevenueUsd)
    const economics = deriveGumdropEconomics(
      readNumber(data.deliveredGumDrops) || amount,
      grossRevenueUsd,
      {
        paypalFeeUsd: paypalFeeUsd > 0 ? paypalFeeUsd : undefined,
        netRevenueUsd: netRevenueUsd > 0 ? netRevenueUsd : undefined,
      },
    )
    const bundleLabel = readString(data.bundleLabel) || `${economics.deliveredGumDrops} GD`
    const bundleKey = readString(data.bundleKey) || encodeKeyFragment(bundleLabel)
    const bundleTier = readString(data.bundleTier) || (economics.bonusGumDrops > 0 ? "bonus" : "standard")
    const batch = db.batch()

    batch.set(db.collection("analytics_commerce_daily").doc(timeKeys.dayKey), {
      dayKey: timeKeys.dayKey,
      transactionCount: buildIncrementUpdate(1),
      amountTotal: buildIncrementUpdate(amount),
      revenueCentsTotal: buildIncrementUpdate(type === "purchase_currency" && status === "completed" ? economics.grossRevenueCents : 0),
      grossRevenueUsdTotal: buildIncrementUpdate(type === "purchase_currency" && status === "completed" ? economics.grossRevenueUsd : 0),
      paypalFeeUsdTotal: buildIncrementUpdate(type === "purchase_currency" && status === "completed" ? economics.paypalFeeUsd : 0),
      paypalFeeCentsTotal: buildIncrementUpdate(type === "purchase_currency" && status === "completed" ? economics.paypalFeeCents : 0),
      netRevenueUsdTotal: buildIncrementUpdate(type === "purchase_currency" && status === "completed" ? economics.netRevenueUsd : 0),
      netRevenueCentsTotal: buildIncrementUpdate(type === "purchase_currency" && status === "completed" ? economics.netRevenueCents : 0),
      adjustedProfitUsdTotal: buildIncrementUpdate(type === "purchase_currency" && status === "completed" ? economics.adjustedProfitUsd : 0),
      adjustedProfitCentsTotal: buildIncrementUpdate(type === "purchase_currency" && status === "completed" ? economics.adjustedProfitCents : 0),
      retailValueUsdTotal: buildIncrementUpdate(type === "purchase_currency" && status === "completed" ? economics.retailValueUsd : 0),
      bonusValueUsdTotal: buildIncrementUpdate(type === "purchase_currency" && status === "completed" ? economics.bonusValueUsd : 0),
      bonusGumDropsTotal: buildIncrementUpdate(type === "purchase_currency" && status === "completed" ? economics.bonusGumDrops : 0),
      deliveredGumDropsTotal: buildIncrementUpdate(type === "purchase_currency" && status === "completed" ? economics.deliveredGumDrops : 0),
      paidGumDropsTotal: buildIncrementUpdate(type === "purchase_currency" && status === "completed" ? economics.paidGumDrops : 0),
      purchaseCount: buildIncrementUpdate(type === "purchase_currency" && status === "completed" ? 1 : 0),
      unlockCount: buildIncrementUpdate(type === "unlock_content" ? 1 : 0),
      unlockSpendGdTotal: buildIncrementUpdate(unlockSpendAmount),
      updatedAt: FieldValue.serverTimestamp(),
      lastTransactionAt: timestamp,
    }, {merge: true})

    batch.set(db.collection("analytics_commerce_rollup").doc("summary"), {
      transactionCount: buildIncrementUpdate(1),
      purchaseCount: buildIncrementUpdate(type === "purchase_currency" && status === "completed" ? 1 : 0),
      unlockCount: buildIncrementUpdate(type === "unlock_content" ? 1 : 0),
      paypalFeeUsdTotal: buildIncrementUpdate(type === "purchase_currency" && status === "completed" ? economics.paypalFeeUsd : 0),
      paypalFeeCentsTotal: buildIncrementUpdate(type === "purchase_currency" && status === "completed" ? economics.paypalFeeCents : 0),
      netRevenueUsdTotal: buildIncrementUpdate(type === "purchase_currency" && status === "completed" ? economics.netRevenueUsd : 0),
      netRevenueCentsTotal: buildIncrementUpdate(type === "purchase_currency" && status === "completed" ? economics.netRevenueCents : 0),
      grossRevenueUsdTotal: buildIncrementUpdate(type === "purchase_currency" && status === "completed" ? economics.grossRevenueUsd : 0),
      adjustedProfitUsdTotal: buildIncrementUpdate(type === "purchase_currency" && status === "completed" ? economics.adjustedProfitUsd : 0),
      retailValueUsdTotal: buildIncrementUpdate(type === "purchase_currency" && status === "completed" ? economics.retailValueUsd : 0),
      bonusValueUsdTotal: buildIncrementUpdate(type === "purchase_currency" && status === "completed" ? economics.bonusValueUsd : 0),
      bonusGumDropsTotal: buildIncrementUpdate(type === "purchase_currency" && status === "completed" ? economics.bonusGumDrops : 0),
      deliveredGumDropsTotal: buildIncrementUpdate(type === "purchase_currency" && status === "completed" ? economics.deliveredGumDrops : 0),
      paidGumDropsTotal: buildIncrementUpdate(type === "purchase_currency" && status === "completed" ? economics.paidGumDrops : 0),
      unlockSpendGdTotal: buildIncrementUpdate(unlockSpendAmount),
      updatedAt: FieldValue.serverTimestamp(),
      lastTransactionAt: timestamp,
    }, {merge: true})

    if (type === "purchase_currency" && status === "completed") {
      batch.set(db.collection("analytics_bundle_rollup").doc(bundleKey), {
        bundleKey,
        bundleLabel,
        bundleTier,
        purchaseCount: buildIncrementUpdate(1),
        grossRevenueUsdTotal: buildIncrementUpdate(economics.grossRevenueUsd),
        paypalFeeUsdTotal: buildIncrementUpdate(economics.paypalFeeUsd),
        paypalFeeCentsTotal: buildIncrementUpdate(economics.paypalFeeCents),
        netRevenueUsdTotal: buildIncrementUpdate(economics.netRevenueUsd),
        netRevenueCentsTotal: buildIncrementUpdate(economics.netRevenueCents),
        adjustedProfitUsdTotal: buildIncrementUpdate(economics.adjustedProfitUsd),
        retailValueUsdTotal: buildIncrementUpdate(economics.retailValueUsd),
        bonusValueUsdTotal: buildIncrementUpdate(economics.bonusValueUsd),
        bonusGumDropsTotal: buildIncrementUpdate(economics.bonusGumDrops),
        deliveredGumDropsTotal: buildIncrementUpdate(economics.deliveredGumDrops),
        paidGumDropsTotal: buildIncrementUpdate(economics.paidGumDrops),
        effectiveUsdPer100GdTotal: buildIncrementUpdate(economics.effectiveUsdPer100Gd),
        updatedAt: FieldValue.serverTimestamp(),
        lastTransactionAt: timestamp,
      }, {merge: true})

      batch.set(db.collection("analytics_bundle_daily").doc(`${timeKeys.dayKey}_${bundleKey}`), {
        dayKey: timeKeys.dayKey,
        bundleKey,
        bundleLabel,
        bundleTier,
        purchaseCount: buildIncrementUpdate(1),
        grossRevenueUsdTotal: buildIncrementUpdate(economics.grossRevenueUsd),
        paypalFeeUsdTotal: buildIncrementUpdate(economics.paypalFeeUsd),
        paypalFeeCentsTotal: buildIncrementUpdate(economics.paypalFeeCents),
        netRevenueUsdTotal: buildIncrementUpdate(economics.netRevenueUsd),
        netRevenueCentsTotal: buildIncrementUpdate(economics.netRevenueCents),
        adjustedProfitUsdTotal: buildIncrementUpdate(economics.adjustedProfitUsd),
        retailValueUsdTotal: buildIncrementUpdate(economics.retailValueUsd),
        bonusValueUsdTotal: buildIncrementUpdate(economics.bonusValueUsd),
        bonusGumDropsTotal: buildIncrementUpdate(economics.bonusGumDrops),
        deliveredGumDropsTotal: buildIncrementUpdate(economics.deliveredGumDrops),
        paidGumDropsTotal: buildIncrementUpdate(economics.paidGumDrops),
        effectiveUsdPer100GdTotal: buildIncrementUpdate(economics.effectiveUsdPer100Gd),
        updatedAt: FieldValue.serverTimestamp(),
        lastTransactionAt: timestamp,
      }, {merge: true})
    }

    if (userId) {
      const commercePatch: Record<string, number | ReturnType<typeof buildIncrementUpdate>> = {}
      if (type === "purchase_currency" && status === "completed") {
        commercePatch.purchaseCount = buildIncrementUpdate(1)
        commercePatch.purchaseTransactionCount = buildIncrementUpdate(1)
        commercePatch.grossRevenueUsdTotal = buildIncrementUpdate(economics.grossRevenueUsd)
        commercePatch.paypalFeeUsdTotal = buildIncrementUpdate(economics.paypalFeeUsd)
        commercePatch.paypalFeeCentsTotal = buildIncrementUpdate(economics.paypalFeeCents)
        commercePatch.netRevenueUsdTotal = buildIncrementUpdate(economics.netRevenueUsd)
        commercePatch.netRevenueCentsTotal = buildIncrementUpdate(economics.netRevenueCents)
        commercePatch.adjustedProfitUsdTotal = buildIncrementUpdate(economics.adjustedProfitUsd)
        commercePatch.retailValueUsdTotal = buildIncrementUpdate(economics.retailValueUsd)
        commercePatch.bonusValueUsdTotal = buildIncrementUpdate(economics.bonusValueUsd)
        commercePatch.bonusGumDropsTotal = buildIncrementUpdate(economics.bonusGumDrops)
        commercePatch.deliveredGumDropsTotal = buildIncrementUpdate(economics.deliveredGumDrops)
        commercePatch.paidGumDropsTotal = buildIncrementUpdate(economics.paidGumDrops)
        commercePatch.effectiveUsdPer100GdTotal = buildIncrementUpdate(economics.effectiveUsdPer100Gd)
        commercePatch.lastPurchaseAt = timestamp
      }
      batch.set(db.collection("analytics_user_daily").doc(`${timeKeys.dayKey}_${userId}`), {
        dayKey: timeKeys.dayKey,
        uid: userId,
        transactionCount: buildIncrementUpdate(1),
        spendGdTotal: buildIncrementUpdate(unlockSpendAmount),
        unlockSpendGdTotal: buildIncrementUpdate(unlockSpendAmount),
        revenueCentsTotal: buildIncrementUpdate(type === "purchase_currency" && status === "completed" ? economics.grossRevenueCents : 0),
        purchaseCount: buildIncrementUpdate(type === "purchase_currency" && status === "completed" ? 1 : 0),
        purchaseTransactionCount: buildIncrementUpdate(type === "purchase_currency" && status === "completed" ? 1 : 0),
        unlockCount: buildIncrementUpdate(type === "unlock_content" ? 1 : 0),
        ...commercePatch,
        updatedAt: FieldValue.serverTimestamp(),
        lastSeenAt: timestamp,
      }, {merge: true})

      batch.set(db.collection("analytics_users_rollup").doc(userId), {
        uid: userId,
        purchaseCount: buildIncrementUpdate(type === "purchase_currency" && status === "completed" ? 1 : 0),
        purchaseTransactionCount: buildIncrementUpdate(type === "purchase_currency" && status === "completed" ? 1 : 0),
        unlockCount: buildIncrementUpdate(type === "unlock_content" ? 1 : 0),
        spendGdTotal: buildIncrementUpdate(unlockSpendAmount),
        unlockSpendGdTotal: buildIncrementUpdate(unlockSpendAmount),
        revenueCentsTotal: buildIncrementUpdate(type === "purchase_currency" && status === "completed" ? economics.grossRevenueCents : 0),
        ...commercePatch,
        updatedAt: FieldValue.serverTimestamp(),
        lastSeenAt: timestamp,
      }, {merge: true})
    }

    if (dropId) {
      batch.set(db.collection("analytics_drop_daily").doc(`${timeKeys.dayKey}_${dropId}`), {
        dayKey: timeKeys.dayKey,
        dropId,
        unlockTransactionCount: buildIncrementUpdate(type === "unlock_content" ? 1 : 0),
        spendGdTotal: buildIncrementUpdate(unlockSpendAmount),
        updatedAt: FieldValue.serverTimestamp(),
        lastEventAt: timestamp,
      }, {merge: true})
    }

    await batch.commit()

    await incrementRealtimeNode("analytics/realtime/commerce", {
      transactionCount: 1,
      purchaseCount: type === "purchase_currency" && status === "completed" ? 1 : 0,
      unlockCount: type === "unlock_content" ? 1 : 0,
      revenueCentsTotal: type === "purchase_currency" && status === "completed" ? economics.grossRevenueCents : 0,
      grossRevenueUsdTotal: type === "purchase_currency" && status === "completed" ? economics.grossRevenueUsd : 0,
      paypalFeeUsdTotal: type === "purchase_currency" && status === "completed" ? economics.paypalFeeUsd : 0,
      paypalFeeCentsTotal: type === "purchase_currency" && status === "completed" ? economics.paypalFeeCents : 0,
      netRevenueUsdTotal: type === "purchase_currency" && status === "completed" ? economics.netRevenueUsd : 0,
      netRevenueCentsTotal: type === "purchase_currency" && status === "completed" ? economics.netRevenueCents : 0,
      adjustedProfitUsdTotal: type === "purchase_currency" && status === "completed" ? economics.adjustedProfitUsd : 0,
      bonusValueUsdTotal: type === "purchase_currency" && status === "completed" ? economics.bonusValueUsd : 0,
      bonusGumDropsTotal: type === "purchase_currency" && status === "completed" ? economics.bonusGumDrops : 0,
      unlockSpendGdTotal: unlockSpendAmount,
      lastTransactionAt: timestamp,
    })
  },
)
