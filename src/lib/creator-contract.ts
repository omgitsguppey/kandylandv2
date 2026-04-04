export const CREATOR_ONBOARDING_INTRO_VERSION = "creator_intro_2026_v1";
export const CREATOR_MASTER_SERVICE_AGREEMENT_VERSION = "mgsa_2026_v1";
export const DEFAULT_CREATOR_TEMPLATE_ID = "default_creator_experience_template";
export const DEFAULT_CREATOR_TEMPLATE_LABEL = "Default creator experience template";

export const CREATOR_INTRO_CREATOR_BULLETS = [
    "Approved creators can publish drops, manage fan access, and use the creator dashboard.",
    "Creator tools stay locked until compliance, contract, and admin approval are complete unless owner override is used.",
    "You are responsible for submitting truthful identity information and honoring the rules attached to monetized creator access.",
] as const;

export const CREATOR_INTRO_FAN_BULLETS = [
    "Fans unlock creator access through Gum Drops and creator-specific experiences that are configured inside the platform.",
    "Creator-linked fan features only appear when approved creators are live and the related creator systems are enabled.",
    "Messages, bookings, subscriptions, and custom requests use the creator settings already configured on the backend.",
] as const;

export const CREATOR_CONTRACT_SUMMARY_BULLETS = [
    "This agreement grants access to KandyDrops creator tools only after both sides sign and admin approval is complete.",
    "Creators stay responsible for lawful content, truthful identity verification, and compliance with platform and payment rules.",
    "KandyDrops may pause or remove creator access when moderation, compliance, payout, or safety issues require intervention.",
] as const;

export const CREATOR_MASTER_SERVICE_AGREEMENT_SECTIONS = [
    {
        heading: "1. Program access",
        body: "KandyDrops grants approved creators limited access to the gated Kreator Experiences program. Access is conditioned on truthful intake information, successful identity review, countersigned legal records, and ongoing compliance with platform rules.",
    },
    {
        heading: "2. Creator obligations",
        body: "Creators must provide accurate account details, maintain lawful content practices, and avoid deceptive, abusive, or restricted activity. Creator access may be limited or removed when these obligations are not met.",
    },
    {
        heading: "3. Monetized fan access",
        body: "Creator experiences may include paid messaging, subscriptions, custom requests, broadcasts, and bookings where those systems are enabled. Backend pricing, restrictions, and payout logic remain governed by the platform configuration and current creator settings.",
    },
    {
        heading: "4. Compliance and identity",
        body: "Creators must submit the required identity and compliance package before legal completion is accepted unless an explicit owner override is recorded. KandyDrops may request additional materials or reject incomplete submissions.",
    },
    {
        heading: "5. Moderation, suspension, and removal",
        body: "KandyDrops may investigate creator activity, pause individual creator systems, reject creator access, return applications for changes, or suspend live creator tools when safety, policy, or operational concerns require intervention.",
    },
    {
        heading: "6. Audit trail and records",
        body: "The platform keeps an internal audit trail of acknowledgments, signatures, admin review actions, overrides, and related lifecycle events. Those records support operational review and contract traceability.",
    },
] as const;
