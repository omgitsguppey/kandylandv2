"use client";

import { useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { authFetch } from "@/lib/authFetch";

function reportAdminUiError(errorInfo: Record<string, unknown>) {
    void authFetch("/api/analytics/ingest-identified", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            events: [
                {
                    eventId: crypto.randomUUID(),
                    eventName: "admin_ui_error",
                    eventTimestampMs: Date.now(),
                    eventParams: errorInfo,
                },
            ],
        }),
        keepalive: true,
    }).catch((error) => {
        console.warn("[AdminErrorCatcher] Admin UI error report failed", error);
    });
}

export function AdminErrorCatcher() {
    const { userProfile } = useAuth();
    const isAdmin = userProfile?.role === "admin";

    useEffect(() => {
        if (!isAdmin) {
            return;
        }

        const handleError = (event: ErrorEvent) => {
            const errorInfo = {
                message: event.message,
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno,
                stack: event.error?.stack || "",
            };

            reportAdminUiError(errorInfo);
        };

        const handleRejection = (event: PromiseRejectionEvent) => {
            const errorInfo = {
                message: event.reason?.message || String(event.reason),
                stack: event.reason?.stack || "",
            };

            reportAdminUiError(errorInfo);
        };

        window.addEventListener("error", handleError);
        window.addEventListener("unhandledrejection", handleRejection);

        return () => {
            window.removeEventListener("error", handleError);
            window.removeEventListener("unhandledrejection", handleRejection);
        };
    }, [isAdmin]);

    return null;
}
