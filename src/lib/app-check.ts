import { getToken } from "firebase/app-check";

import { appCheck } from "@/lib/firebase";

function shouldRequireClientAppCheck() {
    return process.env.NODE_ENV === "production"
        && Boolean(process.env.NEXT_PUBLIC_RECAPTCHA_ENTERPRISE_SITE_KEY);
}

export async function getAppCheckToken(): Promise<string | null> {
    if (!appCheck) {
        if (shouldRequireClientAppCheck()) {
            throw new Error("App Check is not initialized");
        }
        return null;
    }

    try {
        const token = await getToken(appCheck, false);
        return token.token || null;
    } catch (error) {
        if (shouldRequireClientAppCheck()) {
            throw error instanceof Error ? error : new Error("Failed to acquire App Check token");
        }
        return null;
    }
}
