"use client";
import { useEffect, useState } from "react";
import CookieConsent from "react-cookie-consent";

export default function CookieBanner() {
    const [showBanner, setShowBanner] = useState(false);

    useEffect(() => {
        // Check localStorage on mount
        const consent = localStorage.getItem("kandydrops_cookie_consent");
        if (!consent) {
            setShowBanner(true);
        }
    }, []);

    if (!showBanner) return null;

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
                alignItems: "center"
            }}
            buttonStyle={{
                background: "#ec4899",
                color: "white",
                fontSize: "13px",
                fontWeight: "bold",
                borderRadius: "8px",
                padding: "8px 16px"
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
