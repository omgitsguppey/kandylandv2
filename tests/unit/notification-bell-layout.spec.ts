import { describe, expect, it } from "vitest";

import { getNotificationPanelStyle } from "@/components/Navigation/NotificationBell";

describe("NotificationBell layout helpers", () => {
    it("uses safe-area-aware sizing so the panel stays inside small-screen bounds", () => {
        const style = getNotificationPanelStyle();

        expect(style.width).toBe("min(22rem, calc(100vw - max(1rem, env(safe-area-inset-left)) - max(1rem, env(safe-area-inset-right))))");
        expect(style.maxHeight).toBe("min(30rem, calc(100dvh - env(safe-area-inset-top) - env(safe-area-inset-bottom) - 5rem))");
        expect(style.backdropFilter).toBe("blur(30px)");
        expect(style.WebkitBackdropFilter).toBe("blur(30px)");
    });
});
