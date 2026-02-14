"use client";

import { PayPalProvider } from "@/components/PayPalProvider";
import MobileBottomBar from "@/components/Navigation/MobileBottomBar";
import { GlobalPurchaseModal } from "@/components/GlobalPurchaseModal";
import { OnboardingModal } from "@/components/Auth/OnboardingModal";
import { Toaster } from "sonner";
import { DebugBreakpoints } from "@/components/Debug/DebugBreakpoints";
import CookieBanner from "@/components/CookieBanner";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);

export function CoreLayoutWrapper({ children }: { children: React.ReactNode }) {
    return (
        <PayPalProvider>
            {children}
            <MobileBottomBar />
            <GlobalPurchaseModal />
            <OnboardingModal />
            <Toaster position="top-center" theme="dark" richColors closeButton />
            <CookieBanner />
            <DebugBreakpoints />
        </PayPalProvider>
    );
}
