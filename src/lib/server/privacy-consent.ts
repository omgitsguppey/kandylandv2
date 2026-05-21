import "server-only";
import { NextRequest } from "next/server";
import { UserProfile } from "@/types/db";
import { ANALYTICS_CONSENT_COOKIE } from "@/lib/privacy-consent";
import { canUseBehavioralSignals, normalizeConsentMode } from "@/lib/privacy/consent-tracking-policy";

export function requestHasGlobalPrivacyControl(request: NextRequest) {
    return request.headers.get("sec-gpc") === "1";
}

export function requestAllowsAnonymousAnalytics(request: NextRequest) {
    if (requestHasGlobalPrivacyControl(request)) {
        return false;
    }

    const cookieMode = request.cookies.get(ANALYTICS_CONSENT_COOKIE)?.value;
    return cookieMode === "granted" || canUseBehavioralSignals(normalizeConsentMode(cookieMode));
}

export function profileAllowsAnonymousAnalytics(profile: UserProfile | null | undefined, request?: NextRequest) {
    if (!profile?.privacySettings?.anonymousAnalyticsEnabled) {
        return false;
    }

    if (profile.privacySettings.honorGlobalPrivacyControl !== false && request && requestHasGlobalPrivacyControl(request)) {
        return false;
    }

    return true;
}

export function profileAllowsIdentifiedAnalytics(profile: UserProfile | null | undefined, request?: NextRequest) {
    if (!profile?.privacySettings?.identifiedAnalyticsEnabled) {
        return false;
    }

    return profileAllowsAnonymousAnalytics(profile, request);
}
