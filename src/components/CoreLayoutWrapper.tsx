"use client";

import { PayPalProvider } from "@/components/PayPalProvider";
import { Toaster } from "sonner";
import CookieBanner from "@/components/CookieBanner";
import dynamic from "next/dynamic";
import { useEffect } from "react";
import { useAuth } from "@/context/AuthContext";

const MobileBottomBar = dynamic(() => import("@/components/Navigation/MobileBottomBar"));
const Navbar = dynamic(() => import("@/components/Navbar").then((mod) => mod.Navbar));
const GlobalPurchaseModal = dynamic(() => import("@/components/GlobalPurchaseModal").then((mod) => mod.GlobalPurchaseModal));
const GlobalAuthModal = dynamic(() => import("@/components/GlobalAuthModal").then((mod) => mod.GlobalAuthModal));
const OnboardingModal = dynamic(() => import("@/components/Auth/OnboardingModal").then((mod) => mod.OnboardingModal));
const DebugBreakpoints = dynamic(() => import("@/components/Debug/DebugBreakpoints").then((mod) => mod.DebugBreakpoints));
const InsufficientBalanceModal = dynamic(() => import("@/components/InsufficientBalanceModal").then((mod) => mod.InsufficientBalanceModal));
const ScrollToTop = dynamic(() => import("@/components/Navigation/ScrollToTop").then((mod) => mod.ScrollToTop));
const AutoScrollToTop = dynamic(() => import("@/components/Navigation/AutoScrollToTop").then((mod) => mod.AutoScrollToTop));

export function CoreLayoutWrapper({ children }: { children: React.ReactNode }) {
    const { userProfile } = useAuth();

    useEffect(() => {
        if (typeof window !== "undefined") {
            // Track user properties in GA
            if ((window as any).gtag && userProfile?.role) {
                (window as any).gtag("set", "user_properties", {
                    user_role: userProfile.role,
                });
            }

            // Capture and store referral code from URL
            const params = new URLSearchParams(window.location.search);
            const refCode = params.get("ref");
            if (refCode) {
                sessionStorage.setItem("kandy_referral", refCode);
            }
        }
    }, [userProfile?.role]);

    return (
        <PayPalProvider>
            <Navbar />
            {children}
            <MobileBottomBar />
            <ScrollToTop />
            <AutoScrollToTop />
            <GlobalPurchaseModal />

            <InsufficientBalanceModal />
            <GlobalAuthModal />

            <OnboardingModal />
            <Toaster position="top-center" theme="dark" richColors closeButton />
            <CookieBanner />
            <DebugBreakpoints />
        </PayPalProvider>
    );
}
