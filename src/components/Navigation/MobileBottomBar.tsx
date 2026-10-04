"use client";

import { Suspense, useEffect, useRef } from "react";
import { Candy, Home, LayoutDashboard, MessageSquare, Sparkles, Wallet } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { KandyMobileNavigationDock } from "@/components/creative-tim/kandydrops/navigation/KandyNavigationPrimitives";
import { Button, buttonVariants } from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";
import { useUI } from "@/context/UIContext";
import { useChatUnreadStatus } from "@/hooks/useChatUnreadStatus";
import { CREATOR_DASHBOARD_ROUTE } from "@/lib/creator-profile-routing";
import { isIosStandalonePwa } from "@/lib/device-layout-contract";
import { trackEvent } from "@/lib/telemetry";
import {
    USER_MOBILE_BOTTOM_NAV_BOTTOM_OFFSET,
    USER_MOBILE_BOTTOM_NAV_HEIGHT,
    USER_MOBILE_BOTTOM_NAV_VISIBILITY_CLASS_NAME,
} from "@/lib/user-mobile-shell";
import { cn } from "@/lib/utils";

type NavItem = {
    label: string;
    href: string;
    icon: typeof Home;
    action?: "purchase";
    featured?: boolean;
};

export const MOBILE_BOTTOM_NAV_WALLET_ACTION_CLASSIFICATION = {
    status: "intentional_nav_action_exception",
    review: "needs_product_review",
    migration: "migrate_to_wallet_route_later",
    behaviorUnchanged: true,
    paymentRuntimeChanged: false,
} as const;

const GUEST_NAV_ITEMS: NavItem[] = [
    { label: "Home", href: "/", icon: Home },
    { label: "Drops", href: "/drops", icon: Candy, featured: true },
    { label: "Experiences", href: "/experiences", icon: Sparkles },
];

const AUTHED_NAV_ITEMS: NavItem[] = [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { label: "Drops", href: "/drops", icon: Candy, featured: true },
    { label: "Chat", href: "/dashboard/chat", icon: MessageSquare },
    { label: "Experiences", href: "/experiences", icon: Sparkles },
    { label: "Wallet", href: "#wallet", icon: Wallet, action: "purchase" },
];

function triggerHaptic() {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate(10);
    }
}

function MobileBottomBarInner() {
    const dockRef = useRef<HTMLElement | null>(null);
    const pathname = usePathname();
    const { user, userProfile, loading } = useAuth();
    const { openPurchaseModal } = useUI();
    const { hasUnreadMessages } = useChatUnreadStatus();
    const authSettled = !loading;
    const iosPwa = typeof window !== "undefined" ? isIosStandalonePwa() : false;

    useEffect(() => {
        const dock = dockRef.current;
        if (!dock) return;

        const root = document.documentElement;
        const previousHeight = root.style.getPropertyValue("--kd-mobile-bottom-nav-visual-height");
        const syncHeight = () => {
            const height = Math.ceil(dock.getBoundingClientRect().height);
            if (height > 0) {
                const value = String(height) + "px";
                if (root.style.getPropertyValue("--kd-mobile-bottom-nav-visual-height") !== value) {
                    root.style.setProperty("--kd-mobile-bottom-nav-visual-height", value);
                }
                dock.setAttribute("data-bottom-nav-visual-height", String(height));
            } else {
                root.style.removeProperty("--kd-mobile-bottom-nav-visual-height");
            }
        };
        syncHeight();
        const observer = typeof ResizeObserver === "function" ? new ResizeObserver(syncHeight) : null;
        observer?.observe(dock);
        return () => {
            observer?.disconnect();
            if (previousHeight) root.style.setProperty("--kd-mobile-bottom-nav-visual-height", previousHeight);
            else root.style.removeProperty("--kd-mobile-bottom-nav-visual-height");
        };
    }, [authSettled, pathname]);

    if (pathname?.startsWith("/admin")) {
        return null;
    }

    if (!authSettled) {
        return (
            <div
                className={cn("pointer-events-none fixed inset-x-0 z-40 px-3 opacity-0 sm:px-4", USER_MOBILE_BOTTOM_NAV_VISIBILITY_CLASS_NAME)}
                data-bottom-nav-role="navigation"
                data-device-layout-contract="2026-05-public-beta"
                data-device-layout-surface="mobile-bottom-nav"
                data-hydration-lane="critical"
                style={{ bottom: USER_MOBILE_BOTTOM_NAV_BOTTOM_OFFSET, height: USER_MOBILE_BOTTOM_NAV_HEIGHT }}
            />
        );
    }

    const isSignedIn = !!user;
    const creatorDashboardHref = userProfile?.role === "creator" ? CREATOR_DASHBOARD_ROUTE : "/dashboard";
    const navItems = isSignedIn
        ? AUTHED_NAV_ITEMS.map((item) => item.href === "/dashboard" ? { ...item, href: creatorDashboardHref } : item)
        : GUEST_NAV_ITEMS;
    const mobileItemClassName = "relative min-h-11 min-w-0 flex-1 flex-col gap-0.5 rounded-2xl p-1 pb-2 text-center text-xs font-medium leading-tight";

    return (
        <div
            className={cn("pointer-events-none fixed inset-x-0 z-40 px-3 sm:px-4", USER_MOBILE_BOTTOM_NAV_VISIBILITY_CLASS_NAME)}
            style={{ bottom: USER_MOBILE_BOTTOM_NAV_BOTTOM_OFFSET }}
        >
            <KandyMobileNavigationDock platformShell={iosPwa ? "ios-pwa" : "default"} dockRef={dockRef}>
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = item.action
                        ? false
                        : item.href === "/dashboard"
                            ? pathname === item.href
                            : pathname === item.href || pathname?.startsWith(`${item.href}/`);
                    const itemTone = isActive
                        ? "bg-secondary text-foreground"
                        : item.featured
                            ? "text-primary hover:bg-secondary hover:text-foreground"
                            : "text-muted-foreground hover:bg-secondary hover:text-foreground";

                    if (item.action === "purchase") {
                        return (
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                key={item.label}
                                onClick={() => {
                                    triggerHaptic();
                                    trackEvent("navigation_click", { destination: "wallet", route: pathname ?? "/", source: "mobile_bottom_bar", source_component: "mobile_bottom_bar" });
                                    openPurchaseModal();
                                }}
                                aria-label="Open wallet"
                                className={cn(mobileItemClassName, "text-primary hover:bg-secondary hover:text-foreground")}
                            >
                                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                                <span className="max-w-full break-words leading-tight">{item.label}</span>
                            </Button>
                        );
                    }

                    return (
                        <Link
                            key={item.label}
                            href={item.href}
                            data-onboarding-target={`${item.label.toLowerCase()}-nav`}
                            aria-current={isActive ? "page" : undefined}
                            aria-label={item.label}
                            title={item.label}
                            onClick={() => {
                                triggerHaptic();
                                trackEvent("navigation_click", { destination: item.href, route: pathname ?? "/", source: "mobile_bottom_bar", source_component: "mobile_bottom_bar" });
                            }}
                            className={cn(buttonVariants({ variant: "ghost", size: "sm" }), mobileItemClassName, itemTone)}
                        >
                            <span className="relative grid place-items-center">
                                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                                {item.label === "Chat" && hasUnreadMessages ? (
                                    <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-brand-pink ring-2 ring-kandy-ink/90" />
                                ) : null}
                            </span>
                            <span className="max-w-full break-words leading-tight">{item.label}</span>
                            <span
                                aria-hidden="true"
                                className={cn(
                                    "absolute inset-x-3 bottom-1 h-0.5 rounded-full transition-opacity",
                                    isActive ? "bg-foreground opacity-90" : "opacity-0",
                                )}
                            />
                        </Link>
                    );
                })}
            </KandyMobileNavigationDock>
        </div>
    );
}

export default function MobileBottomBar() {
    return (
        <Suspense fallback={null}>
            <MobileBottomBarInner />
        </Suspense>
    );
}
