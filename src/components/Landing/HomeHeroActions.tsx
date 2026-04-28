"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { useAuthIdentity } from "@/context/AuthContext";
import { useUIActions } from "@/context/UIContext";
import { trackEvent } from "@/lib/telemetry";

export function HomeHeroActions() {
    const { user } = useAuthIdentity();
    const { openAuthModal } = useUIActions();

    return (
        <>
            <div className="flex w-full flex-col justify-center gap-2.5 pt-1 max-[360px]:gap-2 sm:w-auto sm:flex-row sm:gap-4 sm:pt-3">
                {user ? (
                    <Link href="/dashboard" className="w-full sm:w-auto" onClick={() => trackEvent("hero_cta_clicked", { destination: "/dashboard" })}>
                        <Button size="lg" variant="brand" className="w-full px-6 py-3.5 text-base font-bold shadow-[0_0_30px_rgba(178,140,255,0.4)] transition-all hover:shadow-[0_0_40px_rgba(178,140,255,0.6)] max-[360px]:py-3 md:px-10 md:py-6 md:text-lg">
                            Go to Dashboard <ArrowRight className="ml-2 h-4 w-4 md:h-5 md:w-5" />
                        </Button>
                    </Link>
                ) : (
                    <Button
                        onClick={() => {
                            trackEvent("hero_cta_clicked", { action: "open_signup" });
                            openAuthModal("signup");
                        }}
                        size="lg"
                        variant="brand"
                        className="w-full px-6 py-3.5 text-base font-bold shadow-[0_0_30px_rgba(178,140,255,0.4)] transition-all hover:shadow-[0_0_40px_rgba(178,140,255,0.6)] max-[360px]:py-3 sm:w-auto md:px-10 md:py-6 md:text-lg"
                    >
                        Unwrap Your KandyDrops <ArrowRight className="ml-2 h-4 w-4 md:h-5 md:w-5" />
                    </Button>
                )}
            </div>

            <div className="flex w-full flex-col justify-center gap-2 sm:w-auto sm:flex-row sm:gap-3">
                <Link href="/faq" className="w-full sm:w-auto" onClick={() => trackEvent("hero_cta_clicked", { destination: "/faq" })}>
                    <Button variant="outline" size="lg" className="w-full border border-white/10 bg-white/[0.04] px-6 py-3 text-sm font-bold text-white hover:bg-white/[0.08]">
                        See How It Works
                    </Button>
                </Link>
            </div>
        </>
    );
}
