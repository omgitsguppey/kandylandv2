import {onDocumentCreated} from "firebase-functions/v2/firestore"
import {FieldValue} from "firebase-admin/firestore"

import {buildIncrementUpdate, encodeKeyFragment, readNumber, readString, toTimeKeys} from "./analytics-core.js"
import {db} from "./firebase-admin.js"
import {REGION} from "./firebase-runtime.js"
import {deriveGumdropEconomics} from "./gumdrop-economics.js"
import {touchAnalyticsRuntime} from "./analytics-runtime.js"

interface TransactionFact {
  type?: string;
  status?: string;
  userId?: string;
  amount?: number;
  rewardSource?: string;
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
  timestampMs?: number;
  description?: string;
  dropId?: string;
  relatedDropId?: string;
}

function isFirestoreAlreadyExists(error: unknown) {
  const candidate = error as {code?: unknown; message?: unknown}
  return candidate.code === 6
    || candidate.code === "already-exists"
    || candidate.code === "ALREADY_EXISTS"
    || (typeof candidate.message === "string" && candidate.message.includes("ALREADY_EXISTS"))
}

function readOptionalNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined
}

function readTimestampMillis(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.trunc(value)
  }

  if (!value || typeof value !== "object") {
    return undefined
  }

  if ("toMillis" in value && typeof (value as {toMillis?: () => number}).toMillis === "function") {
    const millis = (value as {toMillis: () => number}).toMillis()
    return Number.isFinite(millis) ? Math.trunc(millis) : undefined
  }

  const seconds = readOptionalNumber((value as {seconds?: unknown; _seconds?: unknown}).seconds)
    ?? readOptionalNumber((value as {seconds?: unknown; _seconds?: unknown})._seconds)
  if (typeof seconds !== "number") {
    return undefined
  }

  const nanoseconds = readOptionalNumber((value as {nanoseconds?: unknown; _nanoseconds?: unknown}).nanoseconds)
    ?? readOptionalNumber((value as {nanoseconds?: unknown; _nanoseconds?: unknown})._nanoseconds)
    ?? 0

  return Math.trunc(seconds * 1000 + nanoseconds / 1_000_000)
}

function classifyTransaction(data: TransactionFact, amount: number, status: string) {
  const rewardSource = readString(data.rewardSource)
  const isCompleted = status === "completed"

  if (!isCompleted) {
    return {
      gumdropDelta: 0,
      gumdropCreditTotal: 0,
      gumdropDebitTotal: 0,
      gumdropRewardTotal: 0,
      gumdropPurchaseTotal: 0,
      gumdropSpendTotal: 0,
      gumdropAdjustmentPositiveTotal: 0,
      gumdropAdjustmentNegativeTotal: 0,
      rewardTransactionCount: 0,
      checkInRewardCount: 0,
      taskRewardCount: 0,
      onboardingRewardCount: 0,
      referralBonusCount: 0,
      purchaseTransactionCount: 0,
      spendTransactionCount: 0,
      adminAdjustmentCount: 0,
    }
  }

  const positiveAmount = Math.max(0, amount)
  const negativeAmount = Math.max(0, Math.abs(Math.min(0, amount)))
  const type = readString(data.type)
  const isRewardTransaction = type === "daily_reward" || type === "onboarding_reward" || type === "referral_bonus"
  const isPurchaseTransaction = type === "purchase_currency"
  const isSpendTransaction = type === "unlock_content" || type === "creator_message_text" || type === "creator_message_image" || type === "creator_message_video" || type === "creator_subscription" || type === "creator_subscription_renewal" || type === "creator_custom_request" || type === "creator_booking_phone" || type === "creator_booking_video"
  const isAdminAdjustment = type === "admin_adjustment"

  const explicitPaid = readOptionalNumber(data.paidGumDrops) ?? 0
  const explicitBonus = readOptionalNumber(data.bonusGumDrops) ?? 0
  const purchasePaidAmount = isPurchaseTransaction ? (explicitPaid > 0 ? explicitPaid : positiveAmount) : 0
  const purchaseBonusAmount = isPurchaseTransaction ? explicitBonus : 0

  return {
    gumdropDelta: amount,
    gumdropCreditTotal: positiveAmount,
    gumdropDebitTotal: negativeAmount,
    gumdropRewardTotal: (isRewardTransaction ? positiveAmount : 0) + purchaseBonusAmount,
    gumdropPurchaseTotal: purchasePaidAmount,
    gumdropSpendTotal: isSpendTransaction ? negativeAmount : 0,
    gumdropAdjustmentPositiveTotal: isAdminAdjustment ? positiveAmount : 0,
    gumdropAdjustmentNegativeTotal: isAdminAdjustment ? negativeAmount : 0,
    rewardTransactionCount: isRewardTransaction ? 1 : 0,
    checkInRewardCount: type === "daily_reward" && rewardSource === "check_in" ? 1 : 0,
    taskRewardCount: type === "daily_reward" && rewardSource === "task" ? 1 : 0,
    onboardingRewardCount: type === "onboarding_reward" ? 1 : 0,
    referralBonusCount: type === "referral_bonus" ? 1 : 0,
    purchaseTransactionCount: isPurchaseTransaction ? 1 : 0,
    spendTransactionCount: isSpendTransaction ? 1 : 0,
    adminAdjustmentCount: isAdminAdjustment ? 1 : 0,
  }
}

function resolveEconomics(data: TransactionFact, amount: number) {
  const storedGrossRevenueUsd = readOptionalNumber(data.grossRevenueUsd)
  const storedGrossRevenueCents = readOptionalNumber(data.grossRevenueCents)
  const storedPaypalFeeUsd = readOptionalNumber(data.paypalFeeUsd)
  const storedPaypalFeeCents = readOptionalNumber(data.paypalFeeCents)
  const storedNetRevenueUsd = readOptionalNumber(data.netRevenueUsd)
  const storedNetRevenueCents = readOptionalNumber(data.netRevenueCents)
  const storedDeliveredGumDrops = readOptionalNumber(data.deliveredGumDrops)
  const storedPaidGumDrops = readOptionalNumber(data.paidGumDrops)
  const storedBonusGumDrops = readOptionalNumber(data.bonusGumDrops)
  const storedRetailValueUsd = readOptionalNumber(data.retailValueUsd)
  const storedBonusValueUsd = readOptionalNumber(data.bonusValueUsd)
  const storedAdjustedProfitUsd = readOptionalNumber(data.adjustedProfitUsd)
  const storedAdjustedProfitCents = readOptionalNumber(data.adjustedProfitCents)
  const storedEffectiveUsdPer100Gd = readOptionalNumber(data.effectiveUsdPer100Gd)
  const grossRevenueUsdFromCents = typeof storedGrossRevenueCents === "number" ? storedGrossRevenueCents / 100 : undefined
  const paypalFeeUsdFromCents = typeof storedPaypalFeeCents === "number" ? storedPaypalFeeCents / 100 : undefined
  const netRevenueUsdFromCents = typeof storedNetRevenueCents === "number" ? storedNetRevenueCents / 100 : undefined
  const adjustedProfitUsdFromCents = typeof storedAdjustedProfitCents === "number" ? storedAdjustedProfitCents / 100 : undefined

  const fallbackGrossRevenueUsd = storedGrossRevenueUsd ?? grossRevenueUsdFromCents ?? readOptionalNumber(data.cost) ?? 0
  const fallbackDeliveredGumDrops = storedDeliveredGumDrops ?? amount
  const derived = deriveGumdropEconomics(fallbackDeliveredGumDrops, fallbackGrossRevenueUsd, {
    paypalFeeUsd: storedPaypalFeeUsd ?? paypalFeeUsdFromCents,
    netRevenueUsd: storedNetRevenueUsd ?? netRevenueUsdFromCents,
  })

  return {
    grossRevenueUsd: storedGrossRevenueUsd ?? grossRevenueUsdFromCents ?? derived.grossRevenueUsd,
    grossRevenueCents: storedGrossRevenueCents ?? derived.grossRevenueCents,
    paypalFeeUsd: storedPaypalFeeUsd ?? paypalFeeUsdFromCents ?? derived.paypalFeeUsd,
    paypalFeeCents: storedPaypalFeeCents ?? derived.paypalFeeCents,
    netRevenueUsd: storedNetRevenueUsd ?? netRevenueUsdFromCents ?? derived.netRevenueUsd,
    netRevenueCents: storedNetRevenueCents ?? derived.netRevenueCents,
    deliveredGumDrops: storedDeliveredGumDrops ?? derived.deliveredGumDrops,
    paidGumDrops: storedPaidGumDrops ?? derived.paidGumDrops,
    bonusGumDrops: storedBonusGumDrops ?? derived.bonusGumDrops,
    retailValueUsd: storedRetailValueUsd ?? derived.retailValueUsd,
    bonusValueUsd: storedBonusValueUsd ?? derived.bonusValueUsd,
    adjustedProfitUsd: storedAdjustedProfitUsd ?? adjustedProfitUsdFromCents ?? derived.adjustedProfitUsd,
    adjustedProfitCents: storedAdjustedProfitCents ?? derived.adjustedProfitCents,
    effectiveUsdPer100Gd: storedEffectiveUsdPer100Gd ?? derived.effectiveUsdPer100Gd,
  }
}

export const onTransactionCreated = onDocumentCreated(
  {document: "transactions/{transactionId}", region: REGION},
  async (event) => {
    const data = event.data?.data() as TransactionFact | undefined
    if (!data) {
      return
    }

    const timestamp = readOptionalNumber(data.timestampMs)
      ?? readTimestampMillis(data.timestamp)
      ?? Date.now()
    const timeKeys = toTimeKeys(timestamp)
    const type = readString(data.type) || "unknown"
    const status = readString(data.status) || "unknown"
    const userId = readString(data.userId)
    const dropId = readString(data.dropId) || readString(data.relatedDropId)
    const amount = readNumber(data.amount)
    const unlockSpendAmount = type === "unlock_content" ? Math.abs(amount) : 0
    const economics = resolveEconomics(data, amount)
    const economyMetrics = classifyTransaction(data, amount, status)
    const bundleLabel = readString(data.bundleLabel) || `${economics.deliveredGumDrops} GD`
    const bundleKey = readString(data.bundleKey) || encodeKeyFragment(bundleLabel)
    const bundleTier = readString(data.bundleTier) || (economics.bonusGumDrops > 0 ? "bonus" : "standard")
    const projectionReceiptRef = db.collection("analytics_projection_receipts").doc(`transactions:${event.id}:commerce_rollup`)
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
        gumdropDeltaTotal: buildIncrementUpdate(economyMetrics.gumdropDelta),
        gumdropCreditTotal: buildIncrementUpdate(economyMetrics.gumdropCreditTotal),
        gumdropDebitTotal: buildIncrementUpdate(economyMetrics.gumdropDebitTotal),
        gumdropRewardTotal: buildIncrementUpdate(economyMetrics.gumdropRewardTotal),
        gumdropPurchaseTotal: buildIncrementUpdate(economyMetrics.gumdropPurchaseTotal),
        gumdropSpendTotal: buildIncrementUpdate(economyMetrics.gumdropSpendTotal),
        gumdropAdjustmentPositiveTotal: buildIncrementUpdate(economyMetrics.gumdropAdjustmentPositiveTotal),
        gumdropAdjustmentNegativeTotal: buildIncrementUpdate(economyMetrics.gumdropAdjustmentNegativeTotal),
        rewardTransactionCount: buildIncrementUpdate(economyMetrics.rewardTransactionCount),
        checkInRewardCount: buildIncrementUpdate(economyMetrics.checkInRewardCount),
        taskRewardCount: buildIncrementUpdate(economyMetrics.taskRewardCount),
        onboardingRewardCount: buildIncrementUpdate(economyMetrics.onboardingRewardCount),
        referralBonusCount: buildIncrementUpdate(economyMetrics.referralBonusCount),
        adminAdjustmentCount: buildIncrementUpdate(economyMetrics.adminAdjustmentCount),
        spendGdTotal: buildIncrementUpdate(unlockSpendAmount),
        unlockSpendGdTotal: buildIncrementUpdate(unlockSpendAmount),
        revenueCentsTotal: buildIncrementUpdate(type === "purchase_currency" && status === "completed" ? economics.grossRevenueCents : 0),
        purchaseCount: buildIncrementUpdate(type === "purchase_currency" && status === "completed" ? 1 : 0),
        purchaseTransactionCount: buildIncrementUpdate(economyMetrics.purchaseTransactionCount),
        unlockCount: buildIncrementUpdate(type === "unlock_content" ? 1 : 0),
        spendTransactionCount: buildIncrementUpdate(economyMetrics.spendTransactionCount),
        ...commercePatch,
        updatedAt: FieldValue.serverTimestamp(),
        lastSeenAt: timestamp,
      }, {merge: true})

      batch.set(db.collection("analytics_users_rollup").doc(userId), {
        uid: userId,
        transactionCount: buildIncrementUpdate(1),
        gumdropDeltaTotal: buildIncrementUpdate(economyMetrics.gumdropDelta),
        gumdropCreditTotal: buildIncrementUpdate(economyMetrics.gumdropCreditTotal),
        gumdropDebitTotal: buildIncrementUpdate(economyMetrics.gumdropDebitTotal),
        gumdropRewardTotal: buildIncrementUpdate(economyMetrics.gumdropRewardTotal),
        gumdropPurchaseTotal: buildIncrementUpdate(economyMetrics.gumdropPurchaseTotal),
        gumdropSpendTotal: buildIncrementUpdate(economyMetrics.gumdropSpendTotal),
        gumdropAdjustmentPositiveTotal: buildIncrementUpdate(economyMetrics.gumdropAdjustmentPositiveTotal),
        gumdropAdjustmentNegativeTotal: buildIncrementUpdate(economyMetrics.gumdropAdjustmentNegativeTotal),
        rewardTransactionCount: buildIncrementUpdate(economyMetrics.rewardTransactionCount),
        checkInRewardCount: buildIncrementUpdate(economyMetrics.checkInRewardCount),
        taskRewardCount: buildIncrementUpdate(economyMetrics.taskRewardCount),
        onboardingRewardCount: buildIncrementUpdate(economyMetrics.onboardingRewardCount),
        referralBonusCount: buildIncrementUpdate(economyMetrics.referralBonusCount),
        purchaseCount: buildIncrementUpdate(type === "purchase_currency" && status === "completed" ? 1 : 0),
        purchaseTransactionCount: buildIncrementUpdate(economyMetrics.purchaseTransactionCount),
        unlockCount: buildIncrementUpdate(type === "unlock_content" ? 1 : 0),
        spendTransactionCount: buildIncrementUpdate(economyMetrics.spendTransactionCount),
        adminAdjustmentCount: buildIncrementUpdate(economyMetrics.adminAdjustmentCount),
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

    batch.create(projectionReceiptRef, {
      processedAt: FieldValue.serverTimestamp(),
      sourceCollection: "transactions",
      sourceId: event.id,
      projection: "commerce_rollup",
      dayKey: timeKeys.dayKey,
      userId: userId || null,
      transactionType: type,
      status,
    })

    try {
      await batch.commit()
    } catch (error) {
      if (!isFirestoreAlreadyExists(error)) {
        throw error
      }
      console.warn(`[Analytics] Duplicate transaction rollup skipped: ${event.id}`)
      return
    }
    await touchAnalyticsRuntime(timestamp)
  },
)
