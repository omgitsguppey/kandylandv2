"use client";

import { Suspense } from "react";
import { Home, Candy, Sparkles, LayoutDashboard, MessageSquare, Wallet } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useUI } from "@/context/UIContext";
import { useChatUnreadStatus } from "@/hooks/useChatUnreadStatus";
import { cn } from "@/lib/utils";
import { trackEvent } from "@/lib/telemetry";
import { CREATOR_DASHBOARD_ROUTE } from "@/lib/creator-profile-routing";
import { isIosStandalonePwa } from "@/lib/device-layout-contract";
import {
    USER_MOBILE_BOTTOM_NAV_BOTTOM_OFFSET,
    USER_MOBILE_BOTTOM_NAV_HEIGHT,
} from "@/lib/user-mobile-shell";

type NavItem = {
    label: string;
    href: string;
    icon: typeof Home;
    /** If true, opens purchase modal instead of navigating */
    action?: "purchase";
};

const GUEST_NAV_ITEMS: NavItem[] = [
    { label: "Home", href: "/", icon: Home },
    { label: "Drops", href: "/drops", icon: Candy },
    { label: "Experiences", href: "/experiences", icon: Sparkles },
];

const AUTHED_NAV_ITEMS: NavItem[] = [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { label: "Drops", href: "/drops", icon: Candy },
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
                className="pointer-events-none fixed inset-x-0 z-40 px-3 md:hidden sm:px-4 opacity-0"
                data-device-layout-surface="mobile-bottom-nav"
                data-hydration-lane="critical"
                data-bottom-nav-role="navigation"
                style={{ bottom: USER_MOBILE_BOTTOM_NAV_BOTTOM_OFFSET, height: USER_MOBILE_BOTTOM_NAV_HEIGHT }}
            />
        );
    }

    const isSignedIn = !!user;
    const creatorDashboardHref = userProfile?.role === "creator" ? CREATOR_DASHBOARD_ROUTE : "/dashboard";
    const navItems = isSignedIn
        ? AUTHED_NAV_ITEMS.map((item) => item.href === "/dashboard" ? { ...item, href: creatorDashboardHref } : item)
        : GUEST_NAV_ITEMS;

    return (
        <div
            className="pointer-events-none fixed inset-x-0 z-40 px-3 md:hidden sm:px-4"
            style={{ bottom: USER_MOBILE_BOTTOM_NAV_BOTTOM_OFFSET }}
            data-platform-shell={iosPwa ? "ios-pwa" : "default"}
        >
            <nav
                aria-label="Mobile navigation"
                className="pointer-events-auto mx-auto flex max-w-7xl items-center justify-between rounded-full border border-white/10 bg-black/55 px-3.5 py-1.5 shadow-xl shadow-black/40 backdrop-blur-xl"
                data-device-layout-surface="mobile-bottom-nav"
                data-hydration-lane="critical"
                data-bottom-nav-role="navigation"
                data-bottom-nav-visual-height="56"
                style={{ WebkitBackdropFilter: "blur(20px)" }}
            >
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = item.action
                        ? false
                        : item.href === "/dashboard"
                            ? pathname === item.href
                            : pathname === item.href || pathname?.startsWith(`${item.href}/`);

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
                                className={cn(
                                    "flex h-11 min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-full px-2 py-1 text-center transition-colors active:scale-95",
                                    "text-gray-400"
                                )}
                            >
                                <Icon className="h-3.5 w-3.5 shrink-0" />
                                <span className="text-[9px] font-semibold leading-none">{item.label}</span>
                            </button>
                        );
                    }

                    return (
                        <Link
                            key={item.label}
                            href={item.href}
                            data-onboarding-target={`${item.label.toLowerCase()}-nav`}
                            aria-current={isActive ? "page" : undefined}
                            onClick={() => {
                                triggerHaptic();
                                trackEvent('navigation_click', { destination: item.href, route: pathname ?? "/", source: 'mobile_bottom_bar', source_component: "mobile_bottom_bar" });
                            }}
                            className={cn(
                                "flex h-11 min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-full px-2 py-1 text-center transition-colors active:scale-95",
                                isActive ? "bg-brand-purple/10 text-brand-purple" : "text-gray-400"
                            )}
                        >
                            <div className="relative">
                                <Icon className="h-3.5 w-3.5 shrink-0" />
                                {item.label === "Chat" && hasUnreadMessages && (
                                    <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-brand-purple ring-2 ring-black/55" />
                                )}
                            </div>
                            <span className="text-[9px] font-semibold leading-none">{item.label}</span>
                        </Link>
                    );
                })}
            </nav>
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
