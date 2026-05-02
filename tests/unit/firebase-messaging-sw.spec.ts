import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const serviceWorkerSource = fs.readFileSync(
    path.join(process.cwd(), "public/firebase-messaging-sw.js"),
    "utf8",
);

describe("firebase messaging service worker notification display", () => {
    it("uses data-only manual display safeguards and deterministic browser tags", () => {
        expect(serviceWorkerSource).toContain("onBackgroundMessage");
        expect(serviceWorkerSource).toContain("autoDisplayedByFcm");
        expect(serviceWorkerSource).toContain("manual display suppressed");
        expect(serviceWorkerSource).toContain("resolveNotificationTag(data)");
        expect(serviceWorkerSource).toContain("tag,");
        expect(serviceWorkerSource).toContain("renotify: false");
        expect(serviceWorkerSource).toContain("browserDisplayMode: \"manual-service-worker\"");
    });

    it("posts click metadata back to the app so read/open state can persist", () => {
        expect(serviceWorkerSource).toContain("KANDYDROPS_NOTIFICATION_CLICK");
        expect(serviceWorkerSource).toContain("notificationId");
        expect(serviceWorkerSource).toContain("idempotencyKey");
        expect(serviceWorkerSource).toContain("postMessage(clickPayload)");
    });

    it("sanitizes notification click targets before focusing or opening the app", () => {
        expect(serviceWorkerSource).toContain("resolveSafeNotificationUrl");
        expect(serviceWorkerSource).toContain("parsed.origin !== self.location.origin");
        expect(serviceWorkerSource).toContain("clients.matchAll({ type: \"window\", includeUncontrolled: true })");
        expect(serviceWorkerSource).toContain("clients.openWindow(targetUrl.toString())");
    });
});
