"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useUI } from "@/context/UIContext";
import { readPrivacySettingsSnapshot, saveGuestConsentDecision } from "@/lib/privacy-consent";
import { getConsentUpgradeEffect, type ConsentDecision, type ConsentMode } from "@/lib/privacy/consent-tracking-policy";
import { trackEvent } from "@/lib/telemetry";

interface BannerViewProps {
    savingChoice: boolean;
    handleConsent: (decision: ConsentDecision) => Promise<void>;
}

function CompactBannerView({ savingChoice, handleConsent }: BannerViewProps) {
    return (
        <div className="flex flex-col gap-2">
            <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-brand-purple">
                    Privacy
                </p>
                <p className="text-xs leading-4 text-gray-100">
                    Essential storage stays on. Accept all enables behavioral tracking; minimal keeps lightweight product analytics only. You can change this later in Settings.
                </p>
            </div>
            <div className="grid grid-cols-1 gap-1.5 min-[340px]:grid-cols-2">
                <Link
                    href="/settings"
                    className="inline-flex min-h-9 items-center justify-center whitespace-normal break-words rounded-xl border border-white/10 bg-white/5 px-2 py-1.5 text-center text-[11px] font-bold leading-3 text-white transition-opacity hover:opacity-90"
                >
                    Manage settings
                </Link>
                <button
                    type="button"
                    onClick={() => void handleConsent("decline_optional")}
                    disabled={savingChoice}
                    className="inline-flex min-h-9 items-center justify-center whitespace-normal break-words rounded-xl border border-white/10 bg-white/5 px-2 py-1.5 text-center text-[11px] font-bold leading-3 text-white transition-opacity hover:opacity-90"
                >
                    Decline optional
                </button>
                <button
                    type="button"
                    onClick={() => void handleConsent("minimal")}
                    disabled={savingChoice}
                    className="inline-flex min-h-9 items-center justify-center whitespace-normal break-words rounded-xl border border-brand-purple/40 bg-brand-purple/15 px-2 py-1.5 text-center text-[11px] font-bold leading-3 text-white transition-opacity hover:opacity-90"
                >
                    Minimal analytics
                </button>
                <button
                    type="button"
                    onClick={() => void handleConsent("accept_all")}
                    disabled={savingChoice}
                    className="inline-flex min-h-9 items-center justify-center whitespace-normal break-words rounded-xl bg-brand-purple px-2 py-1.5 text-center text-[11px] font-bold leading-3 text-white transition-opacity hover:opacity-90"
                >
                    {savingChoice ? "Saving..." : "Accept all"}
                </button>
            </div>
        </div>
    );
}

function DesktopBannerView({ savingChoice, handleConsent }: BannerViewProps) {
    return (
        <div className="flex flex-col gap-3">
            <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-brand-purple">
                    Privacy
                </p>
                <p className="mt-1 text-sm leading-6 text-gray-100">
                    We use essential storage for sign-in and security. Accept all enables behavioral tracking, while minimal analytics keeps lightweight product and performance signals only.
                </p>
                <p className="mt-2 text-xs leading-5 text-gray-400">
                    You can change this later in Settings, and the full notice is always available in our{" "}
                    <Link href="/privacy" className="text-brand-purple hover:underline">
                        privacy policy
                    </Link>.
                </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
                <button
                    type="button"
                    onClick={() => void handleConsent("decline_optional")}
                    disabled={savingChoice}
                    className="inline-flex min-h-10 flex-1 items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold text-white transition-opacity hover:opacity-90"
                >
                    Decline optional
                </button>
                <button
                    type="button"
                    onClick={() => void handleConsent("minimal")}
                    disabled={savingChoice}
                    className="inline-flex min-h-10 flex-1 items-center justify-center rounded-xl border border-brand-purple/40 bg-brand-purple/15 px-4 py-2 text-sm font-bold text-white transition-opacity hover:opacity-90"
                >
                    Minimal analytics
                </button>
                <button
                    type="button"
                    onClick={() => void handleConsent("accept_all")}
                    disabled={savingChoice}
                    className="inline-flex min-h-10 flex-1 items-center justify-center rounded-xl bg-brand-purple px-4 py-2 text-sm font-bold text-white transition-opacity hover:opacity-90"
                >
                    {savingChoice ? "Saving..." : "Accept all"}
                </button>
            </div>
        </div>
    );
}

export default function CookieBanner() {
    const [isMounted, setIsMounted] = useState(false);
    const [dismissed, setDismissed] = useState(false);
    const [isCompactViewport, setIsCompactViewport] = useState(false);
    const [consentMode, setConsentMode] = useState<ConsentMode>("unknown");
    const [consentError, setConsentError] = useState<string | null>(null);
    const [savingChoice, setSavingChoice] = useState(false);
    const { user, userProfile } = useAuth();
    const { isAuthModalOpen } = useUI();

    const suppressForFlow = Boolean(
        isAuthModalOpen ||
        user &&
        userProfile &&
        userProfile.onboardingCompleted !== true
    );

    useEffect(() => {
        const syncViewport = () => {
            setIsCompactViewport(window.innerWidth <= 390 || window.innerHeight <= 860);
        };

        syncViewport();
        const mountTimer = window.setTimeout(() => {
            setIsMounted(true);
            setConsentMode(readPrivacySettingsSnapshot().consentMode);
        }, 0);
        window.addEventListener("resize", syncViewport);

        return () => {
            window.clearTimeout(mountTimer);
            window.removeEventListener("resize", syncViewport);
        };
    }, []);

    const hasConsent = isMounted
        ? readPrivacySettingsSnapshot().consentUpdatedAt > 0
        : false;
    const showBanner = isMounted && !dismissed && !hasConsent;

    useEffect(() => {
        if (typeof document === "undefined") {
            return;
        }

        const offset = showBanner && isCompactViewport && !suppressForFlow ? "4rem" : "0px";
        document.documentElement.style.setProperty("--kandy-cookie-offset", offset);

        return () => {
            document.documentElement.style.setProperty("--kandy-cookie-offset", "0px");
        };
    }, [isCompactViewport, showBanner, suppressForFlow]);

    if (!showBanner || suppressForFlow) return null;

    const handleConsent = async (decision: ConsentDecision) => {
        setSavingChoice(true);
        setConsentError(null);
        try {
            const snapshot = await saveGuestConsentDecision(decision);
            const effect = getConsentUpgradeEffect(decision);
            setConsentMode(snapshot.consentMode);
            trackEvent("cookie_consent_updated", {
                consent_decision: decision,
                consent_mode: snapshot.consentMode,
                behavioral_tracking_enabled: effect.enablesBehavioralTracking,
                minimal_analytics_enabled: effect.enablesMinimalProductAnalytics,
            });
            setDismissed(true);
        } catch (error) {
            const message = error instanceof Error ? error.message : "We could not save that choice right now.";
            setConsentError(message);
        } finally {
            setSavingChoice(false);
        }
    };

    return (
        <div
            data-cookie-banner-mobile={isCompactViewport ? "compact" : "standard"}
            data-cookie-banner-mobile-size={isCompactViewport ? "320-safe" : "standard"}
            data-consent-mode={consentMode}
            data-consent-tracking-connected="true"
            className={
                isCompactViewport
                    ? "fixed bottom-[calc(var(--user-mobile-bottom-nav-reserved-height,4.5rem)+0.5rem+env(safe-area-inset-bottom))] left-2 right-2 z-50 max-h-[calc(100dvh-7rem-env(safe-area-inset-top)-env(safe-area-inset-bottom))] overflow-y-auto rounded-[1.15rem] border border-white/10 bg-black/92 px-3 py-2 text-white shadow-[0_25px_70px_rgba(0,0,0,0.45)] backdrop-blur-xl"
                    : "fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] right-4 z-50 w-[min(24rem,calc(100vw-2rem))] rounded-[1.6rem] border border-white/10 bg-black/92 px-4 py-4 text-white shadow-[0_25px_70px_rgba(0,0,0,0.45)] backdrop-blur-xl"
            }
        >
            {isCompactViewport ? (
                <CompactBannerView savingChoice={savingChoice} handleConsent={handleConsent} />
            ) : (
                <DesktopBannerView savingChoice={savingChoice} handleConsent={handleConsent} />
            )}
            {consentError ? (
                <p className="mt-2 text-[11px] leading-5 text-red-300">{consentError}</p>
            ) : null}
        </div>
    );
}
