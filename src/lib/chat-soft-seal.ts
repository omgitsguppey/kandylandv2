const CHAT_SOFT_SEAL_PREFIX = "soft1:";
const CHAT_SOFT_SEAL_SALT = process.env.NEXT_PUBLIC_CHAT_SOFT_SEAL_SALT?.trim() || "kandydrops-chat-soft-v1";

function bytesToBase64Url(bytes: Uint8Array) {
    if (typeof Buffer !== "undefined") {
        return Buffer.from(bytes).toString("base64url");
    }

    let binary = "";
    bytes.forEach((byte) => {
        binary += String.fromCharCode(byte);
    });

    return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/u, "");
}

function base64UrlToBytes(value: string) {
    if (typeof Buffer !== "undefined") {
        return new Uint8Array(Buffer.from(value, "base64url"));
    }

    const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized + "=".repeat((4 - (normalized.length % 4 || 4)) % 4);
    const binary = atob(padded);
    return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function buildSeed(scope: string) {
    let hash = 2166136261;
    const input = `${CHAT_SOFT_SEAL_SALT}:${scope}`;
    for (let index = 0; index < input.length; index += 1) {
        hash ^= input.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
    }

    return hash >>> 0 || 0x9e3779b9;
}

function nextMaskByte(state: { value: number }) {
    let current = state.value >>> 0;
    current ^= current << 13;
    current ^= current >>> 17;
    current ^= current << 5;
    state.value = current >>> 0 || 0x85ebca6b;
    return state.value & 0xff;
}

function xorBytes(input: Uint8Array, scope: string) {
    const state = { value: buildSeed(scope) };
    const output = new Uint8Array(input.length);
    for (let index = 0; index < input.length; index += 1) {
        output[index] = input[index] ^ nextMaskByte(state);
    }
    return output;
}

export function buildChatSoftSealScope(threadId: string, field: string) {
    return `${threadId}:${field}`;
}

export function softSealChatValue(scope: string, value: string | null | undefined) {
    if (value == null || value.length === 0) {
        return value;
    }

    if (value.startsWith(CHAT_SOFT_SEAL_PREFIX)) {
        return value;
    }

    const encoded = new TextEncoder().encode(value);
    return `${CHAT_SOFT_SEAL_PREFIX}${bytesToBase64Url(xorBytes(encoded, scope))}`;
}

export function softOpenChatValue(scope: string, value: string | null | undefined) {
    if (value == null || value.length === 0) {
        return value;
    }

    if (!value.startsWith(CHAT_SOFT_SEAL_PREFIX)) {
        return value;
    }

    try {
        const sealed = value.slice(CHAT_SOFT_SEAL_PREFIX.length);
        const decoded = xorBytes(base64UrlToBytes(sealed), scope);
        return new TextDecoder().decode(decoded);
    } catch {
        return value;
    }
}
