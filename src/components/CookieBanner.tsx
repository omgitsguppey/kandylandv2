"use client";
import { useEffect, useState } from "react";
import CookieConsent from "react-cookie-consent";
import { useAuth } from "@/context/AuthContext";
import { useUI } from "@/context/UIContext";

export default function CookieBanner() {
    const [showBanner, setShowBanner] = useState(false);
    const { user, userProfile } = useAuth();
    const { isAuthModalOpen } = useUI();

    const suppressForFlow = Boolean(
        isAuthModalOpen ||
        user &&
        userProfile &&
        userProfile.onboardingCompleted !== true
    );

    useEffect(() => {
        // Check localStorage on mount
        const consent = localStorage.getItem("kandydrops_cookie_consent");
        if (!consent) {
            setShowBanner(true);
        }
    }, []);

    if (!showBanner || suppressForFlow) return null;

    return (
        <CookieConsent
            location="bottom"
            buttonText="I Understand"
            cookieName="kandydrops_consent"
            style={{
                background: "rgba(0, 0, 0, 0.9)",
                backdropFilter: "blur(10px)",
                borderTop: "1px solid rgba(255, 255, 255, 0.1)",
                fontSize: "13px",
                alignItems: "center",
                padding: "12px 16px calc(12px + env(safe-area-inset-bottom))",
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
                setShowBanner(false);
            }}
        >
            This website uses cookies to enhance the user experience and track interactions for improvement.{" "}
            <span style={{ fontSize: "10px", color: "#6b7280" }}>By continuing, you verify you are over 18.</span>
        </CookieConsent>
    );
}
