export function generateSecureClientId() {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
        return crypto.randomUUID().replace(/-/g, "");
    }

    if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
        const buffer = new Uint8Array(16);
        crypto.getRandomValues(buffer);
        return Array.from(buffer)
            .map((byte) => byte.toString(16).padStart(2, "0"))
            .join("");
    }

    throw new Error("Cryptographically secure random number generation is not available in this environment.");
}

export function generateSecureClientToken(length = 8) {
    if (!Number.isInteger(length) || length <= 0) {
        throw new Error("Secure client token length must be a positive integer.");
    }

    return generateSecureClientId().slice(0, length);
}
