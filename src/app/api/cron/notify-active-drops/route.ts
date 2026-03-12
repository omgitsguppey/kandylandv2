import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/server/firebase-admin";
import { sendTargetedDropNotification } from "@/lib/server/push-notifications";

// This cron job should be called frequently (e.g. every 5-15 minutes)
export async function GET(request: NextRequest) {
    try {
        // Enforce basic auth/cron secret in production.
        const authHeader = request.headers.get('authorization');
        if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) return NextResponse.json({error: "Unauthorized"}, {status: 401});

        const now = Date.now();
        const dropsRef = adminDb.collection("drops");

        // Find all scheduled drops that have reached their start time
        const scheduledSnap = await dropsRef
            .where("status", "==", "scheduled")
            .where("validFrom", "<=", now)
            .get();

        if (scheduledSnap.empty) {
            return NextResponse.json({ message: "No newly active drops to process." });
        }

        const batch = adminDb.batch();
        let opsCount = 0;
        const activatedDrops: string[] = [];

        // For each drop that just went live...
        for (const doc of scheduledSnap.docs) {
            const dropId = doc.id;
            const drop = doc.data();

            // 1. Update status to active
            batch.update(doc.ref, { status: "active" });
            opsCount++;
            activatedDrops.push(drop.title || dropId);

            // 2. Identify users who already own this drop to exclude them from the notification
            // In a production with millions of users, this might be heavily paginated or inverted.
            // For KandyDrops scale, querying for users who own the drop works well. 
            const excludedUserIds: string[] = [];
            try {
                const ownersSnap = await adminDb.collection("users")
                    .where("unlockedContent", "array-contains", dropId)
                    .get();
                ownersSnap.forEach(userDoc => excludedUserIds.push(userDoc.id));
            } catch (err) {
                console.error(`Failed to fetch owners for drop ${dropId}`, err);
            }

            // 3. Dispatch Notification logic
            const isReturn = (drop.activationCount || 0) >= 1;

            try {
                await sendTargetedDropNotification(
                    drop.title || "New Drop",
                    dropId,
                    drop.imageUrl,
                    isReturn,
                    excludedUserIds
                );
            } catch (err) {
                console.error(`Notification failed for drop ${dropId}`, err);
            }
        }

        if (opsCount > 0) {
            await batch.commit();
        }

        return NextResponse.json({
            message: `Activated ${opsCount} drops and dispatched notifications.`,
            drops: activatedDrops
        });

    } catch (error: any) {
        console.error("Notify active drops error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
