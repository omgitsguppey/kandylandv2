"use client";
import { useEffect, useState } from "react";
import CookieConsent from "react-cookie-consent";
import { useAuth } from "@/context/AuthContext";
import { useUI } from "@/context/UIContext";

export default function CookieBanner() {
    const [isMounted, setIsMounted] = useState(false);
    const [dismissed, setDismissed] = useState(false);
    const { user, userProfile } = useAuth();
    const { isAuthModalOpen } = useUI();

    const suppressForFlow = Boolean(
        isAuthModalOpen ||
        user &&
        userProfile &&
        userProfile.onboardingCompleted !== true
    );

    useEffect(() => {
        const mountTimer = window.setTimeout(() => {
            setIsMounted(true);
        }, 0);

        return () => window.clearTimeout(mountTimer);
    }, []);

    const hasConsent = isMounted && typeof window !== "undefined"
        ? localStorage.getItem("kandydrops_cookie_consent") === "true"
        : false;
    const showBanner = isMounted && !dismissed && !hasConsent;

    if (!showBanner || suppressForFlow) return null;

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
                bottom: "calc(5rem + env(safe-area-inset-bottom))",
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
            onAccept={() => {
                localStorage.setItem("kandydrops_cookie_consent", "true");
                setDismissed(true);
            }}
        >
            This website uses cookies to enhance the user experience and track interactions for improvement.{" "}
            <span style={{ fontSize: "10px", color: "#6b7280" }}>By continuing, you verify you are over 18.</span>
        </CookieConsent>
    );
}
