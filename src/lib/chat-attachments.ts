export const CHAT_ATTACHMENT_MAX_BYTES = 50 * 1024 * 1024;

export type ChatAttachmentKind = "image" | "video";

export function resolveChatAttachmentKind(mimeType: unknown): ChatAttachmentKind | null {
    if (typeof mimeType !== "string") {
        return null;
    }

    const normalized = mimeType.trim().toLowerCase();
    if (normalized.startsWith("image/")) {
        return "image";
    }

    if (normalized.startsWith("video/")) {
        return "video";
    }

    return null;
}

export function isSupportedChatAttachmentMimeType(mimeType: unknown) {
    return resolveChatAttachmentKind(mimeType) !== null;
}
