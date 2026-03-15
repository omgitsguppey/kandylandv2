import { config as loadEnv } from "dotenv";

import * as admin from "firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

import { deriveGumdropEconomics, getBundlePresentation } from "@/lib/gumdrop-economics";
import { normalizeTransactionRecord } from "@/lib/transaction-normalizers";

loadEnv({ path: ".env.local" });

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  });
}

const adminDb = admin.firestore();

type CommerceAggregate = {
  transactionCount: number;
  purchaseCount: number;
  unlockCount: number;
  revenueCentsTotal: number;
  grossRevenueUsdTotal: number;
  paypalFeeUsdTotal: number;
  paypalFeeCentsTotal: number;
  netRevenueUsdTotal: number;
  netRevenueCentsTotal: number;
  adjustedProfitUsdTotal: number;
  adjustedProfitCentsTotal: number;
  retailValueUsdTotal: number;
  bonusValueUsdTotal: number;
  bonusGumDropsTotal: number;
  deliveredGumDropsTotal: number;
  paidGumDropsTotal: number;
  spendGdTotal: number;
  unlockSpendGdTotal: number;
  lastTransactionAt: number;
};

type UserAggregate = {
  purchaseCount: number;
  purchaseTransactionCount: number;
  unlockCount: number;
  unwrapCount: number;
  spendGdTotal: number;
  unlockSpendGdTotal: number;
  revenueCentsTotal: number;
  grossRevenueUsdTotal: number;
  paypalFeeUsdTotal: number;
  paypalFeeCentsTotal: number;
  netRevenueUsdTotal: number;
  netRevenueCentsTotal: number;
  adjustedProfitUsdTotal: number;
  retailValueUsdTotal: number;
  bonusValueUsdTotal: number;
  bonusGumDropsTotal: number;
  deliveredGumDropsTotal: number;
  paidGumDropsTotal: number;
  effectiveUsdPer100GdTotal: number;
  watchSecondsTotal: number;
  sessionCount: number;
  loadMsTotal: number;
  loadSampleCount: number;
  lastSeenAt: number;
  lastPurchaseAt: number;
};

type DailyRollupAggregate = {
  totalEvents: number;
  authenticatedEvents: number;
  viewerSessions: number;
  lastEventAt: number;
};

type TaskAggregate = {
  taskId?: string;
  title?: string;
  eventCount: number;
  rewardTotal: number;
  durationMsTotal: number;
  durationSampleCount: number;
  types: Record<string, number>;
  lastEventAt: number;
};

function roundCurrency(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function toTimestampNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (
    value
    && typeof value === "object"
    && "toMillis" in value
    && typeof (value as { toMillis: () => number }).toMillis === "function"
  ) {
    return (value as { toMillis: () => number }).toMillis();
  }

  return 0;
}

function toTimeKeys(timestamp: number) {
  const date = new Date(timestamp);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return {
    dayKey: `${year}-${month}-${day}`,
  };
}

function buildEmptyCommerceAggregate(): CommerceAggregate {
  return {
    transactionCount: 0,
    purchaseCount: 0,
    unlockCount: 0,
    revenueCentsTotal: 0,
    grossRevenueUsdTotal: 0,
    paypalFeeUsdTotal: 0,
    paypalFeeCentsTotal: 0,
    netRevenueUsdTotal: 0,
    netRevenueCentsTotal: 0,
    adjustedProfitUsdTotal: 0,
    adjustedProfitCentsTotal: 0,
    retailValueUsdTotal: 0,
    bonusValueUsdTotal: 0,
    bonusGumDropsTotal: 0,
    deliveredGumDropsTotal: 0,
    paidGumDropsTotal: 0,
    spendGdTotal: 0,
    unlockSpendGdTotal: 0,
    lastTransactionAt: 0,
  };
}

function buildEmptyUserAggregate(): UserAggregate {
  return {
    purchaseCount: 0,
    purchaseTransactionCount: 0,
    unlockCount: 0,
    unwrapCount: 0,
    spendGdTotal: 0,
    unlockSpendGdTotal: 0,
    revenueCentsTotal: 0,
    grossRevenueUsdTotal: 0,
    paypalFeeUsdTotal: 0,
    paypalFeeCentsTotal: 0,
    netRevenueUsdTotal: 0,
    netRevenueCentsTotal: 0,
    adjustedProfitUsdTotal: 0,
    retailValueUsdTotal: 0,
    bonusValueUsdTotal: 0,
    bonusGumDropsTotal: 0,
    deliveredGumDropsTotal: 0,
    paidGumDropsTotal: 0,
    effectiveUsdPer100GdTotal: 0,
    watchSecondsTotal: 0,
    sessionCount: 0,
    loadMsTotal: 0,
    loadSampleCount: 0,
    lastSeenAt: 0,
    lastPurchaseAt: 0,
  };
}

function buildEmptyDailyRollupAggregate(): DailyRollupAggregate {
  return {
    totalEvents: 0,
    authenticatedEvents: 0,
    viewerSessions: 0,
    lastEventAt: 0,
  };
}

function buildEmptyTaskAggregate(taskId?: string, title?: string): TaskAggregate {
  return {
    taskId,
    title,
    eventCount: 0,
    rewardTotal: 0,
    durationMsTotal: 0,
    durationSampleCount: 0,
    types: {},
    lastEventAt: 0,
  };
}

async function commitEntries(
  entries: Array<() => Promise<void>>,
) {
  for (const entry of entries) {
    await entry();
  }
}

async function main() {
  const [transactionsSnapshot, sessionFactsSnapshot, eventFactsSnapshot, taskEventsSnapshot] = await Promise.all([
    adminDb.collection("transactions").get(),
    adminDb.collection("analytics_session_facts").get(),
    adminDb.collection("analytics_event_facts").get(),
    adminDb.collection("daily_task_events").get(),
  ]);

  const commerceDaily = new Map<string, CommerceAggregate>();
  const bundleDaily = new Map<string, CommerceAggregate & { bundleLabel: string; bundleKey: string; bundleTier: string }>();
  const bundleRollup = new Map<string, CommerceAggregate & { bundleLabel: string; bundleKey: string; bundleTier: string }>();
  const userDaily = new Map<string, UserAggregate>();
  const userRollup = new Map<string, UserAggregate>();
  const dailyRollups = new Map<string, DailyRollupAggregate>();
  const taskDaily = new Map<string, TaskAggregate>();
  const taskRollup = new Map<string, TaskAggregate>();
  const commerceSummary = buildEmptyCommerceAggregate();

  transactionsSnapshot.docs.forEach((doc) => {
    try {
      const transaction = normalizeTransactionRecord(doc.data(), doc.id);
      const timestamp = typeof transaction.timestamp === "number" ? transaction.timestamp : toTimestampNumber(transaction.timestamp);
      const dayKey = toTimeKeys(timestamp || Date.now()).dayKey;
      const isPurchase = transaction.status === "completed" && transaction.type === "purchase_currency";
      const isUnlock = transaction.type === "unlock_content";
      const unlockSpendAmount = isUnlock ? Math.abs(transaction.amount) : 0;
      const economics = deriveGumdropEconomics(
        transaction.deliveredGumDrops ?? transaction.amount,
        transaction.grossRevenueUsd ?? transaction.cost ?? 0,
        {
          paypalFeeUsd: transaction.paypalFeeUsd,
          netRevenueUsd: transaction.netRevenueUsd,
        },
      );
      const bundlePresentation = getBundlePresentation(economics.deliveredGumDrops);
      const dayEntry = commerceDaily.get(dayKey) ?? buildEmptyCommerceAggregate();
      const userDayKey = `${dayKey}_${transaction.userId}`;
      const userDayEntry = userDaily.get(userDayKey) ?? buildEmptyUserAggregate();
      const userRollupEntry = userRollup.get(transaction.userId) ?? buildEmptyUserAggregate();

      const applyCommerce = (target: CommerceAggregate) => {
        target.transactionCount += 1;
        target.purchaseCount += isPurchase ? 1 : 0;
        target.unlockCount += isUnlock ? 1 : 0;
        target.revenueCentsTotal += isPurchase ? economics.grossRevenueCents : 0;
        target.grossRevenueUsdTotal += isPurchase ? economics.grossRevenueUsd : 0;
        target.paypalFeeUsdTotal += isPurchase ? economics.paypalFeeUsd : 0;
        target.paypalFeeCentsTotal += isPurchase ? economics.paypalFeeCents : 0;
        target.netRevenueUsdTotal += isPurchase ? economics.netRevenueUsd : 0;
        target.netRevenueCentsTotal += isPurchase ? economics.netRevenueCents : 0;
        target.adjustedProfitUsdTotal += isPurchase ? economics.adjustedProfitUsd : 0;
        target.adjustedProfitCentsTotal += isPurchase ? economics.adjustedProfitCents : 0;
        target.retailValueUsdTotal += isPurchase ? economics.retailValueUsd : 0;
        target.bonusValueUsdTotal += isPurchase ? economics.bonusValueUsd : 0;
        target.bonusGumDropsTotal += isPurchase ? economics.bonusGumDrops : 0;
        target.deliveredGumDropsTotal += isPurchase ? economics.deliveredGumDrops : 0;
        target.paidGumDropsTotal += isPurchase ? economics.paidGumDrops : 0;
        target.spendGdTotal += unlockSpendAmount;
        target.unlockSpendGdTotal += unlockSpendAmount;
        target.lastTransactionAt = Math.max(target.lastTransactionAt, timestamp);
      };

      const applyUserCommerce = (target: UserAggregate) => {
        target.purchaseCount += isPurchase ? 1 : 0;
        target.purchaseTransactionCount += isPurchase ? 1 : 0;
        target.unlockCount += isUnlock ? 1 : 0;
        target.unwrapCount += isUnlock ? 1 : 0;
        target.spendGdTotal += unlockSpendAmount;
        target.unlockSpendGdTotal += unlockSpendAmount;
        target.revenueCentsTotal += isPurchase ? economics.grossRevenueCents : 0;
        target.grossRevenueUsdTotal += isPurchase ? economics.grossRevenueUsd : 0;
        target.paypalFeeUsdTotal += isPurchase ? economics.paypalFeeUsd : 0;
        target.paypalFeeCentsTotal += isPurchase ? economics.paypalFeeCents : 0;
        target.netRevenueUsdTotal += isPurchase ? economics.netRevenueUsd : 0;
        target.netRevenueCentsTotal += isPurchase ? economics.netRevenueCents : 0;
        target.adjustedProfitUsdTotal += isPurchase ? economics.adjustedProfitUsd : 0;
        target.retailValueUsdTotal += isPurchase ? economics.retailValueUsd : 0;
        target.bonusValueUsdTotal += isPurchase ? economics.bonusValueUsd : 0;
        target.bonusGumDropsTotal += isPurchase ? economics.bonusGumDrops : 0;
        target.deliveredGumDropsTotal += isPurchase ? economics.deliveredGumDrops : 0;
        target.paidGumDropsTotal += isPurchase ? economics.paidGumDrops : 0;
        target.effectiveUsdPer100GdTotal += isPurchase ? economics.effectiveUsdPer100Gd : 0;
        target.lastSeenAt = Math.max(target.lastSeenAt, timestamp);
        target.lastPurchaseAt = Math.max(target.lastPurchaseAt, isPurchase ? timestamp : 0);
      };

      applyCommerce(dayEntry);
      applyCommerce(commerceSummary);
      applyUserCommerce(userDayEntry);
      applyUserCommerce(userRollupEntry);

      commerceDaily.set(dayKey, dayEntry);
      userDaily.set(userDayKey, userDayEntry);
      userRollup.set(transaction.userId, userRollupEntry);

      if (isPurchase) {
        const bundleDayKey = `${dayKey}_${bundlePresentation.bundleKey}`;
        const bundleDayEntry = bundleDaily.get(bundleDayKey) ?? {
          ...buildEmptyCommerceAggregate(),
          bundleLabel: bundlePresentation.bundleLabel,
          bundleKey: bundlePresentation.bundleKey,
          bundleTier: bundlePresentation.bundleTier,
        };
        const bundleRollupEntry = bundleRollup.get(bundlePresentation.bundleKey) ?? {
          ...buildEmptyCommerceAggregate(),
          bundleLabel: bundlePresentation.bundleLabel,
          bundleKey: bundlePresentation.bundleKey,
          bundleTier: bundlePresentation.bundleTier,
        };
        applyCommerce(bundleDayEntry);
        applyCommerce(bundleRollupEntry);
        bundleDaily.set(bundleDayKey, bundleDayEntry);
        bundleRollup.set(bundlePresentation.bundleKey, bundleRollupEntry);
      }
    } catch (error) {
      console.error("Skipping malformed transaction during parity backfill", doc.id, error);
    }
  });

  sessionFactsSnapshot.docs.forEach((doc) => {
    const data = doc.data() as Record<string, unknown>;
    const userId = typeof data.userId === "string" ? data.userId : "";
    if (!userId) {
      return;
    }

    const timestamp = toTimestampNumber(data.lastEventAt) || toTimestampNumber(data.lastEventAtMs) || Date.now();
    const dayKey = typeof data.dayKey === "string" ? data.dayKey : toTimeKeys(timestamp).dayKey;
    const startedCount = Number(data.startedCount || 0);
    const watchSecondsTotal = Number(data.watchSecondsTotal || 0);
    const loadMsTotal = Number(data.loadMsTotal || 0);
    const loadSampleCount = Number(data.loadSampleCount || 0);
    const userDayKey = `${dayKey}_${userId}`;
    const userDayEntry = userDaily.get(userDayKey) ?? buildEmptyUserAggregate();
    const userRollupEntry = userRollup.get(userId) ?? buildEmptyUserAggregate();

    userDayEntry.sessionCount += startedCount;
    userDayEntry.watchSecondsTotal += watchSecondsTotal;
    userDayEntry.loadMsTotal += loadMsTotal;
    userDayEntry.loadSampleCount += loadSampleCount;
    userDayEntry.lastSeenAt = Math.max(userDayEntry.lastSeenAt, timestamp);
    userRollupEntry.sessionCount += startedCount;
    userRollupEntry.watchSecondsTotal += watchSecondsTotal;
    userRollupEntry.loadMsTotal += loadMsTotal;
    userRollupEntry.loadSampleCount += loadSampleCount;
    userRollupEntry.lastSeenAt = Math.max(userRollupEntry.lastSeenAt, timestamp);

    userDaily.set(userDayKey, userDayEntry);
    userRollup.set(userId, userRollupEntry);
  });

  eventFactsSnapshot.docs.forEach((doc) => {
    const data = doc.data() as Record<string, unknown>;
    const timestamp = toTimestampNumber(data.timestamp) || Date.now();
    const dayKey = typeof data.dayKey === "string" ? data.dayKey : toTimeKeys(timestamp).dayKey;
    const eventName = typeof data.eventName === "string" ? data.eventName : "";
    const current = dailyRollups.get(dayKey) ?? buildEmptyDailyRollupAggregate();
    current.totalEvents += 1;
    current.authenticatedEvents += 1;
    current.viewerSessions += eventName === "viewer_session_started" ? 1 : 0;
    current.lastEventAt = Math.max(current.lastEventAt, timestamp);
    dailyRollups.set(dayKey, current);
  });

  taskEventsSnapshot.docs.forEach((doc) => {
    const data = doc.data() as Record<string, unknown>;
    const timestamp = toTimestampNumber(data.timestamp) || Date.now();
    const dayKey = typeof data.dayKey === "string" ? data.dayKey : toTimeKeys(timestamp).dayKey;
    const taskId = typeof data.taskId === "string" ? data.taskId : doc.id;
    const title = typeof data.title === "string" ? data.title : taskId;
    const type = typeof data.type === "string" ? data.type : "unknown";
    const reward = Number(data.reward || 0);
    const durationMs = Number(data.durationMs || 0);

    const dayEntry = taskDaily.get(dayKey) ?? buildEmptyTaskAggregate(undefined, undefined);
    dayEntry.eventCount += 1;
    dayEntry.rewardTotal += reward;
    dayEntry.durationMsTotal += durationMs;
    dayEntry.durationSampleCount += durationMs > 0 ? 1 : 0;
    dayEntry.types[type] = (dayEntry.types[type] || 0) + 1;
    dayEntry.lastEventAt = Math.max(dayEntry.lastEventAt, timestamp);
    taskDaily.set(dayKey, dayEntry);

    const rollupEntry = taskRollup.get(taskId) ?? buildEmptyTaskAggregate(taskId, title);
    rollupEntry.eventCount += 1;
    rollupEntry.rewardTotal += reward;
    rollupEntry.durationMsTotal += durationMs;
    rollupEntry.durationSampleCount += durationMs > 0 ? 1 : 0;
    rollupEntry.types[type] = (rollupEntry.types[type] || 0) + 1;
    rollupEntry.lastEventAt = Math.max(rollupEntry.lastEventAt, timestamp);
    taskRollup.set(taskId, rollupEntry);
  });

  const writes: Array<() => Promise<void>> = [];

  commerceDaily.forEach((entry, dayKey) => {
    writes.push(async () => {
      await adminDb.collection("analytics_commerce_daily").doc(dayKey).set({
      dayKey,
      ...entry,
      updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
    });
  });

  writes.push(async () => {
    await adminDb.collection("analytics_commerce_rollup").doc("summary").set({
    ...commerceSummary,
    updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
  });

  bundleDaily.forEach((entry, docId) => {
    writes.push(async () => {
      await adminDb.collection("analytics_bundle_daily").doc(docId).set({
      dayKey: docId.slice(0, 10),
      ...entry,
      updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
    });
  });

  bundleRollup.forEach((entry, bundleKey) => {
    writes.push(async () => {
      await adminDb.collection("analytics_bundle_rollup").doc(bundleKey).set({
      ...entry,
      updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
    });
  });

  userDaily.forEach((entry, docId) => {
    const uid = docId.split("_").slice(1).join("_");
    const dayKey = docId.slice(0, 10);
    writes.push(async () => {
      await adminDb.collection("analytics_user_daily").doc(docId).set({
      dayKey,
      uid,
      ...entry,
      updatedAt: FieldValue.serverTimestamp(),
      lastSeenAt: entry.lastSeenAt,
      lastSeenAtMs: entry.lastSeenAt,
      }, { merge: true });
    });
  });

  userRollup.forEach((entry, uid) => {
    writes.push(async () => {
      await adminDb.collection("analytics_users_rollup").doc(uid).set({
      uid,
      ...entry,
      grossRevenueUsdTotal: roundCurrency(entry.grossRevenueUsdTotal),
      paypalFeeUsdTotal: roundCurrency(entry.paypalFeeUsdTotal),
      netRevenueUsdTotal: roundCurrency(entry.netRevenueUsdTotal),
      adjustedProfitUsdTotal: roundCurrency(entry.adjustedProfitUsdTotal),
      retailValueUsdTotal: roundCurrency(entry.retailValueUsdTotal),
      bonusValueUsdTotal: roundCurrency(entry.bonusValueUsdTotal),
      updatedAt: FieldValue.serverTimestamp(),
      lastSeenAt: entry.lastSeenAt,
      lastSeenAtMs: entry.lastSeenAt,
      }, { merge: true });
    });
  });

  dailyRollups.forEach((entry, dayKey) => {
    writes.push(async () => {
      await adminDb.collection("analytics_rollups_daily").doc(dayKey).set({
        dayKey,
        totalEvents: entry.totalEvents,
        authenticatedEvents: entry.authenticatedEvents,
        viewerSessions: entry.viewerSessions,
        lastEventAt: entry.lastEventAt,
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
    });
  });

  taskDaily.forEach((entry, dayKey) => {
    writes.push(async () => {
      await adminDb.collection("analytics_task_daily").doc(dayKey).set({
        dayKey,
        eventCount: entry.eventCount,
        rewardTotal: entry.rewardTotal,
        durationMsTotal: entry.durationMsTotal,
        durationSampleCount: entry.durationSampleCount,
        types: entry.types,
        lastEventAt: entry.lastEventAt,
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
    });
  });

  taskRollup.forEach((entry, taskId) => {
    writes.push(async () => {
      await adminDb.collection("analytics_task_rollup").doc(taskId).set({
        taskId,
        title: entry.title || taskId,
        eventCount: entry.eventCount,
        rewardTotal: entry.rewardTotal,
        durationMsTotal: entry.durationMsTotal,
        durationSampleCount: entry.durationSampleCount,
        types: entry.types,
        lastEventAt: entry.lastEventAt,
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
    });
  });

  await commitEntries(writes);
  console.log(`Backfilled ${commerceDaily.size} commerce days, ${userRollup.size} user rollups, ${userDaily.size} user-day rollups, ${dailyRollups.size} telemetry days, and ${taskRollup.size} task rollups.`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Analytics parity backfill failed", error);
    process.exit(1);
  });
