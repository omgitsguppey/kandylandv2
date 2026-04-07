import "server-only";

import type { AdminUiChartHealthItem } from "@/lib/admin-ui-chart-health";
import { adminDb } from "@/lib/server/firebase-admin";
import { recordRouteWarning } from "@/lib/server/route-diagnostics";

export const ADMIN_UI_CHART_HEALTH_COLLECTION = "admin_ui_chart_health";

type PersistedAdminUiChartHealthItem = Partial<AdminUiChartHealthItem> & {
    firstObservedAtMs?: number;
    changedAtMs?: number;
};

const CHART_HEALTH_WRITE_THROTTLE_MS = 5 * 60 * 1000;

function arraysMatch(left: string[], right: string[]) {
    return left.length === right.length && left.every((value, index) => value === right[index]);
}

function toNumber(value: unknown) {
    return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

export async function saveAdminUiChartHealth(input: {
    items: AdminUiChartHealthItem[];
    actorUid: string;
    actorEmail?: string | null;
}) {
    if (!adminDb || input.items.length === 0) {
        return;
    }

    try {
        const refs = input.items.map((item) => adminDb.collection(ADMIN_UI_CHART_HEALTH_COLLECTION).doc(item.key));
        const snapshots = await adminDb.getAll(...refs);
        const batch = adminDb.batch();
        let writeCount = 0;

        input.items.forEach((item, index) => {
            const existing = snapshots[index]?.data() as PersistedAdminUiChartHealthItem | undefined;
            const unchanged = Boolean(
                existing
                && existing.status === item.status
                && existing.hydrationState === item.hydrationState
                && existing.hasData === item.hasData
                && existing.summary === item.summary
                && existing.action === item.action
                && toNumber(existing.issueCount) === item.issueCount
                && arraysMatch(
                    Array.isArray(existing.issueMessages) ? existing.issueMessages.filter((value): value is string => typeof value === "string") : [],
                    item.issueMessages,
                ),
            );

            const lastUpdatedAtMs = toNumber(existing?.updatedAtMs);
            if (unchanged && lastUpdatedAtMs > item.updatedAtMs - CHART_HEALTH_WRITE_THROTTLE_MS) {
                return;
            }

            batch.set(refs[index], {
                ...item,
                actorUid: input.actorUid,
                actorEmail: input.actorEmail ?? null,
                updatedAtMs: item.updatedAtMs,
                firstObservedAtMs: toNumber(existing?.firstObservedAtMs) || item.updatedAtMs,
                changedAtMs: unchanged ? toNumber(existing?.changedAtMs) || item.updatedAtMs : item.updatedAtMs,
            }, { merge: true });
            writeCount += 1;
        });

        if (writeCount > 0) {
            await batch.commit();
        }
    } catch (error) {
        recordRouteWarning("admin/ui-chart-health", "Admin UI chart health sync failed", error, {
            channel: "admin",
            detail: {
                itemCount: input.items.length,
            },
        });
    }
}

export async function listAdminUiChartHealth(limitCount = 80) {
    if (!adminDb) {
        return [] as AdminUiChartHealthItem[];
    }

    try {
        const snapshot = await adminDb.collection(ADMIN_UI_CHART_HEALTH_COLLECTION)
            .orderBy("updatedAtMs", "desc")
            .limit(limitCount)
            .get();

        return snapshot.docs.map((doc) => doc.data() as AdminUiChartHealthItem);
    } catch (error) {
        recordRouteWarning("admin/ui-chart-health", "Admin UI chart health read failed", error, {
            channel: "admin",
            detail: {
                limitCount,
            },
        });
        return [] as AdminUiChartHealthItem[];
    }
}
