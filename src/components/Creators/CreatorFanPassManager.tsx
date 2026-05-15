"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2, RefreshCw, Wallet } from "lucide-react";

import { authFetch } from "@/lib/authFetch";
import { cn } from "@/lib/utils";

type SectionState = "live" | "unavailable" | "not_configured" | "blocked" | "needs_setup" | "needs_review" | "error";
type FanPassStatus = "active" | "canceled" | "grace" | "past_due" | string;

type FanPassSubscriberRow = {
  id: string;
  userId?: string;
  status?: FanPassStatus;
  priceGd?: number;
  startedAt?: number;
  renewAt?: number;
  renewedAt?: number;
  gracePeriodEndsAt?: number | null;
  renewalState?: string;
};

type FanPassResponse = {
  success?: boolean;
  viewMode?: "creator_subscriber_visibility" | "fan_subscription_status" | "subscriber_visibility_projection";
  subscribers?: FanPassSubscriberRow[];
  error?: string;
  message?: string;
};

type CreatorFanPassManagerProps = {
  creatorId: string;
  creatorName: string;
  enabled: boolean;
  restricted: boolean;
  priceGd: number;
  readOnly: boolean;
  sourceState: SectionState;
};

function statusTone(status: FanPassStatus | undefined) {
  switch (status) {
    case "active":
      return "border-emerald-300/20 bg-emerald-500/10 text-emerald-100";
    case "grace":
    case "past_due":
      return "border-amber-300/20 bg-amber-500/10 text-amber-100";
    case "canceled":
      return "border-red-300/20 bg-red-500/10 text-red-100";
    default:
      return "border-white/10 bg-white/5 text-gray-200";
  }
}

function formatDate(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "Date unavailable";
  }
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function shortUserId(value: unknown) {
  if (typeof value !== "string" || value.length === 0) {
    return "Unknown fan";
  }
  return value.length > 10 ? `${value.slice(0, 6)}...${value.slice(-4)}` : value;
}

function normalizeSubscribers(value: unknown): FanPassSubscriberRow[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((entry): entry is FanPassSubscriberRow => Boolean(entry && typeof entry === "object" && typeof (entry as FanPassSubscriberRow).id === "string"))
    .sort((left, right) => {
      const leftAt = typeof left.startedAt === "number" ? left.startedAt : 0;
      const rightAt = typeof right.startedAt === "number" ? right.startedAt : 0;
      return rightAt - leftAt;
    });
}

export function CreatorFanPassManager({
  creatorId,
  creatorName,
  enabled,
  restricted,
  priceGd,
  readOnly,
  sourceState,
}: CreatorFanPassManagerProps) {
  const [subscribers, setSubscribers] = useState<FanPassSubscriberRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadRequestIdRef = useRef(0);
  const canLoadSubscribers = Boolean(creatorId && enabled && !restricted && priceGd > 0);
  const subscribersUrl = useMemo(() => `/api/creator/subscriptions?creatorId=${encodeURIComponent(creatorId)}`, [creatorId]);
  const managementState = restricted
    ? "blocked"
    : enabled && priceGd > 0
      ? "subscriber_visibility"
      : "configuration_only";

  const loadSubscribers = useCallback(async () => {
    if (!canLoadSubscribers) {
      setSubscribers([]);
      setError(null);
      setLoading(false);
      return;
    }

    const requestId = loadRequestIdRef.current + 1;
    loadRequestIdRef.current = requestId;
    setLoading(true);
    setError(null);
    try {
      const response = await authFetch(subscribersUrl);
      const body = await response.json().catch(() => ({})) as FanPassResponse;
      if (!response.ok) {
        throw new Error(body.error || body.message || "Fan Pass subscribers are unavailable.");
      }
      if (loadRequestIdRef.current === requestId) {
        if (body.viewMode === "fan_subscription_status") {
          setError("Subscriber visibility unavailable for this context.");
          setSubscribers([]);
          return;
        }
        setSubscribers(normalizeSubscribers(body.subscribers));
      }
    } catch (loadError) {
      if (loadRequestIdRef.current === requestId) {
        setError(loadError instanceof Error ? loadError.message : "Fan Pass subscribers are unavailable.");
        setSubscribers([]);
      }
    } finally {
      if (loadRequestIdRef.current === requestId) {
        setLoading(false);
      }
    }
  }, [canLoadSubscribers, subscribersUrl]);

  useEffect(() => {
    void loadSubscribers();
  }, [loadSubscribers]);

  const activeCount = subscribers.filter((subscriber) => subscriber.status === "active").length;
  const unavailableMessage = restricted
    ? "Fan Pass is restricted for this creator."
    : enabled && priceGd > 0
      ? "Subscriber visibility uses the existing subscription route."
      : "Fan Pass subscriber visibility is configuration-only until pricing is enabled.";

  return (
    <section
      className="rounded-3xl border border-white/10 bg-black/45 p-4 sm:p-5"
      data-creator-fan-pass-manager
      data-testid="creator-fan-pass-manager"
      data-creator-fan-pass-management-state={managementState}
      data-creator-fan-pass-source-state={sourceState}
      data-creator-fan-pass-read-only="true"
      data-creator-fan-pass-projection-read-only={readOnly ? "true" : "false"}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-gray-400">Fan Pass</p>
          <h2 className="mt-1 text-lg font-black text-white">Subscriber visibility</h2>
          <p className="mt-1 text-sm text-gray-300">{canLoadSubscribers ? `${creatorName} has ${activeCount.toLocaleString()} active subscriber${activeCount === 1 ? "" : "s"}.` : unavailableMessage}</p>
        </div>
        <button
          type="button"
          onClick={() => void loadSubscribers()}
          disabled={!canLoadSubscribers || loading}
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-bold text-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          Refresh
        </button>
      </div>

      <p className="mt-3 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-gray-300">
        Read-only creator view. Public creator pages own fan membership changes.
      </p>
      {error ? (
        <p className="mt-3 rounded-2xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-100">{error}</p>
      ) : null}

      {!canLoadSubscribers ? (
        <p className="mt-3 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-gray-300">{unavailableMessage}</p>
      ) : loading ? (
        <div className="mt-4 flex items-center gap-2 text-sm text-gray-300">
          <Loader2 className="h-4 w-4 animate-spin text-brand-purple" />
          Loading Fan Pass subscribers
        </div>
      ) : subscribers.length === 0 ? (
        <p className="mt-3 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-gray-300">No subscribers yet.</p>
      ) : (
        <div className="mt-4 space-y-3">
          {subscribers.map((subscriber) => {
            const status = subscriber.status || "unknown";
            const price = typeof subscriber.priceGd === "number" ? `${subscriber.priceGd.toLocaleString()} GD` : `${priceGd.toLocaleString()} GD`;
            const nextDate = typeof subscriber.renewAt === "number"
              ? `Renews ${formatDate(subscriber.renewAt)}`
              : typeof subscriber.startedAt === "number"
                ? `Started ${formatDate(subscriber.startedAt)}`
                : "Renewal date unavailable";
            return (
              <article key={subscriber.id} className="rounded-2xl border border-white/10 bg-white/[0.04] p-3" data-creator-fan-pass-subscriber-status={status}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Wallet className="h-4 w-4 text-brand-purple" />
                      <h3 className="text-sm font-bold text-white">{shortUserId(subscriber.userId)}</h3>
                      <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em]", statusTone(status))}>
                        {status.replaceAll("_", " ")}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-gray-300">{price} · {nextDate}</p>
                    {subscriber.renewalState ? <p className="mt-1 text-xs text-gray-500">Renewal: {subscriber.renewalState}</p> : null}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
