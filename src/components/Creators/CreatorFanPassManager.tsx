"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";

import { HumanErrorNotice } from "@/components/errors/HumanErrorNotice";
import { FanPassSubscriberRow, type FanPassSubscriberCrmRow } from "@/components/Creators/FanPassSubscriberRow";
import { useSubmitBugReport } from "@/hooks/useSubmitBugReport";
import { authFetch } from "@/lib/authFetch";
import {
  buildBugReportContext,
  getSafePreviousRoute,
  resolveClientActionError,
  type ResolvedClientActionError,
} from "@/lib/errors/client-error-adapter";

type SectionState = "live" | "unavailable" | "not_configured" | "blocked" | "needs_setup" | "needs_review" | "error";
type FanPassStatus = "active" | "canceled" | "grace" | "past_due" | string;

type FanPassSubscriberRecord = FanPassSubscriberCrmRow & {
  status?: FanPassStatus;
};

type FanPassResponse = {
  success?: boolean;
  viewMode?: "creator_subscriber_visibility" | "fan_subscription_status" | "subscriber_visibility_projection";
  subscribers?: FanPassSubscriberRecord[];
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

function normalizeSubscribers(value: unknown): FanPassSubscriberRecord[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((entry): entry is FanPassSubscriberRecord => Boolean(entry && typeof entry === "object" && typeof (entry as FanPassSubscriberRecord).id === "string"))
    .sort((left, right) => {
      const leftAt = typeof left.startedAt === "number" ? left.startedAt : 0;
      const rightAt = typeof right.startedAt === "number" ? right.startedAt : 0;
      return rightAt - leftAt;
    });
}

function readObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
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
  const [subscribers, setSubscribers] = useState<FanPassSubscriberRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<ResolvedClientActionError | null>(null);
  const loadRequestIdRef = useRef(0);
  const bugReporter = useSubmitBugReport();
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
      setActionError(null);
      setLoading(false);
      return;
    }

    const requestId = loadRequestIdRef.current + 1;
    loadRequestIdRef.current = requestId;
    setLoading(true);
    setError(null);
    setActionError(null);
    try {
      const response = await authFetch(subscribersUrl);
      const body = await response.json().catch(() => ({})) as FanPassResponse;
      if (!response.ok) {
        throw resolveClientActionError(body, {
          code: "manager_load_failed",
          status: response.status,
          surface: "creator_dashboard",
          route: subscribersUrl,
          fallbackKey: "manager_load_failed",
          context: { manager: "fan_pass", stage: "load" },
        });
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
        setActionError("descriptor" in readObject(loadError)
          ? loadError as ResolvedClientActionError
          : resolveClientActionError(loadError, {
            surface: "creator_dashboard",
            route: subscribersUrl,
            fallbackKey: "manager_load_failed",
            context: { manager: "fan_pass", stage: "load" },
          }));
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
      data-fan-pass-crm="mobile_v1"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-gray-400">Fan Pass</p>
          <h2 className="mt-1 text-lg font-black text-white">Fan Pass CRM</h2>
          <p className="mt-1 text-sm text-gray-300">{canLoadSubscribers ? `${creatorName} has ${activeCount.toLocaleString()} active subscriber${activeCount === 1 ? "" : "s"}.` : unavailableMessage}</p>
        </div>
        <button
          type="button"
          onClick={() => void loadSubscribers()}
          disabled={!canLoadSubscribers || loading}
          aria-busy={loading}
          className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2.5 text-xs font-bold text-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />}
          Refresh
        </button>
      </div>

      <p className="mt-3 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-gray-300">
        Read-only creator view. Public creator pages own fan membership changes.
      </p>
      {error ? (
        <p className="mt-3 rounded-2xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-100">{error}</p>
      ) : null}
      {actionError ? (
        <HumanErrorNotice
          descriptor={actionError.descriptor}
          compact
          className="mt-3"
          onPrimaryAction={(action) => {
            if (action === "refresh" || action === "retry") {
              void loadSubscribers();
            }
          }}
          onSubmitBug={() => bugReporter.submit(actionError.descriptor, buildBugReportContext({
            descriptor: actionError.descriptor,
            route: actionError.route,
            previousRoute: getSafePreviousRoute(),
            extra: actionError.context,
          }))}
        />
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
          {subscribers.map((subscriber) => (
            <FanPassSubscriberRow key={subscriber.id} subscriber={subscriber} fallbackPriceGd={priceGd} />
          ))}
        </div>
      )}
    </section>
  );
}
