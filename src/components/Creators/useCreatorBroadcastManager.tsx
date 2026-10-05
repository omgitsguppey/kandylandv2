"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useAdminViewAs } from "@/context/AdminViewAsContext";
import { useAuth } from "@/context/AuthContext";
import { useSubmitBugReport } from "@/hooks/useSubmitBugReport";
import { authFetch } from "@/lib/authFetch";
import { resolveClientActionError, type ResolvedClientActionError } from "@/lib/errors/client-error-adapter";
import { trackEvent } from "@/lib/telemetry";

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

export function formatDateTime(value?: number | null) {
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

export function getStatusTone(status: string) {
  switch (status) {
    case "sent":
    case "published":
      return "bg-success/15 text-success border-success/20";
    case "scheduled":
      return "bg-warning/15 text-warning border-warning/20";
    case "failed":
      return "bg-destructive/15 text-destructive border-destructive/20";
    case "canceled":
      return "bg-secondary text-foreground border-border";
    default:
      return "bg-primary/15 text-primary border-primary/20";
  }
}

export function statusLabel(status?: string) {
  return (status || "draft").replaceAll("_", " ");
}

function readObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
}

export function useCreatorBroadcastManager({
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
return { creatorId, creatorName, broadcasts, loading, expandedId, setExpandedId, title, setTitle, message, setMessage, sending, error, actionError, bugReporter, readOnly, actorRole, canReadBroadcasts, canSendBroadcast, blockedTruthState, loadBroadcasts, handleSend };
}
