import { useState, useEffect } from "react";
import { onSnapshot, collection, query, limit, orderBy, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase-data";
import type { AdminSurfaceState } from "@/lib/admin-parity";

export interface PrivacyPreflightStatus {
  globalGuestTracking: AdminSurfaceState;
  eventsPipeline: AdminSurfaceState;
  dedupeHealth: AdminSurfaceState;
  cloudRunIngest: AdminSurfaceState;
  bqExportHealth: AdminSurfaceState;
  consentGating: AdminSurfaceState;
  consentRejections: number;
  lastEventAgeMs: number;
}

export function useAdminPrivacyPreflight() {
  const [status, setStatus] = useState<PrivacyPreflightStatus>({
    globalGuestTracking: "unavailable",
    eventsPipeline: "unavailable",
    dedupeHealth: "unavailable",
    cloudRunIngest: "unavailable",
    bqExportHealth: "unavailable",
    consentGating: "unavailable",
    consentRejections: 0,
    lastEventAgeMs: 0,
  });

  useEffect(() => {
    // Listen to recent events to measure pipeline health
    const eventsQuery = query(
      collection(db, "analytics_event_facts"),
      orderBy("timestamp", "desc"),
      limit(10)
    );

    const unsubscribeEvents = onSnapshot(eventsQuery, (snapshot) => {
      let rejections = 0;
      let lastTimestamp = 0;
      let canonicalOriginated = 0;
      let guestTaggedEvents = 0;
      let consentTaggedEvents = 0;
      
      snapshot.forEach(doc => {
        const data = doc.data();
        if (data.consentMode === "denied" || data.globalPrivacyControl) {
          rejections++;
        }
        if (typeof data.consentMode === "string" || typeof data.globalPrivacyControl === "boolean") {
          consentTaggedEvents++;
        }
        if (data.timestamp > lastTimestamp) {
          lastTimestamp = data.timestamp;
        }
        if (data.origin === "canonical" || data.origin === "cloud_run" || data.source === "canonical") {
          canonicalOriginated++;
        }
        if (typeof data.guestId === "string" || typeof data.anonymousId === "string") {
          guestTaggedEvents++;
        }
      });

      const ageMs = lastTimestamp > 0 ? Date.now() - lastTimestamp : Infinity;
      const isPipelineLive = ageMs < 60000;
      const hasRecentEvents = snapshot.size > 0;
      
      setStatus(prev => ({
        ...prev,
        eventsPipeline: !hasRecentEvents ? "unavailable" : isPipelineLive ? "live" : (ageMs < 3600000 ? "stale" : "failed"),
        cloudRunIngest: !hasRecentEvents ? "unavailable" : (canonicalOriginated > 0 ? "live" : "fallback"),
        bqExportHealth: !hasRecentEvents ? "unavailable" : isPipelineLive ? "live" : (ageMs < 3600000 ? "stale" : "failed"),
        consentGating: !hasRecentEvents ? "unavailable" : (consentTaggedEvents > 0 ? "live" : "degraded"),
        lastEventAgeMs: ageMs,
        consentRejections: rejections,
        globalGuestTracking: !hasRecentEvents ? "unavailable" : guestTaggedEvents > 0 ? "live" : "degraded",
      }));
    }, (error) => {
      console.error("[Preflight] Event pipeline listener failed", error);
      setStatus(prev => ({
        ...prev,
        eventsPipeline: "failed",
        cloudRunIngest: "failed",
        bqExportHealth: "failed",
        consentGating: "failed",
      }));
    });

    // One-off check for dedupe collection health
    getDocs(query(collection(db, "analytics_dedupe"), limit(1)))
      .then((snap) => {
        setStatus(prev => ({
          ...prev,
          dedupeHealth: snap.empty ? "stale" : "live"
        }));
      })
      .catch((err) => {
        console.error("[Preflight] Dedupe health check failed", err);
        setStatus(prev => ({ ...prev, dedupeHealth: "failed" }));
      });

    return () => {
      unsubscribeEvents();
    };
  }, []);

  return status;
}
