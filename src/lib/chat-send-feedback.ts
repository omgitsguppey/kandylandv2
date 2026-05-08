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
        case "insufficient_paid_gumdrops":
            return "You need more paid GumDrops to message this creator.";
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
        case "file_too_large_requires_fan_pass":
            return "This file is too large. Chat uploads are limited to 25 MB unless you have a Fan Pass.";
        case "fan_pass_file_limit_exceeded":
            return "This file is too large. Fan Pass uploads support up to 500 MB. Please upload a smaller file.";
        case "file_too_large":
            return "This file is too large for chat upload.";
        default:
            return "We couldn't send your message. Try again shortly.";
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
