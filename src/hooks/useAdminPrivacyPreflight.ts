import { useEffect, useState } from "react";

import { useAuth } from "@/context/AuthContext";
import { isAdminUiTestSessionUser } from "@/lib/admin/admin-ui-test-session";
import { authFetch } from "@/lib/authFetch";
import type { PrivacyConsoleRange, PrivacyConsoleState } from "@/lib/admin-privacy-console";

type AdminPrivacySessionState = "waiting_for_admin_session" | "local_fixture_source_missing" | "ready";

type AdminPrivacyPreflightHookState = {
    data: PrivacyConsoleState | null;
    error: Error | null;
    isLoading: boolean;
    range: PrivacyConsoleRange;
    setRange: (nextRange: PrivacyConsoleRange) => void;
    adminSessionState: AdminPrivacySessionState;
};

export function useAdminPrivacyPreflight(): AdminPrivacyPreflightHookState {
    const { user, userProfile, loading: authLoading } = useAuth();
    const [data, setData] = useState<PrivacyConsoleState | null>(null);
    const [error, setError] = useState<Error | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [range, setRange] = useState<PrivacyConsoleRange>("24h");
    const isLocalAdminUiTestSession = isAdminUiTestSessionUser(user);

    const adminSessionState: AdminPrivacySessionState = authLoading || !user || userProfile?.role !== "admin"
        ? "waiting_for_admin_session"
        : isLocalAdminUiTestSession
            ? "local_fixture_source_missing"
        : "ready";

    /* eslint-disable react-hooks/set-state-in-effect -- Route fetch state intentionally follows admin session/range readiness. */
    useEffect(() => {
        if (adminSessionState === "local_fixture_source_missing") {
            setData(null);
            setIsLoading(false);
            setError(null);
            return;
        }

        if (adminSessionState !== "ready") {
            setData(null);
            setIsLoading(true);
            setError(null);
            return;
        }

        let cancelled = false;
        setIsLoading(true);
        setError(null);

        void authFetch(`/api/admin/privacy/preflight?range=${encodeURIComponent(range)}`, {
            cache: "no-store",
            headers: {
                Accept: "application/json",
            },
        })
            .then(async (response) => {
                const body = await response.json().catch(() => null);
                if (!response.ok) {
                    throw new Error(typeof body?.error === "string" ? body.error : "Privacy preflight route failed.");
                }
                if (cancelled) return;
                setData(body as PrivacyConsoleState);
                setIsLoading(false);
            })
            .catch((nextError) => {
                if (cancelled) return;
                setError(nextError instanceof Error ? nextError : new Error(String(nextError)));
                setIsLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [adminSessionState, range]);
    /* eslint-enable react-hooks/set-state-in-effect */

    return {
        data,
        error,
        isLoading,
        range,
        setRange,
        adminSessionState,
    };
}
