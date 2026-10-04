"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef } from "react";
import NextImage from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus, Sparkles, Wallet } from "lucide-react";
import { DEVICE_PRIMARY_NAVIGATION_CLASSES } from "@/lib/device-layout-contract";

import { BetaBadge } from "@/components/ReleaseNotes/BetaBadge";
import {
    KandyBrandLockup,
    KandyDesktopNavigation,
    KandyTopNavigationFrame,
    type KandyDesktopNavigationItem,
} from "@/components/creative-tim/kandydrops/navigation/KandyNavigationPrimitives";
import { Button, buttonVariants } from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";
import { useUI } from "@/context/UIContext";
import { CREATOR_DASHBOARD_ROUTE } from "@/lib/creator-profile-routing";
import { SECONDARY_UNWRAP_CTA } from "@/lib/marketing-copy";
import { trackEvent } from "@/lib/telemetry";

const ProfileDropdown = dynamic(
    () => import("@/components/Navigation/ProfileDropdown").then((mod) => mod.ProfileDropdown),
);
const ProfileSidebar = dynamic(
    () => import("@/components/Navigation/ProfileSidebar").then((mod) => mod.default),
);
const AdminDropdown = dynamic(
    () => import("@/components/Navigation/AdminDropdown").then((mod) => mod.AdminDropdown),
);
const NotificationBell = dynamic(
    () => import("@/components/Navigation/NotificationBell").then((mod) => mod.NotificationBell),
);
const AnimateBalance = dynamic(
    () => import("@/components/Navigation/AnimateBalance").then((mod) => mod.AnimateBalance),
);

export function Navbar() {
    const navRef = useRef<HTMLElement | null>(null);
    useEffect(() => {
        const nav = navRef.current;
        if (!nav) return;
        const root = document.documentElement;
        const previousHeight = root.style.getPropertyValue("--kd-top-nav-visual-height");
        const syncHeight = () => {
            const height = Math.ceil(nav.getBoundingClientRect().height);
            if (height <= 0) return;
            const value = String(height) + "px";
            if (root.style.getPropertyValue("--kd-top-nav-visual-height") !== value) {
                root.style.setProperty("--kd-top-nav-visual-height", value);
            }
            nav.setAttribute("data-top-nav-visual-height", String(height));
        };
        syncHeight();
        const observer = typeof ResizeObserver === "function" ? new ResizeObserver(syncHeight) : null;
        observer?.observe(nav);
        return () => {
            observer?.disconnect();
            if (previousHeight) root.style.setProperty("--kd-top-nav-visual-height", previousHeight);
            else root.style.removeProperty("--kd-top-nav-visual-height");
        };
    }, []);
    const pathname = usePathname();
    const { user, userProfile, loading } = useAuth();
    const authSettled = !loading;
    const {
        openPurchaseModal,
        openAuthModal,
        isProfileSidebarOpen,
        openProfileSidebar,
        closeProfileSidebar,
    } = useUI();
    const homeHref = user
        ? userProfile?.role === "admin"
            ? "/admin"
            : "/dashboard"
        : "/";
    const isAdmin = userProfile?.role === "admin";
    const desktopNavigationItems: KandyDesktopNavigationItem[] = user
        ? [
            userProfile?.role === "creator"
                ? { label: "Studio", href: CREATOR_DASHBOARD_ROUTE }
                : { label: "My KandyDrops", href: "/dashboard" },
            { label: "Drops", href: "/drops" },
            { label: "Experiences", href: "/experiences" },
            { label: "Chat", href: "/dashboard/chat" },
            ...(isAdmin ? [{ label: "Control tower", href: "/admin" }] : []),
        ]
        : [
            { label: "Discover", href: "/drops" },
            { label: "Experiences", href: "/experiences" },
        ];

    return (
        <>
            <nav
                ref={navRef}
                className="navigation-material sticky top-0 z-50 rounded-none border-x-0 border-t-0 px-4 py-1.5 sm:px-6"
                aria-label="App navigation"
                data-device-layout-contract="2026-05-public-beta"
                data-device-layout-surface="top-nav"
                data-hydration-lane="critical"
                data-top-nav-behavior="stable-route-bar"
                style={{ paddingTop: "calc(env(safe-area-inset-top) + 0.375rem)" }}
            >
                <KandyTopNavigationFrame>
                    <div className="flex shrink-0 items-center gap-2">
                        <Link
                            href={homeHref}
                            onClick={() => {
                                trackEvent("navigation_click", { destination: homeHref, source: "navbar_logo" });
                            }}
                            aria-label="KandyDrops home"
                            className="inline-flex min-h-11 min-w-11 items-center rounded-xl outline-none transition-opacity duration-150 hover:opacity-80 focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
                        >
                            <KandyBrandLockup />
                        </Link>
                        <BetaBadge />
                    </div>

                    <div className="col-start-2 row-start-1 flex min-w-0 flex-wrap items-center justify-end gap-2 sm:gap-3">
                        {!authSettled ? (
                            <div className="flex items-center gap-2">
                                <div className="hidden h-11 w-28 rounded-full border border-border bg-secondary md:block" />
                                <div className="h-11 w-11 rounded-full border border-border bg-secondary" />
                            </div>
                        ) : user ? (
                            <>
                                {isAdmin ? <AdminDropdown /> : null}
                                <NotificationBell />

                                <div className="hidden min-h-11 items-center gap-2 border-l border-border pl-3 md:flex">
                                    <div className="flex min-w-0 items-center gap-2">
                                        <Wallet className="h-4 w-4 shrink-0 text-muted-foreground" />
                                        <AnimateBalance
                                            balance={userProfile?.gumDropsBalance || 0}
                                            className="relative text-sm font-semibold tabular-nums text-foreground"
                                        />
                                    </div>

                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => openPurchaseModal()}
                                        title="Buy Gum Drops"
                                        aria-label="Buy Gum Drops"
                                    >
                                        <Plus className="h-4 w-4" aria-hidden="true" />
                                    </Button>
                                </div>

                                <div className="hidden md:block">
                                    <ProfileDropdown />
                                </div>

                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={openProfileSidebar}
                                    aria-label="Open profile menu"
                                    className="relative overflow-hidden border border-input bg-secondary p-0 md:hidden"
                                >
                                    {user.photoURL ? (
                                        <NextImage
                                            src={user.photoURL}
                                            alt="Profile"
                                            fill
                                            className="object-cover"
                                            sizes="44px"
                                        />
                                    ) : (
                                        <span className="text-sm font-semibold text-foreground">
                                            {user.displayName?.charAt(0)?.toUpperCase() || "U"}
                                        </span>
                                    )}
                                </Button>
                            </>
                        ) : (
                            <>
                                <Link
                                    href="/creators/apply"
                                    onClick={() => {
                                        trackEvent("navigation_click", { destination: "/creators/apply", source: "navbar_creator_apply" });
                                    }}
                                    className={buttonVariants({ variant: "outline", size: "sm", className: "text-xs sm:text-sm" })}
                                >
                                    For creators
                                </Link>
                                <Button
                                    type="button"
                                    variant="brand"
                                    onClick={() => openAuthModal("signup")}
                                    className="max-w-36 shrink gap-1.5 px-3 text-xs sm:max-w-none sm:gap-2 sm:px-5 sm:text-sm"
                                >
                                    <Sparkles className="h-4 w-4" aria-hidden="true" />
                                    <span className="truncate sm:hidden">Unwrap</span>
                                    <span className="hidden sm:inline">{SECONDARY_UNWRAP_CTA}</span>
                                </Button>
                            </>
                        )}
                    </div>
                    {authSettled ? (
                        <KandyDesktopNavigation
                            items={desktopNavigationItems}
                            pathname={pathname}
                            onNavigate={(destination) => {
                                trackEvent("navigation_click", {
                                    destination,
                                    source: "navbar_primary_navigation",
                                    source_component: "navbar",
                                });
                            }}
                        />
                    ) : (
                        <div className={DEVICE_PRIMARY_NAVIGATION_CLASSES.expanded} aria-hidden="true" />
                    )}
                </KandyTopNavigationFrame>
            </nav>

            {isProfileSidebarOpen ? (
                <ProfileSidebar isOpen={isProfileSidebarOpen} onClose={closeProfileSidebar} />
            ) : null}
        </>
    );
}
