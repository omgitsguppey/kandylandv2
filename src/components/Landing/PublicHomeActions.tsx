"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/Button";
import { useAuthIdentity, useAuthLoading } from "@/context/AuthContext";
import { useUIActions } from "@/context/UIContext";
import { trackEvent } from "@/lib/telemetry";
import { cn } from "@/lib/utils";

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
                className="w-full sm:w-auto"
            >
                Checking access
            </Button>
        );
    }

    if (user) {
        return (
            <Link
                href="/dashboard"
                className={cn(buttonVariants({ variant: "brand", size: "lg" }), "w-full sm:w-auto")}
                onClick={() => trackEvent("hero_cta_clicked", {
                    action: "homepage_dashboard_cta_clicked",
                    destination: "/dashboard",
                    route: "/",
                    source_component: "home_hero_actions",
                })}
            >
                Go to Dashboard <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
            </Link>
        );
    }

    return (
        <Button
            type="button"
            size="lg"
            variant="brand"
            className="w-full sm:w-auto"
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
            Unwrap your KandyDrops <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
        </Button>
    );
}
