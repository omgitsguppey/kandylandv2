import { getToken } from "firebase/app-check";

import { getAppCheckInstance } from "@/lib/firebase";
import { shouldRequireAppCheck } from "@/lib/firebase-runtime";

export async function getAppCheckToken(): Promise<string | null> {
    const appCheck = getAppCheckInstance();

    if (!appCheck) {
        if (shouldRequireAppCheck()) {
            throw new Error("App Check is not initialized");
        }
        return null;
    }

    try {
        const token = await getToken(appCheck, false);
        return token.token || null;
    } catch (error) {
        if (shouldRequireAppCheck()) {
            throw error instanceof Error ? error : new Error("Failed to acquire App Check token");
        }
        return null;
    }
}
