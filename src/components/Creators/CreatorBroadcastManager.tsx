"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronUp, Loader2, Megaphone, RefreshCw, Send } from "lucide-react";

import { HumanErrorNotice } from "@/components/errors/HumanErrorNotice";
import { PageViewEvent } from "@/components/Analytics/PageViewEvent";
import { useAdminViewAs } from "@/context/AdminViewAsContext";
import { useAuth } from "@/context/AuthContext";
import { useSubmitBugReport } from "@/hooks/useSubmitBugReport";
import { authFetch } from "@/lib/authFetch";
import {
  buildBugReportContext,
  getSafePreviousRoute,
  resolveClientActionError,
  type ResolvedClientActionError,
} from "@/lib/errors/client-error-adapter";
import { trackEvent } from "@/lib/telemetry";
import { cn } from "@/lib/utils";

type BroadcastStatus = "draft" | "scheduled" | "sent" | "published" | "failed" | "canceled";

type BroadcastRecord = {
  id: string;
  title?: string;
  message?: string;
  status?: BroadcastStatus | string;
  createdAtMs?: number;
  scheduledAtMs?: number | null;
  sentAtMs?: number | null;
  audience?: "followers" | "fan_pass_subscribers" | "followers_and_subscribers" | string;
  audienceFanCount?: number;
  audienceNotificationCount?: number;
  deliveryCount?: number | null;
  openCount?: number | null;
  failureReason?: string | null;
};

type BroadcastManagerResponse = {
  success?: boolean;
  broadcasts?: BroadcastRecord[];
  broadcast?: BroadcastRecord;
  error?: string;
};

function formatDateTime(value?: number | null) {
  if (!value || !Number.isFinite(value)) {
    return "Not tracked yet";
  }

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function getStatusTone(status: string) {
  switch (status) {
    case "sent":
    case "published":
      return "bg-emerald-500/15 text-emerald-200 border-emerald-400/20";
    case "scheduled":
      return "bg-amber-500/15 text-amber-100 border-amber-400/20";
    case "failed":
      return "bg-red-500/15 text-red-100 border-red-400/20";
    case "canceled":
      return "bg-white/10 text-gray-200 border-white/10";
    default:
      return "bg-brand-purple/15 text-brand-purple border-brand-purple/20";
  }
}

function statusLabel(status?: string) {
  return (status || "draft").replaceAll("_", " ");
}

function readObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
}

export function CreatorBroadcastManager({
  creatorId,
  creatorName,
  broadcastsEnabled = true,
  broadcastsRestricted = false,
}: {
  creatorId: string;
  creatorName: string;
  broadcastsEnabled?: boolean;
  broadcastsRestricted?: boolean;
}) {
  const { userProfile } = useAuth();
  const { viewAsState } = useAdminViewAs();
  const [broadcasts, setBroadcasts] = useState<BroadcastRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<ResolvedClientActionError | null>(null);
  const bugReporter = useSubmitBugReport();
  const loadRequestIdRef = useRef(0);

  const query = useMemo(() => (viewAsState?.adminViewingAsUserId ? `?creatorId=${encodeURIComponent(viewAsState.adminViewingAsUserId)}` : ""), [viewAsState?.adminViewingAsUserId]);
  const readOnly = Boolean(viewAsState);
  const actorRole = userProfile?.role || "creator";
  const canReadBroadcasts = Boolean(creatorId) && broadcastsEnabled !== false && broadcastsRestricted !== true;
  const canSendBroadcast = canReadBroadcasts && !readOnly;
  const blockedTruthState = broadcastsRestricted ? "blocked" : broadcastsEnabled === false ? "not_configured" : "unavailable";

  const loadBroadcasts = useCallback(async () => {
    if (!canReadBroadcasts) {
      setBroadcasts([]);
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
      const response = await authFetch(`/api/creator/broadcasts${query}`);
      const body = await response.json().catch(() => ({})) as BroadcastManagerResponse;
      if (!response.ok) {
        throw resolveClientActionError(body, {
          code: "manager_load_failed",
          status: response.status,
          surface: "creator_dashboard",
          route: `/api/creator/broadcasts${query}`,
          fallbackKey: "manager_load_failed",
          context: { manager: "broadcasts", stage: "load" },
        });
      }
      const nextBroadcasts = Array.isArray(body.broadcasts) ? body.broadcasts : [];
      if (loadRequestIdRef.current !== requestId) return;
      setBroadcasts(nextBroadcasts);
      if (nextBroadcasts.length === 0) {
        trackEvent("creator_broadcast_empty_state_viewed", {
          actor_role: actorRole,
          creator_id: creatorId,
          target_creator_id: creatorId,
          section: "broadcasts",
          source_component: "CreatorBroadcastManager",
          truth_state: "not_configured",
        });
      }
    } catch (loadError) {
      if (loadRequestIdRef.current === requestId) {
        setActionError("descriptor" in readObject(loadError)
          ? loadError as ResolvedClientActionError
          : resolveClientActionError(loadError, {
            surface: "creator_dashboard",
            route: `/api/creator/broadcasts${query}`,
            fallbackKey: "manager_load_failed",
            context: { manager: "broadcasts", stage: "load" },
          }));
      }
    } finally {
      if (loadRequestIdRef.current === requestId) {
        setLoading(false);
      }
    }
  }, [actorRole, canReadBroadcasts, creatorId, query]);

  useEffect(() => {
    void loadBroadcasts();
  }, [loadBroadcasts]);

  const handleSend = useCallback(async () => {
    if (!canSendBroadcast) {
      setError(readOnly ? "Read-only projection. Broadcast creation is disabled." : "Broadcasts are unavailable for this creator.");
      return;
    }
    if (sending) {
      return;
    }
    if (message.trim().length < 4) {
      setError("Write a short message before sending a broadcast.");
      return;
    }

    setSending(true);
    setError(null);
    setActionError(null);
    try {
      const response = await authFetch("/api/creator/broadcasts", {
        method: "POST",
        body: JSON.stringify({
          title: title.trim(),
          message: message.trim(),
          audience: "followers",
        }),
      });
      const body = await response.json().catch(() => ({})) as BroadcastManagerResponse;
      if (!response.ok) {
        setActionError(resolveClientActionError(body, {
          code: "mutation_failed",
          status: response.status,
          surface: "creator_dashboard",
          route: "/api/creator/broadcasts",
          fallbackKey: "mutation_failed",
          context: { manager: "broadcasts", stage: "send" },
        }));
        trackEvent("creator_broadcast_creation_failed", {
          actor_role: actorRole,
          creator_id: creatorId,
          target_creator_id: creatorId,
          section: "broadcasts",
          source_component: "CreatorBroadcastManager",
          truth_state: "error",
        });
        return;
      }

      if (body.broadcast) {
        setBroadcasts((current) => [body.broadcast!, ...current]);
      }
      setTitle("");
      setMessage("");
      trackEvent("creator_broadcast_created", {
        actor_role: actorRole,
        creator_id: creatorId,
        target_creator_id: creatorId,
        section: "broadcasts",
        broadcast_id: body.broadcast?.id || "",
        source_component: "CreatorBroadcastManager",
        truth_state: "live",
      });
    } catch {
      setActionError(resolveClientActionError(null, {
        code: "mutation_failed",
        surface: "creator_dashboard",
        route: "/api/creator/broadcasts",
        fallbackKey: "mutation_failed",
        context: { manager: "broadcasts", stage: "send" },
      }));
      trackEvent("creator_broadcast_creation_failed", {
        actor_role: actorRole,
        creator_id: creatorId,
        target_creator_id: creatorId,
        section: "broadcasts",
        source_component: "CreatorBroadcastManager",
        truth_state: "error",
      });
    } finally {
      setSending(false);
    }
  }, [actorRole, canSendBroadcast, creatorId, message, readOnly, sending, title]);

  return (
    <section className="rounded-3xl border border-white/10 bg-black/45 p-4 sm:p-5">
      <PageViewEvent
        eventName="creator_broadcast_manager_viewed"
        eventParams={{
          actor_role: actorRole,
          creator_id: creatorId,
          target_creator_id: creatorId,
          section: "broadcasts",
          source_component: "CreatorBroadcastManager",
          truth_state: readOnly ? "blocked" : canReadBroadcasts ? "live" : blockedTruthState,
        }}
      />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-gray-400">Broadcasts</p>
          <h2 className="mt-1 text-lg font-black text-white">Manage fan broadcasts</h2>
          <p className="mt-1 text-sm text-gray-400">Review what {creatorName} sent, see delivery status, and send a new update.</p>
        </div>
        <button
          type="button"
          onClick={() => void loadBroadcasts()}
          disabled={!canReadBroadcasts || loading}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          Refresh
        </button>
      </div>

      <div className="mt-4 rounded-2xl border border-white/10 bg-black/40 p-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-white">
          <Megaphone className="h-4 w-4 text-brand-purple" />
          Create broadcast
        </div>
        <div className="mt-2 inline-flex rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-gray-300" data-broadcast-audience="followers">
          Audience: Followers
        </div>
        <div className="mt-3 space-y-2">
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value.slice(0, 80))}
            placeholder="Optional title"
            className="w-full rounded-xl border border-white/10 bg-black/50 px-3 py-2 text-sm text-white outline-none placeholder:text-white/30"
            maxLength={80}
            disabled={!canSendBroadcast}
          />
          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value.slice(0, 280))}
            placeholder="Message your fans"
            rows={3}
            className="w-full resize-none rounded-xl border border-white/10 bg-black/50 px-3 py-2 text-sm text-white outline-none placeholder:text-white/30"
            maxLength={280}
            disabled={!canSendBroadcast}
          />
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] text-gray-500">{message.length}/280</p>
            <button
              type="button"
              onClick={() => void handleSend()}
              disabled={sending || !canSendBroadcast || message.trim().length < 4}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-brand-purple px-4 py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Create broadcast
            </button>
          </div>
          {readOnly ? <p className="text-xs text-gray-400">Read-only projection. Broadcast creation is disabled.</p> : null}
          {!readOnly && !canReadBroadcasts ? <p className="text-xs text-gray-400">Broadcasts are unavailable for this creator.</p> : null}
          {error ? <p className="text-xs text-red-200">{error}</p> : null}
          {actionError ? (
            <HumanErrorNotice
              descriptor={actionError.descriptor}
              compact
              className="mt-2"
              onPrimaryAction={(action) => {
                if (action === "refresh" || action === "retry") {
                  void loadBroadcasts();
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
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {loading ? (
          <div className="rounded-2xl border border-white/10 bg-black/30 p-4 text-sm text-gray-400">Loading broadcasts...</div>
        ) : broadcasts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-black/25 p-4">
            <p className="text-sm font-semibold text-white">No broadcasts yet</p>
            <p className="mt-1 text-sm text-gray-400">Broadcasts you send from here will show up in newest-first order.</p>
          </div>
        ) : broadcasts.map((broadcast) => {
          const status = (broadcast.status || "sent").toString();
          const expanded = expandedId === broadcast.id;
          return (
            <article key={broadcast.id} className="rounded-2xl border border-white/10 bg-black/35 p-4">
              <button
                type="button"
                onClick={() => {
                  setExpandedId(expanded ? null : broadcast.id);
                  trackEvent("creator_broadcast_detail_viewed", {
                    actor_role: actorRole,
                    creator_id: creatorId,
                    target_creator_id: creatorId,
                    section: "broadcasts",
                    broadcast_id: broadcast.id,
                    source_component: "CreatorBroadcastManager",
                    truth_state: status,
                  });
                }}
                className="flex w-full items-start justify-between gap-3 text-left"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-semibold text-white">{broadcast.title?.trim() || "Creator update"}</p>
                    <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.16em]", getStatusTone(status))}>
                      {statusLabel(status)}
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm text-gray-400">{broadcast.message || "Not tracked yet"}</p>
                  <p className="mt-1 text-xs font-semibold text-brand-purple">View details</p>
                </div>
                {expanded ? <ChevronUp className="h-4 w-4 shrink-0 text-gray-400" /> : <ChevronDown className="h-4 w-4 shrink-0 text-gray-400" />}
              </button>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-gray-400 sm:grid-cols-3">
                <div>Created {formatDateTime(broadcast.createdAtMs)}</div>
                <div>Sent {formatDateTime(broadcast.sentAtMs)}</div>
                <div>Audience {broadcast.audienceNotificationCount ?? broadcast.audienceFanCount ?? "Not tracked yet"}</div>
              </div>
              {expanded ? (
                <div className="mt-3 space-y-2 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm text-gray-300">
                  <p>{broadcast.message || "Not tracked yet"}</p>
                  <div className="grid grid-cols-2 gap-2 text-xs text-gray-400">
                    <div>Delivered {broadcast.deliveryCount ?? "Not tracked yet"}</div>
                    <div>Opened {broadcast.openCount ?? "Not tracked yet"}</div>
                  </div>
                  {broadcast.failureReason ? <p className="text-xs text-red-200">Failure: {broadcast.failureReason}</p> : null}
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}
