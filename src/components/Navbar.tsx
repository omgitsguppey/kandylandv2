"use client";

import Link from "next/link";
import { useAuthIdentity, useUserProfile } from "@/context/AuthContext";
import { useUI } from "@/context/UIContext";
import { Sparkles, Wallet, Plus } from "lucide-react";
import { trackEvent } from "@/lib/telemetry";
import { SECONDARY_UNWRAP_CTA } from "@/lib/marketing-copy";

import { ProfileDropdown } from "@/components/Navigation/ProfileDropdown";
import { ProfileSidebar } from "@/components/Navigation/ProfileSidebar";
import { AdminDropdown } from "@/components/Navigation/AdminDropdown";
import { NotificationBell } from "@/components/Navigation/NotificationBell";
import { AnimateBalance } from "@/components/Navigation/AnimateBalance";

import NextImage from "next/image";

export function Navbar() {
    const { user } = useAuthIdentity();
    const { userProfile } = useUserProfile();
    const {
        openPurchaseModal,
        openAuthModal,
        isProfileSidebarOpen,
        openProfileSidebar,
        closeProfileSidebar,
    } = useUI();

    // Navbar is now global

    return (
        <>
            <nav className="fixed top-0 left-0 right-0 z-50 px-3 sm:px-6 py-3 sm:py-4 transition-all" style={{ paddingTop: 'calc(0.75rem + env(safe-area-inset-top))' }}>
                <div className="max-w-7xl mx-auto bg-black/55 backdrop-blur-xl border border-white/10 rounded-full px-3.5 sm:px-6 py-2 sm:py-3 flex items-center justify-between shadow-xl shadow-black/40" style={{ WebkitBackdropFilter: 'blur(20px)' }}>
                    <Link href="/" onClick={() => {
                        trackEvent('navigation_click', { destination: '/', source: 'navbar_logo' });
                    }} className="text-lg sm:text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-brand-purple to-brand-purple">
                        KandyDrops
                    </Link>

                    <div className="flex items-center gap-2 sm:gap-4">
                        {user ? (
                            <>
                                {/* Admin Dropdown (Desktop & Mobile) - Protected internally */}
                                <AdminDropdown />

                                {/* Notification Bell (Global) */}
                                <NotificationBell />

                                {/* Wallet - Hidden on Mobile, shown on Desktop */}
                                <div className="hidden md:flex items-center gap-3 pl-4 pr-1.5 py-1.5 glass-button rounded-full border border-white/5">
                                    <div className="flex items-center gap-2">
                                        <Wallet className="w-4 h-4 text-brand-purple drop-shadow-[0_0_8px_rgba(139,92,246,0.5)]" />
                                        <AnimateBalance
                                            balance={userProfile?.gumDropsBalance || 0}
                                            className="font-mono text-brand-purple font-bold tracking-wider relative"
                                        />
                                    </div>

                                    <button
                                        onClick={openPurchaseModal}
                                        className="w-7 h-7 flex items-center justify-center bg-gradient-to-br from-brand-purple to-pink-600 rounded-full text-white shadow-lg shadow-brand-purple/20 active:scale-95 transition-all"
                                        title="Buy Gum Drops"
                                    >
                                        <Plus className="w-4 h-4" />
                                    </button>
                                </div>

                                {/* Desktop Profile Dropdown */}
                                <div className="hidden md:block">
                                    <ProfileDropdown />
                                </div>

                                {/* Mobile Menu Trigger */}
                                <button
                                    onClick={openProfileSidebar}
                                    className="md:hidden w-9 h-9 rounded-full bg-white/5 flex items-center justify-center text-white border border-white/10 relative overflow-hidden"
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
                                        <span className="font-bold text-sm bg-gradient-to-tr from-brand-purple to-brand-purple bg-clip-text text-transparent">
                                            {user.displayName?.charAt(0)?.toUpperCase() || "U"}
                                        </span>
                                    )}
                                </button>
                            </>
                        ) : (
                            <button
                                onClick={() => openAuthModal("signup")}
                                className="flex items-center gap-2 rounded-full bg-gradient-to-r from-brand-purple to-purple-500 px-4 py-2 text-xs font-bold tracking-wide text-white shadow-[0_0_20px_rgba(178,140,255,0.35)] transition-all duration-300 sm:px-6 sm:py-2.5 sm:text-sm"
                            >
                                <Sparkles className="w-4 h-4" />
                                {SECONDARY_UNWRAP_CTA}
                            </button>
                        )}
                    </div>
                </div>
            </nav>

            {/* Mobile Sidebar */}
            <ProfileSidebar isOpen={isProfileSidebarOpen} onClose={closeProfileSidebar} />

        </>
    );
}
