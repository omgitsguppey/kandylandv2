"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useUI } from "@/context/UIContext";

export default function CookieBanner() {
    const [isMounted, setIsMounted] = useState(false);
    const [dismissed, setDismissed] = useState(false);
    const [isCompactViewport, setIsCompactViewport] = useState(false);
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

    const hasConsent = isMounted && typeof window !== "undefined"
        ? localStorage.getItem("kandydrops_cookie_consent") === "true"
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

    const handleAccept = () => {
        localStorage.setItem("kandydrops_cookie_consent", "true");
        document.cookie = `kandydrops_consent=true; max-age=${150 * 24 * 60 * 60}; path=/`;
        setDismissed(true);
    };

    return (
        <div
            className={
                isCompactViewport
                    ? "fixed right-3 top-[calc(4.85rem+env(safe-area-inset-top))] z-50 w-[min(15rem,calc(100vw-1.5rem))] rounded-[1.35rem] border border-white/10 bg-black/92 px-3.5 py-3 text-white shadow-[0_25px_70px_rgba(0,0,0,0.45)] backdrop-blur-xl"
                    : "fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] right-4 z-50 w-[min(24rem,calc(100vw-2rem))] rounded-[1.6rem] border border-white/10 bg-black/92 px-4 py-4 text-white shadow-[0_25px_70px_rgba(0,0,0,0.45)] backdrop-blur-xl"
            }
        >
            {isCompactViewport ? (
                <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-brand-purple">
                            18+ access
                        </p>
                        <p className="truncate text-[10px] leading-5 text-gray-100">
                            Cookies help improve KandyDrops.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={handleAccept}
                        className="inline-flex min-h-9 shrink-0 items-center justify-center rounded-xl bg-brand-purple px-3.5 py-2 text-xs font-bold text-white transition-opacity hover:opacity-90"
                    >
                        I Understand
                    </button>
                </div>
            ) : (
                <div className="flex flex-col gap-3">
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-brand-purple">
                            18+ access
                        </p>
                        <p className="mt-1 text-sm leading-6 text-gray-100">
                            We use cookies to improve KandyDrops and confirm age access.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={handleAccept}
                        className="inline-flex min-h-10 items-center justify-center rounded-xl bg-brand-purple px-4 py-2 text-sm font-bold text-white transition-opacity hover:opacity-90"
                    >
                        I Understand
                    </button>
                </div>
            )}
        </div>
    );
}
