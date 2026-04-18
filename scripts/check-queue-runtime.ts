import {
    buildNotifyActiveDropsLifecyclePlan,
    buildProcessQueueLifecyclePlan,
    type ActivationDropRuntime,
    type QueuedDropRuntime,
} from "../shared/runtime/queue-runtime";
import { getFiniteDropTimestamp } from "../shared/runtime/drop-status";
import { buildNotificationDispatchStableId } from "../shared/runtime/runtime-warning-contract";
import { getRuntimeAdminDb } from "./runtime-admin";

function assert(condition: unknown, message: string) {
    if (!condition) {
        throw new Error(message);
    }
}

function normalizeTimesPerDay(timesPerDay: unknown, dropsPerDay: number) {
    const rawTimes = Array.isArray(timesPerDay)
        ? timesPerDay.filter((value): value is string => typeof value === "string" && /^\d{2}:\d{2}$/.test(value))
        : [];
    const sortedTimes = [...rawTimes].sort((left, right) => left.localeCompare(right));

    if (sortedTimes.length === 0) {
        return Array.from({ length: dropsPerDay }, (_, index) => (index === 0 ? "12:00" : "18:00"));
    }

    if (sortedTimes.length >= dropsPerDay) {
        return sortedTimes.slice(0, dropsPerDay);
    }

    return [
        ...sortedTimes,
        ...Array(dropsPerDay - sortedTimes.length).fill(sortedTimes[sortedTimes.length - 1] || "12:00"),
    ];
}

async function getResolvedQueueConfig(adminDb: FirebaseFirestore.Firestore) {
    const [queueSnap, legacySnap] = await Promise.all([
        adminDb.collection("adminSettings").doc("dropQueue").get(),
        adminDb.collection("drops").where("rotationConfig.enabled", "==", true).get(),
    ]);

    const raw = queueSnap.exists ? queueSnap.data() as Record<string, unknown> : {};
    const dropsPerDay = Math.max(1, Math.floor(Number(raw.dropsPerDay) || 1));
    const cooldownDays = Math.max(1, Math.floor(Number(raw.cooldownDays) || 7));
    const queue = Array.isArray(raw.queue)
        ? Array.from(new Set(raw.queue.filter((value): value is string => typeof value === "string" && value.length > 0)))
        : [];

    return {
        queue: Array.from(new Set([...queue, ...legacySnap.docs.map((doc) => doc.id)])),
        cooldownDays,
        timesPerDay: normalizeTimesPerDay(raw.timesPerDay, dropsPerDay),
    };
}

function toQueuedDropRuntime(doc: FirebaseFirestore.DocumentSnapshot): QueuedDropRuntime | null {
    const data = doc.data();
    if (!data) {
        return null;
    }

    return {
        id: doc.id,
        validFrom: getFiniteDropTimestamp(data.validFrom),
        validUntil: getFiniteDropTimestamp(data.validUntil),
        activationCount: Number.isFinite(Number(data.activationCount)) ? Number(data.activationCount) : 0,
        status: data.status === "active" || data.status === "expired" || data.status === "scheduled"
            ? data.status
            : null,
    } satisfies QueuedDropRuntime;
}

function toActivationDropRuntime(
    doc: FirebaseFirestore.QueryDocumentSnapshot,
    status: "scheduled" | "active",
) {
    const data = doc.data() as Record<string, unknown>;
    return {
        id: doc.id,
        validFrom: getFiniteDropTimestamp(data.validFrom),
        validUntil: getFiniteDropTimestamp(data.validUntil),
        activationCount: Number.isFinite(Number(data.activationCount)) ? Number(data.activationCount) : 0,
        imageUrl: typeof data.imageUrl === "string" ? data.imageUrl : undefined,
        title: typeof data.title === "string" && data.title.trim().length > 0 ? data.title : doc.id,
        status,
        autoQueueOnExpire: data.autoQueueOnExpire === true,
    } satisfies ActivationDropRuntime;
}

export async function checkQueueRuntime() {
    const adminDb = getRuntimeAdminDb();
    const config = await getResolvedQueueConfig(adminDb);
    const queueRefs = config.queue.map((dropId) => adminDb.collection("drops").doc(dropId));
    const queueDocs = queueRefs.length > 0 ? await adminDb.getAll(...queueRefs) : [];
    const queueEntries: Array<[string, QueuedDropRuntime]> = [];
    for (const doc of queueDocs) {
        const runtime = toQueuedDropRuntime(doc);
        if (!runtime) {
            continue;
        }
        queueEntries.push([runtime.id, runtime]);
    }
    const queueMap = Object.fromEntries(queueEntries) as Record<string, QueuedDropRuntime | undefined>;
    const [scheduledSnap, activeSnap, outcomeSnap] = await Promise.all([
        adminDb.collection("drops").where("status", "==", "scheduled").get(),
        adminDb.collection("drops").where("status", "==", "active").get(),
        adminDb.collection("notification_dispatch_outcomes").get(),
    ]);
    const now = Date.now();

    const processPlan = buildProcessQueueLifecyclePlan({
        config,
        dropsById: queueMap,
        now,
    });
    const notifyPlan = buildNotifyActiveDropsLifecyclePlan({
        scheduledDrops: scheduledSnap.docs.map((doc) => toActivationDropRuntime(doc, "scheduled")),
        activeDrops: activeSnap.docs.map((doc) => toActivationDropRuntime(doc, "active")),
        now,
    });

    const outcomeIds = new Set(outcomeSnap.docs.map((doc) => doc.id));
    const missingOutcomes = notifyPlan.activationNotifications
        .filter((entry) => !outcomeIds.has(buildNotificationDispatchStableId(entry.activationKey)))
        .map((entry) => entry.activationKey);

    const failures = [
        ...processPlan.invariants.map((entry) => `${entry.code}: ${entry.message}${entry.dropId ? ` (${entry.dropId})` : ""}`),
        ...notifyPlan.invariants.map((entry) => `${entry.code}: ${entry.message}${entry.dropId ? ` (${entry.dropId})` : ""}`),
        ...missingOutcomes.map((activationKey) => `Missing notification outcome for activation ${activationKey}.`),
    ];

    assert(failures.length === 0, failures.join("\n"));
}

if (require.main === module) {
    checkQueueRuntime()
        .then(() => console.log("Queue runtime continuity check passed."))
        .catch((error) => {
            console.error(error instanceof Error ? error.message : String(error));
            process.exit(1);
        });
}
