import { auth } from "@/lib/firebase";

/**
 * Makes an authenticated fetch call by attaching the Firebase ID token
 * as a Bearer token in the Authorization header.
 *
 * Usage: const res = await authFetch("/api/some-route", { method: "POST", body: JSON.stringify(data) });
 */
export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
    const currentUser = auth.currentUser;
    if (!currentUser) {
        throw new Error("Not authenticated");
    }

    const idToken = await currentUser.getIdToken();

    const headers = new Headers(options.headers);
    headers.set("Authorization", `Bearer ${idToken}`);
    if (!headers.has("Content-Type") && options.body) {
        headers.set("Content-Type", "application/json");
    }

    return fetch(url, {
        ...options,
        headers,
    });
}
