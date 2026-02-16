"use client";

import { PayPalProvider } from "@/components/PayPalProvider";
import { Toaster } from "sonner";
import CookieBanner from "@/components/CookieBanner";
import dynamic from "next/dynamic";

const MobileBottomBar = dynamic(() => import("@/components/Navigation/MobileBottomBar"));
const GlobalPurchaseModal = dynamic(() => import("@/components/GlobalPurchaseModal").then((mod) => mod.GlobalPurchaseModal));
const GlobalAuthModal = dynamic(() => import("@/components/GlobalAuthModal").then((mod) => mod.GlobalAuthModal));
const OnboardingModal = dynamic(() => import("@/components/Auth/OnboardingModal").then((mod) => mod.OnboardingModal));
const DebugBreakpoints = dynamic(() => import("@/components/Debug/DebugBreakpoints").then((mod) => mod.DebugBreakpoints));


export function CoreLayoutWrapper({ children }: { children: React.ReactNode }) {
    return (
        <PayPalProvider>
            {children}
            <MobileBottomBar />
            <GlobalPurchaseModal />
            <GlobalAuthModal />
            <OnboardingModal />
            <Toaster position="top-center" theme="dark" richColors closeButton />
            <CookieBanner />
            <DebugBreakpoints />
        </PayPalProvider>
    );
}
