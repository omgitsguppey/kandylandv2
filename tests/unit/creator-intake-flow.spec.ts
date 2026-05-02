import { describe, expect, it } from "vitest";

import {
    buildCreatorIntakeTelemetryPayload,
    CREATOR_INTAKE_SOURCE,
    CREATOR_INTAKE_STEPS,
    CREATOR_INTAKE_VERSION,
    recommendCreatorSetupFromGoals,
    sanitizeCreatorIntakeFields,
} from "@/lib/creator-intake-flow";

describe("creator intake flow contract", () => {
    it("defines the five creator-facing intake steps", () => {
        expect(CREATOR_INTAKE_STEPS.map((step) => step.title)).toEqual([
            "You already have attention. Let’s decide what it should become.",
            "Where do your fans already find you?",
            "Recommended creator setup",
            "Review the creator agreement",
            "Submit for review",
        ]);
    });

    it("sanitizes intake fields without accepting unknown option values", () => {
        expect(sanitizeCreatorIntakeFields({
            creatorMonetizationGoals: ["paid_drops", "private_chat", "mystery"],
            creatorFollowerRange: "10k_50k",
            creatorPostingFrequency: "weekly",
            fansAlreadyAskForAccess: "not_sure",
            creatorRecommendedSetup: "timed_drops_private_chat",
            intakeSubmittedAt: 1_710_000_000_000,
        })).toEqual({
            creatorMonetizationGoals: ["paid_drops", "private_chat"],
            creatorFollowerRange: "10k_50k",
            creatorPostingFrequency: "weekly",
            fansAlreadyAskForAccess: "not_sure",
            creatorRecommendedSetup: "timed_drops_private_chat",
            intakeVersion: CREATOR_INTAKE_VERSION,
            intakeSubmittedAt: 1_710_000_000_000,
            intakeSource: CREATOR_INTAKE_SOURCE,
        });
    });

    it("recommends a setup from selected goals", () => {
        expect(recommendCreatorSetupFromGoals(["live_time"])).toBe("live_time_priority_chat");
        expect(recommendCreatorSetupFromGoals(["fan_pass"])).toBe("fan_pass_custom_requests");
        expect(recommendCreatorSetupFromGoals(["paid_drops", "private_chat"])).toBe("timed_drops_private_chat");
        expect(recommendCreatorSetupFromGoals(["paid_drops"])).toBe("drops_only");
        expect(recommendCreatorSetupFromGoals(["not_sure_yet"])).toBe("start_simple_decide_later");
    });

    it("builds creator intake telemetry with actor and step markers", () => {
        expect(buildCreatorIntakeTelemetryPayload({
            actorType: "guest",
            actorUid: "subject_1",
            anonymousVisitorId: "subject_1",
            sessionId: "sess_1",
            signupIntent: "creator",
            stepKey: "monetization_goals",
            selectedGoals: ["paid_drops", "fan_pass"],
            source: "creator_intake",
            route: "/",
        })).toMatchObject({
            actorType: "guest",
            actorUid: "subject_1",
            actor_type: "guest",
            actor_uid: "subject_1",
            anonymous_visitor_id: "subject_1",
            session_id: "sess_1",
            signup_intent: "creator",
            step_key: "monetization_goals",
            selected_goals: "paid_drops|fan_pass",
            source: "creator_intake",
            route: "/",
        });
    });
});
