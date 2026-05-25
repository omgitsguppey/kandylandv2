import { describe, expect, it } from "vitest";

import { buildExternalDependencyMap } from "@/lib/debug/external-dependency-map";

describe("external dependency map", () => {
  it("maps required providers without exposing env values or marking config as runtime health", () => {
    const map = buildExternalDependencyMap({
      envExampleText: "NEXT_PUBLIC_GA_MEASUREMENT_ID=\nNEXT_PUBLIC_FIREBASE_VAPID_KEY=\nPAYPAL_CLIENT_ID=\nPOSTHOG_SECRET=should-not-leak\n",
      packageNames: ["firebase", "firebase-admin", "@paypal/react-paypal-js", "posthog-js", "@google-analytics/data", "@google-cloud/vertexai", "@google-cloud/bigquery"],
    });

    const serviceNames = map.services.map((service) => service.serviceName);
    expect(serviceNames).toEqual(expect.arrayContaining([
      "Firebase Auth",
      "Firestore",
      "Firebase Admin SDK",
      "Firebase Storage",
      "Firebase Functions",
      "Firebase Hosting/App Hosting",
      "FCM/push/VAPID",
      "Google Analytics Data API",
      "GA4 / Measurement ID",
      "BigQuery",
      "Cloud SQL/Data Connect",
      "Cloud Run/App Hosting",
      "Vertex AI/Gemini",
      "PayPal",
      "PostHog",
      "Service Worker/PWA",
      "Scheduler/Cron",
    ]));
    expect(JSON.stringify(map)).not.toContain("should-not-leak");
    expect(map.providerCallsRun).toBe(false);
    const statuses = map.services.map((service) => String(service.runtimeVerificationStatus));
    expect(statuses).not.toContain("runtime_healthy_from_package");
    expect(map.services.every((service) => service.owner && service.nextAction)).toBe(true);
  });
});
