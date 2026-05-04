"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import NextImage from "next/image";
import { Plus, Sparkles, Wallet } from "lucide-react";

import { useAuth } from "@/context/AuthContext";
import { useUI } from "@/context/UIContext";
import { trackEvent } from "@/lib/telemetry";
import { SECONDARY_UNWRAP_CTA } from "@/lib/marketing-copy";

const ProfileDropdown = dynamic(
    () => import("@/components/Navigation/ProfileDropdown").then((mod) => mod.ProfileDropdown),
);
const ProfileSidebar = dynamic(
    () => import("@/components/Navigation/ProfileSidebar").then((mod) => mod.ProfileSidebar),
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

    return (
        <>
            <nav
                className="fixed left-0 right-0 top-0 z-50 px-3 py-3 transition-all sm:px-6 sm:py-4"
                data-device-layout-surface="top-nav"
                data-hydration-lane="critical"
                data-top-nav-behavior="fixed-floating-glass"
                style={{ paddingTop: "calc(0.75rem + env(safe-area-inset-top))" }}
            >
                <div
                    className="mx-auto flex max-w-7xl items-center justify-between rounded-full border border-white/10 bg-black/55 px-3.5 py-2 shadow-xl shadow-black/40 backdrop-blur-xl sm:px-6 sm:py-3"
                    style={{ WebkitBackdropFilter: "blur(20px)" }}
                >
                    <Link
                        href={homeHref}
                        onClick={() => {
                            trackEvent("navigation_click", { destination: homeHref, source: "navbar_logo" });
                        }}
                        aria-label="KandyDrops home"
                        className="shrink-0 text-white text-base font-bold sm:text-2xl"
                    >
                        KandyDrops
                    </Link>

                    <div className="flex min-w-0 items-center gap-2 sm:gap-4">
                        {!authSettled ? (
                            <div className="flex items-center gap-2 sm:gap-4">
                                <div className="hidden h-9 w-24 rounded-full border border-white/10 bg-white/5 md:block" />
                                <div className="h-9 w-9 rounded-full border border-white/10 bg-white/5" />
                            </div>
                        ) : user ? (
                            <>
                                {isAdmin ? <AdminDropdown /> : null}
                                <NotificationBell />

                                <div className="hidden items-center gap-3 rounded-full border border-white/5 px-4 py-1.5 pr-1.5 md:flex">
                                    <div className="flex items-center gap-2">
                                        <Wallet className="h-4 w-4 text-brand-purple drop-shadow-[0_0_8px_rgba(139,92,246,0.5)]" />
                                        <AnimateBalance
                                            balance={userProfile?.gumDropsBalance || 0}
                                            className="relative font-mono font-bold tracking-wider text-brand-purple"
                                        />
                                    </div>

                                    <button
                                        onClick={() => openPurchaseModal()}
                                        className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-brand-purple to-pink-600 text-white shadow-lg shadow-brand-purple/20 transition-all active:scale-95"
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
                                    onClick={openProfileSidebar}
                                    aria-label="Open profile menu"
                                    className="relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-white/5 text-white md:hidden"
                                >
                                    {user.photoURL ? (
                                        <NextImage
                                            src={user.photoURL}
                                            alt="Profile"
                                            fill
                                            className="object-cover opacity-80"
                                            sizes="40px"
                                        />
                                    ) : (
                                        <span className="bg-gradient-to-tr from-brand-purple to-brand-purple bg-clip-text text-sm font-bold text-transparent">
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
                                    className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-2 text-[11px] font-semibold text-gray-200 transition-colors hover:border-brand-purple/30 hover:text-white sm:px-4 sm:text-xs"
                                >
                                    For creators
                                </Link>
                                <button
                                    onClick={() => openAuthModal("signup")}
                                    className="flex max-w-[8.5rem] shrink items-center justify-center gap-1.5 rounded-full bg-gradient-to-r from-brand-purple to-purple-500 px-3 py-2 text-[11px] font-bold tracking-wide text-white shadow-[0_0_20px_rgba(178,140,255,0.35)] transition-all duration-300 sm:max-w-none sm:gap-2 sm:px-6 sm:py-2.5 sm:text-sm"
                                >
                                    <Sparkles className="h-4 w-4" />
                                    <span className="truncate sm:hidden">Unwrap</span>
                                    <span className="hidden sm:inline">{SECONDARY_UNWRAP_CTA}</span>
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </nav>

            {isProfileSidebarOpen ? (
                <ProfileSidebar isOpen={isProfileSidebarOpen} onClose={closeProfileSidebar} />
            ) : null}
        </>
    );
}
