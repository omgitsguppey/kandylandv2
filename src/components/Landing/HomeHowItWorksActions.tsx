"use client";

import { startTransition } from "react";
import { useRouter } from "next/navigation";

import { useUIActions } from "@/context/UIContext";
import { useAuthIdentity } from "@/context/AuthContext";
import { SECONDARY_UNWRAP_CTA } from "@/lib/marketing-copy";
import { trackEvent } from "@/lib/telemetry";

type HomeHowItWorksActionsProps = {
    variant: "primary" | "secondary";
};

export function HomeHowItWorksActions({ variant }: HomeHowItWorksActionsProps) {
    const router = useRouter();
    const { openAuthModal } = useUIActions();
    const { user } = useAuthIdentity();

    const handleLandingCta = () => {
        const source = variant === "primary" ? "landing_how_it_works" : "landing_showcase";
        if (user) {
            trackEvent("navigation_click", { destination: "/drops", source });
            startTransition(() => {
                router.push("/drops");
            });
            return;
        }

        openAuthModal("signup");
    };

    if (variant === "primary") {
        return (
            <button
                onClick={handleLandingCta}
                className="w-full rounded-full bg-gradient-to-r from-brand-purple to-purple-500 px-6 py-3.5 font-extrabold text-white shadow-[0_0_20px_rgba(164,118,255,0.25)] transition-all hover:opacity-95 hover:shadow-[0_0_30px_rgba(164,118,255,0.4)] sm:w-auto sm:px-8 sm:py-4"
            >
                Unwrap your KandyDrops
            </button>
        );
    }

    return (
        <button
            onClick={handleLandingCta}
            className="mt-2 w-full shrink-0 rounded-full border border-white/10 bg-white/5 px-6 py-3 font-bold text-white transition-all hover:border-white/20 hover:bg-white/10 sm:mt-0 sm:w-auto sm:px-7"
        >
            {SECONDARY_UNWRAP_CTA}
        </button>
    );
}
