"use client";

import dynamic from "next/dynamic";
import NextImage from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus, Sparkles, Wallet } from "lucide-react";

import { BetaBadge } from "@/components/ReleaseNotes/BetaBadge";
import {
    KandyBrandLockup,
    KandyDesktopNavigation,
    KandyTopNavigationFrame,
    type KandyDesktopNavigationItem,
} from "@/components/creative-tim/kandydrops/navigation/KandyNavigationPrimitives";
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
        ? isAdmin
            ? [{ label: "Control tower", href: "/admin" }]
            : userProfile?.role === "creator"
                ? [
                    { label: "Studio", href: CREATOR_DASHBOARD_ROUTE },
                    { label: "Drops", href: "/drops" },
                    { label: "Experiences", href: "/experiences" },
                    { label: "Chat", href: "/dashboard/chat" },
                ]
                : [
                    { label: "My KandyDrops", href: "/dashboard" },
                    { label: "Drops", href: "/drops" },
                    { label: "Experiences", href: "/experiences" },
                    { label: "Chat", href: "/dashboard/chat" },
                ]
        : [
            { label: "Discover", href: "/drops" },
            { label: "Experiences", href: "/experiences" },
        ];

    return (
        <>
            <nav
                className="sticky top-0 z-50 border-b border-white/10 bg-[#0a0a0b]/98 px-4 py-1.5 backdrop-blur-md sm:px-6"
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
                            className="inline-flex min-h-10 items-center rounded-md outline-none transition-opacity duration-200 hover:opacity-85 focus-visible:ring-2 focus-visible:ring-kandy-lilac"
                        >
                            <KandyBrandLockup />
                        </Link>
                        <BetaBadge />
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
                        <div className="hidden flex-1 lg:block" />
                    )}

                    <div className="flex shrink-0 items-center justify-end gap-2 sm:gap-3">
                        {!authSettled ? (
                            <div className="flex items-center gap-2">
                                <div className="hidden h-10 w-28 border border-white/10 bg-white/[0.03] md:block" />
                                <div className="h-10 w-10 border border-white/10 bg-white/[0.03]" />
                            </div>
                        ) : user ? (
                            <>
                                {isAdmin ? <AdminDropdown /> : null}
                                <NotificationBell />

                                <div className="hidden min-h-10 items-center gap-2 border-l border-white/10 pl-3 md:flex">
                                    <div className="flex min-w-0 items-center gap-2">
                                        <Wallet className="h-4 w-4 shrink-0 text-white/65" />
                                        <AnimateBalance
                                            balance={userProfile?.gumDropsBalance || 0}
                                            className="relative font-mono text-sm font-bold tracking-wider text-white"
                                        />
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => openPurchaseModal()}
                                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-white/[0.08] text-white transition-colors hover:bg-white/[0.14] active:scale-95"
                                        title="Buy Gum Drops"
                                        aria-label="Buy Gum Drops"
                                    >
                                        <Plus className="h-4 w-4" />
                                    </button>
                                </div>

                                <div className="hidden md:block">
                                    <ProfileDropdown />
                                </div>

                                <button
                                    type="button"
                                    onClick={openProfileSidebar}
                                    aria-label="Open profile menu"
                                    className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-md border border-white/15 bg-white/[0.03] text-white transition-colors hover:bg-white/[0.08] md:hidden"
                                >
                                    {user.photoURL ? (
                                        <NextImage
                                            src={user.photoURL}
                                            alt="Profile"
                                            fill
                                            className="object-cover opacity-80"
                                            sizes="44px"
                                        />
                                    ) : (
                                        <span className="text-sm font-bold text-white">
                                            {user.displayName?.charAt(0)?.toUpperCase() || "U"}
                                        </span>
                                    )}
                                </button>
                            </>
                        ) : (
                            <>
                                <Link
                                    href="/creators/apply"
                                    onClick={() => {
                                        trackEvent("navigation_click", { destination: "/creators/apply", source: "navbar_creator_apply" });
                                    }}
                                    className="inline-flex min-h-10 items-center rounded-md border border-white/15 px-3 text-xs font-semibold text-gray-200 transition-colors hover:border-white/40 hover:text-white sm:px-4 sm:text-sm"
                                >
                                    For creators
                                </Link>
                                <button
                                    type="button"
                                    onClick={() => openAuthModal("signup")}
                                    className="flex min-h-10 max-w-36 shrink items-center justify-center gap-1.5 rounded-md border border-white/15 bg-white/[0.08] px-3 text-xs font-bold tracking-wide text-white transition-colors hover:bg-white/[0.14] active:scale-[0.98] sm:max-w-none sm:gap-2 sm:px-5 sm:text-sm"
                                >
                                    <Sparkles className="h-4 w-4" />
                                    <span className="truncate sm:hidden">Unwrap</span>
                                    <span className="hidden sm:inline">{SECONDARY_UNWRAP_CTA}</span>
                                </button>
                            </>
                        )}
                    </div>
                </KandyTopNavigationFrame>
            </nav>

            {isProfileSidebarOpen ? (
                <ProfileSidebar isOpen={isProfileSidebarOpen} onClose={closeProfileSidebar} />
            ) : null}
        </>
    );
}
