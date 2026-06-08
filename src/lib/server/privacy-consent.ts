import "server-only";
import { NextRequest } from "next/server";
import { UserProfile } from "@/types/db";
import { ANALYTICS_CONSENT_COOKIE } from "@/lib/privacy-consent";
import { canTrackEvent, normalizeConsentMode, type ConsentMode } from "@/lib/privacy/consent-tracking-policy";

export function requestHasGlobalPrivacyControl(request: NextRequest) {
    return request.headers.get("sec-gpc") === "1";
}

export function resolveRequestConsentMode(request: NextRequest): ConsentMode {
    if (requestHasGlobalPrivacyControl(request)) {
        return "necessary_only";
    }

    const cookieMode = request.cookies.get(ANALYTICS_CONSENT_COOKIE)?.value;
    if (cookieMode === "granted") {
        return "full_behavioral";
    }
    if (cookieMode === "denied") {
        return "necessary_only";
    }

    return normalizeConsentMode(cookieMode);
}

export function requestAllowsAnonymousAnalytics(
    request: NextRequest,
    eventTypeOrName = "semantic_page_viewed",
) {
    return canTrackEvent(eventTypeOrName, resolveRequestConsentMode(request));
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
