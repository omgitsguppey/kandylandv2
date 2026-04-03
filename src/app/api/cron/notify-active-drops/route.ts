import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/server/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { sendTargetedDropNotification } from "@/lib/server/push-notifications";
import { resolveDropStatusFromTiming } from "@/lib/drop-status";
import { CRON } from "@/lib/server/rate-limit";
import { markDropsRuntimeChanged } from "@/lib/server/drop-runtime";
import { guardApiRequest } from "@/lib/server/request-guard";
import { handleApiError } from "@/lib/server/auth";
import { recordRouteWarning } from "@/lib/server/route-diagnostics";

// This cron job should be called frequently (e.g. every 5-15 minutes)
export async function GET(request: NextRequest) {
    try {
        await guardApiRequest(request, {
            routeName: "cron/notify-active-drops",
            rateLimit: CRON,
        });
        const cronSecret = process.env.CRON_SECRET?.trim();
        const authHeader = request.headers.get("authorization");

        if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
            if (!cronSecret) {
                recordRouteWarning("cron/notify-active-drops", "CRON_SECRET is not configured", undefined, {
                    channel: "cron",
                });
            }
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        if (!adminDb) return NextResponse.json({ error: "Database not available" }, { status: 500 });

        const now = Date.now();
        const dropsRef = adminDb.collection("drops");

        const [scheduledSnap, activeSnap] = await Promise.all([
            dropsRef
                .where("status", "==", "scheduled")
                .where("validFrom", "<=", now)
                .get(),
            dropsRef
                .where("status", "==", "active")
                .where("validUntil", "<=", now)
                .get(),
        ]);

        if (scheduledSnap.empty && activeSnap.empty) {
            return NextResponse.json({ message: "No drop lifecycle changes to process." });
        }

        const batch = adminDb.batch();
        const queueRef = adminDb.collection("adminSettings").doc("dropQueue");
        let activatedCount = 0;
        let expiredCount = 0;
        const activatedDrops: string[] = [];
        const expiredDrops: string[] = [];
        const autoQueuedDropIds = new Set<string>();
        const activationNotifications: Array<{
            dropId: string;
            dropTitle: string;
            imageUrl?: string;
            isReturn: boolean;
            excludedUserIds: string[];
            activationKey: string;
        }> = [];

        for (const doc of scheduledSnap.docs) {
            const dropId = doc.id;
            const drop = doc.data();
            const nextStatus = resolveDropStatusFromTiming({
                validFrom: Number(drop.validFrom || 0),
                validUntil: typeof drop.validUntil === "number" ? drop.validUntil : undefined,
            }, now);

            batch.update(doc.ref, { status: nextStatus });

            if (nextStatus === "expired") {
                expiredCount++;
                expiredDrops.push(drop.title || dropId);
                if (drop.autoQueueOnExpire === true) {
                    autoQueuedDropIds.add(dropId);
                }
                continue;
            }

            activatedCount++;
            activatedDrops.push(drop.title || dropId);
            const excludedUserIds: string[] = [];
            try {
                const ownersSnap = await adminDb.collection("users")
                    .where("unlockedContent", "array-contains", dropId)
                    .get();
                ownersSnap.forEach(userDoc => excludedUserIds.push(userDoc.id));
            } catch (err) {
                recordRouteWarning("cron/notify-active-drops", "Failed to fetch owners for active drop notification", err, {
                    channel: "cron",
                    detail: {
                        dropId,
                    },
                });
            }

            const isReturn = (drop.activationCount || 0) >= 1;
            activationNotifications.push({
                dropId,
                dropTitle: drop.title || "New Drop",
                imageUrl: typeof drop.imageUrl === "string" ? drop.imageUrl : undefined,
                isReturn,
                excludedUserIds,
                activationKey: `drop-activation:${dropId}:${Number(drop.validFrom || 0)}`,
            });
        }

        for (const doc of activeSnap.docs) {
            const drop = doc.data();
            const nextStatus = resolveDropStatusFromTiming({
                validFrom: Number(drop.validFrom || 0),
                validUntil: typeof drop.validUntil === "number" ? drop.validUntil : undefined,
            }, now);

            if (nextStatus === "active") {
                continue;
            }

            batch.update(doc.ref, { status: nextStatus });
            expiredCount++;
            expiredDrops.push(drop.title || doc.id);
            if (drop.autoQueueOnExpire === true) {
                autoQueuedDropIds.add(doc.id);
            }
        }

        if (activatedCount > 0 || expiredCount > 0) {
            if (autoQueuedDropIds.size > 0) {
                batch.set(queueRef, {
                    queue: FieldValue.arrayUnion(...Array.from(autoQueuedDropIds)),
                }, { merge: true });
            }
            markDropsRuntimeChanged(batch, now);
            await batch.commit();
        }

        await Promise.allSettled(
            activationNotifications.map((payload) =>
                sendTargetedDropNotification(
                    payload.dropTitle,
                    payload.dropId,
                    payload.imageUrl,
                    payload.isReturn,
                    payload.excludedUserIds,
                    payload.activationKey,
                ),
            ),
        );

        return NextResponse.json({
            message: `Activated ${activatedCount} drops, expired ${expiredCount} drops, and reconciled lifecycle status.`,
            activatedDrops,
            expiredDrops,
            autoQueuedDrops: Array.from(autoQueuedDropIds),
        });

    } catch (error: any) {
        return handleApiError(error, "Cron.NotifyActiveDrops.GET");
    }
}
