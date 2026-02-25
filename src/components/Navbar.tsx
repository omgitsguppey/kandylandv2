"use client";

import Link from "next/link";
import { useAuthIdentity, useUserProfile } from "@/context/AuthContext";
import { useUI } from "@/context/UIContext";
import { LogIn, Wallet, Plus } from "lucide-react";

import { ProfileDropdown } from "@/components/Navigation/ProfileDropdown";
import { ProfileSidebar } from "@/components/Navigation/ProfileSidebar";
import { AdminDropdown } from "@/components/Navigation/AdminDropdown";
import { NotificationBell } from "@/components/Navigation/NotificationBell";
import { AnimateBalance } from "@/components/Navigation/AnimateBalance";
import { useState } from "react";

import NextImage from "next/image";

export function Navbar() {
    const { user } = useAuthIdentity();
    const { userProfile } = useUserProfile();
    const { openPurchaseModal, openAuthModal } = useUI();
    // UI States
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // Navbar is now global

    return (
        <>
            <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-4 transition-all" style={{ paddingTop: 'calc(1rem + env(safe-area-inset-top))' }}>
                <div className="max-w-7xl mx-auto bg-black/55 backdrop-blur-xl border border-white/10 rounded-full px-6 py-3 flex items-center justify-between shadow-xl shadow-black/40" style={{ WebkitBackdropFilter: 'blur(20px)' }}>
                    <Link href="/" className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-brand-pink to-brand-cyan">
                        KandyDrops
                    </Link>

                    <div className="flex items-center gap-4">
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
                                        className="w-7 h-7 flex items-center justify-center bg-gradient-to-br from-brand-pink to-pink-600 rounded-full text-white shadow-lg shadow-brand-pink/20 active:scale-95 transition-all"
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
                                    onClick={() => setIsMobileMenuOpen(true)}
                                    className="md:hidden w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white border border-white/10 relative overflow-hidden"
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
                                        <span className="font-bold text-sm bg-gradient-to-tr from-brand-pink to-brand-purple bg-clip-text text-transparent">
                                            {user.displayName?.charAt(0).toUpperCase()}
                                        </span>
                                    )}
                                </button>
                            </>
                        ) : (
                            <button
                                onClick={openAuthModal}
                                className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-white text-black font-bold text-sm tracking-wide shadow-[0_0_20px_rgba(255,255,255,0.3)] _0_25px_rgba(255,255,255,0.5)] transition-all duration-300"
                            >
                                <LogIn className="w-4 h-4" />
                                Sign In
                            </button>
                        )}
                    </div>
                </div>
            </nav>

            {/* Mobile Sidebar */}
            <ProfileSidebar isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />

        </>
    );
}
