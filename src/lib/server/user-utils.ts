import "server-only";

const RESERVED_USERNAMES = new Set([
    // Admin & System spoofing
    "admin", "administrator", "system", "root", "support", "help", "info", "contact",
    "staff", "moderator", "mod", "kandy", "kandydrops", "ikandy", "official",

    // UI/App Routes
    "dashboard", "profile", "settings", "login", "register", "logout", "signin", "signup",
    "api", "drops", "user", "users", "home", "index", "about", "terms", "privacy", "tos",
    "policy", "banned", "creators", "experiences", "faq", "library", "wallet", "checkout",
    "auth", "recover", "reset", "adminpanel", "roster"
]);

/**
 * Validates and normalizes a username format.
 * - Must be at least 3 characters long.
 * - Must contain only lowercase alphanumeric characters and underscores.
 * - Must NOT be a reserved system or routing keyword.
 * 
 * @param value The raw user input
 * @returns The sanitized lowercase username, or null if invalid/blocked.
 */
export function normalizeUsername(value: unknown): string | null {
    if (typeof value !== "string") {
        return null;
    }

    const normalized = value.trim().toLowerCase();

    // Check length and format
    if (normalized.length < 3 || !/^[a-z0-9_]+$/.test(normalized)) {
        return null;
    }

    // Block reserved routing names and staff mimicry
    if (RESERVED_USERNAMES.has(normalized)) {
        return null; // Reject the username
    }

    return normalized;
}
