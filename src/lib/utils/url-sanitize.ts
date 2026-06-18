export function getSafeExternalUrl(url: string | undefined): string | undefined {
    const trimmedUrl = url?.trim();
    if (!trimmedUrl) return undefined;

    const normalizedSchemeCheck = trimmedUrl.replace(/[\u0000-\u001F\u007F\s]+/g, "");
    if (/^(javascript|data|vbscript):/i.test(normalizedSchemeCheck)) {
        return undefined;
    }

    try {
        const parsed = new URL(trimmedUrl, "http://localhost");
        if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
            return undefined;
        }

        // Return original trimmed URL for relative paths, parsed string for absolute
        return trimmedUrl.startsWith('/') ? trimmedUrl : parsed.toString();
    } catch {
        return undefined;
    }
}
