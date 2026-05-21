"use client";

import { useEffect, useMemo, useState } from "react";
import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";

import {
  buildAdminAnalyticsLiveSignals,
  type AdminAnalyticsLiveSignals,
} from "@/lib/admin-analytics-live-runtime";
import { reportClientIssue } from "@/lib/client-error-reporting";
import { db } from "@/lib/firebase-data";
import {
  buildFirestoreClientFallbackMessage,
  buildFirestoreClientIssueDetail,
} from "@/lib/firestore-client-errors";
import { createAutoHealingObserver } from "@/lib/self-healing";

type ListenerDetails = {
  lastEventAtMs: number | null;
  lastServerConfirmedAtMs: number | null;
  errorMessage: string | null;
};

type ListenerState = {
  eventFactsLoaded: boolean;
  guestBatchesLoaded: boolean;
  guestSessionsLoaded: boolean;
  watchSessionsLoaded: boolean;
  eventFactsFailed: boolean;
  guestBatchesFailed: boolean;
  guestSessionsFailed: boolean;
  watchSessionsFailed: boolean;
  eventFactsFromCache: boolean;
  guestBatchesFromCache: boolean;
  guestSessionsFromCache: boolean;
  watchSessionsFromCache: boolean;
  details: {
    eventFacts: ListenerDetails;
    guestBatches: ListenerDetails;
    guestSessions: ListenerDetails;
    watchSessions: ListenerDetails;
  };
};

type SnapshotEntry = {
  id: string;
  data: Record<string, unknown>;
};

export type AnalyticsRealtimeListenerDebugEntry = {
  collection: string;
  status: "loaded" | "failed" | "waiting";
  fromCache: boolean;
  mountedAtMs: number | null;
  lastEventAtMs: number | null;
  lastServerConfirmedAtMs: number | null;
  errorMessage: string | null;
};

export type AnalyticsRealtimeDebugMeta = {
  listeners: Record<string, AnalyticsRealtimeListenerDebugEntry>;
  mountedAtMs: number | null;
};

function toSnapshotEntries(snapshot: {
  docs: Array<{ id: string; data(): Record<string, unknown> }>;
}) {
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    data: doc.data(),
  }));
}

export type AdminAnalyticsRealtimeResult = AdminAnalyticsLiveSignals & {
  listenerDebugMeta: AnalyticsRealtimeDebugMeta;
};

export function useAdminAnalyticsRealtime(nowMs: number): AdminAnalyticsRealtimeResult {
  const [eventFacts, setEventFacts] = useState<SnapshotEntry[]>([]);
  const [guestBatches, setGuestBatches] = useState<SnapshotEntry[]>([]);
  const [guestSessions, setGuestSessions] = useState<SnapshotEntry[]>([]);
  const [watchSessions, setWatchSessions] = useState<SnapshotEntry[]>([]);
  const [listenerState, setListenerState] = useState<ListenerState>({
    eventFactsLoaded: false,
    guestBatchesLoaded: false,
    guestSessionsLoaded: false,
    watchSessionsLoaded: false,
    eventFactsFailed: false,
    guestBatchesFailed: false,
    guestSessionsFailed: false,
    watchSessionsFailed: false,
    eventFactsFromCache: true,
    guestBatchesFromCache: true,
    guestSessionsFromCache: true,
    watchSessionsFromCache: true,
    details: {
      eventFacts: { lastEventAtMs: null, lastServerConfirmedAtMs: null, errorMessage: null },
      guestBatches: { lastEventAtMs: null, lastServerConfirmedAtMs: null, errorMessage: null },
      guestSessions: { lastEventAtMs: null, lastServerConfirmedAtMs: null, errorMessage: null },
      watchSessions: { lastEventAtMs: null, lastServerConfirmedAtMs: null, errorMessage: null },
    },
  });

  const [mountedAtMs] = useState<number | null>(() => {
    return typeof window !== "undefined" ? Date.now() : null;
  });

  useEffect(() => {
    let cancelled = false;

    const eventFactsControl = createAutoHealingObserver(() =>
      onSnapshot(
        query(
          collection(db, "analytics_event_facts"),
          orderBy("timestamp", "desc"),
          limit(80),
        ),
        { includeMetadataChanges: true },
        (snapshot) => {
          if (cancelled) return;
          const fromCache = snapshot.metadata.fromCache;
          setEventFacts(toSnapshotEntries(snapshot));
          setListenerState((current) => ({
            ...current,
            eventFactsLoaded: true,
            eventFactsFailed: false,
            eventFactsFromCache: fromCache,
            details: {
              ...current.details,
              eventFacts: {
                lastEventAtMs: Date.now(),
                lastServerConfirmedAtMs: fromCache ? current.details.eventFacts.lastServerConfirmedAtMs : Date.now(),
                errorMessage: null,
              },
            },
          }));
        },
        (error) => {
          if (cancelled) return;
          setListenerState((current) => ({
            ...current,
            eventFactsFailed: true,
            details: {
              ...current.details,
              eventFacts: {
                ...current.details.eventFacts,
                errorMessage: buildFirestoreClientFallbackMessage("Admin analytics identified events", error),
              },
            },
          }));
          reportClientIssue({
            channel: "firebase",
            severity: "warn",
            message: "Admin analytics identified-event realtime listener failed",
            error,
            detail: buildFirestoreClientIssueDetail(error, {
              listener: "admin_analytics_event_facts",
              scope: "admin analytics realtime",
              fallbackMessage: buildFirestoreClientFallbackMessage(
                "Admin analytics identified events",
                error,
              ),
            }),
            consoleLabel:
              "[Admin Analytics] identified-event realtime listener failed",
          });
          eventFactsControl.triggerReconnect(error);
        },
      ),
    );

    const guestBatchesControl = createAutoHealingObserver(() =>
      onSnapshot(
        query(
          collection(db, "analytics_guest_batches"),
          orderBy("receivedAtMs", "desc"),
          limit(50),
        ),
        { includeMetadataChanges: true },
        (snapshot) => {
          if (cancelled) return;
          const fromCache = snapshot.metadata.fromCache;
          setGuestBatches(toSnapshotEntries(snapshot));
          setListenerState((current) => ({
            ...current,
            guestBatchesLoaded: true,
            guestBatchesFailed: false,
            guestBatchesFromCache: fromCache,
            details: {
              ...current.details,
              guestBatches: {
                lastEventAtMs: Date.now(),
                lastServerConfirmedAtMs: fromCache ? current.details.guestBatches.lastServerConfirmedAtMs : Date.now(),
                errorMessage: null,
              },
            },
          }));
        },
        (error) => {
          if (cancelled) return;
          setListenerState((current) => ({
            ...current,
            guestBatchesFailed: true,
            details: {
              ...current.details,
              guestBatches: {
                ...current.details.guestBatches,
                errorMessage: buildFirestoreClientFallbackMessage("Admin analytics guest batches", error),
              },
            },
          }));
          reportClientIssue({
            channel: "firebase",
            severity: "warn",
            message: "Admin analytics guest-batch realtime listener failed",
            error,
            detail: buildFirestoreClientIssueDetail(error, {
              listener: "admin_analytics_guest_batches",
              scope: "admin analytics realtime",
              fallbackMessage: buildFirestoreClientFallbackMessage(
                "Admin analytics guest batches",
                error,
              ),
            }),
            consoleLabel:
              "[Admin Analytics] guest-batch realtime listener failed",
          });
          guestBatchesControl.triggerReconnect(error);
        },
      ),
    );

    const guestSessionsControl = createAutoHealingObserver(() =>
      onSnapshot(
        query(
          collection(db, "analytics_sessions"),
          orderBy("lastReceivedAtMs", "desc"),
          limit(50),
        ),
        { includeMetadataChanges: true },
        (snapshot) => {
          if (cancelled) return;
          const fromCache = snapshot.metadata.fromCache;
          setGuestSessions(toSnapshotEntries(snapshot));
          setListenerState((current) => ({
            ...current,
            guestSessionsLoaded: true,
            guestSessionsFailed: false,
            guestSessionsFromCache: fromCache,
            details: {
              ...current.details,
              guestSessions: {
                lastEventAtMs: Date.now(),
                lastServerConfirmedAtMs: fromCache ? current.details.guestSessions.lastServerConfirmedAtMs : Date.now(),
                errorMessage: null,
              },
            },
          }));
        },
        (error) => {
          if (cancelled) return;
          setListenerState((current) => ({
            ...current,
            guestSessionsFailed: true,
            details: {
              ...current.details,
              guestSessions: {
                ...current.details.guestSessions,
                errorMessage: buildFirestoreClientFallbackMessage("Admin analytics guest sessions", error),
              },
            },
          }));
          reportClientIssue({
            channel: "firebase",
            severity: "warn",
            message: "Admin analytics guest-session realtime listener failed",
            error,
            detail: buildFirestoreClientIssueDetail(error, {
              listener: "admin_analytics_guest_sessions",
              scope: "admin analytics realtime",
              fallbackMessage: buildFirestoreClientFallbackMessage(
                "Admin analytics guest sessions",
                error,
              ),
            }),
            consoleLabel:
              "[Admin Analytics] guest-session realtime listener failed",
          });
          guestSessionsControl.triggerReconnect(error);
        },
      ),
    );

    const watchSessionsControl = createAutoHealingObserver(() =>
      onSnapshot(
        query(
          collection(db, "analytics_watch_sessions"),
          orderBy("lastSeenAtMs", "desc"),
          limit(50),
        ),
        { includeMetadataChanges: true },
        (snapshot) => {
          if (cancelled) return;
          const fromCache = snapshot.metadata.fromCache;
          setWatchSessions(toSnapshotEntries(snapshot));
          setListenerState((current) => ({
            ...current,
            watchSessionsLoaded: true,
            watchSessionsFailed: false,
            watchSessionsFromCache: fromCache,
            details: {
              ...current.details,
              watchSessions: {
                lastEventAtMs: Date.now(),
                lastServerConfirmedAtMs: fromCache ? current.details.watchSessions.lastServerConfirmedAtMs : Date.now(),
                errorMessage: null,
              },
            },
          }));
        },
        (error) => {
          if (cancelled) return;
          setListenerState((current) => ({
            ...current,
            watchSessionsFailed: true,
            details: {
              ...current.details,
              watchSessions: {
                ...current.details.watchSessions,
                errorMessage: buildFirestoreClientFallbackMessage("Admin analytics watch sessions", error),
              },
            },
          }));
          reportClientIssue({
            channel: "firebase",
            severity: "warn",
            message: "Admin analytics watch-session realtime listener failed",
            error,
            detail: buildFirestoreClientIssueDetail(error, {
              listener: "admin_analytics_watch_sessions",
              scope: "admin analytics realtime",
              fallbackMessage: buildFirestoreClientFallbackMessage(
                "Admin analytics watch sessions",
                error,
              ),
            }),
            consoleLabel:
              "[Admin Analytics] watch-session realtime listener failed",
          });
          watchSessionsControl.triggerReconnect(error);
        },
      ),
    );

    return () => {
      cancelled = true;
      eventFactsControl.cleanup();
      guestBatchesControl.cleanup();
      guestSessionsControl.cleanup();
      watchSessionsControl.cleanup();
    };
  }, []);

  const liveSignals = useMemo(
    () =>
      buildAdminAnalyticsLiveSignals({
        eventFactDocs: eventFacts.map((entry) => ({
          id: entry.id,
          data: () => entry.data,
        })),
        guestBatchDocs: guestBatches.map((entry) => ({
          id: entry.id,
          data: () => entry.data,
        })),
        guestSessionDocs: guestSessions.map((entry) => ({
          id: entry.id,
          data: () => entry.data,
        })),
        watchSessionDocs: watchSessions.map((entry) => ({
          id: entry.id,
          data: () => entry.data,
        })),
        listenerState,
        nowMs,
      }),
    [eventFacts, guestBatches, guestSessions, listenerState, nowMs, watchSessions],
  );

  const listenerDebugMeta: AnalyticsRealtimeDebugMeta = useMemo(() => {
    const buildEntry = (
      name: keyof ListenerState["details"],
      collectionPath: string,
      loaded: boolean,
      failed: boolean,
      fromCache: boolean,
    ): AnalyticsRealtimeListenerDebugEntry => ({
      collection: collectionPath,
      status: failed ? "failed" : loaded ? "loaded" : "waiting",
      fromCache,
      mountedAtMs,
      lastEventAtMs: listenerState.details[name].lastEventAtMs,
      lastServerConfirmedAtMs: listenerState.details[name].lastServerConfirmedAtMs,
      errorMessage: listenerState.details[name].errorMessage,
    });

    return {
      listeners: {
        eventFacts: buildEntry("eventFacts", "analytics_event_facts", listenerState.eventFactsLoaded, listenerState.eventFactsFailed, listenerState.eventFactsFromCache),
        guestBatches: buildEntry("guestBatches", "analytics_guest_batches", listenerState.guestBatchesLoaded, listenerState.guestBatchesFailed, listenerState.guestBatchesFromCache),
        guestSessions: buildEntry("guestSessions", "analytics_sessions", listenerState.guestSessionsLoaded, listenerState.guestSessionsFailed, listenerState.guestSessionsFromCache),
        watchSessions: buildEntry("watchSessions", "analytics_watch_sessions", listenerState.watchSessionsLoaded, listenerState.watchSessionsFailed, listenerState.watchSessionsFromCache),
      },
      mountedAtMs,
    };
  }, [listenerState, mountedAtMs]);

  return useMemo(
    () => ({ ...liveSignals, listenerDebugMeta }),
    [liveSignals, listenerDebugMeta],
  );
}
