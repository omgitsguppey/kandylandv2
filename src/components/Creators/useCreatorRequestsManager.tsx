"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useSubmitBugReport } from "@/hooks/useSubmitBugReport";
import { authFetch } from "@/lib/authFetch";
import { resolveClientActionError, type ResolvedClientActionError } from "@/lib/errors/client-error-adapter";

type SectionState = "live" | "unavailable" | "not_configured" | "blocked" | "needs_setup" | "needs_review" | "error";

type CreatorRequestStatus = "pending" | "accepted" | "declined" | "fulfilled" | string;
type CreatorRequestAction = "accept" | "decline" | "fulfill";

type CreatorRequestRow = {
  id: string;
  userId?: string;
  categoryId?: string;
  categoryLabel?: string;
  details?: string;
  priceGd?: number;
  status?: CreatorRequestStatus;
  createdAt?: number;
  respondedAt?: number;
  responseNote?: string | null;
};

type CreatorRequestsResponse = {
  success?: boolean;
  requests?: CreatorRequestRow[];
  error?: string;
  message?: string;
};

export type CreatorRequestsManagerProps = {
  creatorId: string;
  creatorName: string;
  enabled: boolean;
  restricted: boolean;
  readOnly: boolean;
  sourceState: SectionState;
};

export function statusTone(status: CreatorRequestStatus | undefined) {
  switch (status) {
    case "pending":
      return "border-warning/20 bg-warning/10 text-warning";
    case "accepted":
      return "border-info/20 bg-info/10 text-info";
    case "fulfilled":
      return "border-success/20 bg-success/10 text-success";
    case "declined":
      return "border-destructive/20 bg-destructive/10 text-destructive";
    default:
      return "border-border bg-secondary text-foreground";
  }
}

export function formatCount(count: number) {
  return `${count.toLocaleString()} request${count === 1 ? "" : "s"}`;
}

function normalizeRequests(value: unknown): CreatorRequestRow[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((entry): entry is CreatorRequestRow => Boolean(entry && typeof entry === "object" && typeof (entry as CreatorRequestRow).id === "string"))
    .sort((left, right) => {
      const leftAt = typeof left.createdAt === "number" ? left.createdAt : 0;
      const rightAt = typeof right.createdAt === "number" ? right.createdAt : 0;
      return rightAt - leftAt;
    });
}

function readObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
}

export function useCreatorRequestsManager({
  creatorId,
  creatorName,
  enabled,
  restricted,
  readOnly,
  sourceState,
}: CreatorRequestsManagerProps) {
const [requests, setRequests] = useState<CreatorRequestRow[]>([]);
const [loading, setLoading] = useState(false);
const [actionError, setActionError] = useState<ResolvedClientActionError | null>(null);
const [pendingActionId, setPendingActionId] = useState<string | null>(null);
const bugReporter = useSubmitBugReport();
const loadRequestIdRef = useRef(0);
const pendingActionIdRef = useRef<string | null>(null);
const canLoadRequests = Boolean(creatorId && enabled && !restricted);
const requestsUrl = useMemo(() => `/api/creator/requests?creatorId=${encodeURIComponent(creatorId)}`, [creatorId]);
const loadRequests = useCallback(async () => {
    if (!canLoadRequests) {
      setRequests([]);
      setActionError(null);
      setLoading(false);
      return;
    }

    const requestId = loadRequestIdRef.current + 1;
    loadRequestIdRef.current = requestId;
    setLoading(true);
    setActionError(null);
    try {
      const response = await authFetch(requestsUrl);
      const body = await response.json().catch(() => ({})) as CreatorRequestsResponse;
      if (!response.ok) {
        throw resolveClientActionError(body, {
          code: "manager_load_failed",
          status: response.status,
          surface: "creator_dashboard",
          route: requestsUrl,
          fallbackKey: "manager_load_failed",
          context: { manager: "requests", stage: "load" },
        });
      }
      if (loadRequestIdRef.current === requestId) {
        setRequests(normalizeRequests(body.requests));
      }
    } catch (loadError) {
      if (loadRequestIdRef.current === requestId) {
        setActionError("descriptor" in readObject(loadError)
          ? loadError as ResolvedClientActionError
          : resolveClientActionError(loadError, {
            surface: "creator_dashboard",
            route: requestsUrl,
            fallbackKey: "manager_load_failed",
            context: { manager: "requests", stage: "load" },
          }));
        setRequests([]);
      }
    } finally {
      if (loadRequestIdRef.current === requestId) {
        setLoading(false);
      }
    }
  }, [canLoadRequests, requestsUrl]);
useEffect(() => {
    void loadRequests();
  }, [loadRequests]);
const visibleRequests = useMemo(() => requests.filter((request) => ["pending", "accepted", "fulfilled", "declined"].includes(String(request.status || "pending"))), [requests]);
const pendingRequests = visibleRequests.filter((request) => (request.status || "pending") === "pending");
const acceptedRequests = visibleRequests.filter((request) => request.status === "accepted");
const unavailableMessage = restricted
    ? "Custom requests are restricted for this creator."
    : enabled
      ? "Request management uses the existing creator request route."
      : "Configuration-only until custom requests are enabled.";
async function handleAction(request: CreatorRequestRow, action: CreatorRequestAction) {
    if (!request.id || readOnly || restricted || !enabled || pendingActionIdRef.current) {
      return;
    }

    const actionKey = `${request.id}:${action}`;
    pendingActionIdRef.current = actionKey;
    setPendingActionId(actionKey);
    setActionError(null);
    try {
      const response = await authFetch("/api/creator/requests", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId: request.id, action }),
      });
      const body = await response.json().catch(() => ({})) as CreatorRequestsResponse & { status?: CreatorRequestStatus };
      if (!response.ok) {
        throw resolveClientActionError(body, {
          code: "mutation_failed",
          status: response.status,
          surface: "creator_dashboard",
          route: "/api/creator/requests",
          fallbackKey: "mutation_failed",
          context: { manager: "requests", stage: "mutation", action, requestId: request.id },
        });
      }

      const nextStatus = body.status || (action === "accept" ? "accepted" : action === "decline" ? "declined" : "fulfilled");
      setRequests((current) => current.map((entry) => entry.id === request.id ? {
        ...entry,
        status: nextStatus,
        respondedAt: Date.now(),
      } : entry));
    } catch (actionError) {
      setActionError("descriptor" in readObject(actionError)
        ? actionError as ResolvedClientActionError
        : resolveClientActionError(actionError, {
          surface: "creator_dashboard",
          route: "/api/creator/requests",
          fallbackKey: "mutation_failed",
          context: { manager: "requests", stage: "mutation", action, requestId: request.id },
        }));
    } finally {
      if (pendingActionIdRef.current === actionKey) {
        pendingActionIdRef.current = null;
        setPendingActionId(null);
      }
    }
  }
return { creatorName, readOnly, sourceState, loading, actionError, pendingActionId, bugReporter, canLoadRequests, loadRequests, visibleRequests, pendingRequests, acceptedRequests, unavailableMessage, handleAction };
}
