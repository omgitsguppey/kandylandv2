"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";

import { useAuthIdentity } from "@/context/AuthContext";
import { authFetch } from "@/lib/authFetch";
import {
  buildAdminViewAsDebugFields,
  clearAdminViewAsStateFromStorage,
  readAdminViewAsStateFromStorage,
  writeAdminViewAsStateToStorage,
  type AdminViewAsState,
} from "@/lib/admin/synthetic-creators-view-as";
import { trackEvent } from "@/lib/telemetry";

type StartViewAsInput = {
  targetUserId: string;
  targetDisplayName: string;
  reason: string;
  returnHref?: string;
  syntheticCreatorType?: string;
};

type AdminViewAsContextValue = {
  viewAsState: AdminViewAsState | null;
  debug: ReturnType<typeof buildAdminViewAsDebugFields>;
  startViewAsCreator: (input: StartViewAsInput) => Promise<void>;
  endViewAsCreator: (reason?: string) => Promise<void>;
};

const AdminViewAsContext = createContext<AdminViewAsContextValue | null>(null);

export function AdminViewAsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuthIdentity();
  const router = useRouter();
  const pathname = usePathname();
  const [viewAsState, setViewAsState] = useState<AdminViewAsState | null>(null);

  useEffect(() => {
    setViewAsState(readAdminViewAsStateFromStorage());
  }, []);

  useEffect(() => {
    if (!user?.uid || !viewAsState) {
      return;
    }

    if (viewAsState.viewAsActorUid !== user.uid) {
      clearAdminViewAsStateFromStorage();
      setViewAsState(null);
    }
  }, [user?.uid, viewAsState]);

  const startViewAsCreator = useCallback(async (input: StartViewAsInput) => {
    if (!user?.uid) {
      throw new Error("Admin session is required.");
    }

    const simulationStartedAt = Date.now();
    const returnHref = input.returnHref || `${pathname || "/admin/roster"}`;
    const nextState: AdminViewAsState = {
      adminViewingAsUserId: input.targetUserId,
      adminViewingAsDisplayName: input.targetDisplayName || "Creator",
      adminViewingAsRole: "creator",
      simulationStartedAt,
      simulationReason: input.reason,
      viewAsActorUid: user.uid,
      viewAsReturnHref: returnHref,
    };

    const response = await authFetch("/api/admin/view-as-creator", {
      method: "POST",
      body: JSON.stringify({
        action: "start",
        targetUserId: input.targetUserId,
        reason: input.reason,
        returnHref,
        syntheticCreatorType: input.syntheticCreatorType,
        simulationStartedAt,
      }),
    });
    const result = await response.json().catch(() => ({})) as { error?: string };
    if (!response.ok) {
      throw new Error(result.error || "View-as session could not start.");
    }

    writeAdminViewAsStateToStorage(nextState);
    setViewAsState(nextState);
    trackEvent("admin_view_as_creator_started", {
      actorType: "admin",
      actorUid: user.uid,
      targetUserId: input.targetUserId,
      performedAs: "admin_view_as_creator",
      route: pathname || "/admin/roster",
      reason: input.reason,
      syntheticCreatorType: input.syntheticCreatorType ?? "",
    });
    toast.success(`Viewing as ${nextState.adminViewingAsDisplayName}.`);
  }, [pathname, user?.uid]);

  const endViewAsCreator = useCallback(async (reason = "Returned to admin") => {
    const current = viewAsState ?? readAdminViewAsStateFromStorage();
    if (!current) {
      return;
    }

    clearAdminViewAsStateFromStorage();
    setViewAsState(null);

    try {
      const response = await authFetch("/api/admin/view-as-creator", {
        method: "POST",
        body: JSON.stringify({
          action: "end",
          targetUserId: current.adminViewingAsUserId,
          reason,
          returnHref: current.viewAsReturnHref,
          simulationStartedAt: current.simulationStartedAt,
        }),
      });
      if (!response.ok) {
        throw new Error("View-as audit end failed.");
      }
    } catch {
      // The local simulation is already cleared; server diagnostics retain failed audit attempts.
    }

    trackEvent("admin_view_as_creator_ended", {
      actorType: "admin",
      actorUid: user?.uid ?? current.viewAsActorUid,
      targetUserId: current.adminViewingAsUserId,
      performedAs: "admin_view_as_creator",
      route: pathname || "/admin/roster",
      reason,
    });
    router.push(current.viewAsReturnHref || "/admin/roster");
  }, [pathname, router, user?.uid, viewAsState]);

  const value = useMemo<AdminViewAsContextValue>(() => ({
    viewAsState,
    debug: buildAdminViewAsDebugFields(viewAsState),
    startViewAsCreator,
    endViewAsCreator,
  }), [endViewAsCreator, startViewAsCreator, viewAsState]);

  return (
    <AdminViewAsContext.Provider value={value}>
      {children}
    </AdminViewAsContext.Provider>
  );
}

export function useAdminViewAs() {
  const context = useContext(AdminViewAsContext);
  if (!context) {
    throw new Error("useAdminViewAs must be used within AdminViewAsProvider");
  }

  return context;
}
