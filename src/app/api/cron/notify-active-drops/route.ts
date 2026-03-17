import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/server/firebase-admin";
import { sendTargetedDropNotification } from "@/lib/server/push-notifications";
import { resolveDropStatusFromTiming } from "@/lib/drop-status";
import { checkRateLimit, CRON } from "@/lib/server/rate-limit";

// This cron job should be called frequently (e.g. every 5-15 minutes)
export async function GET(request: NextRequest) {
    try {
        await checkRateLimit(request, "cron/notify-active-drops", CRON);
        // Enforce basic auth/cron secret in production.
        const authHeader = request.headers.get('authorization');
        if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) return NextResponse.json({error: "Unauthorized"}, {status: 401});
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
        let activatedCount = 0;
        let expiredCount = 0;
        const activatedDrops: string[] = [];
        const expiredDrops: string[] = [];
        const activationNotifications: Array<{
            dropId: string;
            dropTitle: string;
            imageUrl?: string;
            isReturn: boolean;
            excludedUserIds: string[];
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
                console.error(`Failed to fetch owners for drop ${dropId}`, err);
            }

            const isReturn = (drop.activationCount || 0) >= 1;
            activationNotifications.push({
                dropId,
                dropTitle: drop.title || "New Drop",
                imageUrl: typeof drop.imageUrl === "string" ? drop.imageUrl : undefined,
                isReturn,
                excludedUserIds,
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
        }

        if (activatedCount > 0 || expiredCount > 0) {
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
                ),
            ),
        );

        return NextResponse.json({
            message: `Activated ${activatedCount} drops, expired ${expiredCount} drops, and reconciled lifecycle status.`,
            activatedDrops,
            expiredDrops,
        });

    } catch (error: any) {
        console.error("Notify active drops error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
