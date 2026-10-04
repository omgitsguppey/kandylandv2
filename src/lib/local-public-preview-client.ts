export function isLocalPublicPreviewClient(): boolean {
    return process.env.NODE_ENV === "development"
        && typeof document !== "undefined"
        && document.documentElement.dataset.kandyLocalPreview === "true";
}
