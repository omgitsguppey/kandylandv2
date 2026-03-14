import { NextRequest, NextResponse } from "next/server";
import type { User } from "firebase/auth";

import { adminDb } from "@/lib/server/firebase-admin";
import { verifyAdmin, handleApiError } from "@/lib/server/auth";
import { checkRateLimit, ADMIN } from "@/lib/server/rate-limit";
import { normalizeTransactionRecord } from "@/lib/transaction-normalizers";
import { normalizeUserProfile } from "@/lib/user-utils";

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ userId: string }> },
) {
    try {
        await checkRateLimit(request, "admin/user-detail", ADMIN);
        await verifyAdmin(request);

        const { userId } = await context.params;
        const limitParam = Number(request.nextUrl.searchParams.get("limit") || 60);
        const historyLimit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 200) : 60;

        const userRef = adminDb.collection("users").doc(userId);
        const [userSnap, transactionsSnap] = await Promise.all([
            userRef.get(),
            adminDb.collection("transactions")
                .where("userId", "==", userId)
                .orderBy("timestamp", "desc")
                .limit(historyLimit)
                .get(),
        ]);

        if (!userSnap.exists) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const rawUser = userSnap.data() as Record<string, unknown>;
        const mockUser = {
            uid: userId,
            email: typeof rawUser.email === "string" ? rawUser.email : "",
            displayName: typeof rawUser.displayName === "string" ? rawUser.displayName : "",
            photoURL: typeof rawUser.photoURL === "string" ? rawUser.photoURL : "",
        } as User;

        const user = normalizeUserProfile(rawUser, mockUser);
        if (!user) {
            return NextResponse.json({ error: "User profile is malformed" }, { status: 500 });
        }

        const transactions = transactionsSnap.docs.flatMap((doc) => {
            try {
                const normalized = normalizeTransactionRecord(doc.data(), doc.id);
                const raw = doc.data() as Record<string, unknown>;
                const status = raw.status === "failed" || raw.error
                    ? "failed"
                    : raw.status === "pending"
                        ? "pending"
                        : "completed";

                return [{ ...normalized, status }];
            } catch {
                return [];
            }
        });

        return NextResponse.json({ success: true, user, transactions });
    } catch (error) {
        return handleApiError(error, "Admin.UserDetail.GET");
    }
}
