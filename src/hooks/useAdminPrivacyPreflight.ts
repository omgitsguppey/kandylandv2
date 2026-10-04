import { useEffect, useState } from "react";

import { useAuth } from "@/context/AuthContext";
import { isAdminUiTestSessionUser } from "@/lib/admin/admin-ui-test-session";
import { authFetch } from "@/lib/authFetch";
import { readPrivacyConsoleState, type PrivacyConsoleRange, type PrivacyConsoleState } from "@/lib/admin-privacy-console";
import { resolveHumanError } from "@/lib/errors/resolve-human-error";

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
    const [snapshot, setSnapshot] = useState<{ ownerUid: string | null; data: PrivacyConsoleState | null; error: Error | null }>({ ownerUid: null, data: null, error: null });
    const [isLoading, setIsLoading] = useState(true);
    const [range, setRange] = useState<PrivacyConsoleRange>("24h");
    const isLocalAdminUiTestSession = isAdminUiTestSessionUser(user);

    const ownerUid = user?.uid ?? null;
    const adminSessionState: AdminPrivacySessionState = authLoading || !ownerUid || userProfile?.role !== "admin"
        ? "waiting_for_admin_session"
        : isLocalAdminUiTestSession
            ? "local_fixture_source_missing"
        : "ready";

    /* eslint-disable react-hooks/set-state-in-effect -- Route fetch state intentionally follows admin session/range readiness. */
    useEffect(() => {
        if (adminSessionState === "local_fixture_source_missing") {
            setSnapshot({ ownerUid: null, data: null, error: null });
            setIsLoading(false);
            return;
        }

        if (adminSessionState !== "ready") {
            setSnapshot({ ownerUid: null, data: null, error: null });
            setIsLoading(true);
            return;
        }

        let cancelled = false;
        setIsLoading(true);
        setSnapshot((current) => ({ ownerUid, data: current.ownerUid === ownerUid ? current.data : null, error: null }));

        void authFetch(`/api/admin/privacy/preflight?range=${encodeURIComponent(range)}`, {
            cache: "no-store",
            headers: {
                Accept: "application/json",
            },
        })
            .then(async (response) => {
                const body = await response.json().catch(() => null);
                const source = readPrivacyConsoleState(body);
                if (!response.ok || body?.success === false || !source || source.range !== range) {
                    const descriptor = resolveHumanError({
                        code: body?.errorKey ?? body?.errorCode ?? body?.code ?? (response.ok && body?.success !== false ? "validation_failed" : undefined),
                        status: response.ok ? undefined : response.status,
                        surface: "admin_truth",
                        fallback: "admin_truth_unavailable",
                    });
                    throw Object.assign(new Error(descriptor.operatorMessage), { status: response.status, code: descriptor.errorKey });
                }
                if (cancelled) return;
                setSnapshot({ ownerUid, data: source, error: null });
                setIsLoading(false);
            })
            .catch((nextError) => {
                if (cancelled) return;
                setSnapshot((current) => ({ ownerUid, data: current.ownerUid === ownerUid ? current.data : null, error: nextError instanceof Error ? nextError : new Error(String(nextError)) }));
                setIsLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [adminSessionState, ownerUid, range]);
    /* eslint-enable react-hooks/set-state-in-effect */

    return {
        data: adminSessionState === "ready" && snapshot.ownerUid === ownerUid ? snapshot.data : null,
        error: adminSessionState === "ready" && snapshot.ownerUid === ownerUid ? snapshot.error : null,
        isLoading: adminSessionState === "ready" && snapshot.ownerUid !== ownerUid ? true : isLoading,
        range,
        setRange,
        adminSessionState,
    };
}
