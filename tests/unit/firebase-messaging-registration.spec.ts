import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const messagingSource = fs.readFileSync(
    path.join(process.cwd(), "src/lib/firebase-messaging.ts"),
    "utf8",
);

describe("Firebase Messaging PWA registration", () => {
    it("uses single-flight service worker registration for runtime, token, and display paths", () => {
        expect(messagingSource).toContain("let appServiceWorkerRegistrationPromise");
        expect(messagingSource).toContain("if (appServiceWorkerRegistrationPromise)");
        expect(messagingSource).toContain("navigator.serviceWorker.register(getAppServiceWorkerUrl(), { scope: \"/\" })");
        expect(messagingSource).toContain("appServiceWorkerRegistrationPromise = null");
        expect(messagingSource).toContain("serviceWorkerRegistration: registration");
    });

    it("keeps foreground browser notifications deterministic and manually displayed", () => {
        expect(messagingSource).toContain("resolveBrowserNotificationTag");
        expect(messagingSource).toContain("idempotencyKey");
        expect(messagingSource).toContain("renotify: false");
        expect(messagingSource).toContain("browserDisplayMode: \"foreground-client\"");
        expect(messagingSource).toContain("registration.showNotification(title, notificationOptions)");
    });
});
