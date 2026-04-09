export type ChatSendWarning = {
    code?: string;
    detail?: string;
};

export function buildChatSendErrorMessage(input: {
    error?: string;
    errorCode?: string;
}) {
    switch (input.errorCode) {
        case "forbidden":
            return "You are not allowed to send messages in this thread.";
        case "creator_unavailable":
            return "Messaging is unavailable for this creator right now.";
        case "invalid_attachment":
            return "This message type needs a valid attachment before it can be sent.";
        case "participants_not_found":
            return "This chat thread is missing one of its participants.";
        case "invalid_thread":
            return "This chat thread is no longer valid.";
        case "empty_message":
            return "Add a message or attachment before sending.";
        default:
            return input.error || "Failed to send message.";
    }
}

export function buildChatSendWarningMessage(warnings?: ChatSendWarning[] | null) {
    if (!warnings || warnings.length === 0) {
        return null;
    }

    const postSendTrackingWarning = warnings.find((warning) => warning.code === "post_send_tracking_failure");
    if (postSendTrackingWarning) {
        return "Message sent, but tracking degraded after delivery. Admin debug will show the warning.";
    }

    return "Message sent with a non-blocking warning.";
}
