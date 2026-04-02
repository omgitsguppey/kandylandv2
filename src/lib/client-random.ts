export function generateSecureClientId(): string {
    if (typeof crypto !== "undefined") {
        if (typeof crypto.randomUUID === "function") {
            return crypto.randomUUID();
        }

        if (typeof crypto.getRandomValues === "function") {
            const buffer = new Uint8Array(16);
            crypto.getRandomValues(buffer);
            return Array.from(buffer)
                .map((byte) => byte.toString(16).padStart(2, "0"))
                .join("");
        }
    }

    throw new Error("Cryptographically secure random number generation is not available in this environment.");
}

export function generateSecureClientToken(length = 8): string {
    if (!Number.isInteger(length) || length <= 0) {
        throw new Error("Secure client token length must be a positive integer.");
    }

    return generateSecureClientId().replace(/-/g, "").slice(0, length);
}
