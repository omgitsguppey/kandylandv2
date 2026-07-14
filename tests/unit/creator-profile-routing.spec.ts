import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
    buildCreatorAdminHref,
    buildCreatorProfileHref,
    buildCreatorProfileLinkTelemetryPayload,
    buildCreatorPublicHref,
    buildCreatorReviewHref,
    canLinkToCreatorPublicProfile,
    explainCreatorProfileRouteMissing,
} from "@/lib/creator-profile-routing";

const root = process.cwd();

function read(relativePath: string) {
    return readFileSync(join(root, relativePath), "utf8");
}

describe("creator-profile-routing", () => {
    it("builds public creator hrefs from canonical username slugs", () => {
        expect(buildCreatorPublicHref({ username: "Zaylani" })).toBe("/creators/zaylani");
        expect(buildCreatorPublicHref({ creatorUsername: "@CandyLane" })).toBe("/creators/candylane");
        expect(buildCreatorProfileHref({ creatorUsername: "Creator Name" })).toBeNull();
    });

    it("does not fall back to uid for public routes because the public route expects a slug", () => {
        expect(buildCreatorPublicHref({ uid: "creator_123" })).toBeNull();
        expect(canLinkToCreatorPublicProfile({ uid: "creator_123" })).toBe(false);
        expect(explainCreatorProfileRouteMissing({ uid: "creator_123" })).toBe("creator_username_missing_or_invalid");
    });

    it("builds admin and review hrefs from creator ids", () => {
        expect(buildCreatorAdminHref({ uid: "creator_123" })).toBe("/admin/user/creator_123");
        expect(buildCreatorReviewHref("creator_123")).toBe("/admin/roster?focus=creator_123");
    });

    it("explains disabled or unavailable public routes without making fake links", () => {
        expect(buildCreatorPublicHref({ username: "zay", publicProfileEnabled: false })).toBeNull();
        expect(explainCreatorProfileRouteMissing({ username: "zay", publicProfileEnabled: false })).toBe("public_profile_disabled");
        expect(explainCreatorProfileRouteMissing({ username: "zay", status: "suspended" })).toBe("creator_account_unavailable");
        expect(explainCreatorProfileRouteMissing({ isSyntheticCreator: true })).toBe("synthetic_creator_username_missing");
    });

    it("adds actor marker fields to creator profile link telemetry", () => {
        const payload = buildCreatorProfileLinkTelemetryPayload({
            actor: { uid: "fan_1", role: "user" },
            creator: { uid: "creator_1", username: "zaylani" },
            href: "/creators/zaylani",
            routeSource: "chat_header",
            currentRoute: "/dashboard/chat",
        });

        expect(payload).toMatchObject({
            actorType: "user",
            actorUid: "fan_1",
            targetCreatorId: "creator_1",
            performedAs: "own_account",
            actionKey: "creator_profile_link_clicked",
            routeSource: "chat_header",
            creatorProfileHref: "/creators/zaylani",
        });
    });

    it("follows broadcast notification routing through its delegated canonical owner", () => {
        const route = read("src/app/api/creator/broadcasts/route.ts");
        const notifications = read("src/lib/notifications/creator-broadcast-notifications.ts");
        const validator = read("scripts/agent/validate-creator-profile-routing.ts");

        expect(route).toContain("@/lib/notifications/creator-broadcast-notifications");
        expect(route).toContain("enqueueCreatorBroadcastNotifications");
        expect(notifications).toContain("buildCreatorPublicHref");
        expect(validator).toContain("Broadcast notification owner");
        expect(validator).toContain("broadcastNotifications");
    });
});
