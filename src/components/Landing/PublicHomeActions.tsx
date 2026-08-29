"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { useAuthIdentity, useAuthLoading } from "@/context/AuthContext";
import { useUIActions } from "@/context/UIContext";
import { trackEvent } from "@/lib/telemetry";

const PRIMARY_ACTION_CLASSNAME =
    "inline-flex min-h-14 w-full items-center justify-center rounded-full bg-[linear-gradient(135deg,#fbcfe8_0%,#d946ef_24%,#9333ea_62%,#581c87_100%)] px-6 py-3.5 text-base font-black text-white shadow-[0_0_38px_rgba(217,70,239,0.35),0_18px_46px_rgba(88,28,135,0.36),inset_0_1px_0_rgba(255,255,255,0.42)] ring-1 ring-white/25 transition-all hover:-translate-y-0.5 hover:text-white hover:shadow-[0_0_48px_rgba(232,121,249,0.46),0_22px_54px_rgba(88,28,135,0.42),inset_0_1px_0_rgba(255,255,255,0.46)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 active:scale-95 sm:w-auto sm:px-8";

export function PublicHomeActions() {
    const { user } = useAuthIdentity();
    const { loading } = useAuthLoading();
    const { openAuthModal } = useUIActions();

    if (loading) {
        return (
            <Button
                type="button"
                size="lg"
                variant="brand"
                isLoading
                aria-label="Checking account access"
                className={PRIMARY_ACTION_CLASSNAME}
            >
                Checking access
            </Button>
        );
    }

    if (user) {
        return (
            <Link
                href="/dashboard"
                className={PRIMARY_ACTION_CLASSNAME}
                onClick={() => trackEvent("hero_cta_clicked", {
                    action: "homepage_dashboard_cta_clicked",
                    destination: "/dashboard",
                    route: "/",
                    source_component: "home_hero_actions",
                })}
            >
                Go to Dashboard <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
        );
    }

    return (
        <Button
            type="button"
            size="lg"
            variant="brand"
            className={PRIMARY_ACTION_CLASSNAME}
            onClick={() => {
                trackEvent("hero_cta_clicked", {
                    action: "open_signup",
                    cta_id: "homepage_unwrap_cta_clicked",
                    destination: "auth_signup",
                    route: "/",
                    source_component: "home_hero_actions",
                });
                openAuthModal("signup");
            }}
        >
            Unwrap your KandyDrops <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
    );
}
