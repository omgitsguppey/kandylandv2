import { NextRequest, NextResponse } from "next/server";
import { adminDb, adminAuth } from "@/lib/server/firebase-admin";
import * as admin from "firebase-admin";
import { checkRateLimit, STRICT } from "@/lib/server/rate-limit";
import { describeSecurityEvent } from "@/lib/security-events";
import { hasTrustedSiteOrigin } from "@/lib/server/request-origin";
import { trackServerEvent } from "@/lib/server/analytics";

function buildTimeKeys(timestamp: number) {
    const date = new Date(timestamp);
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    const day = String(date.getUTCDate()).padStart(2, "0");
    const hour = String(date.getUTCHours()).padStart(2, "0");
    const minute = String(date.getUTCMinutes()).padStart(2, "0");

    return {
        dayKey: `${year}-${month}-${day}`,
        hourKey: `${year}-${month}-${day}T${hour}`,
        minuteKey: `${year}-${month}-${day}T${hour}:${minute}`,
    };
}

export async function POST(req: NextRequest) {
    try {
        await checkRateLimit(req, "security/log-attempt", STRICT);
        if (!hasTrustedSiteOrigin(req)) {
            return NextResponse.json({ error: "Untrusted origin" }, { status: 403 });
        }

        const authHeader = req.headers.get("Authorization");
        if (!authHeader?.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const token = authHeader.split("Bearer ")[1];
        const decodedToken = await adminAuth.verifyIdToken(token);
        const uid = decodedToken.uid;

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
        const timeKeys = buildTimeKeys(nowMs);

        await adminDb.runTransaction(async (transaction: admin.firestore.Transaction) => {
            const userDoc = await transaction.get(userRef);
            if (!userDoc.exists) return; // Should exist

            const data = userDoc.data() || {};
            const username = typeof data.username === "string" && data.username.trim().length > 0
                ? data.username.trim()
                : typeof data.displayName === "string" && data.displayName.trim().length > 0
                    ? data.displayName.trim()
                    : decodedToken.email || uid;
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
