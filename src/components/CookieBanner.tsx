"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useUI } from "@/context/UIContext";
import { readPrivacySettingsSnapshot, saveGuestAnalyticsConsent } from "@/lib/privacy-consent";

interface BannerViewProps {
    savingChoice: boolean;
    handleConsent: (allowAnalytics: boolean) => Promise<void>;
}

function CompactBannerView({ savingChoice, handleConsent }: BannerViewProps) {
    return (
        <div className="flex items-center justify-between gap-2 overflow-hidden">
            <div className="min-w-0">
                <p className="text-[9px] font-black uppercase tracking-[0.18em] text-brand-purple">
                    Privacy
                </p>
                <p className="truncate text-[10px] leading-5 text-gray-100">
                    Essential storage stays on for sign-in and security. Optional analytics are your choice.
                </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
                <Link
                    href="/privacy"
                    className="inline-flex min-h-8 items-center justify-center rounded-xl border border-white/10 bg-white/5 px-2.5 py-2 text-[10px] font-bold text-white transition-opacity hover:opacity-90"
                >
                    Policy
                </Link>
                <button
                    type="button"
                    onClick={() => void handleConsent(false)}
                    disabled={savingChoice}
                    className="inline-flex min-h-8 items-center justify-center rounded-xl border border-white/10 bg-white/5 px-2.5 py-2 text-[10px] font-bold text-white transition-opacity hover:opacity-90"
                >
                    Essential
                </button>
                <button
                    type="button"
                    onClick={() => void handleConsent(true)}
                    disabled={savingChoice}
                    className="inline-flex min-h-8 items-center justify-center rounded-xl bg-brand-purple px-3 py-2 text-[11px] font-bold text-white transition-opacity hover:opacity-90"
                >
                    {savingChoice ? "Saving..." : "Allow analytics"}
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
                    We use essential storage for sign-in and security. Optional analytics help improve KandyDrops and stay off unless you allow them.
                </p>
                <p className="mt-2 text-xs leading-5 text-gray-400">
                    You can change this later in Settings, and the full notice is always available in our{" "}
                    <Link href="/privacy" className="text-brand-purple hover:underline">
                        privacy policy
                    </Link>.
                </p>
            </div>
            <div className="flex gap-2">
                <button
                    type="button"
                    onClick={() => void handleConsent(false)}
                    disabled={savingChoice}
                    className="inline-flex min-h-10 flex-1 items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold text-white transition-opacity hover:opacity-90"
                >
                    Essential only
                </button>
                <button
                    type="button"
                    onClick={() => void handleConsent(true)}
                    disabled={savingChoice}
                    className="inline-flex min-h-10 flex-1 items-center justify-center rounded-xl bg-brand-purple px-4 py-2 text-sm font-bold text-white transition-opacity hover:opacity-90"
                >
                    {savingChoice ? "Saving..." : "Allow analytics"}
                </button>
            </div>
        </div>
    );
}

export default function CookieBanner() {
    const [isMounted, setIsMounted] = useState(false);
    const [dismissed, setDismissed] = useState(false);
    const [isCompactViewport, setIsCompactViewport] = useState(false);
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

    const handleConsent = async (allowAnalytics: boolean) => {
        setSavingChoice(true);
        setConsentError(null);
        try {
            await saveGuestAnalyticsConsent(allowAnalytics);
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
            className={
                isCompactViewport
                    ? "fixed left-3 right-3 top-[calc(4.85rem+env(safe-area-inset-top))] z-50 rounded-[1.35rem] border border-white/10 bg-black/92 px-3 py-2.5 text-white shadow-[0_25px_70px_rgba(0,0,0,0.45)] backdrop-blur-xl"
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
