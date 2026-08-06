"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { useAuthIdentity, useAuthLoading } from "@/context/AuthContext";
import { useUIActions } from "@/context/UIContext";
import { trackEvent } from "@/lib/telemetry";

const PRIMARY_HERO_BUTTON_CLASSNAME =
    "min-h-14 w-full bg-[linear-gradient(135deg,#d8b4fe_0%,#a855f7_38%,#6d28d9_100%)] px-6 py-3.5 text-base font-bold shadow-[0_0_34px_rgba(168,85,247,0.52),0_14px_42px_rgba(88,28,135,0.32),inset_0_1px_0_rgba(255,255,255,0.36)] ring-1 ring-white/25 transition-all hover:shadow-[0_0_44px_rgba(192,132,252,0.64),0_18px_48px_rgba(88,28,135,0.38),inset_0_1px_0_rgba(255,255,255,0.42)] max-[360px]:py-3 md:px-10 md:py-6 md:text-lg";

const SECONDARY_HERO_BUTTON_CLASSNAME =
    "min-h-14 w-full border border-white/12 bg-black/38 px-6 py-3 text-sm font-bold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_12px_32px_rgba(0,0,0,0.28)] backdrop-blur-md hover:border-white/20 hover:bg-white/[0.07]";

export function HomeHeroActions() {
    const { user } = useAuthIdentity();
    const { loading } = useAuthLoading();
    const { openAuthModal } = useUIActions();

    return (
        <>
            <div className="flex w-full flex-col justify-center gap-2.5 pt-1 max-[360px]:gap-2 sm:w-auto sm:flex-row sm:gap-4 sm:pt-3">
                {loading ? (
                    <Button
                        type="button"
                        size="lg"
                        variant="brand"
                        isLoading
                        aria-label="Checking account access"
                        aria-busy="true"
                        className={`${PRIMARY_HERO_BUTTON_CLASSNAME} sm:w-auto`}
                    >
                        Checking access
                    </Button>
                ) : user ? (
                    <Link
                        href="/dashboard"
                        className="w-full sm:w-auto"
                        onClick={() => trackEvent("hero_cta_clicked", {
                            action: "homepage_dashboard_cta_clicked",
                            destination: "/dashboard",
                            route: "/",
                            source_component: "home_hero_actions",
                        })}
                    >
                        <Button size="lg" variant="brand" className={PRIMARY_HERO_BUTTON_CLASSNAME}>
                            Go to Dashboard <ArrowRight className="ml-2 h-4 w-4 md:h-5 md:w-5" />
                        </Button>
                    </Link>
                ) : (
                    <Button
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
                        size="lg"
                        variant="brand"
                        className={`${PRIMARY_HERO_BUTTON_CLASSNAME} sm:w-auto`}
                    >
                        Unwrap your KandyDrops <ArrowRight className="ml-2 h-4 w-4 md:h-5 md:w-5" />
                    </Button>
                )}
            </div>

            <div className="flex w-full flex-col justify-center gap-2 sm:w-auto sm:flex-row sm:gap-3">
                <Link
                    href="/faq"
                    className="w-full sm:w-auto"
                    onClick={() => trackEvent("hero_cta_clicked", {
                        action: "homepage_how_it_works_clicked",
                        destination: "/faq",
                        route: "/",
                        source_component: "home_hero_actions",
                    })}
                >
                    <Button variant="outline" size="lg" className={SECONDARY_HERO_BUTTON_CLASSNAME}>
                        See How It Works
                    </Button>
                </Link>
            </div>
        </>
    );
}
