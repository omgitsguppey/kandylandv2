"use client";
import { useEffect, useState } from "react";
import CookieConsent from "react-cookie-consent";
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

    if (!showBanner || suppressForFlow) return null;

    const handleAccept = () => {
        localStorage.setItem("kandydrops_cookie_consent", "true");
        document.cookie = `kandydrops_consent=true; max-age=${150 * 24 * 60 * 60}; path=/`;
        setDismissed(true);
    };

    if (isCompactViewport) {
        return (
            <div className="fixed inset-x-2 bottom-[calc(4.35rem+env(safe-area-inset-bottom))] z-50 rounded-[1.5rem] border border-white/10 bg-black/92 px-4 py-3 text-white shadow-[0_25px_70px_rgba(0,0,0,0.45)] backdrop-blur-xl">
                <p className="text-[11px] leading-5 text-gray-100">
                    We use cookies to improve KandyDrops and confirm 18+ access.
                </p>
                <button
                    type="button"
                    onClick={handleAccept}
                    className="mt-3 inline-flex min-h-10 items-center justify-center rounded-xl bg-pink-500 px-4 py-2 text-sm font-bold text-white"
                >
                    I Understand
                </button>
            </div>
        );
    }

    return (
        <CookieConsent
            location="bottom"
            buttonText="I Understand"
            cookieName="kandydrops_consent"
            style={{
                background: "rgba(0, 0, 0, 0.9)",
                backdropFilter: "blur(10px)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                borderTop: "1px solid rgba(255, 255, 255, 0.1)",
                fontSize: "13px",
                alignItems: "center",
                padding: "12px 16px calc(12px + env(safe-area-inset-bottom))",
                bottom: "calc(4.5rem + env(safe-area-inset-bottom))",
                left: "12px",
                right: "12px",
                width: "auto",
                borderRadius: "24px",
                boxShadow: "0 25px 70px rgba(0, 0, 0, 0.45)",
            }}
            buttonStyle={{
                background: "#ec4899",
                color: "white",
                fontSize: "13px",
                fontWeight: "bold",
                borderRadius: "8px",
                padding: "8px 16px"
            }}
            contentStyle={{
                margin: 0,
                lineHeight: 1.5,
            }}
            expires={150}
            onAccept={handleAccept}
        >
            This website uses cookies to enhance the user experience and track interactions for improvement.{" "}
            <span style={{ fontSize: "10px", color: "#6b7280" }}>By continuing, you verify you are over 18.</span>
        </CookieConsent>
    );
}
