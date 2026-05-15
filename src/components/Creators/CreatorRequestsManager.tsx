"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";

import { authFetch } from "@/lib/authFetch";
import { cn } from "@/lib/utils";

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

type CreatorRequestsManagerProps = {
  creatorId: string;
  creatorName: string;
  enabled: boolean;
  restricted: boolean;
  readOnly: boolean;
  sourceState: SectionState;
};

function statusTone(status: CreatorRequestStatus | undefined) {
  switch (status) {
    case "pending":
      return "border-amber-300/20 bg-amber-500/10 text-amber-100";
    case "accepted":
      return "border-sky-300/20 bg-sky-500/10 text-sky-100";
    case "fulfilled":
      return "border-emerald-300/20 bg-emerald-500/10 text-emerald-100";
    case "declined":
      return "border-red-300/20 bg-red-500/10 text-red-100";
    default:
      return "border-white/10 bg-white/5 text-gray-200";
  }
}

function formatCount(count: number) {
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

export function CreatorRequestsManager({
  creatorId,
  creatorName,
  enabled,
  restricted,
  readOnly,
  sourceState,
}: CreatorRequestsManagerProps) {
  const [requests, setRequests] = useState<CreatorRequestRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingActionId, setPendingActionId] = useState<string | null>(null);
  const loadRequestIdRef = useRef(0);
  const pendingActionIdRef = useRef<string | null>(null);
  const canLoadRequests = Boolean(creatorId && enabled && !restricted);
  const requestsUrl = useMemo(() => `/api/creator/requests?creatorId=${encodeURIComponent(creatorId)}`, [creatorId]);

  const loadRequests = useCallback(async () => {
    if (!canLoadRequests) {
      setRequests([]);
      setError(null);
      setLoading(false);
      return;
    }

    const requestId = loadRequestIdRef.current + 1;
    loadRequestIdRef.current = requestId;
    setLoading(true);
    setError(null);
    try {
      const response = await authFetch(requestsUrl);
      const body = await response.json().catch(() => ({})) as CreatorRequestsResponse;
      if (!response.ok) {
        throw new Error(body.error || body.message || "Requests are unavailable.");
      }
      if (loadRequestIdRef.current === requestId) {
        setRequests(normalizeRequests(body.requests));
      }
    } catch (loadError) {
      if (loadRequestIdRef.current === requestId) {
        setError(loadError instanceof Error ? loadError.message : "Requests are unavailable.");
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
    setError(null);
    try {
      const response = await authFetch("/api/creator/requests", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId: request.id, action }),
      });
      const body = await response.json().catch(() => ({})) as CreatorRequestsResponse & { status?: CreatorRequestStatus };
      if (!response.ok) {
        throw new Error(body.error || body.message || "Request action failed.");
      }

      const nextStatus = body.status || (action === "accept" ? "accepted" : action === "decline" ? "declined" : "fulfilled");
      setRequests((current) => current.map((entry) => entry.id === request.id ? {
        ...entry,
        status: nextStatus,
        respondedAt: Date.now(),
      } : entry));
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Request action failed.");
    } finally {
      if (pendingActionIdRef.current === actionKey) {
        pendingActionIdRef.current = null;
        setPendingActionId(null);
      }
    }
  }

  return (
    <section
      id="creator-requests-manager"
      className="rounded-3xl border border-white/10 bg-black/45 p-4 sm:p-5"
      data-testid="creator-requests-manager"
      data-creator-requests-source-state={sourceState}
      data-creator-requests-load-state={canLoadRequests ? "connected" : "configuration_only"}
      data-creator-requests-read-only={readOnly ? "true" : "false"}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-gray-400">Requests</p>
          <h2 className="mt-1 text-lg font-black text-white">Manage custom requests</h2>
          <p className="mt-1 text-sm text-gray-300">{canLoadRequests ? `${creatorName} has ${formatCount(visibleRequests.length)} loaded.` : unavailableMessage}</p>
        </div>
        <button
          type="button"
          onClick={() => void loadRequests()}
          disabled={!canLoadRequests || loading}
          className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2.5 text-xs font-bold text-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          Refresh
        </button>
      </div>

      {readOnly ? (
        <p className="mt-3 rounded-2xl border border-brand-purple/20 bg-brand-purple/10 px-3 py-2 text-xs font-semibold text-brand-purple">Read-only projection: request actions are disabled.</p>
      ) : null}
      {error ? (
        <p className="mt-3 rounded-2xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-100">{error}</p>
      ) : null}

      {!canLoadRequests ? (
        <p className="mt-3 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-gray-300">{unavailableMessage}</p>
      ) : loading ? (
        <div className="mt-4 flex items-center gap-2 text-sm text-gray-300">
          <Loader2 className="h-4 w-4 animate-spin text-brand-purple" />
          Loading requests
        </div>
      ) : visibleRequests.length === 0 ? (
        <p className="mt-3 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-gray-300">No open requests.</p>
      ) : (
        <div className="mt-4 space-y-3">
          <p className="text-xs font-semibold text-gray-400">
            {formatCount(pendingRequests.length)} pending. {formatCount(acceptedRequests.length)} accepted.
          </p>
          {visibleRequests.map((request) => {
            const status = request.status || "pending";
            const category = request.categoryLabel || request.categoryId || "Custom request";
            const price = typeof request.priceGd === "number" ? `${request.priceGd.toLocaleString()} GD` : "Price unavailable";
            const actionDisabled = readOnly || Boolean(pendingActionId);
            return (
              <article key={request.id} className="rounded-2xl border border-white/10 bg-white/[0.04] p-3" data-creator-request-status={status}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-bold text-white">{category}</h3>
                      <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em]", statusTone(status))}>
                        {status}
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm text-gray-300">{request.details || "No request details provided."}</p>
                    <p className="mt-1 text-xs text-gray-500">{price}</p>
                  </div>
                </div>
                {status === "pending" || status === "accepted" ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {status === "pending" ? (
                      <>
                        <button
                          type="button"
                          disabled={actionDisabled}
                          onClick={() => void handleAction(request, "accept")}
                          className="min-h-11 rounded-full border border-emerald-300/20 bg-emerald-500/10 px-3 py-2.5 text-xs font-bold text-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Accept
                        </button>
                        <button
                          type="button"
                          disabled={actionDisabled}
                          onClick={() => void handleAction(request, "decline")}
                          className="min-h-11 rounded-full border border-red-300/20 bg-red-500/10 px-3 py-2.5 text-xs font-bold text-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Decline
                        </button>
                      </>
                    ) : null}
                    {status === "accepted" ? (
                      <button
                        type="button"
                        disabled={actionDisabled}
                        onClick={() => void handleAction(request, "fulfill")}
                        className="min-h-11 rounded-full border border-sky-300/20 bg-sky-500/10 px-3 py-2.5 text-xs font-bold text-sky-100 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Fulfill
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
