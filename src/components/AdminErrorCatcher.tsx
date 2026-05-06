"use client";

import { useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import {
    classifyBrowserSecurityBoundaryError,
} from "@/lib/client-diagnostics";
import { reportClientIssue } from "@/lib/client-error-reporting";
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
                route: window.location.pathname,
                sourceSurface: "admin",
                component: "AdminErrorCatcher",
            };

            const browserSecurityBoundary = classifyBrowserSecurityBoundaryError({
                error: event.error,
                message: event.message,
                route: window.location.pathname,
                detail: errorInfo,
            });

            if (browserSecurityBoundary) {
                reportClientIssue({
                    channel: "ui",
                    severity: browserSecurityBoundary.severity,
                    message: browserSecurityBoundary.humanMessage,
                    humanMessage: browserSecurityBoundary.humanMessage,
                    evidenceCategory: "browser_security_boundary",
                    fingerprint: browserSecurityBoundary.fingerprint,
                    error: event.error,
                    detail: {
                        ...browserSecurityBoundary.detail,
                        component: "AdminErrorCatcher",
                        userFlowFailed: false,
                    },
                    consoleLabel: "[AdminErrorCatcher] Browser security boundary",
                });
                return;
            }

            reportAdminUiError(errorInfo);
        };

        const handleRejection = (event: PromiseRejectionEvent) => {
            const errorInfo = {
                message: event.reason?.message || String(event.reason),
                stack: event.reason?.stack || "",
                route: window.location.pathname,
                sourceSurface: "admin",
                component: "AdminErrorCatcher",
            };

            const browserSecurityBoundary = classifyBrowserSecurityBoundaryError({
                error: event.reason,
                route: window.location.pathname,
                detail: errorInfo,
            });

            if (browserSecurityBoundary) {
                reportClientIssue({
                    channel: "ui",
                    severity: browserSecurityBoundary.severity,
                    message: browserSecurityBoundary.humanMessage,
                    humanMessage: browserSecurityBoundary.humanMessage,
                    evidenceCategory: "browser_security_boundary",
                    fingerprint: browserSecurityBoundary.fingerprint,
                    error: event.reason,
                    detail: {
                        ...browserSecurityBoundary.detail,
                        component: "AdminErrorCatcher",
                        userFlowFailed: false,
                    },
                    consoleLabel: "[AdminErrorCatcher] Browser security boundary",
                });
                return;
            }

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
