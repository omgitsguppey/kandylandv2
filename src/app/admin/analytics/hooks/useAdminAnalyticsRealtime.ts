"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
  });

  // Per-listener timing refs (not reactive — exposed via debug meta)
  const mountedAtRef = useRef<number | null>(null);
  const timingRef = useRef<Record<string, {
    lastEventAtMs: number | null;
    lastServerConfirmedAtMs: number | null;
    errorMessage: string | null;
  }>>({
    eventFacts: { lastEventAtMs: null, lastServerConfirmedAtMs: null, errorMessage: null },
    guestBatches: { lastEventAtMs: null, lastServerConfirmedAtMs: null, errorMessage: null },
    guestSessions: { lastEventAtMs: null, lastServerConfirmedAtMs: null, errorMessage: null },
    watchSessions: { lastEventAtMs: null, lastServerConfirmedAtMs: null, errorMessage: null },
  });

  useEffect(() => {
    let cancelled = false;
    mountedAtRef.current = Date.now();

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
          timingRef.current.eventFacts.lastEventAtMs = Date.now();
          if (!fromCache) timingRef.current.eventFacts.lastServerConfirmedAtMs = Date.now();
          timingRef.current.eventFacts.errorMessage = null;
          setListenerState((current) => ({
            ...current,
            eventFactsLoaded: true,
            eventFactsFailed: false,
            eventFactsFromCache: fromCache,
          }));
        },
        (error) => {
          if (cancelled) return;
          timingRef.current.eventFacts.errorMessage = error?.message ?? "Unknown error";
          setListenerState((current) => ({
            ...current,
            eventFactsFailed: true,
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
          timingRef.current.guestBatches.lastEventAtMs = Date.now();
          if (!fromCache) timingRef.current.guestBatches.lastServerConfirmedAtMs = Date.now();
          timingRef.current.guestBatches.errorMessage = null;
          setListenerState((current) => ({
            ...current,
            guestBatchesLoaded: true,
            guestBatchesFailed: false,
            guestBatchesFromCache: fromCache,
          }));
        },
        (error) => {
          if (cancelled) return;
          timingRef.current.guestBatches.errorMessage = error?.message ?? "Unknown error";
          setListenerState((current) => ({
            ...current,
            guestBatchesFailed: true,
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
          timingRef.current.guestSessions.lastEventAtMs = Date.now();
          if (!fromCache) timingRef.current.guestSessions.lastServerConfirmedAtMs = Date.now();
          timingRef.current.guestSessions.errorMessage = null;
          setListenerState((current) => ({
            ...current,
            guestSessionsLoaded: true,
            guestSessionsFailed: false,
            guestSessionsFromCache: fromCache,
          }));
        },
        (error) => {
          if (cancelled) return;
          timingRef.current.guestSessions.errorMessage = error?.message ?? "Unknown error";
          setListenerState((current) => ({
            ...current,
            guestSessionsFailed: true,
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
          timingRef.current.watchSessions.lastEventAtMs = Date.now();
          if (!fromCache) timingRef.current.watchSessions.lastServerConfirmedAtMs = Date.now();
          timingRef.current.watchSessions.errorMessage = null;
          setListenerState((current) => ({
            ...current,
            watchSessionsLoaded: true,
            watchSessionsFailed: false,
            watchSessionsFromCache: fromCache,
          }));
        },
        (error) => {
          if (cancelled) return;
          timingRef.current.watchSessions.errorMessage = error?.message ?? "Unknown error";
          setListenerState((current) => ({
            ...current,
            watchSessionsFailed: true,
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
      name: string,
      collectionPath: string,
      loaded: boolean,
      failed: boolean,
      fromCache: boolean,
    ): AnalyticsRealtimeListenerDebugEntry => ({
      collection: collectionPath,
      status: failed ? "failed" : loaded ? "loaded" : "waiting",
      fromCache,
      mountedAtMs: mountedAtRef.current,
      lastEventAtMs: timingRef.current[name]?.lastEventAtMs ?? null,
      lastServerConfirmedAtMs: timingRef.current[name]?.lastServerConfirmedAtMs ?? null,
      errorMessage: timingRef.current[name]?.errorMessage ?? null,
    });

    return {
      listeners: {
        eventFacts: buildEntry("eventFacts", "analytics_event_facts", listenerState.eventFactsLoaded, listenerState.eventFactsFailed, listenerState.eventFactsFromCache),
        guestBatches: buildEntry("guestBatches", "analytics_guest_batches", listenerState.guestBatchesLoaded, listenerState.guestBatchesFailed, listenerState.guestBatchesFromCache),
        guestSessions: buildEntry("guestSessions", "analytics_sessions", listenerState.guestSessionsLoaded, listenerState.guestSessionsFailed, listenerState.guestSessionsFromCache),
        watchSessions: buildEntry("watchSessions", "analytics_watch_sessions", listenerState.watchSessionsLoaded, listenerState.watchSessionsFailed, listenerState.watchSessionsFromCache),
      },
      mountedAtMs: mountedAtRef.current,
    };
  }, [listenerState]);

  return useMemo(
    () => ({ ...liveSignals, listenerDebugMeta }),
    [liveSignals, listenerDebugMeta],
  );
}
