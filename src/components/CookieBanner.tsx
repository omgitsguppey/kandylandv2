"use client";

import CookieConsent from "react-cookie-consent";
import { useUI } from "@/context/UIContext";

export default function CookieBanner() {
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
        >
            This website uses cookies to enhance the user experience and track interactions for improvement.{" "}
            <span style={{ fontSize: "10px", color: "#6b7280" }}>By continuing, you verify you are over 18.</span>
        </CookieConsent>
    );
}
