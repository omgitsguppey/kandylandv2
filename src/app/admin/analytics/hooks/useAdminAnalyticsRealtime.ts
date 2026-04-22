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

type ListenerState = {
  eventFactsLoaded: boolean;
  guestBatchesLoaded: boolean;
  guestSessionsLoaded: boolean;
  watchSessionsLoaded: boolean;
  eventFactsFailed: boolean;
  guestBatchesFailed: boolean;
  guestSessionsFailed: boolean;
  watchSessionsFailed: boolean;
};

type SnapshotEntry = {
  id: string;
  data: Record<string, unknown>;
};

function toSnapshotEntries(snapshot: {
  docs: Array<{ id: string; data(): Record<string, unknown> }>;
}) {
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    data: doc.data(),
  }));
}

export function useAdminAnalyticsRealtime(nowMs: number): AdminAnalyticsLiveSignals {
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
  });

  useEffect(() => {
    const eventFactsControl = createAutoHealingObserver(() =>
      onSnapshot(
        query(
          collection(db, "analytics_event_facts"),
          orderBy("timestamp", "desc"),
          limit(80),
        ),
        (snapshot) => {
          setEventFacts(toSnapshotEntries(snapshot));
          setListenerState((current) => ({
            ...current,
            eventFactsLoaded: true,
            eventFactsFailed: false,
          }));
        },
        (error) => {
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
        (snapshot) => {
          setGuestBatches(toSnapshotEntries(snapshot));
          setListenerState((current) => ({
            ...current,
            guestBatchesLoaded: true,
            guestBatchesFailed: false,
          }));
        },
        (error) => {
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
        (snapshot) => {
          setGuestSessions(toSnapshotEntries(snapshot));
          setListenerState((current) => ({
            ...current,
            guestSessionsLoaded: true,
            guestSessionsFailed: false,
          }));
        },
        (error) => {
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
        (snapshot) => {
          setWatchSessions(toSnapshotEntries(snapshot));
          setListenerState((current) => ({
            ...current,
            watchSessionsLoaded: true,
            watchSessionsFailed: false,
          }));
        },
        (error) => {
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
      eventFactsControl.cleanup();
      guestBatchesControl.cleanup();
      guestSessionsControl.cleanup();
      watchSessionsControl.cleanup();
    };
  }, []);

  return useMemo(
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
}
