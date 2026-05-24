import { describe, expect, it } from "vitest";

import {
  FORBIDDEN_SERVICE_WORKER_CACHE_PATHS,
  PWA_SERVICE_WORKER_TELEMETRY_EVENTS,
  buildPwaServiceWorkerDebugLane,
  classifyPwaServiceWorkerSafety,
  shouldBypassServiceWorkerCache,
} from "@/lib/pwa/pwa-service-worker-contract";
import {
  buildPwaUpdateTelemetryEnvelope,
} from "@/lib/pwa/pwa-update-telemetry";

describe("PWA service worker safety", () => {
  it("blocks sensitive wallet, payment, chat, auth, and private content paths from service worker caching", () => {
    expect(FORBIDDEN_SERVICE_WORKER_CACHE_PATHS).toEqual(
      expect.arrayContaining([
        "/api/paypal",
        "/api/wallet",
        "/api/chat",
        "/api/auth",
        "/dashboard/chat",
        "/dashboard/library",
        "/checkout",
      ]),
    );

    for (const path of [
      "/api/paypal/capture",
      "/api/wallet/ledger",
      "/api/chat/thread-1/messages",
      "/api/auth/session",
      "/dashboard/chat?thread=abc",
      "/dashboard/library/private-drop",
      "/checkout",
    ]) {
      expect(shouldBypassServiceWorkerCache(path)).toBe(true);
    }

    expect(shouldBypassServiceWorkerCache("/drops")).toBe(false);
    expect(shouldBypassServiceWorkerCache("/offline")).toBe(false);
  });

  it("classifies update, offline, notification compatibility, standalone, and stale shell risk honestly", () => {
    const status = classifyPwaServiceWorkerSafety({
      serviceWorkerSupported: true,
      registrationAttempted: true,
      registered: true,
      updateAvailable: true,
      offlineFallbackAvailable: true,
      forbiddenCachePathSafe: true,
      notificationPermissionState: "granted",
      pushTokenStatus: "registered",
      displayMode: "standalone-pwa",
      mobileSafeAreaContractApplied: true,
      staleShellRiskSignals: [],
    });

    expect(status.serviceWorkerStatus).toBe("registered");
    expect(status.registrationStatus).toBe("registered");
    expect(status.updateStatus).toBe("update_available");
    expect(status.offlineSupportStatus).toBe("offline_fallback_safe");
    expect(status.cachePolicy.forbiddenCacheSafe).toBe(true);
    expect(status.notificationCompatibility).toBe("compatible");
    expect(status.standaloneMode).toBe("standalone-pwa");
    expect(status.mobileSafeAreaImpact).toBe("contract_applied");
    expect(status.staleShellRisk).toBe("medium");
  });

  it("maps every PWA lifecycle event into canonical notification/runtime telemetry envelopes", () => {
    expect(PWA_SERVICE_WORKER_TELEMETRY_EVENTS).toEqual([
      "pwa_service_worker_registration_started",
      "pwa_service_worker_registered",
      "pwa_service_worker_registration_failed",
      "pwa_update_available",
      "pwa_update_applied",
      "pwa_offline_seen",
      "pwa_install_prompt_seen",
      "pwa_install_prompt_accepted",
      "pwa_install_prompt_dismissed",
    ]);

    const envelope = buildPwaUpdateTelemetryEnvelope({
      eventName: "pwa_update_available",
      serviceWorkerStatus: "registered",
      registrationStatus: "registered",
      updateStatus: "update_available",
      offlineSupportStatus: "offline_fallback_safe",
      notificationCompatibility: "compatible",
      standaloneMode: "standalone-pwa",
      mobileSafeAreaImpact: "contract_applied",
      route: "/drops",
      sourceComponent: "PwaRuntimeBridge",
    });

    expect(envelope.eventName).toBe("pwa_update_available");
    expect(envelope.featureId).toBe("notifications");
    expect(envelope.materializerLane).toBe("notification_materializer");
    expect(envelope.debugVisibility).toBe("debug_visible");
    expect(envelope.scoreImpact).toContain("runtimeHealth");
    expect(envelope.metadata.updateStatus).toBe("update_available");
  });

  it("builds one collapsed PWA/service worker debug lane without exposing stale private truth", () => {
    const lane = buildPwaServiceWorkerDebugLane({
      registered: true,
      updateAvailable: false,
      notificationCompatible: true,
      forbiddenCacheSafe: true,
      offlineFallbackSafe: true,
      staleShellRisk: "low",
    });

    expect(lane.lane).toBe("PWA/service worker");
    expect(lane.status).toBe("live");
    expect(lane.rawDetailsCollapsedByDefault).toBe(true);
    expect(lane.forbiddenCacheSafe).toBe(true);
    expect(JSON.stringify(lane)).not.toMatch(/wallet ledger|chat message payload|auth\/session secret/u);
  });
});
