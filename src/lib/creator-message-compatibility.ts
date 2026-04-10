export const CREATOR_MESSAGES_COMPATIBILITY_STATE = "migration" as const;
export const CREATOR_MESSAGES_COMPATIBILITY_REMOVE_AFTER = "2026-07-31";
export const CREATOR_MESSAGES_NATIVE_ENTRY = "/api/chat/threads/[threadId]/messages";

export function buildCreatorMessagesCompatibilityHeaders() {
    return {
        "X-Kandy-Compatibility": "creator-messages",
        "X-Kandy-Compatibility-State": CREATOR_MESSAGES_COMPATIBILITY_STATE,
        "X-Kandy-Compatibility-Remove-After": CREATOR_MESSAGES_COMPATIBILITY_REMOVE_AFTER,
        "X-Kandy-Native-Route": CREATOR_MESSAGES_NATIVE_ENTRY,
    };
}
