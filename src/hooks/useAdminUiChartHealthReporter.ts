"use client";

import { useEffect, useMemo, useRef } from "react";

import type { AdminUiChartHealthItem } from "@/lib/admin-ui-chart-health";
import { authFetch } from "@/lib/authFetch";
import { reportClientIssue } from "@/lib/client-error-reporting";

function normalizeItems(items: readonly AdminUiChartHealthItem[]) {
    return [...items]
        .sort((left, right) => left.key.localeCompare(right.key))
        .map((item) => ({
            ...item,
            issueMessages: [...item.issueMessages],
        }));
}

export function useAdminUiChartHealthReporter(items: readonly AdminUiChartHealthItem[]) {
    const lastPayloadRef = useRef("");
    const payload = useMemo(() => JSON.stringify(normalizeItems(items)), [items]);

    useEffect(() => {
        if (!items.length || payload === lastPayloadRef.current) {
            return;
        }

        const timerId = window.setTimeout(() => {
            void authFetch("/api/admin/ui-chart-health", {
                method: "PUT",
                body: JSON.stringify({ items: JSON.parse(payload) as AdminUiChartHealthItem[] }),
            }).then(async (response) => {
                if (!response.ok) {
                    const result = await response.json().catch(() => ({}));
                    throw new Error(typeof result?.error === "string" ? result.error : "Chart health sync failed");
                }

                lastPayloadRef.current = payload;
            }).catch((error) => {
                reportClientIssue({
                    channel: "ui",
                    severity: "warn",
                    message: "Admin UI chart health sync failed",
                    error,
                    detail: {
                        itemCount: items.length,
                    },
                    consoleLabel: "[Admin UI] chart health sync failed",
                });
            });
        }, 200);

        return () => {
            window.clearTimeout(timerId);
        };
    }, [items.length, payload]);
}
