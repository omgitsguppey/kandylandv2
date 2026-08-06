"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import NextImage from "next/image";
import { Plus, Sparkles, Wallet } from "lucide-react";

import { useAuth } from "@/context/AuthContext";
import { useUI } from "@/context/UIContext";
import { trackEvent } from "@/lib/telemetry";
import { SECONDARY_UNWRAP_CTA } from "@/lib/marketing-copy";
import { BetaBadge } from "@/components/ReleaseNotes/BetaBadge";

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
                    className="mx-auto flex max-w-7xl items-center justify-between rounded-[1.35rem] border border-kandy-lilac/20 bg-kandy-void/85 px-3.5 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_18px_48px_rgba(5,2,11,0.52)] backdrop-blur-2xl sm:px-5 sm:py-2.5"
                    style={{ WebkitBackdropFilter: "blur(20px)" }}
                >
                    <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
                        <Link
                            href={homeHref}
                            onClick={() => {
                                trackEvent("navigation_click", { destination: homeHref, source: "navbar_logo" });
                            }}
                            aria-label="KandyDrops home"
                            className="inline-flex min-h-11 shrink-0 items-center bg-gradient-to-r from-white via-kandy-lilac to-brand-pink bg-clip-text text-base font-black tracking-[-0.06em] text-transparent drop-shadow-[0_0_18px_rgba(178,140,255,0.28)] sm:text-2xl"
                        >
                            KandyDrops
                        </Link>
                        <BetaBadge />
                    </div>

                    <div className="flex min-w-0 items-center gap-2 sm:gap-4">
                        {!authSettled ? (
                            <div className="flex items-center gap-2 sm:gap-4">
                                <div className="hidden h-11 w-24 rounded-[0.9rem] border border-white/10 bg-white/[0.04] md:block" />
                                <div className="h-11 w-11 rounded-[0.9rem] border border-white/10 bg-white/[0.04]" />
                            </div>
                        ) : user ? (
                            <>
                                {isAdmin ? <AdminDropdown /> : null}
                                <NotificationBell />

                                <div className="hidden h-11 items-center gap-2 rounded-[1rem] border border-kandy-lilac/15 bg-white/[0.035] px-2 pl-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] md:flex">
                                    <div className="flex items-center gap-2">
                                        <Wallet className="h-4 w-4 text-brand-purple drop-shadow-[0_0_8px_rgba(139,92,246,0.5)]" />
                                        <AnimateBalance
                                            balance={userProfile?.gumDropsBalance || 0}
                                            className="relative font-mono font-bold tracking-wider text-brand-purple"
                                        />
                                    </div>

                                    <button
                                        onClick={() => openPurchaseModal()}
                                        className="flex h-11 w-11 items-center justify-center rounded-[0.85rem] bg-gradient-to-br from-brand-purple to-brand-pink text-white shadow-[0_8px_20px_rgba(178,140,255,0.3)] transition-all duration-200 hover:brightness-110 active:scale-95"
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
                                    className="relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-[0.95rem] border border-kandy-lilac/20 bg-white/[0.05] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] md:hidden"
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
                                    className="inline-flex min-h-11 items-center rounded-[0.9rem] border border-white/10 bg-white/[0.04] px-3 text-[11px] font-semibold text-gray-200 transition-colors hover:border-brand-purple/40 hover:bg-brand-purple/10 hover:text-white sm:px-4 sm:text-xs"
                                >
                                    For creators
                                </Link>
                                <button
                                    onClick={() => openAuthModal("signup")}
                                    className="flex min-h-11 max-w-[8.5rem] shrink items-center justify-center gap-1.5 rounded-[0.9rem] bg-gradient-to-r from-brand-purple to-brand-pink px-3 text-[11px] font-bold tracking-wide text-white shadow-[0_10px_26px_rgba(178,140,255,0.32)] transition-all duration-300 hover:brightness-110 active:scale-[0.98] sm:max-w-none sm:gap-2 sm:px-6 sm:text-sm"
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
