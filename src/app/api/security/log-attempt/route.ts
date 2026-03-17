import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/server/firebase-admin";
import * as admin from "firebase-admin";
import { STRICT } from "@/lib/server/rate-limit";
import { describeSecurityEvent } from "@/lib/security-events";
import { trackServerEvent } from "@/lib/server/analytics";
import { guardApiRequest } from "@/lib/server/request-guard";
import { buildAnalyticsTimeKeys } from "@/lib/server/analytics-event-utils";

export async function POST(req: NextRequest) {
    try {
        const caller = await guardApiRequest(req, {
            routeName: "security/log-attempt",
            rateLimit: STRICT,
            requireTrustedOrigin: true,
            auth: "user",
            scopeToCaller: true,
        });
        if (!caller) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const uid = caller.uid;

        const body = await req.json();
        const {
            dropId,
            reason,
            assetIndex,
            assetKey,
            contentKind,
            pagePath,
            sessionId,
        } = body as Record<string, unknown>;
        const descriptor = describeSecurityEvent(typeof reason === "string" ? reason : undefined);

        const userRef = adminDb.collection("users").doc(uid);
        const eventRef = adminDb.collection("security_events").doc();
        const nowMs = Date.now();
        const timeKeys = buildAnalyticsTimeKeys(nowMs);

        await adminDb.runTransaction(async (transaction: admin.firestore.Transaction) => {
            const userDoc = await transaction.get(userRef);
            if (!userDoc.exists) return; // Should exist

            const data = userDoc.data() || {};
            const username = typeof data.username === "string" && data.username.trim().length > 0
                ? data.username.trim()
                : typeof data.displayName === "string" && data.displayName.trim().length > 0
                    ? data.displayName.trim()
                    : caller.email || uid;
            const flags = typeof data.securityFlags === "object" && data.securityFlags !== null
                ? data.securityFlags as Record<string, unknown>
                : { ripAttempts: 0 };
            const reasonCounts = typeof flags.reasonCounts === "object" && flags.reasonCounts !== null
                ? flags.reasonCounts as Record<string, unknown>
                : {};
            const currentRipAttempts = typeof flags.ripAttempts === "number" && Number.isFinite(flags.ripAttempts)
                ? flags.ripAttempts
                : 0;
            const nextReasonCounts = {
                ...reasonCounts,
                [descriptor.reason]: (typeof reasonCounts[descriptor.reason] === "number" ? Number(reasonCounts[descriptor.reason]) : 0) + 1,
            };
            const nowIso = new Date().toISOString();

            transaction.update(userRef, {
                securityFlags: {
                    ...flags,
                    ripAttempts: currentRipAttempts + 1,
                    lastViolation: nowIso,
                    lastViolationReason: descriptor.reason,
                    lastViolationDropId: typeof dropId === "string" ? dropId : undefined,
                    lastViolationMessage: descriptor.message,
                    reasonCounts: nextReasonCounts,
                }
            });

            transaction.set(eventRef, {
                eventName: "security_violation_detected",
                userId: uid,
                username,
                reason: descriptor.reason,
                label: descriptor.label,
                message: descriptor.message,
                locationLabel: descriptor.locationLabel,
                severity: descriptor.severity,
                dropId: typeof dropId === "string" ? dropId : null,
                assetIndex: typeof assetIndex === "number" && Number.isFinite(assetIndex) ? assetIndex : null,
                assetKey: typeof assetKey === "string" ? assetKey.slice(0, 120) : null,
                contentKind: typeof contentKind === "string" ? contentKind.slice(0, 40) : null,
                pagePath: typeof pagePath === "string" ? pagePath.slice(0, 200) : null,
                sessionId: typeof sessionId === "string" ? sessionId.slice(0, 80) : null,
                source: "protected_viewer",
                userAgent: req.headers.get("user-agent") || "unknown",
                timestamp: nowMs,
                dayKey: timeKeys.dayKey,
                hourKey: timeKeys.hourKey,
                minuteKey: timeKeys.minuteKey,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });
        });

        const securityEventName = descriptor.reason === "screenshot_hotkey"
            ? "security_screenshot_attempted"
            : descriptor.reason === "print_shortcut"
                ? "security_print_attempted"
                : "security_devtools_attempted";
        await trackServerEvent(securityEventName, {
            page_path: typeof pagePath === "string" ? pagePath : "/dashboard/viewer",
            drop_id: typeof dropId === "string" ? dropId : "",
            asset_index: typeof assetIndex === "number" && Number.isFinite(assetIndex) ? assetIndex : 0,
            asset_key: typeof assetKey === "string" ? assetKey.slice(0, 120) : "",
            content_kind: typeof contentKind === "string" ? contentKind.slice(0, 40) : "",
            session_id: typeof sessionId === "string" ? sessionId.slice(0, 80) : "",
            security_reason: descriptor.reason,
            security_label: descriptor.label,
            security_severity: descriptor.severity,
        }, uid);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Security log error:", error);
        return NextResponse.json({ error: "Failed to log attempt" }, { status: 500 });
    }
}
