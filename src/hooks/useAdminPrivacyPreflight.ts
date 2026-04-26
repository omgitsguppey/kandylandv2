import { useState, useEffect } from "react";
import { onSnapshot, collection, query, limit, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase-data";
import { reportRealtimeIssue } from "@/lib/client-error-reporting";
import { buildFirestoreClientIssueDetail } from "@/lib/firestore-client-errors";
import { createAutoHealingObserver } from "@/lib/self-healing";
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
  bqExportReason: string;
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
    lastEventAgeMs: Infinity,
    bqExportReason: "Waiting for pipeline data",
  });

  useEffect(() => {
    let cancelled = false;

    // Listen to recent events to measure pipeline health
    const eventsQuery = query(
      collection(db, "analytics_event_facts"),
      orderBy("timestamp", "desc"),
      limit(10)
    );

    const control = createAutoHealingObserver(() => onSnapshot(eventsQuery, (snapshot) => {
      if (cancelled) return;
      let rejections = 0;
      let lastTimestamp = 0;
      let canonicalOriginated = 0;
      let guestTaggedEvents = 0;
      let consentTaggedEvents = 0;
      let validDedupeEvents = 0;
      
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
        
        // Server origin validation
        if (data.trackingOrigin === "server" || (typeof data.source === "string" && data.source.includes("server"))) {
          canonicalOriginated++;
        }
        
        // Guest tracking identifier validation
        if (typeof data.sessionId === "string" && data.sessionId.length > 0) {
          guestTaggedEvents++;
        }
        
        // Deduplication validation requires the canonical event id to match the Firestore document id.
        if (typeof data.idempotencyKey === "string" && data.idempotencyKey === doc.id) {
          validDedupeEvents++;
        }
      });

      const ageMs = lastTimestamp > 0 ? Date.now() - lastTimestamp : Infinity;
      const isPipelineLive = ageMs < 60000;
      const hasRecentEvents = snapshot.size > 0;
      
      setStatus(prev => ({
        ...prev,
        eventsPipeline: !hasRecentEvents ? "unavailable" : isPipelineLive ? "live" : (ageMs < 3600000 ? "stale" : "failed"),
        cloudRunIngest: !hasRecentEvents ? "unavailable" : (canonicalOriginated > 0 ? "live" : "fallback"),
        
        // BigQuery Export is a cold background extension; we can only infer it's degraded offline
        bqExportHealth: !hasRecentEvents ? "unavailable" : "degraded",
        bqExportReason: !hasRecentEvents ? "No local events to export" : "Offline cold stream unverifiable from client",
        
        consentGating: !hasRecentEvents ? "unavailable" : (consentTaggedEvents > 0 ? "live" : "degraded"),
        lastEventAgeMs: ageMs,
        consentRejections: rejections,
        globalGuestTracking: !hasRecentEvents ? "unavailable" : guestTaggedEvents > 0 ? "live" : "degraded",
        dedupeHealth: !hasRecentEvents ? "unavailable" : validDedupeEvents > 0 ? "live" : "degraded",
      }));
    }, (error) => {
      if (cancelled) return;
      setStatus(prev => ({
        ...prev,
        eventsPipeline: "failed",
        cloudRunIngest: "failed",
        bqExportHealth: "failed",
        bqExportReason: "Pipeline listener failed",
        consentGating: "failed",
        dedupeHealth: "failed",
        globalGuestTracking: "failed",
      }));
      control.triggerReconnect(error);
    }), (error) => {
      const issueDetail = buildFirestoreClientIssueDetail(error);
      reportRealtimeIssue(`Admin privacy preflight pipeline: ${issueDetail}`, error, { listener: "admin_privacy_preflight_events" });
    });

    return () => {
      cancelled = true;
      control.cleanup();
    };
  }, []);

  return status;
}
