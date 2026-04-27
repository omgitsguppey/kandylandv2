"use client";

import { useEffect } from "react";
import { useAuth } from "@/context/AuthContext";

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
            
            fetch("/api/analytics/ingest-identified", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    events: [
                        {
                            eventId: crypto.randomUUID(),
                            eventName: "admin_ui_error",
                            eventTimestampMs: Date.now(),
                            eventParams: errorInfo,
                        }
                    ]
                }),
                keepalive: true,
            }).catch(() => {
                // Ignore failure in error handler
            });
        };

        const handleRejection = (event: PromiseRejectionEvent) => {
            const errorInfo = {
                message: event.reason?.message || String(event.reason),
                stack: event.reason?.stack || "",
            };

            fetch("/api/analytics/ingest-identified", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    events: [
                        {
                            eventId: crypto.randomUUID(),
                            eventName: "admin_ui_error",
                            eventTimestampMs: Date.now(),
                            eventParams: errorInfo,
                        }
                    ]
                }),
                keepalive: true,
            }).catch(() => {
                // Ignore failure in error handler
            });
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
