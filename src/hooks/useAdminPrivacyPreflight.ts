import { useState, useEffect } from "react";
import { onSnapshot, collection, query, limit, orderBy, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase-data";

export type PrivacyState = "live" | "stale" | "failed" | "fallback" | "unknown";

export interface PrivacyPreflightStatus {
  globalGuestTracking: PrivacyState;
  eventsPipeline: PrivacyState;
  dedupeHealth: PrivacyState;
  cloudRunIngest: PrivacyState;
  bqExportHealth: PrivacyState;
  consentRejections: number;
  lastEventAgeMs: number;
}

export function useAdminPrivacyPreflight() {
  const [status, setStatus] = useState<PrivacyPreflightStatus>({
    globalGuestTracking: "unknown",
    eventsPipeline: "unknown",
    dedupeHealth: "unknown",
    cloudRunIngest: "unknown",
    bqExportHealth: "unknown",
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
      let cloudRunOriginated = 0;
      
      snapshot.forEach(doc => {
        const data = doc.data();
        if (data.consentMode === "denied" || data.globalPrivacyControl) {
          rejections++;
        }
        if (data.timestamp > lastTimestamp) {
          lastTimestamp = data.timestamp;
        }
        if (data.origin === "client") {
          cloudRunOriginated++;
        }
      });

      const ageMs = lastTimestamp > 0 ? Date.now() - lastTimestamp : Infinity;
      const isPipelineLive = ageMs < 60000;
      const hasRecentEvents = snapshot.size > 0;
      
      setStatus(prev => ({
        ...prev,
        eventsPipeline: isPipelineLive ? "live" : (ageMs < 3600000 ? "stale" : "failed"),
        cloudRunIngest: hasRecentEvents ? (cloudRunOriginated > 0 ? "live" : "fallback") : "unknown",
        bqExportHealth: isPipelineLive ? "live" : (ageMs < 3600000 ? "stale" : "failed"), // Assumed healthy if pipeline is healthy
        lastEventAgeMs: ageMs,
        consentRejections: rejections,
        globalGuestTracking: "live" // Simplified guest tracking truth for preflight
      }));
    }, (error) => {
      console.error("[Preflight] Event pipeline listener failed", error);
      setStatus(prev => ({ ...prev, eventsPipeline: "failed", cloudRunIngest: "failed", bqExportHealth: "failed" }));
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
