"use client";

import { Suspense } from "react";
import { Candy, Home, LayoutDashboard, MessageSquare, Sparkles, Wallet } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { KandyMobileNavigationDock } from "@/components/creative-tim/kandydrops/navigation/KandyNavigationPrimitives";
import { useAuth } from "@/context/AuthContext";
import { useUI } from "@/context/UIContext";
import { useChatUnreadStatus } from "@/hooks/useChatUnreadStatus";
import { CREATOR_DASHBOARD_ROUTE } from "@/lib/creator-profile-routing";
import { isIosStandalonePwa } from "@/lib/device-layout-contract";
import { trackEvent } from "@/lib/telemetry";
import {
    USER_MOBILE_BOTTOM_NAV_BOTTOM_OFFSET,
    USER_MOBILE_BOTTOM_NAV_HEIGHT,
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
    const pathname = usePathname();
    const { user, userProfile, loading } = useAuth();
    const { openPurchaseModal } = useUI();
    const { hasUnreadMessages } = useChatUnreadStatus();
    const authSettled = !loading;
    const iosPwa = typeof window !== "undefined" ? isIosStandalonePwa() : false;

    if (pathname?.startsWith("/admin")) {
        return null;
    }

    if (!authSettled) {
        return (
            <div
                className="pointer-events-none fixed inset-x-0 z-40 px-3 opacity-0 sm:px-4 md:hidden"
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
    const mobileItemClassName = "relative flex h-11 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl px-1 text-center text-xs font-semibold leading-none transition-all duration-200 active:scale-95";

    return (
        <div
            className="pointer-events-none fixed inset-x-0 z-40 px-3 sm:px-4 md:hidden"
            style={{ bottom: USER_MOBILE_BOTTOM_NAV_BOTTOM_OFFSET }}
        >
            <KandyMobileNavigationDock platformShell={iosPwa ? "ios-pwa" : "default"}>
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = item.action
                        ? false
                        : item.href === "/dashboard"
                            ? pathname === item.href
                            : pathname === item.href || pathname?.startsWith(`${item.href}/`);
                    const itemTone = isActive
                        ? "bg-gradient-to-b from-brand-purple/45 via-brand-purple/25 to-brand-pink/15 text-white shadow-lg shadow-brand-purple/20"
                        : item.featured
                            ? "bg-white/10 text-kandy-lilac shadow-inner shadow-white/10 hover:bg-white/15 hover:text-white"
                            : "text-gray-300 hover:bg-white/5 hover:text-white";

                    if (item.action === "purchase") {
                        return (
                            <button
                                type="button"
                                key={item.label}
                                onClick={() => {
                                    triggerHaptic();
                                    trackEvent("navigation_click", { destination: "wallet", route: pathname ?? "/", source: "mobile_bottom_bar", source_component: "mobile_bottom_bar" });
                                    openPurchaseModal();
                                }}
                                aria-label="Open wallet"
                                className={cn(mobileItemClassName, "text-kandy-lilac hover:bg-white/5 hover:text-white")}
                            >
                                <Icon className="h-4 w-4 shrink-0" />
                                <span className="max-w-full truncate">{item.label}</span>
                            </button>
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
                            className={cn(mobileItemClassName, itemTone)}
                        >
                            <span className="relative grid place-items-center">
                                <Icon className="h-4 w-4 shrink-0" />
                                {item.label === "Chat" && hasUnreadMessages ? (
                                    <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-brand-pink ring-2 ring-kandy-ink/90" />
                                ) : null}
                            </span>
                            <span className="max-w-full truncate">{item.label}</span>
                            <span
                                aria-hidden="true"
                                className={cn(
                                    "absolute inset-x-3 bottom-1 h-0.5 rounded-full transition-opacity",
                                    isActive ? "bg-white opacity-90" : "opacity-0",
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
